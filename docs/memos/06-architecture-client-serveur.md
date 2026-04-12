---
marp: true
theme: default
paginate: true
header: "ExploreIOT — Fondamentaux CS"
footer: "Memo #06 — Architecture client-serveur"
---

# Architecture client-serveur

Modèles, REST, HTTP et implémentation ExploreIOT

---

## Client-Server vs P2P

### Client-Server

```text
Client 1      Client 2      Client 3
  │             │             │
  └─────────────┼─────────────┘
                │
            Server
         (centralisé)
```text

- ✅ Contrôle centralisé
- ✅ Gestion identité/auth
- ❌ Point unique de défaillance

---

## Client-Server vs P2P (cont.)

### Peer-to-Peer

```text
Client 1 ←→ Client 2
  ↑          ↑
  └──→ Client 3 ←──┘
```text

- ✅ Résilient (pas de point défaillance)
- ❌ Complexe (sync, découverte)
- ❌ Sécurité difficile

**ExploreIOT** : Architecture client-server avec FastAPI

---

## REST Principles

**RE**presentational **S**tate **T**ransfer :

```text
1. Client-Server (séparation responsabilités)
2. Stateless (chaque requête autonome)
3. Cacheable (réponses marquées)
4. Uniform Interface (conventions URL)
5. Layered System (proxies, load balancers)
6. Code on Demand (optionnel)
```typescript

---

## HTTP Verbs (Méthodes)

| Verb | Idempotent | Safe | Cacheable | Exemple |
|------|-----------|------|-----------|---------|
| GET | ✅ | ✅ | ✅ | `/api/mesures` |
| POST | ❌ | ❌ | ⚠️ | Créer ressource |
| PUT | ✅ | ❌ | ❌ | Remplacer entier |
| DELETE | ✅ | ❌ | ❌ | Supprimer |
| PATCH | ❌ | ❌ | ❌ | Mise à jour partielle |

---

## GET : Lire les données

```javascript
// Client
fetch('/api/mesures')
  .then(r => r.json())
  .then(data => console.log(data));

// Request HTTP
GET /api/mesures HTTP/1.1
Host: localhost:8000

// Response
200 OK
[
  { "id": 1, "capteur": "temp", "valeur": 23.5 },
  { "id": 2, "capteur": "humidite", "valeur": 45.2 }
]
```bash

**Idempotent** : appeler 10 fois = 1 fois
**Safe** : ne modifie rien côté serveur

---

## POST : Créer une ressource

```javascript
// Client
fetch('/api/mesures', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capteur: 'temp',
    valeur: 24.1
  })
})
.then(r => r.json());

// Request HTTP
POST /api/mesures HTTP/1.1
Content-Type: application/json

{"capteur": "temp", "valeur": 24.1}

// Response
201 Created
Location: /api/mesures/3
{ "id": 3, "capteur": "temp", "valeur": 24.1 }
```bash

---

## PUT : Remplacer entièrement

```javascript
// Client
fetch('/api/mesures/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capteur: 'temperature',
    valeur: 25.0
  })
});

// Request HTTP
PUT /api/mesures/1 HTTP/1.1
Content-Type: application/json

{"capteur": "temperature", "valeur": 25.0}

// Response
200 OK
{ "id": 1, "capteur": "temperature", "valeur": 25.0 }
```bash

---

## DELETE : Supprimer une ressource

```javascript
// Client
fetch('/api/mesures/1', {
  method: 'DELETE'
});

// Request HTTP
DELETE /api/mesures/1 HTTP/1.1

// Response
204 No Content
```text

---

## PATCH : Mise à jour partielle

```javascript
// Client
fetch('/api/mesures/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ valeur: 25.5 })
});

// Request HTTP
PATCH /api/mesures/1 HTTP/1.1
Content-Type: application/json

{"valeur": 25.5}

// Response
200 OK
{ "id": 1, "capteur": "temp", "valeur": 25.5 }
```javascript

---

## HTTP Status Codes 2xx (Success)

```http
200 OK                Requête réussie, réponse dans body
201 Created           Ressource créée (POST)
202 Accepted          Traitement asynchrone accepté
204 No Content        Succès, pas de body (DELETE)
206 Partial Content   Range request
```javascript

**ExploreIOT** : utilise 200, 201, 204

---

## HTTP Status Codes 4xx (Client Error)

```http
400 Bad Request       Syntaxe invalide
401 Unauthorized      Authentification manquante
403 Forbidden         Authentification ok, accès refusé
404 Not Found         Ressource inexistante
409 Conflict          Conflit (ex: doublon)
422 Unprocessable     Validation échouée
429 Too Many Requests Rate limit dépassé
```typescript

---

## HTTP Status Codes 5xx (Server Error)

```http
500 Internal Server Error  Erreur non-spécifiée
501 Not Implemented        Endpoint non implémenté
502 Bad Gateway            Backend pas accessible
503 Service Unavailable    Maintenance / surcharge
504 Gateway Timeout        Timeout backend
```text

---

## ExploreIOT FastAPI Endpoints

```python
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS enabled for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/mesures")
async def get_mesures():
    # SELECT * FROM mesures
    return [...]

@app.post("/api/mesures")
async def create_mesure(mesure: MesureSchema):
    # INSERT INTO mesures
    return {"id": 3, ...}

@app.get("/api/mesures/{id}")
async def get_mesure(id: int):
    # SELECT * FROM mesures WHERE id = ?
    return {...}

@app.put("/api/mesures/{id}")
async def update_mesure(id: int, data: MesureSchema):
    # UPDATE mesures SET ...
    return {...}

@app.delete("/api/mesures/{id}")
async def delete_mesure(id: int):
    # DELETE FROM mesures WHERE id = ?
    return {"deleted": True}
```python

---

## Frontend fetch() API

```javascript
// GET
const mesures = await fetch('/api/mesures')
  .then(r => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

// POST
const newMesure = await fetch('/api/mesures', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ capteur: 'temp', valeur: 23.5 })
}).then(r => r.json());

// Error handling
try {
  const response = await fetch('/api/mesures/999');
  if (response.status === 404) {
    console.error('Mesure introuvable');
  }
} catch (error) {
  console.error('Erreur réseau:', error);
}
```json

---

## CORS (Cross-Origin Resource Sharing)

Permettre requêtes cross-domain :

```text
Frontend: http://localhost:3000
Backend: http://localhost:8000

Browser bloque par défaut sauf si backend répond:
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type
```typescript

**ExploreIOT** : FastAPI CORSMiddleware active

---

## Request/Response Cycle

```text
1. Client construit requête HTTP
   GET /api/mesures?limit=10 HTTP/1.1
   Host: localhost:8000

2. Traverse réseau TCP/IP

3. Serveur reçoit, parse, route
   → FastAPI router("GET", "/api/mesures")

4. Handler exécute logique
   → SELECT * FROM mesures LIMIT 10

5. Serveur construit réponse HTTP
   200 OK
   Content-Type: application/json
   [...]

6. Traverse réseau

7. Client reçoit, parse, utilise data
```text

---

## Statelessness Principle

**Chaque requête doit être autonome** :

```javascript
// ✅ BON: token dans chaque requête
fetch('/api/mesures', {
  headers: {
    'Authorization': 'Bearer eyJhb...'
  }
});

// ❌ MAUVAIS: dépend de session serveur
// Premier request: POST /login → session_id
// Deuxième request: GET /mesures (session_id en mémoire serveur)
```http

**Avantage** : Scale horizontalement (load balancer)

---

## Caching Strategique

```http
GET /api/mesures HTTP/1.1

200 OK
Cache-Control: max-age=60
ETag: "abc123"

Requête 2 (< 60s):
→ Browser sert depuis cache (pas requête réseau)

Requête 3 (> 60s):
→ If-None-Match: "abc123"
← 304 Not Modified (contenu inchangé)
```text

---

## ExploreIOT Architecture Complète

```text
┌─────────────────────────────────────────┐
│         Frontend Next.js                │
│         http://localhost:3000           │
│   - Affiche mesures (GET /api/mesures) │
│   - Ajoute mesure (POST /api/mesures)  │
│   - WebSocket stream temps réel        │
└────────────────────┬────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
      GET/POST       WS        MQTT
      :8000         :8000      :1883
         │           │           │
┌────────▼──────────▼┴──────────▼─────┐
│      Backend FastAPI                │
│      http://localhost:8000          │
│  ✓ REST endpoints (/api/*)          │
│  ✓ WebSocket (/ws)                  │
│  ✓ MQTT client                      │
└────────┬──────────────────────┬─────┘
         │                      │
      TCP:5432              MQTT:1883
         │                      │
    PostgreSQL          MQTT Broker
```sql

---

## Bonnes Pratiques

- ✅ Utiliser HTTP verbs correctement
- ✅ Status codes appropriés
- ✅ Content-Type: application/json
- ✅ Valider input côté client ET serveur
- ✅ Documenter API (OpenAPI/Swagger)
- ✅ Rate limiting (429)
- ✅ Error messages lisibles

**ExploreIOT** : Suit ces standards avec FastAPI

---

## Debugging Tools

```bash
# cURL tester API
curl -X GET http://localhost:8000/api/mesures

# Headers inspection
curl -i http://localhost:8000/api/mesures

# POST avec data
curl -X POST http://localhost:8000/api/mesures \
  -H "Content-Type: application/json" \
  -d '{"capteur":"temp","valeur":23.5}'

# Browser DevTools
# F12 → Network → Voir requêtes
```bash
