---
marp: true
theme: default
paginate: true
header: "ExploreIOT — Fondamentaux CS"
footer: "Memo #08 — SQL fondamentaux"
---

# SQL Fondamentaux

Requêtes, indexes, transactions pour ExploreIOT

---

## SELECT : Lire les données

### Syntaxe simple

```sql
SELECT colonne1, colonne2
FROM table
WHERE condition;
```sql

### ExploreIOT : Toutes mesures

```sql
SELECT id, capteur, valeur, timestamp
FROM mesures;
```sql

**Résultat** :
```text
id | capteur   | valeur | timestamp
---+-----------+--------+--------------------
1  | temp      | 23.5   | 2024-11-15 10:30:00
2  | humidite  | 45.2   | 2024-11-15 10:31:00
3  | temp      | 24.1   | 2024-11-15 10:32:00
```text

---

## WHERE : Filtrer

```sql
-- Mesures temperature > 23
SELECT id, capteur, valeur
FROM mesures
WHERE capteur = 'temp' AND valeur > 23;
```sql

**Opérateurs** :
- `=` égal
- `!=`, `<>` différent
- `>`, `<`, `>=`, `<=` comparaison
- `AND`, `OR`, `NOT` logique
- `BETWEEN`, `IN`, `LIKE` patterns

---

## ORDER BY : Trier

```sql
-- Dernières mesures (plus récentes d'abord)
SELECT id, capteur, valeur, timestamp
FROM mesures
ORDER BY timestamp DESC
LIMIT 10;
```sql

**Exemple** :
```text
id | capteur   | valeur | timestamp
---+-----------+--------+--------------------
5  | temp      | 23.2   | 2024-11-15 10:35:00 ← Plus récente
4  | humidite  | 46.1   | 2024-11-15 10:34:00
3  | temp      | 24.1   | 2024-11-15 10:32:00
```text

---

## GROUP BY : Agréger

```sql
-- Moyenne température par capteur
SELECT capteur, AVG(valeur) as moyenne
FROM mesures
GROUP BY capteur;
```sql

**Exemple** :
```text
capteur   | moyenne
-----------+---------
temp      | 23.87
humidite  | 45.65
```sql

**Fonctions d'agrégation** :
- `COUNT()` nombre lignes
- `SUM()` somme
- `AVG()` moyenne
- `MIN()`, `MAX()` minimum/maximum

---

## GROUP BY avec HAVING

```sql
-- Capteurs avec > 100 mesures
SELECT capteur, COUNT(*) as nb_mesures
FROM mesures
GROUP BY capteur
HAVING COUNT(*) > 100;
```sql

`WHERE` filtre avant GROUP BY
`HAVING` filtre après GROUP BY

---

## JOIN : Combiner tables

### ExploreIOT : Schema

```text
Table capteurs:
id | nom      | localisation
---+----------+--------------------
1  | Temp_01  | Salle
2  | Humid_01 | Salle

Table mesures:
id | capteur_id | valeur | timestamp
---+------------+--------+--------------------
1  | 1          | 23.5   | 2024-11-15 10:30:00
2  | 2          | 45.2   | 2024-11-15 10:31:00
```text

---

## INNER JOIN

```sql
-- Mesures avec info capteur
SELECT mesures.id, capteurs.nom, mesures.valeur, capteurs.localisation
FROM mesures
INNER JOIN capteurs ON mesures.capteur_id = capteurs.id;
```sql

**Résultat** :
```text
id | nom       | valeur | localisation
---+-----------+--------+----------
1  | Temp_01   | 23.5   | Salle
2  | Humid_01  | 45.2   | Salle
```bash

Only rows where JOIN condition matches

---

## LEFT JOIN

```sql
-- Tous capteurs, même sans mesures
SELECT capteurs.nom, mesures.valeur
FROM capteurs
LEFT JOIN mesures ON capteurs.id = mesures.capteur_id;
```sql

Garde TOUS capteurs, NULL si pas de mesures

---

## INSERT : Créer

```sql
-- Insérer une mesure
INSERT INTO mesures (capteur_id, valeur, timestamp)
VALUES (1, 23.5, '2024-11-15 10:30:00');
```sql

```sql
-- Insérer plusieurs
INSERT INTO mesures (capteur_id, valeur, timestamp)
VALUES
  (1, 23.5, '2024-11-15 10:30:00'),
  (2, 45.2, '2024-11-15 10:31:00'),
  (1, 24.1, '2024-11-15 10:32:00');
```sql

---

## UPDATE : Modifier

```sql
-- Mettre à jour une mesure
UPDATE mesures
SET valeur = 25.0
WHERE id = 1;
```sql

```sql
-- Mettre à jour plusieurs
UPDATE mesures
SET valeur = valeur + 0.5
WHERE capteur_id = 1;
```sql

⚠️ Toujours utiliser WHERE sinon toute table change!

---

## DELETE : Supprimer

```sql
-- Supprimer une mesure
DELETE FROM mesures
WHERE id = 1;
```sql

```sql
-- Supprimer mesures > 30 jours
DELETE FROM mesures
WHERE timestamp < NOW() - INTERVAL '30 days';
```sql

⚠️ Destructif! Toujours backup avant.

---

## INDEX : B-tree

Accélérer requêtes :

```sql
-- Créer index sur capteur_id
CREATE INDEX idx_mesures_capteur_id ON mesures(capteur_id);

-- Index composé
CREATE INDEX idx_mesures_capteur_timestamp ON mesures(capteur_id, timestamp);

-- Index unique
CREATE UNIQUE INDEX idx_utilisateurs_email ON utilisateurs(email);
```text

**Avantage** :
- ✅ SELECT/WHERE plus rapide
- ❌ INSERT/UPDATE/DELETE plus lent
- ❌ Consomme disque

---

## EXPLAIN ANALYZE : Query Plan

```sql
EXPLAIN ANALYZE
SELECT AVG(valeur)
FROM mesures
WHERE capteur_id = 1;
```sql

**Résultat** :
```sql
Seq Scan on mesures  (cost=0.00..10000.00)
  Filter: (capteur_id = 1)
  Actual time: 45.2ms
```bash

**Avec index** :
```bash
Index Scan using idx_mesures_capteur_id on mesures
  (cost=0.29..5.00)
  Actual time: 1.2ms
```bash

100x plus rapide avec index!

---

## ExploreIOT Indexes

```sql
-- Créer table mesures
CREATE TABLE mesures (
  id SERIAL PRIMARY KEY,
  capteur_id INTEGER NOT NULL,
  valeur FLOAT NOT NULL,
  timestamp TIMESTAMP NOT NULL
);

-- Index 1: Recherche par capteur
CREATE INDEX idx_mesures_capteur_id
ON mesures(capteur_id);

-- Index 2: Récentes mesures
CREATE INDEX idx_mesures_timestamp
ON mesures(timestamp DESC);

-- Index 3: Capteur + timestamp (queries combinées)
CREATE INDEX idx_mesures_capteur_timestamp
ON mesures(capteur_id, timestamp DESC);
```bash

---

## Transactions : ACID

Garanties de cohérence :

```sql
BEGIN;  -- Début transaction

INSERT INTO mesures (capteur_id, valeur) VALUES (1, 23.5);
UPDATE capteurs SET derniere_mesure = 23.5 WHERE id = 1;

COMMIT;  -- Tout ou rien
```sql

Si erreur avant COMMIT → ROLLBACK automatique

---

## ACID Properties

**A**tomicity : Tout ou rien
```sql
BEGIN;
INSERT ... -- Si fail, aucun change
INSERT ...
COMMIT;
```sql

**C**onsistency : Règles métier respectées
```sql
-- NOT NULL, FOREIGN KEY constraints
CREATE TABLE mesures (
  capteur_id INTEGER NOT NULL REFERENCES capteurs(id),
  valeur FLOAT CHECK (valeur > -100 AND valeur < 200)
);
```typescript

---

## ACID Properties (cont.)

**I**solation : Transactions parallèles indépendantes
```sql
-- Transaction 1           -- Transaction 2
BEGIN;                      BEGIN;
SELECT balance FROM users;
WHERE id=1;                SELECT balance FROM users
(balance = 1000)           WHERE id=1;
UPDATE balance = 900;      (balance = 1000)
                           UPDATE balance = 1200;
COMMIT;                     COMMIT;
-- Finale: 900? 1200? (isolation level définit)
```sql

**D**urability : Commits persistés
```sql
COMMIT;  -- Écrit disque, survit crash
```python

---

## Connection Pooling

Réutiliser connexions :

```python
# Sans pool (bad) : 1 connexion = overhead
conn = psycopg2.connect("dbname=exploreiot user=postgres")
cursor = conn.cursor()
cursor.execute("SELECT * FROM mesures")
conn.close()  # 1 requête = 1 connection (lent)
```sql

```python
# Avec pool (good) : réutiliser 10 connexions
from psycopg2 import pool

connection_pool = psycopg2.pool.SimpleConnectionPool(
    1,    # min connections
    10,   # max connections
    host="localhost",
    database="exploreiot",
    user="postgres",
    password="password"
)

# Utiliser
conn = connection_pool.getconn()
cursor = conn.cursor()
cursor.execute("SELECT * FROM mesures")
connection_pool.putconn(conn)  # Retourner au pool
```sql

---

## SimpleConnectionPool ExploreIOT

```python
from psycopg2 import pool
from contextlib import contextmanager

# Initialiser au démarrage app
db_pool = pool.SimpleConnectionPool(
    1,  # min
    20, # max
    host="localhost",
    database="exploreiot",
    user="postgres",
    password="postgres"
)

@contextmanager
def get_db_connection():
    """Context manager pour réutiliser connexions"""
    conn = db_pool.getconn()
    try:
        yield conn
    finally:
        db_pool.putconn(conn)

# Utiliser
with get_db_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM mesures")
    result = cursor.fetchall()
```sql

---

## FastAPI + SQLAlchemy Pattern

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Connection pooling built-in
engine = create_engine(
    "postgresql://postgres:password@localhost/exploreiot",
    pool_size=10,      # connections du pool
    max_overflow=20,   # connections temporaires supplémentaires
    pool_recycle=3600, # recycle connexion après 1h
)

SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utiliser dans endpoint
@app.get("/api/mesures")
async def get_mesures(db: Session = Depends(get_db)):
    return db.query(Mesure).limit(10).all()
```python

---

## Requêtes Courantes ExploreIOT

### 10 dernières mesures

```sql
SELECT id, capteur_id, valeur, timestamp
FROM mesures
ORDER BY timestamp DESC
LIMIT 10;
```sql

### Moyenne température dernière heure

```sql
SELECT AVG(valeur) as moyenne
FROM mesures
WHERE capteur_id = 1
  AND timestamp > NOW() - INTERVAL '1 hour';
```sql

### Mesures par capteur

```sql
SELECT capteurs.nom, COUNT(*) as nb_mesures, AVG(mesures.valeur) as moyenne
FROM mesures
JOIN capteurs ON mesures.capteur_id = capteurs.id
GROUP BY capteurs.id, capteurs.nom;
```python

---

## Bonnes Pratiques SQL

- ✅ Utiliser parameterized queries (prevent SQL injection)
- ✅ Indexer colonnes WHERE fréquentes
- ✅ EXPLAIN ANALYZE avant prod
- ✅ Connection pooling (surtout avec web app)
- ✅ Transactions pour opérations cohérentes
- ✅ Backup régulier
- ✅ Monitorer slow queries (> 1s)

**ExploreIOT** : 3 indexes, SimpleConnectionPool, FastAPI

---

## Debugging SQL

```bash
# Voir queries en direct
psql -U postgres -d exploreiot -c "SELECT * FROM mesures LIMIT 5;"

# Logs PostgreSQL (trouver lentes requêtes)
tail -f /var/log/postgresql/postgresql.log

# Monitor connexions actives
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
```sql

```python
# Log SQLAlchemy queries
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
# Maintenant voir TOUTES requêtes SQL générées
```sql

!!! tip "Appliquer dans ExploreIOT"
    - La table `mesures` stocke température + humidité avec 3 index (device_id, horodatage, anti-duplication)
    - Le connection pool `SimpleConnectionPool` évite d'ouvrir/fermer des connexions à chaque requête
    - Voir le [journal — Connection pooling](../journal/connection-pooling.md) et [Stratégie migrations](../journal/migrations-strategy.md)

---

## Query Optimization Example

**Slow query** :
```sql
SELECT users.name, COUNT(orders.id)
FROM users
LEFT JOIN orders ON users.id = orders.user_id
GROUP BY users.id;
```sql

**Fast query** :
```sql
SELECT users.name, COUNT(orders.id)
FROM users
LEFT JOIN orders ON users.id = orders.user_id
GROUP BY users.id
HAVING COUNT(orders.id) > 0;
```http

Ajout `HAVING` évite 0 count rows inutiles

---

## Summary : ExploreIOT Data Flow

```text
1. Frontend POST /api/mesures
   → FastAPI endpoint
   → get_db() récupère connexion du pool
   → SQLAlchemy INSERT
   → PostgreSQL écrit à disk
   → Retour 201 Created

2. Frontend GET /api/mesures
   → FastAPI endpoint
   → DB SELECT * LIMIT 10 (avec index timestamp)
   → Retour JSON
   → Connexion retournée au pool

3. WebSocket /ws broadcast
   → Backend SELECT dernière mesure (index rapide)
   → Broadcast JSON à tous clients
   → Requête tous les 1s
```text

---

## Resources

- **PostgreSQL docs** : https://www.postgresql.org/docs/
- **SQLAlchemy ORM** : https://docs.sqlalchemy.org/
- **EXPLAIN ANALYZE tool** : https://www.depesz.com/
- **Index strategy** : https://use-the-index-luke.com/
