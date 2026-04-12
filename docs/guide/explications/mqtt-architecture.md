# Architecture MQTT pub/sub

ExploreIOT utilise MQTT comme colonne vertébrale de communication entre les capteurs simulés, la base de données et le dashboard. Ce document explique le pattern pub/sub et son implémentation concrète dans le projet.

## 1. Le pattern Publish/Subscribe

### Découplage producteur/consommateur

Dans une architecture classique client/serveur, le producteur de données doit connaître l'adresse du consommateur et établir une connexion directe. Si le consommateur est hors ligne, les données sont perdues.

Le pattern **Publish/Subscribe** introduit un intermédiaire : le **broker**. Le producteur (publisher) envoie des messages sur un **topic** sans savoir qui les recevra. Le consommateur (subscriber) s'abonne aux topics qui l'intéressent sans savoir d'où viennent les données.

```text
Publisher ──publié sur topic──▶ [BROKER] ──distribué aux abonnés──▶ Subscriber(s)
```

Ce découplage offre plusieurs avantages :
- Le publisher peut envoyer des messages même si aucun subscriber n'est connecté
- Plusieurs subscribers peuvent recevoir le même message simultanément
- On peut ajouter un nouveau subscriber sans modifier le publisher

### Broker comme intermédiaire intelligent

Le broker MQTT (**Mosquitto** dans ExploreIOT) gère :
- L'authentification des clients (optionnel)
- La persistence des messages (selon le QoS)
- La distribution aux abonnés actifs
- La gestion des connexions persistantes

### Topics hiérarchiques avec wildcards

Les topics MQTT sont des chemins hiérarchiques séparés par `/` :

```text
application/1/device/0102030405060708/event/up
```

Les wildcards permettent des souscriptions flexibles :
- `+` : remplace exactement un niveau. `application/+/device/+/event/up` correspond à toutes les applications et tous les devices.
- `#` : remplace zéro ou plusieurs niveaux (doit être en dernier). `application/#` correspond à tous les messages de toutes les applications.

## 2. Topologie ExploreIOT

### Vue d'ensemble

```text
publisher.py ──────▶ [Mosquitto] ──────▶ subscriber.py ──▶ PostgreSQL
  (simule Chirpstack)       │
                            └─────────▶ main.py (FastAPI) ──▶ WebSocket ──▶ Dashboard
```

### Publisher (simulation de Chirpstack)

Le script `publisher.py` simule le comportement du Network Server LoRaWAN **Chirpstack** :

- Il gère **3 capteurs virtuels** avec des EUI distincts
- Il génère des mesures aléatoires réalistes (T: 18-30°C, H: 30-80%)
- Il publie un message toutes les **5 secondes** par capteur
- Il encode les valeurs en payload binaire (struct big-endian) puis en Base64

Topic de publication :
```text
application/1/device/{devEUI}/event/up
```

### Subscriber (persistance en base de données)

Le script `subscriber.py` est souscrit au topic `application/1/device/+/event/up` (wildcard `+` pour tous les capteurs). Il :

1. Reçoit le message JSON
2. Extrait le `device_id` depuis `deviceInfo.devEui`
3. Décode le payload Base64 → bytes → struct.unpack
4. Valide les plages physiques
5. Insère en PostgreSQL

### API FastAPI (broadcast WebSocket)

Le module `main.py` de l'API se souscrit au même topic MQTT que le subscriber. À chaque message reçu, il broadcaste les données décodées à tous les clients WebSocket connectés (un par onglet dashboard ouvert). Cela permet la mise à jour en temps réel du dashboard sans polling HTTP.

## 3. QoS 1 (at-least-once)

### Les trois niveaux de QoS MQTT

| QoS | Garantie | Mécanisme |
|-----|----------|-----------|
| 0 | Au plus une fois (fire & forget) | Aucun accusé de réception |
| 1 | Au moins une fois | PUBACK obligatoire, retransmission si absent |
| 2 | Exactement une fois | Échange en 4 temps (PUBREC/PUBREL/PUBCOMP) |

### Pourquoi QoS 1 dans ExploreIOT ?

**QoS 1** est le bon compromis pour des données de capteurs :

- **Garantie suffisante** : le message arrive toujours, même en cas de perte réseau temporaire
- **Doublons acceptables** : si le subscriber reçoit deux fois la même mesure, l'impact est faible (une ligne supplémentaire en base). Il n'y a pas de transaction financière ou d'action critique en jeu.
- **Overhead raisonnable** : un seul accusé de réception (PUBACK) par message

**QoS 2** apporterait la garantie "exactement une fois", mais au prix d'un échange en 4 messages au lieu de 2. Pour des données IoT émises toutes les 5 secondes, cet overhead est inutile.

**QoS 0** serait trop risqué : en cas de perte réseau momentanée, des mesures seraient définitivement perdues sans possibilité de retransmission.

## 4. Reconnexion automatique

### Configuration paho-mqtt

La bibliothèque Python `paho-mqtt` est configurée avec un délai de reconnexion exponentiel :

```python
client.reconnect_delay_set(min_delay=1, max_delay=60)
```

En cas de déconnexion du broker :
- Première tentative : après 1 seconde
- Tentatives suivantes : délai doublé à chaque fois (2s, 4s, 8s...)
- Délai maximum : 60 secondes (plafond)

### Backoff exponentiel pour la base de données

Le subscriber implémente également un backoff exponentiel pour les reconnexions à PostgreSQL :

```python
delay = 2
max_delay = 30
max_attempts = 5

for attempt in range(max_attempts):
    try:
        conn = psycopg2.connect(...)
        break
    except psycopg2.OperationalError:
        time.sleep(delay)
        delay = min(delay * 2, max_delay)
```

Cela évite de surcharger la base de données avec des tentatives de reconnexion rapides lors d'un redémarrage du conteneur PostgreSQL.

### Heartbeat file pour healthcheck Docker

Le subscriber écrit périodiquement un fichier `/tmp/subscriber_alive` avec le timestamp courant. Le healthcheck Docker vérifie que ce fichier a été modifié il y a moins de 30 secondes :

```dockerfile
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD test $(( $(date +%s) - $(date +%s -r /tmp/subscriber_alive) )) -lt 30
```

Si le subscriber se bloque (deadlock, exception non catchée), le conteneur est automatiquement redémarré par Docker.

## 5. Format des messages

### Enveloppe JSON

Chaque message publié sur MQTT suit le format d'un événement "uplink" Chirpstack :

```json
{
  "deviceInfo": {
    "deviceName": "capteur-lht65-01",
    "devEui": "0102030405060708"
  },
  "time": "2026-04-11T10:00:00.000Z",
  "data": "CZICjQ=="
}
```

- `deviceInfo.devEui` : identifiant unique du capteur (8 octets en hexadécimal)
- `time` : horodatage ISO 8601 de la mesure côté capteur
- `data` : payload applicatif encodé en Base64

### Payload binaire

Le champ `data` contient un payload binaire de **4 octets** encodé en Base64 :

```text
[octet 1][octet 2]  →  température × 100 (uint16 big-endian)
[octet 3][octet 4]  →  humidité × 10    (uint16 big-endian)
```

Exemple : `CZICjQ==` décode en `09 92 02 8D` soit 2450 (24,50°C) et 653 (65,3%).

Ce format est identique à celui produit par un vrai capteur Dragino LHT65 connecté à Chirpstack, ce qui permet de basculer du mode simulation au mode production sans aucune modification du subscriber.

## 6. Support TLS

### Chiffrement en transit

ExploreIOT supporte TLS pour chiffrer la communication MQTT entre les clients (publisher, subscriber, API) et le broker Mosquitto. TLS prévient les attaques man-in-the-middle et garantit l'intégrité des données.

### Configuration

**Broker (Mosquitto)** : Configuration TLS dans `docker-compose.yml` :

```yaml
mosquitto:
  image: eclipse-mosquitto:latest
  ports:
    - "8883:8883"  # Port TLS (standard)
  volumes:
    - ./mosquitto/config:/mosquitto/config
    - ./mosquitto/certs:/mosquitto/certs
```

Configuration MQTT (`mosquitto.conf`) :

```text
listener 8883
protocol mqtt
certfile /mosquitto/certs/server.crt
keyfile /mosquitto/certs/server.key
cafile /mosquitto/certs/ca.crt
```

**Clients Python** (publisher, subscriber) : Activation TLS via variables d'environnement :

```python
if os.getenv("MQTT_TLS") == "true":
    client.tls_set(
        ca_certs=os.getenv("MQTT_CA_CERTS"),
        certfile=None,
        keyfile=None,
        cert_reqs=ssl.CERT_REQUIRED,
        tls_version=ssl.PROTOCOL_TLSv1_2,
        ciphers=None
    )
    client.tls_insecure_set(False)
```

**API FastAPI** : Configuration via `mqtt_handler.py` :

```python
mqtt_client = mqtt.Client()
if settings.MQTT_TLS:
    mqtt_client.tls_set(ca_certs=settings.MQTT_CA_CERTS)
```

## 7. Thread safety

### Pourquoi les locks sont essentiels

Les callbacks MQTT (`on_message`, `on_connect`) sont exécutés par la boucle réseau de Paho MQTT dans un thread séparé du thread principal. Sans synchronisation, on risque des races conditions :

1. **Lecture/écriture partagée** : Le callback modifie une liste ou dictionnaire tandis que le thread principal le consomme
2. **Commit PostgreSQL incomplet** : Deux insertions concurrentes sans lock peuvent créer des incohérences
3. **Deadlock** : Une requête SQL bloquée attend un commit du même thread (impossibilité)

### mqtt_handler.py

Le module `mqtt_handler.py` utilise un `threading.RLock()` (réentrant) pour protéger les structures de données :

```python
class MqttHandler:
    def __init__(self):
        self.lock = threading.RLock()
        self.messages = []
        self.last_update = {}

    def on_message(self, client, userdata, msg):
        """Callback appelé par le thread réseau Paho"""
        with self.lock:
            # Accès sûr à self.messages et self.last_update
            decoded = self.decode_message(msg)
            self.messages.append(decoded)
            self.last_update["timestamp"] = time.time()

    def get_latest_message(self):
        """Lecture sûre depuis le thread principal"""
        with self.lock:
            return self.messages[-1] if self.messages else None
```

### subscriber.py

Le subscriber utilise une approche similaire pour les insertions PostgreSQL :

```python
db_lock = threading.Lock()
conn = None

def on_message(client, userdata, msg):
    global conn, db_lock

    with db_lock:
        try:
            # Décodage du message (thread-safe)
            payload = json.loads(msg.payload)
            device_id = payload["deviceInfo"]["devEui"]
            temperature, humidity = decode_payload(payload["data"])

            # Insertion PostgreSQL (une seule connexion protégée)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO mesures (device_id, temperature, humidity) VALUES (%s, %s, %s)",
                (device_id, temperature, humidity)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Erreur insertion : {e}")
```

## 8. Validation des credentials au démarrage

ExploreIOT valide les credentials MQTT et la connectivité de la base de données au démarrage pour échouer rapidement en cas de configuration incorrecte.

### Startup check (main.py)

```python
@app.on_event("startup")
async def startup_event():
    """Validation au démarrage"""

    # 1. Vérifier la connexion PostgreSQL
    try:
        db.execute("SELECT 1")
        logger.info("✓ PostgreSQL connecté")
    except Exception as e:
        logger.error(f"✗ PostgreSQL impossible : {e}")
        raise

    # 2. Vérifier MQTT
    try:
        mqtt_handler.connect()
        logger.info("✓ MQTT connecté")
    except Exception as e:
        logger.error(f"✗ MQTT impossible : {e}")
        raise

    # 3. Vérifier les certificats TLS si activés
    if settings.MQTT_TLS:
        if not os.path.exists(settings.MQTT_CA_CERTS):
            raise FileNotFoundError(f"CA cert not found: {settings.MQTT_CA_CERTS}")
```

Si la validation échoue, le conteneur API ne démarre pas et le healthcheck Docker signale l'erreur, évitant un deployment partiel.

## 9. Validation dual-path des données

ExploreIOT applique une validation en deux points pour garantir l'intégrité des données :

### Path 1 : WebSocket (temps réel)

L'API reçoit un message MQTT et valide via `mqtt_service.validate_sensor_reading()` avant de broadcaster aux clients WebSocket :

```python
# mqtt_handler.py (broadcast WebSocket)
def on_message(self, client, userdata, msg):
    decoded = json.loads(msg.payload)

    # Validation
    if not mqtt_service.validate_sensor_reading(decoded):
        logger.warning(f"Invalid reading from {decoded['deviceInfo']['devEui']}")
        return

    # Broadcast aux clients WebSocket connectés
    for ws in self.ws_connections:
        ws.send_json({"type": "new_mesure", "data": decoded})
```

### Path 2 : Persistance (base de données)

Le subscriber valide aussi les données avant insertion :

```python
# subscriber.py
def on_message(client, userdata, msg):
    decoded = json.loads(msg.payload)

    # Même validation que dans l'API
    if not mqtt_service.validate_sensor_reading(decoded):
        logger.warning(f"Invalid reading, skipping DB insertion")
        return

    # Insertion sécurisée en base
    with db_lock:
        cursor.execute("INSERT INTO mesures ...", (device_id, temp, hum))
        conn.commit()
```

La fonction `mqtt_service.validate_sensor_reading()` contient une logique partagée :

```python
def validate_sensor_reading(data: dict) -> bool:
    """Validation centralisée"""
    try:
        # Vérifier les champs requis
        assert "deviceInfo" in data
        assert "data" in data

        # Décoder et valider les plages
        temp, hum = decode_payload(data["data"])

        # Plages acceptables (SHT31)
        assert -40 <= temp <= 125  # Température
        assert 0 <= hum <= 100      # Humidité relative

        return True
    except (AssertionError, KeyError, ValueError):
        return False
```

Ce dual-path garantit qu'aucune donnée invalide ne pénètre la base de données, même en cas de contournement d'une des deux voies.
