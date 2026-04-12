# MERISE — Modèle Physique de Données (MPD)

Le MPD correspond au DDL SQL exact déployé sur PostgreSQL 15 via Alembic.

## DDL PostgreSQL

```sql
-- Migration initiale (Alembic)
CREATE TABLE mesures (
    id          SERIAL          PRIMARY KEY,
    device_id   VARCHAR(64)     NOT NULL,
    temperature NUMERIC(5, 2),
    humidite    NUMERIC(5, 2),
    recu_le     TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Index de performance
CREATE INDEX idx_mesures_device_id
    ON mesures (device_id);

CREATE INDEX idx_mesures_recu_le
    ON mesures (recu_le DESC);

CREATE INDEX idx_mesures_device_time
    ON mesures (device_id, recu_le DESC);
```

## Volumétrie estimée

| Paramètre | Valeur |
|-----------|--------|
| Capteurs simultanés | 3 (simulation), extensible |
| Intervalle de publication | 5 secondes par capteur |
| Mesures par heure | ~2 160 (3 × 12 × 60) |
| Mesures par jour | ~51 840 |
| Taille par ligne | ~80 octets |
| Stockage par jour | ~4 Mo |

## Requêtes principales

### Liste des capteurs avec stats 24h

```sql
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
ORDER BY device_id;
```

### Statistiques globales

```sql
SELECT
    COUNT(DISTINCT device_id) AS nb_devices,
    COUNT(*) AS total_mesures,
    ROUND(AVG(temperature)::numeric, 2) AS temp_moyenne_globale,
    MAX(recu_le) AS derniere_activite
FROM mesures;
```

### Historique capteur (paginé)

```sql
SELECT id, device_id, temperature, humidite, recu_le
FROM mesures
WHERE device_id = $1
ORDER BY recu_le DESC
LIMIT $2;
```

## Gestion des migrations

Le schéma est versionné par **Alembic** :

```bash
# Appliquer toutes les migrations
alembic upgrade head

# Créer une nouvelle migration
alembic revision -m "add_column_x"

# Rollback d'une migration
alembic downgrade -1
```

Le conteneur Docker `api` exécute `alembic upgrade head` automatiquement au démarrage via `entrypoint.sh`.
