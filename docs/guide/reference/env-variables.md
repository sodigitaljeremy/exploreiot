# Variables d'environnement

Référence complète de toutes les variables d'environnement utilisées par ExploreIOT.

Le fichier `.env` à la racine du projet est chargé automatiquement par Docker Compose. Copiez `.env.example` pour commencer :

```bash
cp .env.example .env
```

---

## Tableau de référence complet

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DB_HOST` | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_NAME` | `exploreiot` | Nom de la base de données |
| `DB_USER` | `exploreiot` | Utilisateur de la base de données |
| `DB_PASSWORD` | `change_me_in_production` | Mot de passe de la base de données |
| `DB_POOL_MIN` | `2` | Nombre minimum de connexions dans le pool |
| `DB_POOL_MAX` | `10` | Nombre maximum de connexions dans le pool |
| `DB_STATEMENT_TIMEOUT` | `30000` | Timeout des requetes PostgreSQL (ms) |
| `ENVIRONMENT` | `development` | Mode de deploiement — 'production' exige que API_KEY soit defini |
| `MQTT_HOST` | `localhost` | Hôte du broker MQTT (Mosquitto) |
| `MQTT_PORT` | `1883` | Port du broker MQTT |
| `MQTT_TOPIC` | `application/+/device/+/event/up` | Topic MQTT Chirpstack v4 avec wildcards |
| `MQTT_USER` | *(vide)* | Nom d'utilisateur MQTT (optionnel) |
| `MQTT_PASSWORD` | *(vide)* | Mot de passe MQTT (optionnel) |
| `MQTT_TLS` | *(vide)* | Active le chiffrement TLS pour la connexion MQTT. Valeurs acceptées : `1`, `true`, `yes` |
| `MQTT_CA_CERTS` | *(vide)* | Chemin vers le fichier de certificats CA pour la vérification TLS MQTT |
| `PUBLISH_INTERVAL` | `5` | Intervalle en secondes entre les publications du simulateur |
| `SUBSCRIBER_MAX_RETRIES` | `10` | Nombre max de tentatives de reconnexion MQTT |
| `SUBSCRIBER_BASE_DELAY` | `2` | Delai de base en secondes pour le backoff exponentiel |
| `API_KEY` | *(vide)* | Clé d'API — si vide, l'authentification est désactivée |
| `NEXT_PUBLIC_API_KEY` | *(vide)* | Clé API exposée au navigateur pour l'authentification WebSocket côté client |
| `CORS_ORIGIN` | `http://localhost:3000` | Origines CORS autorisées (séparées par des virgules) |
| `ALERT_TEMP_THRESHOLD` | `33` | Seuil de température en °C déclenchant une alerte |
| `ALERT_SILENCE_MINUTES` | `10` | Durée en minutes sans mesure avant alerte capteur silencieux |
| `MAX_WS_CONNECTIONS` | `50` | Nombre maximum de connexions WebSocket simultanées |
| `RATE_LIMIT_DEFAULT` | `30/minute` | Limite de requêtes par défaut (format slowapi) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL de l'API REST, exposée au navigateur |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000/ws` | URL WebSocket, exposée au navigateur |
| `CHIRPSTACK_ENABLED` | `false` | Active le mode Chirpstack v4 (avec profil Docker) |
| `CHIRPSTACK_API_URL` | `localhost:8080` | URL de l'API gRPC Chirpstack |
| `CHIRPSTACK_API_KEY` | *(vide)* | Clé d'API Chirpstack pour le provisionnement |

---

## Variables de développement

En développement local, les valeurs par défaut sont conçues pour fonctionner immédiatement sans configuration supplémentaire. Le fichier `.env` minimal pour démarrer :

```dotenv
# Base de données
DB_HOST=postgres
DB_PORT=5432
DB_NAME=exploreiot
DB_USER=exploreiot
DB_PASSWORD=exploreiot_dev

# MQTT
MQTT_HOST=mosquitto
MQTT_PORT=1883
MQTT_TOPIC=application/+/device/+/event/up

# API — pas d'authentification en développement
API_KEY=

# CORS — autoriser le frontend local
CORS_ORIGIN=http://localhost:3000

# Alertes
ALERT_TEMP_THRESHOLD=33
ALERT_SILENCE_MINUTES=10

# WebSocket
MAX_WS_CONNECTIONS=50
RATE_LIMIT_DEFAULT=30/minute

# Frontend (variables NEXT_PUBLIC_ exposées côté navigateur)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

> **Note** : Dans `docker-compose.yml`, le `DB_HOST` doit être `postgres` (nom du service Docker) et non `localhost`.

---

## Variables de production

En production, plusieurs variables doivent obligatoirement être modifiées :

```dotenv
# Base de données — mot de passe fort
DB_HOST=postgres
DB_PORT=5432
DB_NAME=exploreiot
DB_USER=exploreiot
DB_PASSWORD=Un_Mot_De_Passe_Tres_Fort_2024!

# Pool de connexions — adapter à la charge
DB_POOL_MIN=5
DB_POOL_MAX=20

# MQTT — activer l'authentification
MQTT_HOST=mosquitto
MQTT_PORT=1883
MQTT_TOPIC=application/+/device/+/event/up
MQTT_USER=mqtt_user
MQTT_PASSWORD=mqtt_password_fort

# MQTT TLS (optionnel)
MQTT_TLS=true
MQTT_CA_CERTS=/path/to/ca.crt

# API — activer l'authentification
API_KEY=generee_avec_openssl_rand_hex_32

# CORS — restreindre à votre domaine
CORS_ORIGIN=https://mondomaine.com,https://www.mondomaine.com

# Alertes — adapter à votre contexte
ALERT_TEMP_THRESHOLD=30
ALERT_SILENCE_MINUTES=5

# WebSocket — limiter selon la charge serveur
MAX_WS_CONNECTIONS=100
RATE_LIMIT_DEFAULT=60/minute

# Frontend — URLs publiques
NEXT_PUBLIC_API_URL=https://api.mondomaine.com
NEXT_PUBLIC_WS_URL=wss://api.mondomaine.com/ws
```

Pour générer une `API_KEY` sécurisée :

```bash
openssl rand -hex 32
```

---

## Sécurité

### Variables sensibles

Les variables suivantes contiennent des secrets et ne doivent **jamais** être committées dans le dépôt Git :

- `DB_PASSWORD` — mot de passe de la base de données
- `API_KEY` — clé d'authentification de l'API
- `MQTT_PASSWORD` — mot de passe du broker MQTT
- `MQTT_TLS` — activation du chiffrement TLS
- `MQTT_CA_CERTS` — chemin vers le fichier de certificats CA

Assurez-vous que `.env` est bien présent dans `.gitignore` :

```bash
grep ".env" .gitignore
# Doit afficher : .env
```

### Variables NEXT_PUBLIC_

Les variables préfixées `NEXT_PUBLIC_` sont **embarquées dans le bundle JavaScript** du frontend lors du build. Elles sont donc visibles par tout utilisateur qui inspecte le code source de la page.

Ne jamais mettre de secrets (clés API, mots de passe) dans des variables `NEXT_PUBLIC_`.

### CORS en production

En production, `CORS_ORIGIN` doit lister uniquement les domaines légitimes de votre application. Une valeur trop permissive (`*`) expose votre API à des requêtes cross-origin non désirées.

```dotenv
# Correct — restreint aux domaines de confiance
CORS_ORIGIN=https://mondomaine.com

# A éviter en production
CORS_ORIGIN=*
```

### Rate limiting

`RATE_LIMIT_DEFAULT` utilise la syntaxe de la bibliothèque [slowapi](https://github.com/laurentS/slowapi) :

- `30/minute` — 30 requêtes par minute par IP
- `100/hour` — 100 requêtes par heure par IP
- `1000/day` — 1000 requêtes par jour par IP

Adaptez cette valeur selon votre contexte de déploiement et le nombre de clients prévus.

### Validation des identifiants

L'application applique des validations strictes pour les identifiants en startup :

- **MQTT_USER sans MQTT_PASSWORD** : lève une `RuntimeError` au démarrage du backend. Si vous activez l'authentification MQTT, vous devez fournir les deux variables.

- **Mots de passe par défaut en production** : en mode `ENVIRONMENT=production`, les mots de passe par défaut pour la base de données et MQTT sont rejetés. Vous devez les remplacer par des valeurs sécurisées.

Exemple d'erreur si `MQTT_USER=mqtt_user` mais `MQTT_PASSWORD` est vide :

```text
RuntimeError: MQTT_USER specified but MQTT_PASSWORD is empty
```
