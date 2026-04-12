"""Data access for devices and metrics."""

from app.database import get_conn

ALLOWED_INTERVALS = {"1 hour", "6 hours", "24 hours", "7 days"}
INTERVAL_SQL = {
    "1 hour": "INTERVAL '1 hour'",
    "6 hours": "INTERVAL '6 hours'",
    "24 hours": "INTERVAL '24 hours'",
    "7 days": "INTERVAL '7 days'",
}


def list_devices_with_stats() -> list[dict]:
    """List all devices with 24h aggregated statistics."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    device_id,
                    COUNT(*) AS nb_mesures,
                    ROUND(AVG(temperature)::numeric, 2) AS temp_moyenne,
                    ROUND(MIN(temperature)::numeric, 2) AS temp_min,
                    ROUND(MAX(temperature)::numeric, 2) AS temp_max,
                    MAX(recu_le) AS derniere_mesure
                FROM mesures
                WHERE recu_le > NOW() - INTERVAL '24 hours'
                GROUP BY device_id
                ORDER BY device_id
            """)
            return cur.fetchall()


def device_exists(device_id: str) -> bool:
    """Check if a device has any measurements."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS n FROM mesures WHERE device_id = %s",
                (device_id,),
            )
            return cur.fetchone()["n"] > 0


def get_device_metrics(
    device_id: str, limit: int, interval: str | None = None
) -> list[dict]:
    """Return measurement history for a device, optionally filtered by time interval."""
    if interval and interval not in ALLOWED_INTERVALS:
        raise ValueError(f"Invalid interval: {interval}")
    with get_conn() as conn:
        with conn.cursor() as cur:
            if interval:
                interval_sql = INTERVAL_SQL.get(interval)
                if interval_sql is None:
                    raise ValueError(f"Invalid interval: {interval}")
                cur.execute(
                    f"""SELECT id, device_id, temperature, humidite, recu_le
                       FROM mesures
                       WHERE device_id = %s AND recu_le > NOW() - {interval_sql}
                       ORDER BY recu_le DESC LIMIT %s""",
                    (device_id, limit),
                )
            else:
                cur.execute(
                    """SELECT id, device_id, temperature, humidite, recu_le
                       FROM mesures
                       WHERE device_id = %s
                       ORDER BY recu_le DESC LIMIT %s""",
                    (device_id, limit),
                )
            return cur.fetchall()
