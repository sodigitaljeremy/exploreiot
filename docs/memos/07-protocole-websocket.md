---
marp: true
theme: default
paginate: true
header: "ExploreIOT — Fondamentaux CS"
footer: "Memo #07 — Protocole WebSocket"
---

# Protocole WebSocket

Communication bidirectionnelle temps réel pour ExploreIOT

---

## WebSocket vs HTTP Polling vs SSE

### HTTP Polling (mauvais pour temps réel)

```text
Client 1s ─→ Server "Y a des updates?"
           ← Server "Non"
Client 1s ─→ Server "Y a des updates?"
           ← Server "Oui! mesure=23.5"
```sql

**Problème** : latence 1s minimum, overhead réseau

---

## WebSocket vs HTTP Polling vs SSE (cont.)

### Server-Sent Events (SSE)

```text
Client ──→ Server "Subscribe updates"
Server ──→ Client "mesure=23.5"
Server ──→ Client "mesure=24.1"
Server ──→ Client "mesure=23.8"
```bash

**Avantage** : latence faible, une seule requête
**Limite** : unidirectionnel (server → client)

---

## WebSocket vs HTTP Polling vs SSE (final)

### WebSocket (meilleur pour temps réel bidirectionnel)

```text
┌──────────────────────────────────────┐
│ Client                    Server      │
│   │←─ mesure=23.5 ────→│              │
│   │←─ mesure=24.1 ────→│              │
│   │─ ack ────────────→│              │
│   │                     │              │
│ Connexion persistante   │              │
│ Bidirectionnelle        │              │
└──────────────────────────────────────┘
```text

**Meilleur pour** : temps réel bidirectionnel, IoT, dashboards

---

## WebSocket Handshake

### Request (Client)

```http
GET /ws HTTP/1.1
Host: localhost:8000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```http

---

## WebSocket Handshake (Response)

### Response (Server 101)

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```javascript

Après 101 : connexion HTTP devient WebSocket
**Pas de polling, vraie persistance**

---

## WebSocket Frame Format

```text
Byte 0:     FIN (1 bit) + RSV (3 bits) + Opcode (4 bits)
Byte 1:     MASK (1 bit) + Payload length (7 bits)
Bytes 2-3:  (si length=126) Extended payload length
Bytes 2-9:  (si length=127) Extended payload length
Bytes 0-3:  (si MASK=1) Masking key
Remaining:  Payload data
```json

**Opcode** :
- 0x1 = Text frame (JSON, UTF-8)
- 0x2 = Binary frame
- 0x8 = Close frame
- 0x9 = Ping frame

---

## ExploreIOT WebSocket Architecture

```javascript
// Frontend (Next.js)
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  console.log('Connected to server');
};

ws.onmessage = (event) => {
  const mesure = JSON.parse(event.data);
  console.log('Real-time mesure:', mesure);
  // Mise à jour UI
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from server');
  // Reconnect logic
};
```sql

---

## ExploreIOT Backend WebSocket

```python
from fastapi import FastAPI, WebSocket
from typing import List
import json

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Traiter message client
    except Exception as e:
        manager.disconnect(websocket)
```text

---

## Real-time Data Broadcasting

```python
from fastapi import FastAPI
from fastapi.background import BackgroundTasks
import asyncio

@app.on_event("startup")
async def startup():
    asyncio.create_task(broadcast_sensor_data())

async def broadcast_sensor_data():
    while True:
        # Lire dernière mesure depuis DB
        mesure = await get_latest_mesure()

        # Broadcast à tous clients WebSocket
        await manager.broadcast({
            "type": "mesure",
            "data": {
                "id": mesure.id,
                "capteur": mesure.capteur,
                "valeur": mesure.valeur,
                "timestamp": mesure.timestamp.isoformat()
            }
        })

        # Attendre 1s avant prochain broadcast
        await asyncio.sleep(1)
```javascript

---

## Reconnection avec Exponential Backoff

```javascript
class WebSocketReconnect {
  constructor(url, maxRetries = 5) {
    this.url = url;
    this.ws = null;
    this.retries = 0;
    this.maxRetries = maxRetries;
    this.backoffMs = 1000; // 1s initial
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      this.retries = 0; // Reset retries
      this.backoffMs = 1000; // Reset backoff
    };

    this.ws.onclose = () => {
      this.reconnect();
    };
  }

  reconnect() {
    if (this.retries >= this.maxRetries) {
      console.error('Max retries reached');
      return;
    }

    this.retries++;
    const delay = this.backoffMs * Math.pow(2, this.retries - 1);
    const maxDelay = 30000; // Cap at 30s
    const waitTime = Math.min(delay, maxDelay);

    console.log(`Reconnecting in ${waitTime}ms (attempt ${this.retries})`);
    setTimeout(() => this.connect(), waitTime);
  }
}

// Utilisation
const wsReconnect = new WebSocketReconnect('ws://localhost:8000/ws');
wsReconnect.connect();
```javascript

---

## Backoff Strategy Exemple

```text
Attempt 1: 1s          (1000ms)
Attempt 2: 2s          (2000ms)
Attempt 3: 4s          (4000ms)
Attempt 4: 8s          (8000ms)
Attempt 5: 16s         (16000ms)
Attempt 6: 30s (capped) (30000ms)
```text

**Avantage** : Réduit charge serveur, évite DDoS accidentel

---

## Bidirectional Communication

```javascript
// Client → Server
ws.send(JSON.stringify({
  type: "ack",
  messageId: 42,
  status: "received"
}));

// Server → Client (via broadcast)
{
  "type": "mesure",
  "data": { "id": 1, "valeur": 23.5 }
}

// Client → Server (commande)
ws.send(JSON.stringify({
  type: "command",
  action": "calibrate_sensor",
  sensor_id": 5
}));

// Server → Client (réponse)
{
  "type": "command_response",
  "status": "success"
}
```javascript

---

## Health Checks (Ping/Pong)

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()

            if data == "ping":
                await websocket.send_text("pong")
            else:
                # Traiter message normal
                pass
    except Exception as e:
        manager.disconnect(websocket)
```text

```javascript
// Client ping periodique
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send("ping");
  }
}, 30000); // Tous les 30s
```json

---

## Message Queuing Pattern

```javascript
class WebSocketQueue {
  constructor(url) {
    this.url = url;
    this.queue = [];
    this.ws = null;
    this.connect();
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Mettre en queue si déconnecté
      this.queue.push(data);
    }
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      // Envoyer messages en attente
      while (this.queue.length > 0) {
        const msg = this.queue.shift();
        this.ws.send(JSON.stringify(msg));
      }
    };
  }
}
```json

---

## Performance Considerations

**Avantages** :
- ✅ Faible latence (< 100ms)
- ✅ Peu d'overhead réseau
- ✅ Bidirectionnel
- ✅ Pas de polling overhead

**Inconvénients** :
- ❌ Consomme plus mémoire serveur (connexions persistantes)
- ❌ Firewall/proxy peuvent bloquer
- ❌ Plus complexe que HTTP

**Quand utiliser** :
- Dashboards temps réel ✅
- Chat ✅
- Jeux multiplayer ✅
- Simple CRUD API ❌

---

## ExploreIOT Real-time Dashboard

```javascript
// Frontend: Affiche mesures en temps réel

const [mesures, setMesures] = useState([]);

const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);

  if (type === 'mesure') {
    setMesures(prev => [
      data,
      ...prev.slice(0, 9) // Garder 10 dernières
    ]);
  }
};

return (
  <div>
    <h1>ExploreIOT - Temps Réel</h1>
    {mesures.map(m => (
      <div key={m.id}>
        {m.capteur}: {m.valeur}°C
      </div>
    ))}
  </div>
);
```bash

---

## Bonnes Pratiques WebSocket

- ✅ Implémenter reconnection avec backoff exponentiel
- ✅ Valider et sanitizer messages
- ✅ Implémenter ping/pong pour health checks
- ✅ Limiter taille des messages
- ✅ Monitorer connections actives
- ✅ Graceful shutdown (close handshake)
- ✅ Documenter message format (JSON schema)

**ExploreIOT** : Utilise /ws pour broadcasts temps réel

---

## Debugging WebSocket

```javascript
// Détailler logs
ws.addEventListener('open', () => {
  console.log('[WS] Connected');
});

ws.addEventListener('message', (event) => {
  console.log('[WS] Received:', event.data);
});

ws.addEventListener('close', () => {
  console.log('[WS] Closed');
});

ws.addEventListener('error', (event) => {
  console.log('[WS] Error:', event);
});
```json

```bash
# Browser DevTools
# F12 → Network → Filter "ws" → Click /ws → Messages tab
```

!!! tip "Appliquer dans ExploreIOT"
    - Le endpoint `/ws` broadcaste les mesures MQTT en temps réel à tous les clients connectés
    - L'authentification WebSocket utilise le pattern "first-message" (pas de query params)
    - Voir le [journal — WebSocket reconnection](../journal/websocket-reconnection.md) pour le backoff exponentiel
