# Référence API

Documentation complète des endpoints de l'API ExploreIOT (FastAPI, version 0.4.0).

URL de base : `http://localhost:8000` (développement)

La documentation interactive Swagger est disponible à : [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Endpoints publics

Ces endpoints ne nécessitent pas d'authentification.

---

### GET /

Retourne les informations générales sur le service API.

**Authentification** : aucune

**Réponse 200 :**

```json
{
  "success": true,
  "service": "ExploreIOT Dashboard API",
  "version": "0.4.0",
  "status": "ok"
}
```

**Exemple curl :**

```text
curl -s http://localhost:8000/ | python3 -m json.tool
```

---

### GET /health

Vérifie l'état de santé de l'API et de la connexion à la base de données. Utilisé par Docker pour les healthchecks et par les systèmes de monitoring externes.

**Authentification** : aucune

**Réponse 200 — tout est opérationnel :**

```json
{
  "success": true,
  "api": true,
  "database": true,
  "status": "ok",
  "timestamp": "2026-04-11T14:00:00.000000"
}
```

**Réponse 200 — base de données injoignable :**

```json
{
  "success": true,
  "api": true,
  "database": false,
  "status": "degraded",
  "timestamp": "2026-04-11T14:00:00.000000"
}
```

**Exemple curl :**

```bash
curl -s http://localhost:8000/health | python3 -m json.tool
```

---

## Endpoints protégés

Si la variable `API_KEY` est configurée, ces endpoints nécessitent le header suivant :

```text
X-API-Key: <votre-clé>
```

Si `API_KEY` est vide (valeur par défaut en développement), l'authentification est désactivée et tous les endpoints sont accessibles sans header.

---

### GET /devices

Retourne la liste de tous les capteurs ayant émis au moins une mesure dans les dernières 24 heures.

**Authentification** : header `X-API-Key` requis si `API_KEY` configuré

**Réponse 200 :**

```json
{
  "success": true,
  "devices": [
    {
      "device_id": "a1b2c3d4e5f60001",
      "nb_mesures": 42,
      "temp_moyenne": 22.5,
      "temp_min": 19.8,
      "temp_max": 26.3,
      "derniere_mesure": "2026-04-11T14:30:05.123456"
    },
    {
      "device_id": "a1b2c3d4e5f60002",
      "nb_mesures": 38,
      "temp_moyenne": 24.1,
      "temp_min": 21.0,
      "temp_max": 27.9,
      "derniere_mesure": "2026-04-11T14:29:55.654321"
    }
  ]
}
```

**Exemple curl :**

```bash
# Sans authentification
curl -s http://localhost:8000/devices | python3 -m json.tool

# Avec authentification
curl -s -H "X-API-Key: votre-cle-api" http://localhost:8000/devices | python3 -m json.tool
```

---

### GET /devices/{device_id}/metrics

Retourne l'historique des mesures d'un capteur spécifique.

**Authentification** : header `X-API-Key` requis si `API_KEY` configuré

**Paramètres de chemin :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `device_id` | string | Identifiant du capteur (ex: `a1b2c3d4e5f60001`) |

**Paramètres de requête :**

| Paramètre | Type | Défaut | Plage | Description |
|-----------|------|--------|-------|-------------|
| `limit` | entier | 20 | 1–1000 | Nombre de mesures à retourner (les plus récentes en premier) |

**Réponse 200 :**

```json
{
  "success": true,
  "device_id": "a1b2c3d4e5f60001",
  "mesures": [
    {
      "id": 1523,
      "temperature": 24.3,
      "humidite": 61.2,
      "recu_le": "2026-04-11T14:30:05.123456"
    },
    {
      "id": 1522,
      "temperature": 23.9,
      "humidite": 61.5,
      "recu_le": "2026-04-11T14:30:00.789012"
    }
  ]
}
```

**Réponse 404 — capteur inconnu ou aucune mesure :**

```json
{
  "error": "Aucune mesure trouvée pour le capteur a1b2c3d4e5f60099"
}
```

**Exemples curl :**

```bash
# 20 dernières mesures (défaut)
curl -s "http://localhost:8000/devices/a1b2c3d4e5f60001/metrics" | python3 -m json.tool

# 100 dernières mesures
curl -s "http://localhost:8000/devices/a1b2c3d4e5f60001/metrics?limit=100" | python3 -m json.tool

# Avec authentification
curl -s -H "X-API-Key: votre-cle-api" \
  "http://localhost:8000/devices/a1b2c3d4e5f60001/metrics?limit=50" | python3 -m json.tool
```

---

### GET /alerts

Analyse les données récentes et retourne les anomalies détectées. Deux types d'alertes sont générés :

- **TEMPERATURE_ELEVEE** : la dernière mesure dépasse `ALERT_TEMP_THRESHOLD` (défaut : 33°C)
- **CAPTEUR_SILENCIEUX** : aucune mesure reçue depuis plus de `ALERT_SILENCE_MINUTES` minutes (défaut : 10 min)

**Authentification** : header `X-API-Key` requis si `API_KEY` configuré

**Réponse 200 — avec alertes :**

```json
{
  "success": true,
  "nb_alertes": 2,
  "alertes": [
    {
      "type": "TEMPERATURE_ELEVEE",
      "device_id": "a1b2c3d4e5f60001",
      "message": "Température élevée : 35.2°C (seuil : 33°C)",
      "temperature": 35.2,
      "recu_le": "2026-04-11T14:32:10.000000"
    },
    {
      "type": "CAPTEUR_SILENCIEUX",
      "device_id": "a1b2c3d4e5f60002",
      "message": "Aucune mesure depuis 12 minutes",
      "derniere_mesure": "2026-04-11T14:20:05.000000"
    }
  ]
}
```

**Réponse 200 — sans alerte :**

```json
{
  "success": true,
  "nb_alertes": 0,
  "alertes": []
}
```

**Exemple curl :**

```bash
curl -s http://localhost:8000/alerts | python3 -m json.tool
```

---

### GET /stats

Retourne les statistiques agrégées de tous les capteurs actifs.

**Authentification** : header `X-API-Key` requis si `API_KEY` configuré

**Réponse 200 :**

```json
{
  "success": true,
  "stats": {
    "nb_devices": 3,
    "total_mesures": 1500,
    "temp_moyenne_globale": 23.4,
    "derniere_activite": "2026-04-11T14:30:05.123456"
  }
}
```

**Exemple curl :**

```bash
curl -s http://localhost:8000/stats | python3 -m json.tool
```

---

### WebSocket /ws

Connexion WebSocket pour recevoir les nouvelles mesures en temps réel, dès qu'elles sont ingérées par le subscriber MQTT.

**URL** : `ws://localhost:8000/ws`

**Authentification** : pattern first-message

Le client se connecte sans paramètres, puis envoie immédiatement un message d'authentification. Le serveur valide le token avec `hmac.compare_digest` et ferme la connexion avec le code **4001** (Unauthorized) si la validation échoue ou si aucun message d'authentification n'est reçu dans les 5 secondes.

**Codes de fermeture WebSocket** :

| Code | Signification |
|------|---------------|
| 4001 | Unauthorized — token invalide ou manquant |
| 4001 | Auth timeout — aucun message d'authentification reçu après 5 secondes |

**Maintien de la connexion** : le client envoie régulièrement un message de type `ping`. Le serveur répond avec un message de type `pong`.

**Messages reçus** :

Le serveur envoie plusieurs types de messages :

1. `new_mesure` — nouvelle mesure en temps réel :

```json
{
  "type": "new_mesure",
  "device_id": "a1b2c3d4e5f60001",
  "temperature": 24.5,
  "humidite": 60.3,
  "recu_le": "2026-04-11T14:30:05.123456"
}
```

2. `pong` — réponse au keepalive du client :

```json
{
  "type": "pong"
}
```

3. `debug_mqtt` — messages de debug MQTT (si l'inspecteur est actif) :

```json
{
  "type": "debug_mqtt",
  "topic": "application/1/device/a1b2c3d4e5f60001/event/up",
  "payload": "{...}",
  "timestamp": "2026-04-12T10:00:05.123456"
}
```

**Limite de connexions** : contrôlée par `MAX_WS_CONNECTIONS` (défaut : 50 connexions simultanées)

**Exemple avec wscat :**

```bash
# Installer wscat
npm install -g wscat

# Se connecter
wscat -c ws://localhost:8000/ws

# Envoyer l'authentification (dans le prompt wscat)
> {"type":"auth","token":"votre-cle-api"}

# Envoyer un ping pour tester la connexion
> {"type":"ping"}
```

**Exemple JavaScript (navigateur) :**

```javascript
const ws = new WebSocket("ws://localhost:8000/ws");

ws.onopen = () => {
  // Envoyer l'authentification immédiatement après l'ouverture
  ws.send(JSON.stringify({ type: "auth", token: "votre-cle-api" }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "new_mesure") {
    console.log(`[${data.device_id}] Temp: ${data.temperature}°C, Hum: ${data.humidite}%`);
  } else if (data.type === "pong") {
    console.log("Connexion active");
  } else if (data.type === "debug_mqtt") {
    console.log(`[MQTT] ${data.topic}: ${data.payload}`);
  }
};

ws.onerror = (err) => {
  console.error("WebSocket error:", err);
};

ws.onclose = (event) => {
  if (event.code === 4001) {
    console.error("Authentification échouée ou timeout");
  }
};

// Keepalive : envoyer un ping toutes les 30 secondes
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping" }));
  }
}, 30000);
```

---

### GET /status

Retourne le statut détaillé de tous les services du système. Utilisé par le composant `ConnectionStatus` du frontend pour afficher le panneau de statut en mode API.

**Authentification** : aucune

**Réponse 200 :**

```json
{
  "success": true,
  "api": true,
  "version": "0.4.0",
  "uptime_seconds": 3600,
  "database": {
    "connected": true,
    "mesure_count": 1500
  },
  "mqtt": {
    "connected": true,
    "buffer_size": 12
  },
  "websocket": {
    "clients": 2
  },
  "publisher": {
    "interval_seconds": 5
  }
}
```

**Exemple curl :**

```bash
curl -s http://localhost:8000/status | python3 -m json.tool
```

---

### GET /debug/recent-messages

Retourne les 50 derniers messages MQTT bruts reçus par le backend. Utile pour le débogage et l'inspecteur de protocoles du frontend.

**Authentification** : header `X-API-Key` requis si `API_KEY` configuré

**Réponse 200 :**

```json
{
  "success": true,
  "messages": [
    {
      "topic": "application/1/device/a1b2c3d4e5f60001/event/up",
      "payload": "{\"deduplicationId\":\"...\",\"deviceInfo\":{...},\"data\":\"CZICjQ==\"}",
      "timestamp": "2026-04-12T10:00:05.123456"
    }
  ]
}
```

**Exemple curl :**

```bash
curl -s http://localhost:8000/debug/recent-messages | python3 -m json.tool
```

---

## Codes d'erreur courants

| Code HTTP | Cause | Solution |
|-----------|-------|----------|
| 401 | `X-API-Key` manquant ou invalide | Vérifier la valeur de `API_KEY` dans `.env` |
| 404 | Capteur non trouvé | Vérifier le `device_id` via `GET /devices` |
| 422 | Paramètre `limit` hors plage (1–1000) | Utiliser une valeur entre 1 et 1000 |
| 429 | Rate limit atteint | Attendre avant de renvoyer la requête (voir `RATE_LIMIT_DEFAULT`) |
| 500 | Erreur interne | Consulter les logs : `docker compose logs api` |
