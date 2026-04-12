# Couche : Worker independant (processus separe du serveur FastAPI)
# Role : Ecoute le broker MQTT et persiste chaque mesure en PostgreSQL
# Flow : Broker MQTT → on_message → decode_chirpstack_payload → INSERT mesures
# Note : Utilise psycopg2 direct (pas le pool SQLAlchemy de l'API)

import json
import signal
import time
import logging
import threading

import psycopg2
import paho.mqtt.client as mqtt

from app.config import (
    DB_CONFIG, MQTT_HOST, MQTT_PORT, MQTT_TOPIC, MQTT_USER, MQTT_PASSWORD,
    MQTT_TLS, MQTT_CA_CERTS, SUBSCRIBER_MAX_RETRIES, SUBSCRIBER_BASE_DELAY,
    DATA_RETENTION_DAYS,
)
from app.logging_config import configure_logging
from app.payload_codec import decode_chirpstack_payload
from app.services.mqtt_service import validate_sensor_reading
from app.utils.retry import retry_with_backoff

logger = logging.getLogger("subscriber")

# Connexion DB lazy avec reconnexion auto
_conn = None
_conn_lock = threading.Lock()
_shutdown = threading.Event()


def get_db_conn():
    """Retourne une connexion DB, avec reconnexion automatique."""
    global _conn
    with _conn_lock:
        if _conn is not None and not _conn.closed:
            return _conn

    def _connect():
        global _conn
        with _conn_lock:
            _conn = psycopg2.connect(**DB_CONFIG)
            logger.info("Connexion PostgreSQL etablie")
            return _conn

    return retry_with_backoff(
        _connect,
        max_retries=SUBSCRIBER_MAX_RETRIES,
        base_delay=SUBSCRIBER_BASE_DELAY,
        max_delay=30,
        exceptions=(psycopg2.OperationalError,),
        description="PostgreSQL subscriber connection",
    )



def sauvegarder_mesure(conn, device_id, temperature, humidite):
    """Insere une mesure en base de donnees."""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO mesures (device_id, temperature, humidite)
            VALUES (%s, %s, %s)
        """, (device_id, temperature, humidite))


def write_heartbeat():
    """Ecrit un fichier heartbeat pour le health check Docker."""
    with open("/tmp/heartbeat", "w") as f:
        f.write(str(time.time()))


# Callbacks MQTT
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        client.subscribe(MQTT_TOPIC, qos=1)
        logger.info("Connecte au broker MQTT")
        logger.info("Abonne au topic: %s", MQTT_TOPIC)
        write_heartbeat()
    else:
        logger.error("Connexion MQTT echouee: %s", reason_code)


def on_disconnect(client, userdata, flags, reason_code, properties):
    logger.warning("MQTT deconnecte (rc=%s), reconnexion auto...", reason_code)


def on_message(client, userdata, msg):
    """Decode Chirpstack v4 MQTT payload and save to database."""
    global _conn
    try:
        payload = json.loads(msg.payload.decode())

        decoded = decode_chirpstack_payload(payload)
        if decoded is None:
            return

        if not validate_sensor_reading(decoded["temperature"], decoded["humidite"]):
            logger.warning("Mesure hors limites rejetée: T=%.2f H=%.1f", decoded["temperature"], decoded["humidite"])
            return

        try:
            conn = get_db_conn()
            sauvegarder_mesure(
                conn,
                decoded["device_id"],
                decoded["temperature"],
                decoded["humidite"],
            )
            write_heartbeat()
            conn.commit()
            logger.info(
                "%s -> T:%.2f°C H:%.1f%% [sauvegarde]",
                decoded["device_id"][-4:],
                decoded["temperature"],
                decoded["humidite"],
            )
        except psycopg2.OperationalError:
            with _conn_lock:
                _conn = None
            logger.warning("DB connexion perdue, reconnexion au prochain message")
        except psycopg2.IntegrityError as e:
            if _conn and not _conn.closed:
                _conn.rollback()
            logger.error("Integrity error: %s", e)
        except psycopg2.DataError as e:
            if _conn and not _conn.closed:
                _conn.rollback()
            logger.error("Data error: %s", e)

    except json.JSONDecodeError as e:
        logger.warning("Invalid JSON in MQTT message: %s", e)
    except Exception:
        logger.exception("Unexpected error processing MQTT message")


def _run_retention_loop():
    """Purge old data every 24h based on DATA_RETENTION_DAYS."""
    while not _shutdown.is_set():
        _shutdown.wait(86400)  # 24h
        if _shutdown.is_set():
            break
        try:
            conn = get_db_conn()
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM mesures WHERE recu_le < NOW() - INTERVAL '%s days'",
                    (DATA_RETENTION_DAYS,),
                )
                deleted = cur.rowcount
                conn.commit()
                if deleted > 0:
                    logger.info("Retention: %d anciennes mesures supprimees (> %d jours)", deleted, DATA_RETENTION_DAYS)
        except Exception:
            logger.exception("Erreur lors de la purge de retention")


def _handle_shutdown(signum, _frame):
    """Handle SIGTERM/SIGINT for graceful shutdown."""
    logger.info("Signal %s recu, arret en cours...", signal.Signals(signum).name)
    _shutdown.set()


def run_subscriber():
    """Boucle principale avec reconnexion auto MQTT + DB."""
    configure_logging()

    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    for attempt in range(SUBSCRIBER_MAX_RETRIES):
        if _shutdown.is_set():
            break
        try:
            # S'assurer que la DB est prete
            get_db_conn()

            # Setup MQTT
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            if MQTT_USER:
                client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
            if MQTT_TLS:
                import ssl
                client.tls_set(
                    ca_certs=MQTT_CA_CERTS if MQTT_CA_CERTS else None,
                    cert_reqs=ssl.CERT_REQUIRED if MQTT_CA_CERTS else ssl.CERT_NONE,
                )
            client.on_connect = on_connect
            client.on_message = on_message
            client.on_disconnect = on_disconnect
            client.reconnect_delay_set(min_delay=1, max_delay=60)

            logger.info("Connexion a %s:%s...", MQTT_HOST, MQTT_PORT)
            client.connect(MQTT_HOST, MQTT_PORT, 60)

            logger.info("ExploreIOT Subscriber — En ecoute")
            retention_thread = threading.Thread(target=_run_retention_loop, daemon=True)
            retention_thread.start()
            client.loop_start()
            _shutdown.wait()
            client.loop_stop()
            client.disconnect()

        except Exception as e:
            if _shutdown.is_set():
                break
            delay = min(SUBSCRIBER_BASE_DELAY * (2 ** attempt), 60)
            logger.warning(
                "Erreur subscriber (tentative %d/%d): %s",
                attempt + 1, SUBSCRIBER_MAX_RETRIES, e,
            )
            logger.info("Reconnexion dans %ds...", delay)
            _shutdown.wait(delay)
    else:
        if not _shutdown.is_set():
            logger.critical("Nombre maximum de tentatives atteint. Arret.")
            raise SystemExit(1)

    # Cleanup
    logger.info("Arret du subscriber")
    if _conn and not _conn.closed:
        _conn.close()


if __name__ == "__main__":
    run_subscriber()
