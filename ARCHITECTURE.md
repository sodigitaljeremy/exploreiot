# Architecture ExploreIOT Dashboard

Vue d'ensemble ultra-exhaustive de l'architecture pour comprendre chaque couche, les patterns d'implémentation, et les mesures de sécurité.

## Vue globale

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16 + React 19)         │
│                                                             │
│  app/page.tsx                                               │
│    └─ DataSourceProvider         ← contexte central         │
│        └─ AppClient              ← routeur de vues          │
│            ├─ Dashboard          ← monitoring temps reel    │
│            ├─ Converter          ← outils pedagogiques      │
│            └─ Pipeline           ← visualisation du flux    │
│                                                             │
│  Composants (React.memo wrapped):                           │
│    ├─ StatsCards, MetricsChart, AlertsPanel (dashboard)    │
│    ├─ Converter, EncodingPipeline (converter)              │
│    ├─ SystemDiagram, Inspector (pipeline)                 │
│    └─ ConnectionStatus (shared, refactored)               │
│                                                             │
│  Hooks (logique reutilisable):                             │
│    ├─ useWebSocket    → WS + reconnect auto               │
│    ├─ useDataLoading  → API + mock fallback               │
│    ├─ useToasts       → notifications UI                  │
│    ├─ usePolling      → refresh intervalle                │
│    └─ useLocalStorage → persistance navigateur            │
│                                                             │
│  Lib (utilitaires purs):                                   │
│    ├─ api-client      → HTTP/WS vers FastAPI (bearer token)│
│    ├─ mock-store      → donnees simulees deterministiques │
│    ├─ lorawan         → encode/decode payloads LoRaWAN    │
│    ├─ exporters       → CSV/PDF avec sanitization XSS     │
│    ├─ types           → types partages (Source of Truth)  │
│    ├─ pipeline-context→ context API pour flux donnees     │
│    ├─ device-registry → metadata statique des devices     │
│    └─ constants       → couleurs, intervals globaux       │
│                                                             │
│  CSP: removed 'unsafe-eval', dynamic URLs sanitized       │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST (HTTP) + WebSocket (WS)
                      │ Bearer Token authentication
                      │ CORS, RateLimit, Security Headers
┌─────────────────────┴───────────────────────────────────────┐
│                    BACKEND (FastAPI + Python)                │
│                                                             │
│  FastAPI Server:                                            │
│    ├─ Routes (app/routes/)          ← endpoints HTTP        │
│    │   ├─ /devices      (GET, POST, PUT, DELETE)          │
│    │   ├─ /stats        (GET, POST)                        │
│    │   ├─ /alerts       (GET, POST, PUT)                   │
│    │   ├─ /health       (GET)                              │
│    │   └─ /debug/*      (GET) [auth required]             │
│    │                                                       │
│    ├─ Repositories (app/repositories/)                     │
│    │   ├─ device_repo.py    → CRUD + INTERVAL_SQL mapping │
│    │   ├─ stats_repo.py     → agregations, null-safe     │
│    │   └─ alert_repo.py     → gestion des alertes        │
│    │                                                       │
│    ├─ Services (app/services/)                            │
│    │   └─ mqtt_service.py   → decode, validation LoRaWAN │
│    │                                                       │
│    ├─ Models (app/models/)                                │
│    │   ├─ device.py         → Device ORM                  │
│    │   ├─ measurement.py    → Measurement ORM            │
│    │   └─ alert.py          → Alert ORM                   │
│    │                                                       │
│    ├─ Middlewares (security + reliability):               │
│    │   ├─ security_headers.py  → CSP, X-Frame-Options    │
│    │   ├─ rate_limit.py        → Token bucket             │
│    │   ├─ security.py          → verify_api_key (timing-safe)│
│    │   └─ CORS config          → origins configurables    │
│    │                                                       │
│    ├─ Utils & Error Handling:                             │
│    │   ├─ errors.py            → AppError, subclasses    │
│    │   ├─ config.py            → env vars (fail-fast)    │
│    │   ├─ database.py          → pool + rollback-on-error│
│    │   └─ utils/retry.py       → exponential backoff     │
│    │                                                       │
│    └─ MQTT Handler (threading.Lock protected):            │
│        ├─ _loop        [Lock: _loop_lock]                │
│        ├─ _mqtt_client  [Lock: _mqtt_client_lock]        │
│        └─ TLS support (optional, via config)             │
│                                                             │
│  Subscriber Worker (separate process):                     │
│    ├─ Threading.Lock protecting _conn                     │
│    ├─ TLS support (optional)                              │
│    ├─ Persistent DB writes (INSERT INTO mesures)         │
│    └─ Auto-reconnect logic                                │
│                                                             │
│  Publisher (test data generator):                          │
│    ├─ Chirpstack v4 uplink simulator                      │
│    ├─ TLS support                                         │
│    └─ JSON encoded LoRaWAN payloads                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA & INFRASTRUCTURE                      │
│                                                             │
│  PostgreSQL Database:                                       │
│    ├─ devices        → [id, name, app_id, dev_eui, ...]  │
│    ├─ mesures        → [id, device_id, payload, rssi, ...│
│    ├─ alerts         → [id, device_id, condition, ...]   │
│    └─ Indexes (performance-critical):                     │
│        ├─ devices(app_id, dev_eui) [UNIQUE]             │
│        ├─ mesures(device_id, created_at DESC)           │
│        └─ alerts(device_id, created_at DESC)            │
│                                                             │
│  MQTT Broker (Mosquitto):                                  │
│    ├─ TLS/SSL optional (certs in docker/mosquitto/)       │
│    ├─ Topics monitored:                                   │
│    │   └─ v3/{app_id}/devices/{dev_eui}/up               │
│    └─ ACL enforced (docker/mosquitto/acl.conf)           │
│                                                             │
│  Docker Infrastructure:                                    │
│    ├─ Mosquitto      → MQTT broker                        │
│    ├─ Postgres       → database persistant                │
│    ├─ Chirpstack     → LoRaWAN network server            │
│    ├─ Backend        → FastAPI app                        │
│    ├─ Frontend       → Next.js server                     │
│    ├─ Grafana        → dashboards (optionnel)            │
│    └─ Backup Service → bash script, 30-day retention    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Pipeline MQTT (dual consumer pattern)

Le système utilise deux consumers MQTT indépendants avec protection thread-safe :

```
                     ┌──────────────────┐
                     │  MQTT Broker     │
                     │  (Mosquitto)     │
                     │  [TLS optional]  │
                     └────────┬─────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
   ┌────────────────────────┐   ┌────────────────────────┐
   │  mqtt_handler.py       │   │  subscriber.py         │
   │  (dans FastAPI)        │   │  (process séparé)      │
   │  [Lock: _loop]         │   │  [Lock: _conn]         │
   │  [Lock: _mqtt_client]  │   │  TLS support           │
   │  TLS optional          │   │                        │
   └────────┬───────────────┘   └────────┬───────────────┘
            │                            │
            ▼                            ▼
   mqtt_service.py            sauvegarder_mesure()
   (decode + valide)          INSERT INTO mesures
   validate_payload()         with rollback on error
            │
            ▼
   websocket.broadcast()      Les routes API lisent
   (temps réel → clients)     ensuite depuis PostgreSQL
```

**mqtt_handler** : broadcast WebSocket temps réel (pas de persistence). Utilise threading.Lock() pour synchroniser l'accès à `_loop` et `_mqtt_client` en raison des appels asynchrones.

**subscriber** : écriture PostgreSQL persistent (archivage, queryable via API). Utilise threading.Lock() pour protéger `_conn`. Implémente rollback automatique en cas d'erreur DB. Support TLS optionnel.

**publisher** : générateur de test (simule des uplinks Chirpstack v4). Envoie des payloads JSON encodés.

---

## Couche Sécurité (Security Layer)

### Thread Safety

**Backend (FastAPI)**
- `mqtt_handler.py` : threading.Lock() sur `_loop` et `_mqtt_client` car l'event loop asyncio n'est pas thread-safe
- `subscriber.py` : threading.Lock() sur `_conn` (connexion MQTT partagée)
- Database.py : rollback automatique sur erreur (transactional safety)

**Frontend (React 19)**
- `queueMicrotask` pattern pour setState dans les effects (compliance React 19)
- Pas d'accès direct au DOM hors de refs (via React.memo + useCallback)

### TLS/SSL Support

**MQTT** (optionnel, configuration via env vars) :
```python
# mqtt_handler.py
if MQTT_TLS_ENABLED:
    mqtt_client.tls_set(
        ca_certs=MQTT_CA_CERT,
        certfile=MQTT_CLIENT_CERT,
        keyfile=MQTT_CLIENT_KEY
    )
    mqtt_client.tls_insecure = False
```

**Subscriber et Publisher** : même pattern appliqué

### Connection Pool & Database Safety

`database.py` :
```python
async with engine.begin() as conn:
    try:
        await conn.execute(...)
    except Exception:
        # rollback auto
        raise
```

### Credential Validation (Fail-Fast)

`config.py` : validation stricte au startup
```python
class Settings(BaseSettings):
    MQTT_HOST: str  # ValueError si absent
    API_KEY: str    # ValueError si absent (length >= 32)
    DATABASE_URL: str  # validation regex
```

### Authentication & Authorization

**API Keys** :
- `security.py` : `verify_api_key()` avec comparaison timing-safe (constante time)
- Debug routes (`/debug/*`) : décorateur `@depends(verify_api_key)`

**Bearer Token** (frontend) :
- `api-client.ts` : envoi automatique du token dans Authorization header
- Fallback vers mock si 401/403

### CSP Hardening

`next.config.js` : Content Security Policy stricte
```javascript
"default-src 'self'"
"script-src 'self' 'nonce-{random}'"  // pas 'unsafe-eval'
"style-src 'self' 'unsafe-inline'"
"img-src 'self' data: https:"
"connect-src 'self' https://api.example.com"
```

### XSS Prevention

`exporters.ts` : sanitization stricte
```typescript
const sanitize = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
```

---

## Frontend — Couches détaillées

```
┌─────────────────────────────────────────────────────────────┐
│  COMPOSANTS (UI Components)                                 │
│  components/                                                │
│    atoms/                 ← briques basiques                │
│      ├─ Card.tsx                                            │
│      └─ StatusDot.tsx                                       │
│                                                             │
│    shared/                ← composants partagés             │
│      ├─ ErrorBoundary.tsx (class component)               │
│      ├─ Toast.tsx         (fixed position)                │
│      ├─ ConnectionStatus.tsx (refactored from dashboard/) │
│      ├─ Skeleton.tsx      (SSR-safe loading states)       │
│      └─ Footer.tsx                                         │
│                                                             │
│    layout/                ← navigation & shell              │
│      ├─ NavBar.tsx        (responsive, theme toggle)      │
│      ├─ ThemeToggle.tsx                                    │
│      ├─ Sidebar.tsx                                        │
│      └─ Container.tsx                                      │
│                                                             │
│    dashboard/             ← vue monitoring temps réel       │
│      ├─ StatsCards.tsx        (React.memo wrapped)        │
│      ├─ MetricsChart.tsx      (React.memo wrapped)        │
│      ├─ AlertsPanel.tsx       (React.memo wrapped)        │
│      ├─ DeviceSelector.tsx    (React.memo wrapped)        │
│      ├─ HealthIndicator.tsx                               │
│      ├─ RealtimeMetrics.tsx                                │
│      └─ Dashboard.tsx (orchestrateur, composition)        │
│                                                             │
│    converter/             ← outils pédagogiques             │
│      ├─ EncodingPipeline.tsx   (visualisation étapes)    │
│      ├─ Decoder.tsx            (payload → données)        │
│      ├─ HexInput.tsx                                       │
│      ├─ DeviceSelector.tsx     (contexte convertisseur)   │
│      ├─ PayloadDisplay.tsx                                │
│      ├─ ErrorDisplay.tsx                                  │
│      └─ Converter.tsx (orchestrateur)                     │
│                                                             │
│    pipeline/              ← visualisation du flux données    │
│      ├─ SystemDiagram.tsx  (Chirpstack → MQTT → API)     │
│      ├─ Inspector.tsx      (inspection détaillée)         │
│      ├─ MessageFlow.tsx    (timeline des messages)        │
│      ├─ DeviceTree.tsx                                    │
│      ├─ TopicMonitor.tsx                                  │
│      ├─ PayloadExplorer.tsx                               │
│      ├─ ConnectionDiagram.tsx                             │
│      └─ Pipeline.tsx (orchestrateur)                      │
│                                                             │
└────────────────────────┬──────────────────────────────────┘
                         │ importent
┌────────────────────────┴──────────────────────────────────┐
│  HOOKS (Logique réutilisable & patterns avancés)          │
│  hooks/                                                   │
│    ├─ useWebSocket.ts                                    │
│    │   ├─ Auto-reconnect avec exponential backoff        │
│    │   ├─ Event listeners (onMessage, onError, onClose)  │
│    │   ├─ Cleanup automatique                            │
│    │   └─ Timeout handling (30s per default)             │
│    │                                                      │
│    ├─ useDataLoading.ts                                  │
│    │   ├─ API call avec fallback vers mock               │
│    │   ├─ Loading/Error states gérés                     │
│    │   ├─ Cache optionnel (via useRef)                   │
│    │   └─ Retry logic intégré                            │
│    │                                                      │
│    ├─ useToasts.ts                                       │
│    │   ├─ Toast queue management                         │
│    │   ├─ Auto-dismiss (duration configurable)           │
│    │   └─ Multiple types (info, success, error, warning) │
│    │                                                      │
│    ├─ usePolling.ts                                      │
│    │   ├─ Refresh intervalle (configurable)              │
│    │   ├─ Pause/resume au besoin                         │
│    │   └─ Cleanup automatique                            │
│    │                                                      │
│    └─ useLocalStorage.ts                                 │
│        ├─ Get/Set/Remove avec fallback                   │
│        ├─ Sync cross-tab via storage event               │
│        └─ SSR safe (typeof window check)                 │
│                                                           │
└────────────────────────┬──────────────────────────────────┘
                         │ importent
┌────────────────────────┴──────────────────────────────────┐
│  LIB (Utilitaires purs & clients)                         │
│  lib/                                                     │
│    ├─ api-client.ts                                      │
│    │   ├─ HTTP client (GET, POST, PUT, DELETE)           │
│    │   ├─ Bearer token auto-injection                    │
│    │   ├─ Error handling & retry logic                   │
│    │   ├─ Type-safe response wrappers                    │
│    │   └─ Endpoint constants                             │
│    │                                                      │
│    ├─ mock-store.ts                                      │
│    │   ├─ Deterministic fake data (seeded)               │
│    │   ├─ Devices, Measurements, Alerts                  │
│    │   ├─ Respects types.ts schema                       │
│    │   └─ Perfect for frontend-only dev                  │
│    │                                                      │
│    ├─ lorawan.ts                                         │
│    │   ├─ decodePayload() → hex string to measurements   │
│    │   ├─ encodePayload() → measurements to hex          │
│    │   ├─ Port parsing (1-222)                           │
│    │   └─ Checksum validation                            │
│    │                                                      │
│    ├─ exporters.ts                                       │
│    │   ├─ exportAsCSV(devices) → text/csv                │
│    │   ├─ exportAsPDF(devices) → application/pdf         │
│    │   ├─ XSS sanitization on text fields                │
│    │   └─ Proper MIME types + download headers           │
│    │                                                      │
│    ├─ types.ts (Source of Truth)                         │
│    │   ├─ Device { id, name, app_id, dev_eui, ... }     │
│    │   ├─ Measurement { id, device_id, payload, ... }   │
│    │   ├─ Alert { id, device_id, condition, ... }       │
│    │   ├─ APIResponse<T> wrapper                         │
│    │   └─ Enums (AlertType, Interval, etc)              │
│    │                                                      │
│    ├─ pipeline-context.tsx                              │
│    │   ├─ PipelineProvider (Context.Provider)            │
│    │   ├─ usePipeline() hook                             │
│    │   ├─ Selected device, topic filter state            │
│    │   └─ Broadcast helper funcs                         │
│    │                                                      │
│    ├─ device-registry.ts                                │
│    │   ├─ device-ids.json (static metadata)              │
│    │   ├─ getDeviceInfo(app_id, dev_eui)                │
│    │   ├─ buildTopicPath(device) helper                  │
│    │   └─ Port mapping cache                             │
│    │                                                      │
│    ├─ constants.ts                                       │
│    │   ├─ Color palettes (light/dark)                    │
│    │   ├─ Polling intervals (5s, 30s, 1m)                │
│    │   ├─ API endpoints & URLs                           │
│    │   └─ Toast timings                                  │
│    │                                                      │
│    └─ lib/ aussi contient:                               │
│        ├─ data-provider.tsx (DataSourceProvider context) │
│        └─ (autres utilitaires au besoin)                 │
│                                                           │
└────────────────────────────────────────────────────────────┘
```

### React 19 Compliance

- **ref callback** : utilisé au lieu de useRef quand direct DOM manipulation
- **setState dans effects** : wrappé dans `queueMicrotask()` pour éviter les avertissements
- **Composants** : fonctionnels, pas de class components (except ErrorBoundary)
- **React.memo** : appliqué aux composants purs (StatsCards, MetricsChart, AlertsPanel, DeviceSelector)

---

## Backend — Couches détaillées

### Route Layer

`app/routes/`

```python
devices.py        → GET /devices, POST /devices, PUT /devices/{id}, DELETE /devices/{id}
stats.py          → GET /stats, POST /stats (agregations: avg, min, max, count)
alerts.py         → GET /alerts, POST /alerts, PUT /alerts/{id}
health.py         → GET /health (readiness, liveness)
debug.py          → GET /debug/devices, GET /debug/stats [auth required]
```

Chaque endpoint :
- Type hints complets (Pydantic models)
- Documentation OpenAPI auto
- Error handling uniforme (try/except → AppError)
- Auth check optionnel via `Depends(verify_api_key)`

### Repository Layer

`app/repositories/`

**device_repo.py**
```python
async def create_device(device: DeviceCreate) -> Device
async def get_devices() -> List[Device]
async def get_device(device_id: int) -> Device
async def update_device(device_id: int, device: DeviceUpdate) -> Device
async def delete_device(device_id: int) -> bool
async def get_by_app_and_eui(app_id: str, dev_eui: str) -> Device  # unique lookup
async def get_stats_grouped_by_interval(device_id: int, interval: str) -> List[IntervalStats]
    # INTERVAL_SQL safe mapping defense-in-depth:
    #   '1min' → '1 minute'
    #   '15min' → '15 minutes'
    #   '1h' → '1 hour'
    #   '1d' → '1 day'
    # Reject unknown intervals before SQL construction
```

**stats_repo.py**
```python
async def calculate_avg(device_id: int, interval: timedelta) -> float  # null-safe fetchone()
async def calculate_min(device_id: int, interval: timedelta) -> float  # handle NULL
async def calculate_max(device_id: int, interval: timedelta) -> float
async def get_timeseries(device_id: int, limit: int = 100) -> List[Measurement]
    # Uses null-safe fetchone() wrapper
```

**alert_repo.py**
```python
async def create_alert(alert: AlertCreate) -> Alert
async def get_alerts(device_id: int) -> List[Alert]
async def update_alert(alert_id: int, alert: AlertUpdate) -> Alert
async def delete_alert(alert_id: int) -> bool
async def trigger_alert(device_id: int, value: float) -> bool  # matching logic
```

### Service Layer

**mqtt_service.py**

```python
def validate_payload(payload: dict, device_id: int) -> MeasurementData
    # Checks:
    # - Required fields présents (rssi, snr, data, port)
    # - Types corrects (int, string, etc)
    # - Ranges valides (RSSI: -120..0, SNR: -20..20)

def decode_payload(hex_string: str, port: int) -> dict
    # LoRaWAN payload decoding
    # Calls lorawan.ts decoding logic via JSON schema
```

### Model Layer (ORM)

`app/models/`

**device.py**
```python
class Device(Base):
    __tablename__ = "devices"
    id: int                    [PK]
    name: str                  [unique, indexed]
    app_id: str                [indexed together with dev_eui]
    dev_eui: str               [indexed together with app_id]
    profile: str               (default: "generic")
    created_at: datetime       [indexed DESC]
    updated_at: datetime
    # Index: (app_id, dev_eui) UNIQUE
```

**measurement.py**
```python
class Measurement(Base):
    __tablename__ = "mesures"
    id: int                    [PK]
    device_id: int             [FK → devices.id]
    payload: str               [hex string]
    rssi: int                  (range: -120..0)
    snr: float                 (range: -20..20)
    created_at: datetime       [indexed DESC for device_id]
    # Index: (device_id, created_at DESC) for time-series queries
```

**alert.py**
```python
class Alert(Base):
    __tablename__ = "alerts"
    id: int                    [PK]
    device_id: int             [FK → devices.id]
    type: str                  (enum: "high_rssi", "low_snr", etc)
    condition: str             (e.g. "rssi < -100")
    is_active: bool
    triggered_at: datetime     [indexed DESC]
    # Index: (device_id, triggered_at DESC)
```

### Error Handling

`app/errors.py`

```python
class AppError(Exception):
    """Base application error"""
    status_code: int
    detail: str

class NotFoundError(AppError):
    status_code = 404
    detail = "Resource not found"

class ValidationError(AppError):
    status_code = 422
    detail = "Validation failed"

class AuthenticationError(AppError):
    status_code = 401
    detail = "Invalid API key"

class RateLimitError(AppError):
    status_code = 429
    detail = "Rate limit exceeded"
```

Global exception handler dans `app/main.py` :
```python
@app.exception_handler(AppError)
async def app_error_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )
```

### Middleware & Security

`app/middlewares/`

**security_headers.py**
```python
# Apply headers to every response:
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-...'; ...
```

**rate_limit.py**
```python
# Token bucket per IP
# Default: 100 requests per minute
# Returns 429 if exceeded
```

**security.py**
```python
async def verify_api_key(authorization: str = Header(...)) -> bool
    # Extract "Bearer {token}" from header
    # Compare timing-safe against env var
    # Raise AuthenticationError on mismatch
```

### Database & Connection Pool

`app/database.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

engine = create_async_engine(
    DATABASE_URL,
    echo=DEBUG,
    pool_size=10,           # max concurrent connections
    max_overflow=5          # queue size
)

async def get_db() -> AsyncSession:
    async with AsyncSession(engine) as session:
        try:
            yield session
        except Exception:
            await session.rollback()  # automatic rollback on error
            raise
        finally:
            await session.close()
```

**Connection Pool Safety** :
- Pool size: 10 (adjustable per env)
- Overflow queue: 5 (connections waiting)
- Auto-rollback on exception
- Timeout: 30s (configurable)

### Configuration & Environment

`app/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Required (fail-fast if missing)
    MQTT_HOST: str
    MQTT_PORT: int = 1883
    DATABASE_URL: str
    API_KEY: str            # min length: 32

    # Optional TLS
    MQTT_TLS_ENABLED: bool = False
    MQTT_CA_CERT: str | None = None
    MQTT_CLIENT_CERT: str | None = None
    MQTT_CLIENT_KEY: str | None = None

    # Application
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    RATE_LIMIT_PER_MINUTE: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Validation fail-fast at startup
        if len(self.API_KEY) < 32:
            raise ValueError("API_KEY must be >= 32 characters")
        if not self.DATABASE_URL.startswith(("postgresql://", "postgresql+asyncpg://")):
            raise ValueError("DATABASE_URL must be valid PostgreSQL URL")

settings = Settings()
```

### Startup & Shutdown

`app/main.py`

```python
@app.on_event("startup")
async def startup_event():
    # Initialize MQTT handler with thread locks
    await mqtt_handler.initialize()
    # Start subscriber worker
    await subscriber.start()
    logger.info("Application started")

@app.on_event("shutdown")
async def shutdown_event():
    # Graceful shutdown
    await mqtt_handler.disconnect()
    await subscriber.stop()
    logger.info("Application stopped")
```

---

## Mode Mock vs API

### Mode MOCK (défaut)

```
┌─────────────────────────────────────────────┐
│                                             │
│  mock-store.ts genère des données simulées  │
│  Deterministic (seeded) pour reproductibilité
│                                             │
│  - Pas besoin de backend                    │
│  - Pas besoin de Docker                     │
│  - Idéal pour développement frontend        │
│                                             │
│  Devices: 5 (hardcodés)                     │
│  Measurements: 100+ (générés)               │
│  Alerts: 20+ (simulés)                      │
│                                             │
└─────────────────────────────────────────────┘
```

### Mode API (Production)

```
┌────────────────────────────────────────────┐
│                                            │
│  api-client.ts appelle le backend FastAPI  │
│  Bearer token auto-injecté                 │
│                                            │
│  useWebSocket se connecte au WS /ws        │
│  useDataLoading avec fallback vers mock    │
│                                            │
│  Si l'API échoue:                          │
│    → Toast "API injoignable"               │
│    → Fallback aux données mock en cache    │
│    → Retry auto après 5s                   │
│                                            │
│  Conditions d'erreur gérées:               │
│    ├─ 401/403 → Auth error                │
│    ├─ 404 → Not found                     │
│    ├─ 429 → Rate limit exceeded           │
│    ├─ 5xx → Server error                  │
│    └─ Network timeout → Fallback mock     │
│                                            │
└────────────────────────────────────────────┘
```

---

## Architecture de Test (Testing Architecture)

### Frontend Tests (Vitest + jsdom)

```
__tests__/
├── lib/
│   ├── lorawan.test.ts                     # 6 tests
│   │   ├─ decodePayload happy path
│   │   ├─ encodePayload round-trip
│   │   ├─ invalid port handling
│   │   ├─ checksum validation
│   │   └─ edge cases (max, min values)
│   │
│   ├── api-client.test.ts                  # 15 tests
│   │   ├─ HTTP methods (GET, POST, PUT, DELETE)
│   │   ├─ Bearer token injection
│   │   ├─ Error handling (4xx, 5xx)
│   │   ├─ Retry logic
│   │   ├─ Response type conversion
│   │   └─ Network timeouts
│   │
│   └── exporters.test.ts                   # 12 tests
│       ├─ CSV export format
│       ├─ PDF generation
│       ├─ XSS sanitization
│       ├─ MIME types
│       ├─ Download filename
│       └─ Edge cases (empty arrays, null values)
│
├── components/
│   ├── StatsCards.test.tsx                 # 11 tests
│   │   ├─ Rendering with props
│   │   ├─ Metric calculation
│   │   ├─ Loading state
│   │   ├─ Error state
│   │   └─ React.memo memoization
│   │
│   ├── AlertsPanel.test.tsx                # 13 tests
│   │   ├─ Alert list rendering
│   │   ├─ Filter by type
│   │   ├─ Sorting by date
│   │   ├─ Empty state
│   │   ├─ Alert triggering
│   │   └─ Auto-dismiss
│   │
│   ├── Converter.test.tsx                  # 21 tests
│   │   ├─ Payload input validation
│   │   ├─ Decoding + visualization
│   │   ├─ Device selection
│   │   ├─ Port parsing
│   │   ├─ Error messages
│   │   ├─ Export functionality
│   │   └─ Reset state
│   │
│   ├── Dashboard.test.tsx                  # 12 tests
│   │   ├─ Component mounting
│   │   ├─ Data loading states
│   │   ├─ WebSocket connection
│   │   ├─ Metric refresh
│   │   ├─ Device selection
│   │   └─ Error boundaries
│   │
│   └── Pipeline.test.tsx                   # 12 tests
│       ├─ System diagram rendering
│       ├─ Message flow visualization
│       ├─ Inspector details
│       ├─ Topic filtering
│       ├─ Real-time updates
│       └─ Connection status display

Vitest Configuration (vitest.config.ts):
  - Environment: jsdom (browser simulation)
  - Coverage: enabled (--coverage flag)
  - Globals: true (describe, it, expect without imports)
  - Include: __tests__/**/*.test.(ts|tsx)
```

### Backend Tests (pytest)

```
backend/tests/
├── test_subscriber.py                      # 12 tests
│   ├─ MQTT connection + TLS
│   ├─ Message handling
│   ├─ Database persistence (INSERT)
│   ├─ Rollback on DB error
│   ├─ Reconnect logic
│   └─ Thread safety (Lock)
│
├── test_api.py                             # 18 tests
│   ├─ GET /devices
│   ├─ POST /devices
│   ├─ PUT /devices/{id}
│   ├─ DELETE /devices/{id}
│   ├─ GET /stats
│   ├─ GET /alerts
│   ├─ POST /alerts
│   ├─ Health check
│   └─ Auth verification
│
├── test_codec.py                           # 16 tests
│   ├─ LoRaWAN payload encoding
│   ├─ LoRaWAN payload decoding
│   ├─ Port ranges (1-222)
│   ├─ Checksum computation
│   ├─ Edge cases (max/min values)
│   └─ Invalid inputs
│
├── test_security.py                        # 9 tests
│   ├─ API key validation (timing-safe)
│   ├─ Bearer token extraction
│   ├─ CSP headers presence
│   ├─ Rate limiting (token bucket)
│   ├─ CORS origin validation
│   └─ TLS configuration
│
├── test_database.py                        # 11 tests
│   ├─ Connection pool creation
│   ├─ Query execution
│   ├─ Transaction rollback on error
│   ├─ Connection timeout
│   ├─ Index presence (optimization)
│   └─ Migration state
│
├── test_config.py                          # 7 tests
│   ├─ Env var loading
│   ├─ Validation fail-fast
│   ├─ API_KEY min length (32 chars)
│   ├─ DATABASE_URL format
│   ├─ Optional TLS vars
│   └─ Missing required fields
│
├── test_mqtt_handler.py                    # 8 tests
│   ├─ Handler initialization
│   ├─ Thread lock on _loop
│   ├─ Thread lock on _mqtt_client
│   ├─ TLS support
│   ├─ Async/await patterns
│   └─ Graceful shutdown
│
├── test_repositories.py                    # 14 tests
│   ├─ device_repo CRUD
│   ├─ stats_repo aggregations (null-safe)
│   ├─ alert_repo filtering
│   ├─ Interval SQL mapping (defense-in-depth)
│   ├─ Null value handling
│   └─ Query optimization
│
├── test_errors.py                          # 6 tests
│   ├─ AppError base class
│   ├─ NotFoundError status code
│   ├─ ValidationError details
│   ├─ Exception handler mapping
│   └─ Error response format
│
├── test_middleware.py                      # 8 tests
│   ├─ Security headers middleware
│   ├─ Rate limit middleware
│   ├─ CORS middleware
│   ├─ Auth middleware
│   └─ Header injection

Total Backend Tests: ~108 tests across 17 files
Coverage Target: >80% for core logic
```

### Test Execution

```bash
# Frontend (Vitest)
npm test                          # Run all frontend tests
npm test -- --coverage           # With coverage report
npm test -- --ui                 # Visual test explorer

# Backend (pytest)
cd backend
pytest                            # Run all tests
pytest --cov=app                 # With coverage
pytest -v                         # Verbose output
pytest tests/test_api.py          # Single file
```

---

## Arborescence complète

```
exploreiot-dashboard/
├── app/                                    # Next.js 16 App Router
│   ├── page.tsx                            # Route / (root page)
│   ├── layout.tsx                          # Root layout + providers
│   ├── not-found.tsx                       # 404 page
│   └── error.tsx                           # Error boundary
│
├── components/                             # React components
│   ├── atoms/
│   │   ├── Card.tsx
│   │   └── StatusDot.tsx
│   │
│   ├── shared/
│   │   ├── ErrorBoundary.tsx               # Class component, Suspense fallback
│   │   ├── Toast.tsx                       # Fixed positioning, auto-dismiss
│   │   ├── ConnectionStatus.tsx            # Refactored from dashboard/
│   │   ├── Skeleton.tsx                    # Loading state (SSR-safe)
│   │   └── Footer.tsx
│   │
│   ├── layout/
│   │   ├── NavBar.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── Sidebar.tsx
│   │   └── Container.tsx
│   │
│   ├── dashboard/
│   │   ├── StatsCards.tsx                  # React.memo wrapped
│   │   ├── MetricsChart.tsx                # React.memo wrapped
│   │   ├── AlertsPanel.tsx                 # React.memo wrapped
│   │   ├── DeviceSelector.tsx              # React.memo wrapped
│   │   ├── HealthIndicator.tsx
│   │   ├── RealtimeMetrics.tsx
│   │   └── Dashboard.tsx                   # Orchestrator
│   │
│   ├── converter/
│   │   ├── EncodingPipeline.tsx
│   │   ├── Decoder.tsx
│   │   ├── HexInput.tsx
│   │   ├── DeviceSelector.tsx              # Context-aware
│   │   ├── PayloadDisplay.tsx
│   │   ├── ErrorDisplay.tsx
│   │   └── Converter.tsx                   # Orchestrator
│   │
│   ├── pipeline/
│   │   ├── SystemDiagram.tsx
│   │   ├── Inspector.tsx
│   │   ├── MessageFlow.tsx
│   │   ├── DeviceTree.tsx
│   │   ├── TopicMonitor.tsx
│   │   ├── PayloadExplorer.tsx
│   │   ├── ConnectionDiagram.tsx
│   │   └── Pipeline.tsx                    # Orchestrator
│   │
│   └── app-client.tsx                      # Main router (Dashboard/Converter/Pipeline)
│
├── hooks/                                  # React hooks
│   ├── useWebSocket.ts                     # WS + auto-reconnect
│   ├── useDataLoading.ts                   # API + mock fallback
│   ├── useToasts.ts                        # Toast queue management
│   ├── usePolling.ts                       # Interval refresh
│   └── useLocalStorage.ts                  # Browser storage
│
├── lib/                                    # Utilities & clients
│   ├── api-client.ts                       # HTTP client (bearer token)
│   ├── mock-store.ts                       # Fake data (deterministic)
│   ├── lorawan.ts                          # Encode/decode payloads
│   ├── exporters.ts                        # CSV/PDF (XSS sanitized)
│   ├── types.ts                            # Source of Truth (TypeScript)
│   ├── pipeline-context.tsx                # Context API for pipeline
│   ├── device-registry.ts                  # Static metadata
│   ├── constants.ts                        # Colors, intervals, URLs
│   └── data-provider.tsx                   # DataSourceProvider context
│
├── __tests__/                              # Frontend tests (Vitest)
│   ├── lib/
│   │   ├── lorawan.test.ts
│   │   ├── api-client.test.ts
│   │   └── exporters.test.ts
│   │
│   └── components/
│       ├── StatsCards.test.tsx
│       ├── AlertsPanel.test.tsx
│       ├── Converter.test.tsx
│       ├── Dashboard.test.tsx
│       └── Pipeline.test.tsx
│
├── public/                                 # Static assets
│   ├── logo.svg
│   └── favicon.ico
│
├── shared/                                 # Shared static data
│   └── device-ids.json                     # Device metadata (app_id, dev_eui)
│
├── backend/                                # FastAPI Backend
│   ├── app/
│   │   ├── main.py                         # FastAPI app initialization
│   │   ├── mqtt_handler.py                 # MQTT handler (threading.Lock)
│   │   ├── config.py                       # Settings (env vars, fail-fast)
│   │   ├── database.py                     # SQLAlchemy pool + rollback
│   │   ├── errors.py                       # AppError, subclasses
│   │   │
│   │   ├── routes/
│   │   │   ├── devices.py                  # CRUD endpoints
│   │   │   ├── stats.py                    # Aggregation endpoints
│   │   │   ├── alerts.py                   # Alert endpoints
│   │   │   ├── health.py                   # Health check
│   │   │   └── debug.py                    # Debug endpoints [auth required]
│   │   │
│   │   ├── repositories/
│   │   │   ├── device_repo.py              # Device CRUD + INTERVAL_SQL mapping
│   │   │   ├── stats_repo.py               # Stats with null-safe fetchone()
│   │   │   └── alert_repo.py               # Alert CRUD
│   │   │
│   │   ├── models/
│   │   │   ├── device.py                   # ORM Device
│   │   │   ├── measurement.py              # ORM Measurement
│   │   │   └── alert.py                    # ORM Alert
│   │   │
│   │   ├── services/
│   │   │   └── mqtt_service.py             # Payload validation, decoding
│   │   │
│   │   ├── middlewares/
│   │   │   ├── security_headers.py         # CSP, X-Frame-Options, etc
│   │   │   ├── rate_limit.py               # Token bucket
│   │   │   └── security.py                 # verify_api_key (timing-safe)
│   │   │
│   │   └── utils/
│   │       └── retry.py                    # Exponential backoff
│   │
│   ├── subscriber.py                       # Separate process (threading.Lock on _conn)
│   ├── publisher.py                        # Test data generator (Chirpstack v4)
│   │
│   ├── tests/                              # Backend tests (pytest)
│   │   ├── test_subscriber.py
│   │   ├── test_api.py
│   │   ├── test_codec.py
│   │   ├── test_security.py
│   │   ├── test_database.py
│   │   ├── test_config.py
│   │   ├── test_mqtt_handler.py
│   │   ├── test_repositories.py
│   │   ├── test_errors.py
│   │   └── test_middleware.py
│   │
│   ├── migrations/                         # Alembic (database schema)
│   │   ├── versions/
│   │   │   ├── 001_initial_schema.py
│   │   │   └── ...
│   │   ├── env.py
│   │   └── script.py.mako
│   │
│   ├── requirements.txt                    # Python dependencies
│   └── .env.example                        # Example env vars
│
├── docker/                                 # Docker configs
│   ├── mosquitto/
│   │   ├── Dockerfile
│   │   ├── config/mosquitto.conf
│   │   ├── acl.conf                        # ACL rules
│   │   └── certs/                          # Optional TLS certs
│   │
│   ├── postgres/
│   │   ├── Dockerfile
│   │   ├── init.sql                        # Schema + indexes
│   │   └── .env
│   │
│   ├── chirpstack/
│   │   ├── Dockerfile
│   │   └── config/
│   │       └── chirpstack.toml
│   │
│   ├── backend/
│   │   └── Dockerfile
│   │
│   ├── frontend/
│   │   └── Dockerfile
│   │
│   ├── grafana/
│   │   └── Dockerfile
│   │
│   └── scripts/
│       └── backup-db.sh                    # 30-day retention
│
├── docs/                                   # MkDocs documentation
│   ├── index.md
│   ├── architecture.md
│   ├── security.md
│   ├── deployment.md
│   └── mkdocs.yml
│
├── .github/
│   └── workflows/
│       └── ci.yml                          # GitHub Actions (Vitest + Trivy)
│
├── scripts/
│   └── backup-db.sh                        # Database backup (30-day retention)
│
├── docker-compose.yml                      # Orchestration (7 services)
├── docker-compose.prod.yml                 # Production config
│
├── next.config.js                          # Next.js config (CSP headers)
├── tailwind.config.ts                      # Tailwind CSS config
├── tsconfig.json                           # TypeScript config
├── vitest.config.ts                        # Vitest config (frontend tests)
│
├── package.json
├── package-lock.json
│
├── .env.example                            # Example frontend env
├── .env.local (gitignored)
├── .gitignore
├── .eslintrc.json
├── .prettierrc
│
├── ARCHITECTURE.md                         # This file
├── README.md
├── CLAUDE.md                               # Agent instructions
├── AGENTS.md                               # Agent rules
└── LICENSE

```

---

## Infrastructure & Deployment (Infrastructure Layer)

### Docker Compose Stack

`docker-compose.yml` orchestre 7 services :

```yaml
version: '3.8'

services:
  mosquitto:
    image: mosquitto:latest
    ports: [ "1883:1883", "8883:8883" ]    # MQTT + TLS
    volumes:
      - ./docker/mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - ./docker/mosquitto/acl.conf:/mosquitto/config/acl.conf
      - ./docker/mosquitto/certs/:/mosquitto/certs/ (optional TLS)
    environment:
      - MOSQUITTO_USERNAME=${MQTT_USERNAME}
      - MOSQUITTO_PASSWORD=${MQTT_PASSWORD}

  postgres:
    image: postgres:15-alpine
    ports: [ "5432:5432" ]
    environment:
      - POSTGRES_DB=exploreiot
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [ "CMD", "pg_isready", "-U", "${DB_USER}" ]
      interval: 10s
      timeout: 5s
      retries: 5

  chirpstack:
    image: chirpstack/chirpstack:4.x
    ports: [ "8080:8080" ]
    environment:
      - CHIRPSTACK_MQTT_BROKER=mosquitto:1883
    depends_on:
      - mosquitto
      - postgres

  backend:
    build: ./docker/backend
    ports: [ "8000:8000" ]
    environment:
      - MQTT_HOST=mosquitto
      - DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@postgres:5432/exploreiot
      - API_KEY=${API_KEY}
      - DEBUG=${DEBUG}
    depends_on:
      postgres:
        condition: service_healthy
      mosquitto:
        condition: service_started
    volumes:
      - ./backend:/app  (dev only)

  frontend:
    build: ./docker/frontend
    ports: [ "3000:3000" ]
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
    depends_on:
      - backend

  grafana:
    image: grafana/grafana:latest
    ports: [ "3001:3000" ]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana

  backup-service:
    image: postgres:15-alpine
    entrypoint: /scripts/backup-db.sh
    volumes:
      - ./scripts/backup-db.sh:/scripts/backup-db.sh
      - ./backups/:/backups/
    environment:
      - PGHOST=postgres
      - PGUSER=${DB_USER}
      - PGPASSWORD=${DB_PASSWORD}
      - PGDATABASE=exploreiot

volumes:
  postgres_data:
  grafana_data:
```

### Database Initialization (init.sql)

```sql
-- Tables
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    app_id VARCHAR(255) NOT NULL,
    dev_eui VARCHAR(255) NOT NULL,
    profile VARCHAR(255) DEFAULT 'generic',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE mesures (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    payload TEXT NOT NULL,
    rssi INTEGER,
    snr FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    condition TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMP DEFAULT NOW()
);

-- Indexes (defense-in-depth + optimization)
CREATE UNIQUE INDEX idx_devices_app_eui ON devices(app_id, dev_eui);
CREATE INDEX idx_devices_name ON devices(name);
CREATE INDEX idx_mesures_device_time ON mesures(device_id, created_at DESC);
CREATE INDEX idx_mesures_rssi ON mesures(rssi);
CREATE INDEX idx_alerts_device_time ON alerts(device_id, triggered_at DESC);
CREATE INDEX idx_alerts_active ON alerts(is_active);
```

### Backup Script (30-day Retention)

`scripts/backup-db.sh`

```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/exploreiot_${TIMESTAMP}.sql.gz"

# Create backup
pg_dump $PGDATABASE | gzip > $BACKUP_FILE
echo "Backup created: $BACKUP_FILE"

# Cleanup old backups (> 30 days)
find $BACKUP_DIR -name "exploreiot_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Old backups cleaned up"
```

### CI/CD Pipeline (GitHub Actions)

`.github/workflows/ci.yml`

```yaml
name: CI

on: [ push, pull_request ]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      mosquitto:
        image: mosquitto:latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest --cov=app tests/

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      - uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  build-docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          context: ./docker/backend
          push: false
          tags: exploreiot-backend:latest
```

---

## Performance & Optimization

### Frontend Optimizations

- **React.memo** : appliqué aux composants purs (StatsCards, MetricsChart, AlertsPanel)
- **useCallback** : prevent function re-creation
- **useMemo** : expensive calculations cached
- **Code splitting** : dynamic imports pour lazy loading
- **Image optimization** : next/image avec WebP
- **CSS-in-JS** : Tailwind (atomic, no runtime overhead)

### Backend Optimizations

- **Connection pooling** : PostgreSQL avec 10-size pool
- **Database indexes** : (device_id, created_at), (app_id, dev_eui) UNIQUE
- **Query optimization** : COUNT(*) en SQL, not in app code
- **Caching** : Redis optional (future)
- **Async/await** : FastAPI native (non-blocking I/O)

### MQTT Optimizations

- **Dual consumers** : mqtt_handler (broadcast) + subscriber (persistence)
- **Topic filtering** : v3/{app_id}/devices/{dev_eui}/up
- **Message batching** : database batch inserts (future)
- **QoS 0/1** : configurable par topic

---

## Security Considerations

### Authentication & Authorization

- **API Key** : required pour /debug/* endpoints (timing-safe comparison)
- **Bearer token** : frontend auto-injects in Authorization header
- **Session cookies** : pas utilisés (stateless API)

### Data Protection

- **TLS** : MQTT optional, backend HTTPS recommended (nginx/load balancer)
- **Encryption** : database at-rest (optional pg_crypt extension)
- **Secrets management** : .env variables, never in git

### Input Validation

- **Payload validation** : mqtt_service.py checks ranges, types
- **INTERVAL_SQL mapping** : defense-in-depth (enum vs string)
- **XSS prevention** : exporters.ts sanitization
- **CSRF protection** : SameSite cookies (if used)

### Rate Limiting

- **Token bucket** : 100 requests/minute default
- **Per IP** : tracking via middleware
- **Returns 429** : rate limit exceeded

---

## Glossaire des termes techniques

| Terme | Signification |
|-------|---------------|
| **LoRaWAN** | Long Range Wide Area Network (réseau IoT bas débit) |
| **Chirpstack** | Network server (LNS) open-source |
| **MQTT** | Message Queuing Telemetry Transport (pub/sub) |
| **Mosquitto** | MQTT broker open-source |
| **App ID** | Identifiant d'application Chirpstack |
| **Dev EUI** | Identifiant unique de device LoRaWAN (64 bits) |
| **Uplink** | Message du device → cloud |
| **Payload** | Données du message (encodées en hex) |
| **RSSI** | Received Signal Strength Indicator (-120..0 dBm) |
| **SNR** | Signal-to-Noise Ratio (-20..20 dB) |
| **Pool** | Ensemble de connexions réutilisables |
| **Rollback** | Annulation de transactions DB |
| **CSP** | Content Security Policy (header de sécurité) |
| **Bearer Token** | Token OAuth/API dans Authorization header |
| **Threading.Lock** | Mutex pour synchronisation inter-threads |
| **Null-safe** | Gestion correcte des valeurs NULL/undefined |
