"""Data access for global statistics."""

from app.database import get_conn


def get_global_stats() -> dict:
    """Return fleet-wide statistics."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    COUNT(DISTINCT device_id) AS nb_devices,
                    COUNT(*) AS total_mesures,
                    ROUND(AVG(temperature)::numeric, 2) AS temp_moyenne_globale,
                    MAX(recu_le) AS derniere_activite
                FROM mesures
            """)
            result = cur.fetchone()
            if result is None:
                return {"nb_devices": 0, "total_mesures": 0, "temp_moyenne_globale": None, "derniere_activite": None}
            return result
