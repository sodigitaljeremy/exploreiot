"""Data access for alert detection."""

from datetime import timedelta

from app.database import get_conn


def find_high_temperature_alerts(
    threshold: float, silence_interval: timedelta
) -> list[dict]:
    """Find measurements exceeding the temperature threshold within the time window."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT device_id, temperature, recu_le
                FROM mesures
                WHERE temperature > %s
                  AND recu_le > NOW() - %s
                ORDER BY recu_le DESC
                """,
                (threshold, silence_interval),
            )
            return cur.fetchall()


def find_silent_sensors(silence_interval: timedelta) -> list[dict]:
    """Find devices that haven't reported within the time window."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    device_id,
                    MAX(recu_le) AS derniere_mesure
                FROM mesures
                GROUP BY device_id
                HAVING MAX(recu_le) < NOW() - %s
                """,
                (silence_interval,),
            )
            return cur.fetchall()
