# Diagramme C4 — Niveau 2 : Conteneurs

Le diagramme de conteneurs montre les 6 services déployés et leurs protocoles de communication.

```mermaid
graph TB
    TECH["👤 Technicien IoT"]

    subgraph Docker["Docker Compose"]
        subgraph Frontend["Frontend"]
            WEB["🌐 Next.js<br/><i>Dashboard React<br/>:3000</i>"]
        end

        subgraph BackendGroup["Backend Python"]
            API["⚡ FastAPI<br/><i>API REST + WebSocket<br/>:8000</i>"]
            SUB["📥 Subscriber<br/><i>MQTT → PostgreSQL<br/>Worker Python</i>"]
            PUB["📤 Publisher<br/><i>Simulateur capteurs<br/>Worker Python</i>"]
        end

        subgraph Infra["Infrastructure"]
            MQ["📨 Mosquitto<br/><i>Broker MQTT<br/>:1883</i>"]
            PG["🗄️ PostgreSQL<br/><i>Base de données<br/>:5432</i>"]
        end

        subgraph ChirpstackProfile["Chirpstack (profil optionnel)"]
            CS["⚙️ Chirpstack v4<br/><i>:8080</i>"]
            REDIS["💾 Redis<br/><i>:6379</i>"]
        end
    end

    TECH -->|"HTTP / WS"| WEB
    WEB -->|"REST JSON<br/>WebSocket"| API
    API -->|"SQL<br/>(psycopg2 pool)"| PG
    SUB -->|"Subscribe<br/>QoS 1"| MQ
    SUB -->|"INSERT"| PG
    SUB -->|"asyncio bridge<br/>broadcast()"| API
    PUB -->|"Publish<br/>QoS 1"| MQ
    CS -->|"Publish"| MQ
    CS -->|"Cache"| REDIS

    style WEB fill:#000,color:#fff
    style API fill:#009688,color:#fff
    style SUB fill:#009688,color:#fff
    style PUB fill:#009688,color:#fff
    style MQ fill:#3C1053,color:#fff
    style PG fill:#336791,color:#fff
    style CS fill:#FF6B3E,color:#fff
    style REDIS fill:#DC382D,color:#fff
```

## Catalogue des conteneurs

| Conteneur | Technologie | Port | Rôle |
|-----------|-------------|------|------|
| **Next.js** | React 19, TypeScript | 3000 | Dashboard temps réel + Convertisseur LoRaWAN |
| **FastAPI** | Python, Uvicorn | 8000 | API REST, WebSocket, health check |
| **Subscriber** | Python, paho-mqtt | — | Écoute MQTT, décode, insère en DB |
| **Publisher** | Python, paho-mqtt | — | Simule capteurs Chirpstack v4 |
| **Mosquitto** | Eclipse Mosquitto 2 | 1883 | Broker MQTT publish/subscribe |
| **PostgreSQL** | PostgreSQL 15 | 5432 | Stockage mesures, alertes |
| **Chirpstack** | Chirpstack v4 | 8080 | Serveur réseau LoRaWAN (optionnel) |
| **Redis** | Redis 7 | 6379 | Cache Chirpstack (optionnel) |
