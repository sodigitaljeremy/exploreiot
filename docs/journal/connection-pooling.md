# Connection pooling

## Le problème

Dans la premiere version d'ExploreIOT, chaque requete API ouvrait une nouvelle connexion PostgreSQL :

```python
@app.get("/api/sensors")
async def get_sensors():
    conn = psycopg2.connect(DATABASE_URL)  # Nouvelle connexion a chaque requete
    cur  = conn.cursor()
    cur.execute("SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 100")
    data = cur.fetchall()
    conn.close()
    return data
```

En charge, le tableau de bord effectuait 20 requetes par seconde. Chaque connexion PostgreSQL implique :
- Une negociation TCP (~1 ms)
- Une authentification (~5 ms)
- L'allocation de ressources cote serveur (~50 ms total)

Resultat : 20 x 50 ms = 1 seconde de latence ajoutee par seconde, et PostgreSQL atteint sa limite de connexions simultanees (par defaut 100) sous charge moderee.

## Ce que j'ai appris

### Le concept de pool de connexions

Un **pool de connexions** pre-etablit un ensemble de connexions au demarrage et les reutilise pour chaque requete. La connexion est "empruntee" pour la duree de la requete, puis rendue au pool.

Analogie : un pool de connexions, c'est comme un parking de voitures de location. Au lieu de construire une voiture neuve pour chaque client (couteux), on maintient une flotte de voitures disponibles. Un client prend une voiture, l'utilise, et la rend — la prochaine client la reutilise immediatement.

### `SimpleConnectionPool` de psycopg2

psycopg2 fournit `SimpleConnectionPool` (mono-thread) et `ThreadedConnectionPool` (multi-thread). Pour FastAPI avec des workers synchrones, `SimpleConnectionPool` suffit. Pour un usage avec `asyncpg`, il existe des pools natifs async.

Parametres cles :
- `minconn` : connexions ouvertes au demarrage (toujours disponibles)
- `maxconn` : limite maximale (au-dela, `getconn()` leve une exception)

### Le pattern context manager pour la restitution

Le risque principal du pooling est d'oublier de rendre la connexion. Un `context manager` (`with` statement) garantit que la connexion est toujours restituee, meme en cas d'exception.

## Code concret (extrait du projet)

### `database.py`

```python
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
import os

# Variable module-level : le pool est cree une seule fois
_pool: pool.SimpleConnectionPool | None = None

def get_pool() -> pool.SimpleConnectionPool:
    """
    Retourne le pool global, en le creant si necessaire (lazy init).
    minconn=2 : 2 connexions toujours ouvertes
    maxconn=10 : jamais plus de 10 connexions simultanees
    """
    global _pool
    if _pool is None:
        _pool = pool.SimpleConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=os.environ.get("DATABASE_URL", "postgresql://user:pass@localhost/exploreiot")
        )
    return _pool

@contextmanager
def get_conn():
    """
    Context manager qui emprunte une connexion au pool et la restitue
    automatiquement, meme en cas d'exception.

    Usage :
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(...)
    """
    connection = get_pool().getconn()
    try:
        yield connection
        connection.commit()        # Commit si tout s'est bien passe
    except Exception:
        connection.rollback()      # Rollback en cas d'erreur
        raise
    finally:
        get_pool().putconn(connection)  # Toujours restituer au pool


def close_pool() -> None:
    """Ferme toutes les connexions du pool. A appeler a l'arret de l'application."""
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None
```

### Utilisation dans `main.py`

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import get_conn, close_pool

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise le pool au demarrage, le ferme a l'arret."""
    get_pool()          # Cree le pool et ouvre minconn connexions
    yield
    close_pool()        # Ferme proprement toutes les connexions

app = FastAPI(lifespan=lifespan)

@app.get("/api/sensors")
def get_sensors():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT device_id, temperature, humidite, timestamp "
                "FROM sensor_data ORDER BY timestamp DESC LIMIT 100"
            )
            rows = cur.fetchall()
    return [
        {"device_id": r[0], "temperature": r[1], "humidite": r[2], "timestamp": r[3]}
        for r in rows
    ]
```

## Piège a eviter

### Ne pas restituer la connexion (pool exhaustion)

Si une connexion n'est pas rendue au pool (oubli de `putconn`, exception non geree), elle est "perdue". Apres `maxconn` requetes concurrentes bloquees, le pool est epuise et toutes les nouvelles requetes echouent avec `PoolError: connection pool exhausted`.

Le context manager `get_conn()` rend cela impossible : `finally` s'execute toujours.

```python
# FAUX — la connexion n'est JAMAIS restituee si cur.execute leve une exception
conn = get_pool().getconn()
cur  = conn.cursor()
cur.execute("SELECT ...")   # <- si exception ici, putconn n'est jamais appele
get_pool().putconn(conn)

# CORRECT — le context manager garantit la restitution
with get_conn() as conn:
    cur.execute("SELECT ...")  # Exception ? putconn appele quand meme via finally
```

### Pool trop petit sous charge

Avec `maxconn=2` et 10 requetes concurrentes, 8 requetes attendent. Si `getconn()` est appele avec un timeout nul (comportement par defaut), il leve immediatement une exception plutot que d'attendre. Dimensionner le pool en fonction du nombre de workers et du temps moyen de requete.

Regle empirique : `maxconn` = nombre de workers applicatifs x 2, sans depasser `max_connections` de PostgreSQL (verifiable avec `SHOW max_connections;`).

### Oublier de fermer le pool a l'arret

Sans `closeall()`, les connexions restent ouvertes cote PostgreSQL jusqu'au timeout (par defaut `idle_in_transaction_session_timeout`). En environnement Docker avec redemarrages frequents, cela peut provoquer le message `FATAL: sorry, too many clients already` au redemarrage suivant.

## Ressources

- [psycopg2 — Connection Pool](https://www.psycopg.org/docs/pool.html)
- [PostgreSQL — Connection and Authentication](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PgBouncer — pooler de connexions dedie pour la production](https://www.pgbouncer.org/)
