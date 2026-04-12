# Principes SOLID

## Le problème

Apres deux semaines de developpement rapide sur ExploreIOT, le fichier `main.py` avait atteint **520 lignes** et melangait tout :

- La configuration de l'application (variables d'environnement, CORS, logging)
- La logique de connexion a la base de donnees
- La verification des cles API
- Le client MQTT et le traitement des messages
- Les endpoints REST (`/api/sensors`, `/api/stats`, `/api/health`)
- Le gestionnaire WebSocket
- La configuration des logs

Ajouter la moindre fonctionnalite necessitait de lire 500 lignes pour comprendre le contexte. Un bug dans la logique MQTT pouvait affecter les endpoints HTTP. Les tests etaient impossibles sans demarrer toute l'application. Un collectionneur de code legacy l'aurait qualifie de **"big ball of mud"**.

## Ce que j'ai appris

### Single Responsibility Principle (SRP)

Le premier des cinq principes SOLID : **un module doit avoir une seule raison de changer**. Si le module de securite change (nouvelle politique d'authentification), seul `security.py` est impacte. Si le schema de base de donnees evolue, seul `database.py` change. Les autres modules ne sont pas touches.

Applique a ExploreIOT, SRP se traduit par : **une responsabilite = un fichier**.

### Separation par couche de responsabilite

Le refactoring a decoupage `main.py` en modules specialises :

| Fichier | Responsabilite unique |
|---------|----------------------|
| `config.py` | Lecture des variables d'environnement et valeurs par defaut |
| `database.py` | Pool de connexions et context manager |
| `security.py` | Verification des cles API |
| `mqtt_handler.py` | Client MQTT, callbacks, traitement des messages |
| `websocket.py` | ConnectionManager et endpoint WebSocket |
| `logging_config.py` | Configuration du logging (format, niveau, handlers) |
| `routes/sensors.py` | Endpoints `/api/sensors` |
| `routes/stats.py` | Endpoints `/api/stats` |
| `routes/health.py` | Endpoint `/api/health` |
| `main.py` | Orchestrateur : assemble les pieces, declare le lifespan |

### `main.py` comme orchestrateur slim

Apres refactoring, `main.py` ne fait qu'assembler les composants. Il ne contient aucune logique metier.

## Code concret (extrait du projet)

### Structure des fichiers apres refactoring

```text
backend/
├── main.py                 # Orchestrateur (< 50 lignes)
├── config.py               # Variables d'environnement
├── database.py             # Pool PostgreSQL
├── security.py             # Authentification API key
├── mqtt_handler.py         # Client MQTT
├── websocket.py            # ConnectionManager WebSocket
├── logging_config.py       # Configuration logging
└── routes/
    ├── __init__.py
    ├── sensors.py          # GET /api/sensors
    ├── stats.py            # GET /api/stats
    └── health.py           # GET /api/health
```

### `config.py` — une seule responsabilite : la configuration

```python
import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Config:
    """
    Toutes les valeurs de configuration en un seul endroit.
    frozen=True : immuable une fois cree, pas de mutation accidentelle.
    """
    database_url:   str
    api_secret_key: str
    mqtt_broker:    str
    mqtt_port:      int
    mqtt_topic:     str
    log_level:      str

def load_config() -> Config:
    """Charge la configuration depuis les variables d'environnement."""
    return Config(
        database_url   = os.environ["DATABASE_URL"],
        api_secret_key = os.environ["API_SECRET_KEY"],
        mqtt_broker    = os.environ.get("MQTT_BROKER", "localhost"),
        mqtt_port      = int(os.environ.get("MQTT_PORT", "1883")),
        mqtt_topic     = os.environ.get("MQTT_TOPIC", "capteurs/#"),
        log_level      = os.environ.get("LOG_LEVEL", "INFO"),
    )
```

### `main.py` apres refactoring — orchestrateur slim

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import load_config
from database import init_pool, close_pool
from mqtt_handler import start_mqtt, stop_mqtt
from logging_config import setup_logging
from routes import sensors, stats, health
from websocket import router as ws_router

config = load_config()
setup_logging(config.log_level)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Demarre et arrete les ressources dans le bon ordre."""
    init_pool(config.database_url)
    start_mqtt(config)
    yield
    stop_mqtt()
    close_pool()

app = FastAPI(title="ExploreIOT API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
)

# Enregistrement des routes — chaque router est defini dans son propre module
app.include_router(sensors.router, prefix="/api")
app.include_router(stats.router,   prefix="/api")
app.include_router(health.router,  prefix="/api")
app.include_router(ws_router)
```

### `routes/sensors.py` — endpoints uniquement

```python
from fastapi import APIRouter, Depends
from security import verify_api_key
from database import get_conn

router = APIRouter()

@router.get("/sensors")
def get_sensors(key: str = Depends(verify_api_key)):
    """Retourne les 100 dernieres mesures."""
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

### Sur-ingenierie : creer des abstractions pour du code a usage unique

SRP ne signifie pas "creer une classe pour tout". Si une fonction de 10 lignes fait une seule chose et n'a aucune raison d'etre reutilisee ou testee isolement, la laisser dans le module appelant est souvent plus lisible.

```python
# INUTILE — une classe pour encapsuler une seule fonction simple
class HealthChecker:
    def check(self) -> dict:
        return {"status": "ok"}

# SUFFISANT — une simple fonction
def check_health() -> dict:
    return {"status": "ok"}
```

### Decouper trop tot, avant de comprendre le domaine

Refactorer en modules distincts alors que le domaine n'est pas encore stabilise oblige a renommer et reorganiser constamment. Le conseil de Martin Fowler : **"Make it work, make it right, make it fast"** — dans cet ordre. Un `main.py` monolithique qui fonctionne vaut mieux qu'une architecture parfaite qui ne livre rien.

Dans ExploreIOT, le decoupage a ete fait apres que les fonctionnalites principales etaient stables et les interfaces entre composants clairement identifiees.

### Creer des imports circulaires en decoupant

Quand `database.py` importe `config.py` et que `config.py` importe `database.py`, Python leve une `ImportError`. La regle : les modules de bas niveau (config, logging) ne doivent importer aucun autre module du projet. Les modules de haut niveau (routes, main) importent les modules de bas niveau.

## Ressources

- [Clean Architecture — Robert C. Martin (Uncle Bob)](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/)
- [FastAPI — Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Martin Fowler — Refactoring](https://refactoring.guru/fr/refactoring)
- [SOLID Principles — Wikipedia](https://fr.wikipedia.org/wiki/SOLID_(informatique))
