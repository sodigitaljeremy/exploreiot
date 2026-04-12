# ExploreIOT Dashboard

![CI](https://github.com/exploreiot/dashboard-ui/actions/workflows/ci.yml/badge.svg)

Dashboard de supervision IoT LoRaWAN en temps reel — pipeline complet du capteur physique a l'interface web. Infrastructure securisee avec authentification, support TLS optionnel, tests exhaustifs (218+ tests), et conformité React 19.

## Fonctionnalites

- **Supervision temps reel** de 3 capteurs LoRaWAN simules (refresh 5s)
- **Graphiques** temperature + humidite (Recharts)
- **Alertes intelligentes** : temperature elevee, capteur silencieux (seuils configurables)
- **Convertisseur LoRaWAN** interactif : pipeline 6 etapes (valeur → binaire → hex → Base64)
- **Mode Mock / API** avec basculement automatique si l'API est injoignable
- **Health check** systeme avec indicateur visuel dans la navbar
- **Authentification API Key** optionnelle avec validation stricte
- **Pipeline MQTT complet** : publisher → Mosquitto → subscriber → PostgreSQL → API → Dashboard
- **Pipeline IoT interactif** : visualisation animee des 8 etapes du pipeline (Capteur → LoRaWAN → MQTT → Subscriber → PostgreSQL → API → WebSocket → Navigateur) avec 3 modes : Live, Pas a pas, Inspecteur de protocoles
- **Outils pedagogiques** : manipulateur de bits interactif, demo de corruption de donnees, visualisation de l'overhead protocolaire, encodage des temperatures negatives (complement a 2)
- **Inspecteur de protocoles** : visualisation en temps reel des trames MQTT, WebSocket et HTTP avec payloads Chirpstack v4 complets
- **Glossaire interactif** : 15 termes techniques (MQTT, Base64, big-endian, QoS, RSSI, SNR, etc.) avec tooltips contextuels dans toute l'interface
- **Panneau de statut des services** : tableau de bord temps reel des 5 services (API, PostgreSQL, MQTT, WebSocket, Publisher) avec latence et metriques
- **Script demo.sh** : lancement one-click de toute l'infrastructure backend (Docker + API + Publisher)
- **Support TLS optionnel pour MQTT** : activation via `MQTT_TLS=true` et `MQTT_CA_CERTS`
- **Indexes de performance** : tables optimisees pour requetes tempsreel (idx_mesures_recu_le, idx_mesures_device_recu, idx_mesures_device_id)
- **Tests exhaustifs** : 218+ tests (110 frontend Vitest + 108 backend pytest)
- **CI/CD automatise** : GitHub Actions avec Vitest + Tripy vulnerability scanning
- **Backup PostgreSQL** : script retention 30 jours (scripts/backup-db.sh)

## Architecture

```text
  publisher.py ──MQTT──▶ Mosquitto ──MQTT──▶ subscriber.py ──▶ PostgreSQL
                                                                    │
  Navigateur ◀── Next.js ◀── HTTP ──▶ api.py (FastAPI) ◀───────────┘
```

**App Client** (orchestrateur principal des vues) :

```tsx
{view === "dashboard" && <Dashboard />}
{view === "converter" && <Converter />}
{view === "pipeline" && <Pipeline />}
```

## Arborescence

```text
shared/                  # Constantes cross-cutting (frontend + backend)
  device-ids.json        # Source unique des IDs capteurs

components/
  atoms/                 # Atomic Design — composants de base
    Card.tsx             # Conteneur carte reutilisable (DRY: 13+ fichiers)
    StatusDot.tsx        # Indicateur de statut (vert/rouge/jaune)
  molecules/             # Composants composes
  dashboard/
    Dashboard.tsx        # Orchestrateur (delègue aux sous-composants, React.memo sur enfants)
    StatsCards.tsx       # 4 cartes statistiques (memo optimise)
    DeviceSelector.tsx   # Liste cliquable des capteurs (memo optimise)
    MetricsChart.tsx     # Graphique Recharts (memo optimise)
    AlertsPanel.tsx      # Panneau d'alertes (memo optimise)
    AlertSettings.tsx    # Configuration seuils (localStorage valide)
  converter/
    Converter.tsx        # Convertisseur LoRaWAN interactif
    DecoderTool.tsx      # Decodeur Base64 inverse
    BitManipulator.tsx   # Manipulateur de bits
    CorruptionDemo.tsx   # Demo corruption
    ProtocolOverhead.tsx # Overhead protocolaire
  pipeline/
    Pipeline.tsx         # Pipeline IoT 8 etapes
    ProtocolInspector.tsx# Inspecteur MQTT/WS/HTTP
  layout/
    NavBar.tsx           # Navigation
    DataModeToggle.tsx   # Toggle Mock/API
  shared/
    ConnectionStatus.tsx # Statut connexions services (API, DB, MQTT, WS) — RELOCATE FROM dashboard/
    ErrorBoundary.tsx    # Isolation d'erreurs de rendu
    Skeleton.tsx         # Placeholders de chargement
    ToastContainer.tsx   # Notifications toast
    Term.tsx             # Terme glossaire avec tooltip

hooks/                   # Custom hooks (DRY)
  useToasts.ts           # Gestion toasts
  useLocalStorage.ts     # localStorage type + valide
  usePolling.ts          # Polling a intervalle
  useWebSocket.ts        # WebSocket connection + reconnect + first-message auth
  useDataLoading.ts      # API avec fallback mock

lib/
  data-provider.tsx      # React Context (Mock vs API) + WebSocket
  device-registry.ts     # Importe depuis shared/device-ids.json
  api-client.ts          # Client HTTP type pour FastAPI
  pipeline-context.tsx   # Context Pipeline (modes live/step-by-step)
  types.ts               # Types TypeScript partages
  mock-store.ts          # Donnees mock
  exporters.ts           # CSV/PDF export avec sanitization
  lorawan.ts             # Utilitaires LoRaWAN

__tests__/               # Tests Vitest (110 tests)
  lib/                   # Tests unitaires lib/
    api-client.test.ts
    device-registry.test.ts
    mock-store.test.ts
  components/            # Tests composants
    Dashboard.test.tsx
    Converter.test.tsx

backend/
  app/
    models/              # Modeles domaine (dataclasses)
      mesure.py, device.py, alert.py
    repositories/        # Couche acces donnees (SQL)
      stats_repo.py, device_repo.py, alert_repo.py
    services/            # Logique metier
      mqtt_service.py    # Traitement messages MQTT
    utils/
      retry.py           # Backoff exponentiel partage (DRY)
    routes/              # Couche HTTP mince (delegation aux repos)
      health.py, devices.py, alerts.py, stats.py, debug.py
    errors.py            # Custom error hierarchy (AppError, NotFoundError, ValidationError)
    security_headers.py  # HTTP security headers middleware
    main.py, config.py, database.py, websocket.py, mqtt_handler.py
    security.py, payload_codec.py, rate_limit.py, audit.py
  subscriber.py          # MQTT → PostgreSQL worker (thread-safe)
  publisher.py           # Simulateur capteurs Chirpstack v4
  tests/                 # 108 tests (pytest)

docker/
  mosquitto/             # Broker MQTT (credentials via build args)
  init.sql               # Schema PostgreSQL avec indexes optimises

scripts/
  init-env.sh            # Generateur .env
  backup-db.sh           # PostgreSQL backup (retention 30j)

vitest.config.ts         # Configuration Vitest pour tests frontend
demo.sh                  # Lancement one-click backend
```

## Demarrage rapide

### Docker (recommande)

```bash
cp .env.example .env
docker compose up --build
# ou: npm run fullstack
```

- Dashboard : <http://localhost:3000>
- API Swagger : <http://localhost:8000/docs>
- API ReDoc : <http://localhost:8000/redoc>

### Developpement local (frontend seul, mode Mock)

```bash
npm install
npm run dev
# http://localhost:3000 (mode Mock par defaut)
```

### Lancement rapide du backend (demo.sh)

```bash
# Demarrage PostgreSQL, Mosquitto (Docker) + API + Publisher (local)
./demo.sh

# Dans un autre terminal : Frontend
npm run dev
# Cliquer sur "API" dans le toggle Mock/API du dashboard
```

### Developpement local (fullstack)

```bash
# Terminal 1 : Infrastructure
docker compose up postgres mosquitto

# Terminal 2 : Backend
cd backend && pip install -r requirements.txt
python subscriber.py &
python publisher.py &
uvicorn app.main:app --port 8000

# Terminal 3 : Frontend
npm run dev
```

## Variables d'environnement

| Variable | Description | Defaut |
|----------|-------------|--------|
| `DB_HOST` | Hote PostgreSQL | `postgres` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base | `exploreiot` |
| `DB_USER` | Utilisateur DB | `exploreiot` |
| `DB_PASSWORD` | Mot de passe DB | `change_me_in_production` |
| `MQTT_HOST` | Hote broker MQTT | `mosquitto` |
| `MQTT_PORT` | Port broker MQTT | `1883` |
| `MQTT_TLS` | Activer TLS pour MQTT | `false` |
| `MQTT_CA_CERTS` | Chemin vers CA certs (si MQTT_TLS=true) | `` |
| `MQTT_USER` | Utilisateur MQTT (optionnel) | `` |
| `MQTT_PASSWORD` | Mot de passe MQTT (requis si MQTT_USER est defini) | `` |
| `NEXT_PUBLIC_API_URL` | URL API vue par le navigateur | `http://localhost:8000` |
| `ALERT_TEMP_THRESHOLD` | Seuil alerte temperature (°C) | `33` |
| `ALERT_SILENCE_MINUTES` | Seuil capteur silencieux (min) | `10` |
| `API_KEY` | Cle API backend (vide = pas d'auth) | `` |
| `NEXT_PUBLIC_API_KEY` | Cle API frontend | `` |
| `ENVIRONMENT` | Mode deploiement (production/development) | `development` |

**Validation au demarrage** : Si `ENVIRONMENT=production` et `API_KEY` non defini, la pile lève une `RuntimeError`.

## Endpoints API

| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/` | Non | Status du service |
| `GET` | `/health` | Non | Sante systeme (API + DB) |
| `GET` | `/devices` | Oui | Liste capteurs + stats 24h |
| `GET` | `/devices/{id}/metrics?limit=20` | Oui | Historique mesures |
| `GET` | `/alerts` | Oui | Alertes actives |
| `GET` | `/stats` | Oui | Statistiques globales |
| `GET` | `/status` | Non | Statut detaille de tous les services (API, DB, MQTT, WS, Publisher) |
| `GET` | `/debug/recent-messages` | **Oui** | 50 derniers messages MQTT bruts (buffer debug) — **AUTHENTICATION REQUISE** |
| `WS` | `/ws` | Oui | Messages temps reel : `new_mesure`, `debug_mqtt`, `ping` |

### WebSocket Authentication (First-Message Pattern)

Le client se connecte a `ws://localhost:8000/ws` **sans query parameter**, puis envoie le token d'authentification comme **premier message** :

```json
{
  "type": "auth",
  "token": "<votre-cle-api>"
}
```

Cette approche evite l'exposition de la clé dans les logs d'acces serveur et les URLs historisees par les proxies.

Documentation interactive : <http://localhost:8000/docs>

## Tests

### Frontend Tests (Vitest)

```bash
npm install
npm run test
# ou avec coverage:
npm run test:coverage
```

110 tests Vitest couvrent :
- Utilitaires lib/ (api-client, device-registry, mock-store, exporters, lorawan)
- Composants (Dashboard, Converter, Pipeline)
- Hooks (useWebSocket, useDataLoading, useLocalStorage, usePolling, useToasts)
- Cas d'erreur et fallbacks

### Backend Tests (pytest)

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests/ -v --cov=app
```

108 tests pytest couvrent :
- API endpoints (devices, alerts, stats, health, debug, status)
- MQTT service (payload decode, alarm handling)
- Database repository (mesures, devices, alerts, stats)
- Security (API key validation, WebSocket auth, error handling)
- Edge cases (connection pool, retry logic)

**Total : 218+ tests**

## Securite

### HTTP Security Headers

Les headers de securite sont appliques a la fois cote backend (middleware FastAPI `SecurityHeadersMiddleware`) et cote frontend (Next.js `headers()` dans `next.config.ts`) :

- `X-Content-Type-Options: nosniff` — empeche le MIME sniffing
- `X-Frame-Options: DENY` — protection clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` — limite les fuites de referrer
- `Content-Security-Policy` (frontend) — restreint les sources de contenu (hardened : `unsafe-eval` removed, URLs dynamiques via env vars)

### Authentification

- **API Key** : header `X-API-Key` valide avec comparaison constant-time (`hmac.compare_digest`)
- **WebSocket** : authentification **first-message** (message JSON `{"type":"auth","token":"<key>"}`) — pas en query string pour eviter l'exposition dans les logs
- **Debug endpoint** : `/debug/recent-messages` requiert authentification (dependencies=[Depends(verify_api_key)])
- **Config fail-fast** : `ENVIRONMENT=production` sans `API_KEY` leve une `RuntimeError` au demarrage
- **Validation credentials MQTT** : `MQTT_USER` requiert `MQTT_PASSWORD` obligatoirement

### TLS Support Optionnel

```python
# mqtt_handler.py, subscriber.py, publisher.py
if os.getenv("MQTT_TLS") == "true":
    client.tls_set(
        ca_certs=os.getenv("MQTT_CA_CERTS"),
        certfile=None,
        keyfile=None,
        cert_reqs=mqtt.ssl.CERT_REQUIRED,
        tls_version=mqtt.ssl.PROTOCOL_TLSv1_2,
        ciphers=None
    )
```

Activation via `.env` :
```dotenv
MQTT_TLS=true
MQTT_CA_CERTS=/path/to/ca.crt
```

### Defense-in-depth

- **Thread safety** : `threading.Lock()` sur globals MQTT handler et subscriber `_conn`
- **Connection pool** : rollback sur erreur avant retour au pool (psycopg2)
- **INTERVAL whitelist** : les intervalles de temps sont valides contre une liste blanche au niveau du repository
- **URL encoding** : les `deviceId` sont encodes avec `encodeURIComponent` dans le client HTTP
- **CSV sanitization** : les exports CSV echappent les formules (`=`, `+`, `-`, `@`)
- **PDF XSS prevention** : les exports PDF utilisent `escapeHtml()` sur toutes les interpolations
- **React 19 compliance** : pattern `queueMicrotask` pour deferred setState dans les effects

### CI/CD Scanning

- **Frontend Vitest** : 110 tests executes a chaque commit (GitHub Actions)
- **Trivy scanning** : vulnerability scan sur conteneurs Docker
- **Backup automation** : PostgreSQL backup 30 jours retention (scripts/backup-db.sh)

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Graphiques | Recharts |
| Tests Frontend | Vitest (110 tests) |
| Backend | FastAPI, psycopg2 (connection pool) |
| Message Broker | Eclipse Mosquitto (MQTT, optionnel TLS) |
| Base de donnees | PostgreSQL 15 (indexes optimises) |
| Orchestration | Docker Compose |
| Tests Backend | pytest + httpx (108 tests) |
| CI/CD | GitHub Actions + Trivy |
| Backup | PostgreSQL retention 30j |

## Performance & Monitoring

- **Database indexes** : `idx_mesures_recu_le`, `idx_mesures_device_recu`, `idx_mesures_device_id` pour requetes O(1)
- **React.memo()** : composants Dashboard enfants (StatsCards, MetricsChart, AlertsPanel, DeviceSelector) optimises pour re-renders
- **WebSocket reconnection** : strategie exponentielle backoff avec jitter (useWebSocket hook)
- **Mock fallback** : useDataLoading automatiquement bascule en mock si API indisponible
- **Audit trail** : logging centre pour troubleshooting production (audit.py)
