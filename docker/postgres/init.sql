-- init.sql — Fallback schema initialization for Docker-only setup.
-- Canonical schema is managed by Alembic (backend/migrations/).
-- This file is kept for docker compose environments that skip Alembic.

-- Chirpstack v4 requires its own database (used only with --profile chirpstack)
SELECT 'CREATE DATABASE chirpstack'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chirpstack')\gexec

CREATE TABLE IF NOT EXISTS mesures (
    id          SERIAL PRIMARY KEY,
    device_id   VARCHAR(64) NOT NULL,
    temperature NUMERIC(5,2),
    humidite    NUMERIC(5,2),
    recu_le     TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes fréquentes de l'API
CREATE INDEX IF NOT EXISTS idx_mesures_device_id ON mesures(device_id);
CREATE INDEX IF NOT EXISTS idx_mesures_recu_le ON mesures(recu_le DESC);
CREATE INDEX IF NOT EXISTS idx_mesures_device_time ON mesures(device_id, recu_le DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mesures_no_dupes ON mesures(device_id, recu_le);

-- Data retention: auto-purge rows older than configured days (default 90).
-- Runs daily via pg_cron if available, otherwise use external cron.
-- Manual cleanup: DELETE FROM mesures WHERE recu_le < NOW() - INTERVAL '90 days';

CREATE OR REPLACE FUNCTION purge_old_mesures(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted INTEGER;
BEGIN
    DELETE FROM mesures WHERE recu_le < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted = ROW_COUNT;
    RETURN deleted;
END;
$$ LANGUAGE plpgsql;
