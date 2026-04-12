# Diagramme C4 — Niveau 3 : Composants FastAPI

Vue détaillée des composants internes du conteneur FastAPI.

```mermaid
graph TB
    subgraph FastAPI["FastAPI (app/)"]
        MAIN["main.py<br/><i>Entrypoint, lifespan,<br/>middleware, WS endpoint</i>"]

        subgraph Middleware["Middleware"]
            AUDIT["audit.py<br/><i>Log chaque requête</i>"]
            CORS["CORSMiddleware<br/><i>Origins autorisés</i>"]
            RATE["SlowAPIMiddleware<br/><i>Rate limiting</i>"]
        end

        subgraph Routes["Routes"]
            HEALTH["health.py<br/><i>GET / , GET /health</i>"]
            DEVICES["devices.py<br/><i>GET /devices<br/>GET /devices/{id}/metrics</i>"]
            ALERTS["alerts.py<br/><i>GET /alerts</i>"]
            STATS["stats.py<br/><i>GET /stats</i>"]
        end

        subgraph Core["Core"]
            CONFIG["config.py<br/><i>Variables d'environnement</i>"]
            DB["database.py<br/><i>Pool psycopg2<br/>get_conn()</i>"]
            SEC["security.py<br/><i>verify_api_key()<br/>hmac timing-safe</i>"]
            WS["websocket.py<br/><i>ConnectionManager<br/>broadcast()</i>"]
            MQTT["mqtt_handler.py<br/><i>Client MQTT interne<br/>bridge asyncio</i>"]
            CODEC["payload_codec.py<br/><i>Encode/decode<br/>LoRaWAN binaire</i>"]
            LOG["logging_config.py<br/><i>Format structuré</i>"]
            RL["rate_limit.py<br/><i>Limiter instance</i>"]
        end
    end

    MAIN --> Routes
    MAIN --> Middleware
    MAIN --> WS
    MAIN --> MQTT
    Routes --> DB
    Routes --> SEC
    Routes --> RL
    MQTT --> WS
    MQTT --> CODEC

    style MAIN fill:#009688,color:#fff
    style DB fill:#336791,color:#fff
    style WS fill:#4CAF50,color:#fff
    style MQTT fill:#3C1053,color:#fff
    style SEC fill:#F44336,color:#fff
    style CODEC fill:#FF9800,color:#fff
```

## Responsabilités

| Composant | Responsabilité principale |
|-----------|--------------------------|
| `main.py` | Point d'entrée Uvicorn, enregistre les routeurs, configure le cycle de vie (MQTT au démarrage), définit l'endpoint WebSocket `/ws` |
| `config.py` | Source unique de configuration via `os.environ.get()` — DB, MQTT, alertes, sécurité, limites |
| `database.py` | Pool de connexions `SimpleConnectionPool` (min 2, max 10), context manager `get_conn()` |
| `security.py` | Dependency FastAPI `verify_api_key()` — comparaison timing-safe `hmac.compare_digest`, retourne 401 |
| `websocket.py` | `ConnectionManager` — cap configurable (`MAX_WS_CONNECTIONS`), broadcast thread-safe avec verrou asyncio |
| `mqtt_handler.py` | Client paho-mqtt dans un thread dédié, valide les plages physiques, bridge vers la boucle asyncio |
| `payload_codec.py` | Codec unifié — `encode_payload()`, `decode_payload()`, `decode_chirpstack_payload()`, `validate_device_id()` |
| `audit.py` | Middleware ASGI — log méthode, path, status code et durée pour chaque requête |
