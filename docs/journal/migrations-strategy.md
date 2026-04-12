# Strategie de migrations

## Le problème

ExploreIOT utilisait initialement un fichier `init.sql` execute au demarrage du container PostgreSQL :

```sql
CREATE TABLE sensor_data (
    id          SERIAL PRIMARY KEY,
    device_id   VARCHAR(50),
    temperature FLOAT,
    humidite    FLOAT,
    timestamp   TIMESTAMPTZ DEFAULT NOW()
);
```

Trois semaines plus tard, il fallait ajouter une colonne `battery_level` et un index sur `device_id`. Le probleme : **`init.sql` n'est execute qu'une seule fois** (quand le volume Docker est cree pour la premiere fois). Modifier `init.sql` n'a aucun effet sur une base de donnees existante. Les options disponibles etaient :

- Supprimer le volume et tout recreer (perte de toutes les donnees)
- Modifier la base manuellement via `psql` (non-reproductible, pas documente)
- Introduire un outil de migration

## Ce que j'ai appris

### Le versioning de schema avec Alembic

Alembic (l'outil de migration de SQLAlchemy) versionne les changements de schema exactement comme Git versionne le code. Chaque migration est un fichier Python avec :
- Un identifiant unique de revision
- Une fonction `upgrade()` : comment aller vers cette version
- Une fonction `downgrade()` : comment revenir en arriere

La table `alembic_version` en base de donnees enregistre la revision actuelle. Alembic sait exactement quelles migrations appliquer pour passer de la version courante a la version cible.

### Migrations sans ORM avec `op.execute()`

Alembic est souvent presente avec SQLAlchemy ORM, mais il fonctionne parfaitement avec du SQL brut via `op.execute()`. Pour un projet qui n'utilise pas d'ORM (comme ExploreIOT avec psycopg2 direct), c'est le choix le plus simple et le plus lisible.

### Pattern `entrypoint.sh` pour Docker

Plutot que de lancer les migrations dans un service Docker separe (avec des problemes de timing et de dependances), le script `entrypoint.sh` execute `alembic upgrade head` avant de demarrer l'API. Puisque les migrations sont idempotentes (elles ne s'appliquent que si necessaire), ce pattern est sur et reproductible.

## Code concret (extrait du projet)

### Fichier de migration Alembic — `alembic/versions/001_initial_schema.py`

```python
"""Initial schema: table sensor_data

Revision ID: 001a2b3c4d5e
Revises: (aucune — premiere migration)
Create Date: 2026-04-11 10:00:00
"""

from alembic import op

# Identifiants de revision pour le graphe de migrations
revision = "001a2b3c4d5e"
down_revision = None          # Premiere migration : pas de predecesseur
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Applique les changements : creation de la table initiale."""
    op.execute("""
        CREATE TABLE IF NOT EXISTS sensor_data (
            id          SERIAL PRIMARY KEY,
            device_id   VARCHAR(50)  NOT NULL,
            temperature FLOAT        NOT NULL,
            humidite    FLOAT        NOT NULL,
            timestamp   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
    """)
    # Index pour accelerer les requetes filtrees par device_id
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id
        ON sensor_data (device_id)
    """)


def downgrade() -> None:
    """Annule les changements : suppression de la table."""
    op.execute("DROP TABLE IF EXISTS sensor_data")
```

### Deuxieme migration — `alembic/versions/002_add_battery_level.py`

```python
"""Add battery_level column to sensor_data

Revision ID: 002f6a7b8c9d
Revises: 001a2b3c4d5e
Create Date: 2026-04-18 14:30:00
"""

from alembic import op

revision = "002f6a7b8c9d"
down_revision = "001a2b3c4d5e"  # Pointe vers la migration precedente
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Ajoute la colonne battery_level (nullable pour compatibilite ascendante)."""
    op.execute("""
        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS battery_level FLOAT
    """)


def downgrade() -> None:
    """Supprime la colonne battery_level."""
    op.execute("""
        ALTER TABLE sensor_data
        DROP COLUMN IF EXISTS battery_level
    """)
```

### `alembic/env.py` — configuration sans ORM

```python
from alembic import context
import os

# Configuration minimale : URL de connexion uniquement, pas de metadata SQLAlchemy
config = context.config
config.set_main_option(
    "sqlalchemy.url",
    os.environ.get("DATABASE_URL", "postgresql://user:pass@localhost/exploreiot")
)

def run_migrations_online() -> None:
    """Execute les migrations avec une vraie connexion a la base."""
    from sqlalchemy import engine_from_config, pool

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # Pas de pooling pour les migrations
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=None)
        with context.begin_transaction():
            context.run_migrations()

run_migrations_online()
```

### `entrypoint.sh` — migrations avant demarrage de l'API

```bash
#!/bin/sh
# entrypoint.sh — execute les migrations puis demarre l'application

set -e  # Arreter si une commande echoue

echo "Attente de PostgreSQL..."
# Attendre que PostgreSQL soit pret a accepter des connexions
until pg_isready -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}"; do
    echo "PostgreSQL pas encore pret, nouvelle tentative dans 2s..."
    sleep 2
done

echo "Application des migrations Alembic..."
alembic upgrade head

echo "Demarrage de l'API..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
```

```dockerfile
# Dans backend/Dockerfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

## Piège a eviter

### Ne pas utiliser `IF NOT EXISTS` (idempotence)

Sans `IF NOT EXISTS`, une migration qui s'execute deux fois (redemarrage du container au mauvais moment) plantera sur la deuxieme execution car la table ou la colonne existe deja. Alembic previent normalement ce probleme (il ne rejoue pas les migrations deja appliquees), mais `IF NOT EXISTS` est une securite supplementaire en cas de corruption de la table `alembic_version`.

```sql
-- FAUX — plantera si execute deux fois
CREATE TABLE sensor_data (...);

-- CORRECT — idempotent
CREATE TABLE IF NOT EXISTS sensor_data (...);
```

### Oublier `downgrade()`

`downgrade()` est souvent consideree comme "pas importante". En pratique, lors d'un deploiement raté en production, la capacite a revenir a la version precedente en 30 secondes (`alembic downgrade -1`) est invaluable. Une migration sans `downgrade()` est une migration sans filet de securite.

### Lancer les migrations dans un service Docker separe

Une approche courante consiste a creer un service `migrations` dans `docker-compose.yml` qui execute `alembic upgrade head` puis s'arrete. Le probleme : Docker Compose ne garantit pas que `migrations` se termine avant que `api` demarre, meme avec `depends_on`. Le pattern `entrypoint.sh` est plus fiable car la migration est dans le meme processus que l'API.

### Modifier une migration deja deployee

Une migration deja appliquee en production ne doit **jamais** etre modifiee. Alembic compare les revisions par identifiant, pas par contenu. Si la migration `001` est modifiee apres avoir ete appliquee, Alembic continuera a considerer la base de donnees comme "a jour" alors qu'elle ne correspond plus au fichier. Toujours creer une **nouvelle migration** pour corriger une migration passee.

## Ressources

- [Alembic — documentation officielle](https://alembic.sqlalchemy.org/en/latest/)
- [Martin Fowler — Evolutionary Database Design](https://martinfowler.com/articles/evodb.html)
- [Alembic — op.execute() pour SQL brut](https://alembic.sqlalchemy.org/en/latest/ops.html#alembic.operations.Operations.execute)
- [Docker Compose — depends_on et conditions](https://docs.docker.com/compose/compose-file/05-services/#depends_on)

!!! tip "Pour aller plus loin"
    - [Memo 08 — SQL fondamentaux](../memos/08-sql-fondamentaux.md) : SELECT, INSERT, INDEX, transactions
    - [Référence — Schéma DB](../guide/reference/schema-db.md) : DDL complet, volumétrie, requêtes principales
