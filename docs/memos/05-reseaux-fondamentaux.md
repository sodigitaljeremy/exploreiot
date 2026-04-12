---
marp: true
theme: default
paginate: true
header: "ExploreIOT — Fondamentaux CS"
footer: "Memo #05 — Réseaux fondamentaux"
---

# Réseaux fondamentaux

Comprendre les modèles, protocoles et ports pour ExploreIOT

---

## Modèle TCP/IP (4 couches)

```text
┌────────────────────────────────────────┐
│ Application (HTTP, MQTT, WebSocket)    │ Couche 4
├────────────────────────────────────────┤
│ Transport (TCP, UDP)                   │ Couche 3
├────────────────────────────────────────┤
│ Internet (IP, IPv4, IPv6)              │ Couche 2
├────────────────────────────────────────┤
│ Link (Ethernet, WiFi)                  │ Couche 1
└────────────────────────────────────────┘
```text

- **Simple et pragmatique**
- Utilisé partout en production
- 4 niveaux d'abstraction

---

## Modèle OSI (7 couches)

```text
7. Application (HTTP, MQTT, DNS)
6. Presentation (Encoding, Compression)
5. Session (Connection management)
4. Transport (TCP, UDP)
3. Network (IP, Routing)
2. Data Link (MAC, Ethernet)
1. Physical (Cables, Signals)
```text

- **Plus académique**
- TCP/IP = couches 1-4 OSI simplifiées
- Utile pour la théorie, TCP/IP pour la pratique

---

## Ports : Well-known (0-1023)

ExploreIOT utilise plusieurs ports critiques :

```text
Port 80   → HTTP (non chiffré)
Port 443  → HTTPS (chiffré TLS)
Port 5432 → PostgreSQL (base données)
```sql

Requirent les permissions administrateur (root) sur Linux.

**ExploreIOT** : PostgreSQL écoute sur **5432** (interne)

---

## Ports : Registered (1024-49151)

Attribués par IANA, usage moins strict :

```text
Port 1883  → MQTT (broker)
Port 3306  → MySQL
Port 6379  → Redis
Port 8000  → Application web (HTTP alternatif)
Port 8080  → Proxy, reverse proxy
```http

**ExploreIOT** : FastAPI écoute sur **8000**, MQTT sur **1883**

---

## Ports : Dynamic (49152-65535)

```text
Client ports ephemeres (OS affecte automatiquement)
Exemple: port 54321 pour une connexion sortante
```typescript

---

## DNS Resolution

Traduction domaine → adresse IP :

```bash
# Requête DNS
$ dig example.com

# Réponse
example.com.  300  IN  A  93.184.216.34
```text

**Processus DNS** :
1. Client → Resolver local (8.8.8.8)
2. Resolver → Root nameserver
3. Root → TLD (.com) nameserver
4. TLD → Authoritative nameserver
5. Réponse IP retournée

**ExploreIOT** : Utilise `localhost:8000` (résolu via `/etc/hosts`)

---

## Handshake TLS/SSL

Sécuriser la communication HTTPS/WSS :

```text
Client                              Server
  |                                   |
  |-------- ClientHello ----------->  |
  |                                   |
  |<------ ServerHello + Cert ----    |
  |                                   |
  |-------- ClientKeyExchange -----> |
  |                                   |
  |-- ChangeCipherSpec, Finished -->  |
  |                                   |
  |<- ChangeCipherSpec, Finished ---  |
  |                                   |
  |====== Encrypted Channel ======>   |
```bash

---

## MQTT Protocol (Port 1883)

Message Queuing Telemetry Transport :

```javascript
// Pub/Sub pattern
broker.publish("sensor/temperature", "23.5");
client.subscribe("sensor/humidity");
// Reçoit : { topic: "sensor/humidity", payload: "45.2" }
```sql

**Caractéristiques** :
- Léger (header 2 bytes)
- QoS 0, 1, 2
- Last Will Testament
- **Port : 1883** (1883s pour TLS)

**ExploreIOT** : MQTT broker sur **localhost:1883**

---

## HTTP Protocol (Port 8000)

Hypertext Transfer Protocol :

```http
GET /api/mesures HTTP/1.1
Host: localhost:8000
Content-Type: application/json

200 OK
Content-Type: application/json

[{"capteur": "temp", "valeur": 23.5}]
```javascript

**Methods** : GET, POST, PUT, DELETE, PATCH
**Status codes** : 2xx (success), 4xx (client), 5xx (server)

**ExploreIOT** : FastAPI sur **localhost:8000**

---

## WebSocket Protocol (Port 8000/ws)

Upgrade HTTP → WebSocket :

```javascript
// Client
const ws = new WebSocket("ws://localhost:8000/ws");
ws.onmessage = (event) => {
  console.log("Mesure temps réel:", event.data);
};

// Server (FastAPI)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"mesure": 23.5})
```python

**Avantages** :
- Bidirectionnel
- Latence faible
- Persistant

**ExploreIOT** : WebSocket sur **localhost:8000/ws**

---

## Architecture Réseau ExploreIOT

```text
┌─────────────────────────────────────┐
│   Frontend (Next.js)                │
│   Port: 3000                        │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┐
       │       │       │
   HTTP:8000  WS:8000  MQTT:1883
       │       │       │
       └───────┼───────┘
               │
┌──────────────▼──────────────────────┐
│   Backend (FastAPI)                 │
│   Port: 8000                        │
│   - /api/* (HTTP)                   │
│   - /ws (WebSocket)                 │
│   - MQTT client                     │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┐
       │       │       │
  PostgreSQL  MQTT     Redis
    :5432    :1883    :6379
       │       │       │
```sql

---

## Ports Récapitulatif ExploreIOT

| Service | Port | Protocole | Type |
|---------|------|-----------|------|
| Frontend | 3000 | HTTP | Next.js dev |
| FastAPI | 8000 | HTTP/WS | Python backend |
| PostgreSQL | 5432 | TCP | Données |
| MQTT Broker | 1883 | MQTT | IoT messages |
| Redis | 6379 | Redis | Cache |

---

## Packet Flow : GET /api/mesures

```text
1. Client DNS: "localhost" → 127.0.0.1
2. Client TCP: SYN → Server:8000
3. Server TCP: SYN-ACK → Client
4. Client TCP: ACK → Server
5. Client HTTP: GET /api/mesures
6. Server HTTP: 200 OK + JSON
7. Client TCP: FIN → Server
8. Server TCP: FIN-ACK → Client
```javascript

---

## Packet Flow : WebSocket Upgrade

```text
1. Client HTTP: GET /ws + Upgrade header
2. Server HTTP: 101 Switching Protocols
3. Client ↔ Server: WebSocket frames (bidirectionnel)
   → Message: {"capteur": "temp", "valeur": 23.5}
   ← Ack: {"reçu": true}
```bash

---

## Bonnes Pratiques Réseaux

- ✅ Toujours spécifier le port explicitement
- ✅ Utiliser TLS/SSL pour production (443, 1883s)
- ✅ Monitorer les ports avec `netstat` / `ss`
- ✅ Firewall : ouvrir seulement ports nécessaires
- ✅ MQTT : authentifier clients (username/password)
- ✅ HTTP : valider headers, CORS, rate limiting

**ExploreIOT** : 3000 (frontend) + 8000 (backend) + 1883 (MQTT)

---

## Outils Diagnostic

```bash
# Voir ports ouverts
ss -tuln

# Tester connexion
telnet localhost 8000

# Trace DNS
nslookup localhost

# Monitor trafic
tcpdump -i lo port 8000

# Info interface réseau
ip addr show
```bash

!!! tip "Appliquer dans ExploreIOT"
    - MQTT sur port 1883 (broker Mosquitto) pour les messages capteur
    - HTTP sur port 8000 (FastAPI) pour l'API REST
    - WebSocket sur port 8000/ws pour le temps réel
    - Voir le [journal — Patterns MQTT](../journal/mqtt-patterns.md) pour l'architecture pub/sub
