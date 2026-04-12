# Section 8 — Concepts transversaux

Ce chapitre documente les préoccupations techniques qui traversent plusieurs composants du système ExploreIOT. Ces concepts ne sont pas localisés dans un seul module mais influencent la conception de l'ensemble du backend.

---

## 8.1 Sécurité

### Authentification par clé API

Les endpoints sensibles (écriture, lecture des données capteurs) sont protégés par une clé API transmise via l'en-tête HTTP `X-API-Key`. La vérification est centralisée dans `backend/app/security.py`.

```python
async def verify_api_key(x_api_key: str = Header(...)):
    if not hmac.compare_digest(x_api_key, settings.API_KEY):
        raise HTTPException(status_code=403, detail="Forbidden")
```

### Comparaison timing-safe (`hmac.compare_digest`)

L'opérateur `==` en Python court-circuite la comparaison dès la première différence, ce qui laisse fuir de l'information temporelle à un attaquant (timing attack). `hmac.compare_digest()` garantit un temps de comparaison constant quelle que soit la position de la première différence. Voir ADR-001.

### Authentification WebSocket

Les connexions WebSocket ne supportent pas l'en-tête `X-API-Key` de façon native dans les navigateurs. L'authentification est assurée via le paramètre de requête `?token=` lors de l'ouverture de la connexion :

```text
ws://localhost:8000/ws/measurements?token=<API_KEY>
```

Le token est vérifié par `hmac.compare_digest()` dès la connexion établie. Toute connexion sans token valide est immédiatement fermée.

### CORS restrictif

La politique CORS n'autorise que l'origine du frontend en développement local (`http://localhost:3000`). En production, la variable `CORS_ORIGINS` doit être mise à jour avec le domaine réel. Aucune wildcard (`*`) n'est utilisée.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["X-API-Key", "Content-Type"],
)
```

### Rate limiting (slowapi)

Le rate limiting est appliqué sur tous les endpoints via la bibliothèque `slowapi`, qui s'intègre nativement à FastAPI. La limite par défaut est configurable via `RATE_LIMIT_DEFAULT` (valeur par défaut : 30 requêtes par minute par adresse IP).

```python
limiter = Limiter(key_func=get_remote_address)

@app.get("/measurements")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def get_measurements(request: Request, ...):
    ...
```

Les endpoints de santé (`/health`, `/`) sont exemptés du rate limiting pour ne pas perturber les healthchecks Docker.

### Conteneurs non-root

Tous les `Dockerfile` du projet définissent un utilisateur non-root avant l'instruction `CMD` :

```dockerfile
RUN adduser --disabled-password --no-create-home appuser
USER appuser
```

Cela réduit la surface d'attaque en cas de compromission d'un conteneur.

---

## 8.2 Logging

### Format structuré

Tous les messages de log suivent un format uniforme défini dans `backend/app/logging_config.py` :

```text
%(asctime)s | %(levelname)-8s | %(name)s | %(message)s
```

Exemple de sortie :

```text
2026-04-11 14:23:01,452 | INFO     | app.mqtt_handler | Mesure insérée: device_eui=A840416B61826265, temp=22.4
2026-04-11 14:23:05,801 | WARNING  | app.mqtt_handler | Valeur hors plage ignorée: temp=655.35
```

### Configuration centralisée

La fonction `setup_logging()` dans `logging_config.py` est appelée une seule fois au démarrage de chaque processus (API, subscriber, publisher). Elle configure le handler `StreamHandler(sys.stdout)` pour que les logs soient capturés par Docker et visibles via `docker compose logs`.

### Conventions

- Aucun `print()` dans le code applicatif — uniquement `logger.info()`, `logger.warning()`, `logger.error()`.
- Aucun emoji dans les messages de log — compatibilité garantie avec tous les terminaux et systèmes de collecte de logs.
- Le niveau par défaut est `INFO`. Il peut être abaissé à `DEBUG` via la variable `LOG_LEVEL`.

---

## 8.3 Gestion d'erreurs et résilience

### Reconnexion à la base de données (exponential backoff)

Le subscriber MQTT et l'API utilisent une stratégie de reconnexion à la base de données avec backoff exponentiel plafonné :

| Paramètre | Valeur |
|-----------|--------|
| Délai initial | 2 secondes |
| Facteur de croissance | 2× |
| Délai maximum | 30 secondes |
| Nombre de tentatives | 5 |

```python
for attempt in range(MAX_RETRIES):
    try:
        conn = get_connection()
        break
    except OperationalError:
        delay = min(BASE_DELAY * (2 ** attempt), MAX_DELAY)
        logger.warning(f"DB unavailable, retrying in {delay}s...")
        time.sleep(delay)
```

### Reconnexion MQTT automatique

Le client Paho MQTT est configuré avec `reconnect_delay_set(min_delay=1, max_delay=60)`. En cas de coupure réseau ou de redémarrage du broker, le client tente de se reconnecter avec un délai croissant (1 à 60 secondes) sans intervention manuelle.

### Nettoyage des connexions WebSocket mortes

Le manager WebSocket maintient un ensemble de connexions actives. Lors de chaque diffusion (`broadcast`), les connexions fermées (déconnexions réseau non détectées) sont pruned :

```python
async def broadcast(self, message: dict):
    dead = set()
    for connection in self.active_connections:
        try:
            await connection.send_json(message)
        except Exception:
            dead.add(connection)
    self.active_connections -= dead
```

### Validation des plages physiques (Dragino LHT65)

Avant toute insertion en base, chaque mesure est validée contre les spécifications constructeur du capteur Dragino LHT65 :

| Grandeur | Plage valide | Source |
|----------|-------------|--------|
| Température | -40 °C à +85 °C | Fiche technique Dragino LHT65 |
| Humidité relative | 0 % à 100 % | Fiche technique Dragino LHT65 |

Les mesures hors plage sont loggées au niveau `WARNING` et ignorées (non insérées). Elles ne font pas remonter d'erreur HTTP.

```text
if not (-40 <= temperature <= 85):
    logger.warning(f"Température hors plage: {temperature}°C — ignorée")
    return
if not (0 <= humidity <= 100):
    logger.warning(f"Humidité hors plage: {humidity}% — ignorée")
    return
```

---

## 8.4 Connection pooling

### Pool psycopg2 (`SimpleConnectionPool`)

L'API et le subscriber utilisent un pool de connexions psycopg2 pour éviter d'ouvrir une nouvelle connexion TCP à chaque requête :

| Paramètre | Valeur |
|-----------|--------|
| Connexions minimum | 2 |
| Connexions maximum | 10 |
| Timeout d'attente | défaut psycopg2 |

```python
pool = SimpleConnectionPool(
    minconn=2,
    maxconn=10,
    dsn=settings.DATABASE_URL,
)
```

### Context manager `get_conn()`

Un context manager garantit le retour automatique de la connexion au pool, même en cas d'exception :

```python
@contextmanager
def get_conn():
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)
```

### Connexion unique pour le subscriber

Le subscriber MQTT est un processus longue durée qui traite les messages de façon séquentielle. Il utilise une connexion persistante unique avec retry plutôt qu'un pool, ce qui simplifie la gestion de l'état et réduit la contention.

---

## 8.5 Rate limiting

### Configuration

Le rate limiting est géré par `slowapi`, une surcouche de `limits` pour FastAPI. La clé d'identification est l'adresse IP distante via `get_remote_address`.

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

### Limites par endpoint

La limite par défaut est définie par `RATE_LIMIT_DEFAULT` (ex : `"30/minute"`). Elle peut être surchargée par endpoint si nécessaire.

### Réponse en cas de dépassement

En cas de dépassement de la limite, `slowapi` retourne automatiquement une réponse HTTP `429 Too Many Requests` avec l'en-tête `Retry-After`.

### Exemptions

Les endpoints de santé sont exemptés pour éviter les faux positifs dans les healthchecks Docker Compose :

```python
@app.get("/health")
async def health():  # Pas de décorateur @limiter.limit(...)
    return {"status": "ok"}
```
