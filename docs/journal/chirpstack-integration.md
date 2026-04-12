# Intégration Chirpstack v4

## Le problème

`publisher.py` simule un serveur de réseau Chirpstack en publiant directement des messages MQTT avec la structure JSON appropriée. Mais simule n'est pas prouver : on ne sait pas si le backend peut vraiment traiter les messages d'un **vrai** Chirpstack v4 en production, avec sa base de données propriétaire, son authentification gRPC, et ses broker MQTT réels.

Le défi : démontrer que l'intégration fonctionne end-to-end en démarrant Chirpstack comme service Docker avec profil Compose, en provisionner les appareils via l'API gRPC, puis en recevant les uplinks MQTT sans modifier le code du subscriber.

## Ce que j'ai appris

### Docker Compose profiles

Docker Compose permet de regrouper les services en **profils**, et de n'en démarrer que certains avec le flag `--profile` :

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    # Service de base, toujours inclus

  chirpstack:
    image: chirpstack/chirpstack:4
    profiles: ["chirpstack"]  # Optionnel — inclus seulement avec --profile chirpstack
    depends_on:
      - postgres
      - redis

  mosquitto:
    image: eclipse-mosquitto:2
    # Service de base, toujours inclus
```

Démarrage :

```bash
# Démarrer sans Chirpstack (mode simulation avec publisher.py)
docker-compose up

# Démarrer avec Chirpstack
docker-compose --profile chirpstack up
```

### Architecture Chirpstack v4

Chirpstack v4 repose sur trois composants interconnectés :

**PostgreSQL (base de données Chirpstack)**
- Schéma distinct de `exploreiot` — Chirpstack gère ses propres tables (applications, devices, etc.)
- Initialisé via migrations Chirpstack lors du premier démarrage
- Port recommandé : `5432` (exposé en `5435` sur l'hôte pour ne pas conflictuer)

**Redis (cache et broker de messages internes)**
- Utilisé par Chirpstack pour le cache et la communication inter-processus
- Port standard : `6379`
- Pas besoin de persistance disque

**gRPC API (provisionnement)**
- Port standard : `8080`
- Utilisée pour créer/modifier les applications et appareils LoRaWAN
- Authentification par `api_token` dans le header

**MQTT Broker (publication des uplinks)**
- Chirpstack publie les uplinks reçus des passerelles LoRa sur des topics MQTT
- Port standard : `1883` (partagé avec Mosquitto)
- Format de topic : `application/{app_id}/device/{device_id}/event/up`

### Configuration Chirpstack : `chirpstack.toml`

La clé de configuration détermine le comportement de Chirpstack :

```toml
# General
# Regional configuration (defines the LoRaWAN region)
region_name = "EU868"

# gRPC API
[grpc]
bind = "0.0.0.0:8080"

# MQTT broker — connexion à Mosquitto (ou au broker interne)
[mqtt]
broker = "mosquitto:1883"
topic_prefix = ""

# PostgreSQL — pointant vers le service postgres Docker
[postgresql]
dsn = "postgres://chirpstack:chirpstack@postgres:5432/chirpstack?sslmode=disable"

# Redis
[redis]
servers = ["redis:6379"]

# Logging
[logging]
level = "info"
```

### API gRPC pour le provisionnement

Créer une application Chirpstack :

```python
import grpc
from chirpstack_api import api

# Connexion au service gRPC
channel = grpc.insecure_channel("localhost:8080")
stub = api.ApplicationServiceStub(channel)

# Créer une application
application = api.Application(
    name="ExploreIOT Demo",
    description="Application de démonstration"
)

# Envoyer la requête (nécessite l'authentification par token)
metadata = [("authorization", "Bearer YOUR_API_TOKEN")]
response = stub.Create(application, metadata=metadata)
print(f"Created application: {response.id}")
```

Enregistrer un capteur (device) :

```python
device = api.Device(
    application_id=app_id,
    name="Capteur Bureau 1",
    description="SHT31 LoRa",
    dev_eui="a1b2c3d4e5f60001",  # Clé 16 hex
    device_profile_id=profile_id,
    skip_fcnt_check=False  # Recommandé : vérifier le compteur de trames
)

response = stub.Create(device, metadata=metadata)
print(f"Created device: {response.id}")
```

### Format des topics Chirpstack v4

Chirpstack v4 publie les uplinks sur des topics au format :

```text
application/{app_id}/device/{device_id}/event/up
```

Le payload JSON contient les données décodées dans le champ `object` (pré-décodé par le codec Chirpstack) et le payload binaire brut en base64 dans le champ `data`. Le subscriber utilise `object` en priorité, avec fallback sur le décodage base64.

## Code concret

### Extrait `docker-compose.yml` avec profil Chirpstack

```yaml
version: '3.8'

services:
  # Base de données pour ExploreIOT
  postgres-exploreiot:
    image: postgres:15
    container_name: postgres-exploreiot
    environment:
      POSTGRES_DB: exploreiot
      POSTGRES_USER: exploreiot
      POSTGRES_PASSWORD: exploreiot_dev
    ports:
      - "5434:5432"
    volumes:
      - postgres-exploreiot-data:/var/lib/postgresql/data

  # Redis global (shared)
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"

  # Mosquitto MQTT Broker
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: mosquitto
    ports:
      - "1883:1883"
    volumes:
      - ./docker/mosquitto/config:/mosquitto/config
      - mosquitto-data:/mosquitto/data

  # Chirpstack — optionnel, profil chirpstack
  postgres-chirpstack:
    image: postgres:15
    container_name: postgres-chirpstack
    profiles: ["chirpstack"]
    environment:
      POSTGRES_DB: chirpstack
      POSTGRES_USER: chirpstack
      POSTGRES_PASSWORD: chirpstack_dev
    ports:
      - "5435:5432"
    volumes:
      - postgres-chirpstack-data:/var/lib/postgresql/data

  chirpstack:
    image: chirpstack/chirpstack:4
    container_name: chirpstack
    profiles: ["chirpstack"]
    environment:
      CHIRPSTACK_CONFIG_DIR: /etc/chirpstack
    ports:
      - "8080:8080"  # gRPC API
      - "8090:8090"  # HTTP API
    volumes:
      - ./docker/chirpstack/chirpstack.toml:/etc/chirpstack/chirpstack.toml
    depends_on:
      - postgres-chirpstack
      - redis
      - mosquitto

  # Backend FastAPI ExploreIOT
  backend:
    build: ./backend
    container_name: backend
    environment:
      DB_HOST: postgres-exploreiot
      DB_PORT: 5432
      DB_NAME: exploreiot
      DB_USER: exploreiot
      DB_PASSWORD: exploreiot_dev
      MQTT_HOST: mosquitto
      MQTT_PORT: 1883
      MQTT_TOPIC: application/+/device/+/event/up
      CHIRPSTACK_ENABLED: "false"
    ports:
      - "8000:8000"
    depends_on:
      - postgres-exploreiot
      - mosquitto

volumes:
  postgres-exploreiot-data:
  postgres-chirpstack-data:
  mosquitto-data:
```

### Extrait `docker/chirpstack/chirpstack.toml`

```toml
[general]
log_level = "info"
log_format = "json"
region_name = "EU868"

[grpc]
bind = "0.0.0.0:8080"

[api]
bind = "0.0.0.0:8090"

[mqtt]
broker = "mosquitto:1883"
topic_prefix = ""

[postgresql]
dsn = "postgres://chirpstack:chirpstack_dev@postgres-chirpstack:5432/chirpstack?sslmode=disable"
max_open_connections = 16

[redis]
servers = ["redis:6379"]
```

### Vérification du provisionnement (CLI)

Utiliser `grpcurl` pour tester la connexion au gRPC sans écrire de code :

```bash
# Lister les applications (nécessite un token valide — peut être généré dans l'UI Chirpstack)
grpcurl -plaintext \
  -H "authorization: Bearer YOUR_API_TOKEN" \
  localhost:8080 \
  chirpstack.api.ApplicationService/List

# Créer une application
grpcurl -plaintext \
  -H "authorization: Bearer YOUR_API_TOKEN" \
  -d '{"name": "Demo", "description": "Test"}' \
  localhost:8080 \
  chirpstack.api.ApplicationService/Create
```

## Piège à éviter

### Chirpstack utilise sa propre base de données

Chirpstack **ne peut pas** partager la base PostgreSQL d'ExploreIOT. Son schéma est très différent et contient des tables Chirpstack spécifiques (`devices`, `device_profiles`, `gateways`, etc.).

Erreur typique : pointer `chirpstack.toml` vers `postgres-exploreiot:5434` et laisser Chirpstack effectuer les migrations. Cela va polluer la base ExploreIOT et créer des conflits de schéma.

**Solution** : Utiliser une **deuxième instance PostgreSQL dédiée** (`postgres-chirpstack`) et laisser Chirpstack effectuer ses migrations dans sa base propre.

### Le topic MQTT doit correspondre exactement

Si le `topic_prefix` dans `chirpstack.toml` est vide (ce qui est correct), Chirpstack publie sur :
```text
application/{app_id}/device/{device_id}/event/up
```

Si le subscriber s'abonne à un mauvais topic, il ne recevra rien.

**Solution** : S'assurer que `MQTT_TOPIC` dans `.env` correspond au format réel de Chirpstack, ou adapter `topic_prefix` dans `chirpstack.toml` pour les deux côtés.

### gRPC requiert une authentification valide

La plupart des opérations gRPC (Create, Update, Delete) nécessitent un token API valide. Sans token ou avec un token expiré, les requêtes échouent avec une erreur `UNAUTHENTICATED`.

**Solution** : Générer un token via l'interface web Chirpstack (Section **Users > Tokens**) et le passer dans le header `authorization: Bearer YOUR_TOKEN`.

## Ressources

- [Chirpstack v4 — Documentation officielle](https://www.chirpstack.io/docs/)
- [Docker Compose — Documentation des profils](https://docs.docker.com/compose/profiles/)
- [Chirpstack gRPC API — Définition proto3](https://github.com/brocaar/chirpstack/tree/main/api)
- [Mosquitto MQTT Broker — Configuration](https://mosquitto.org/man/mosquitto-conf-5.html)
