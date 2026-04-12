# Modèle de sécurité

ExploreIOT est conçu pour un déploiement local ou sur un réseau privé. Le modèle de sécurité couvre l'authentification, la limitation de débit, l'isolation des conteneurs, la validation des données entrantes et la protection des canaux de communication.

## 1. Authentification API (X-API-Key)

### Fonctionnement

Toutes les routes de l'API protégées exigent un en-tête HTTP :

```text
X-API-Key: votre-clé-secrète
```

La clé est configurée via la variable d'environnement `API_KEY` dans le fichier `.env`.

### Mode développement

Si `API_KEY` est vide ou absent, **l'authentification est désactivée**. Toutes les requêtes sont acceptées sans en-tête. Ce mode est adapté au développement local où la sécurité n'est pas critique.

```bash
# .env en développement
API_KEY=

# .env en production
API_KEY=un-secret-long-et-aleatoire
```

### Comparaison timing-safe avec `hmac.compare_digest`

La vérification de la clé n'utilise pas l'opérateur `==` classique de Python, mais `hmac.compare_digest` :

```python
import hmac

def verify_api_key(provided_key: str, expected_key: str) -> bool:
    return hmac.compare_digest(provided_key, expected_key)
```

**Pourquoi est-ce important ?**

Une comparaison de chaînes ordinaire (`provided == expected`) s'arrête dès qu'elle trouve un caractère différent. Le temps d'exécution varie donc selon le nombre de caractères corrects au début de la clé testée. Un attaquant peut exploiter cette différence de timing (quelques nanosecondes) pour deviner la clé octet par octet, sans avoir besoin de la forcer en entier.

`hmac.compare_digest` compare **toujours les deux chaînes en intégralité**, caractère par caractère, en temps constant quel que soit le résultat. Il ne laisse fuir aucune information sur la longueur ou le contenu du secret.

## 2. Authentification WebSocket (First-Message Pattern)

### Fonctionnement

Le protocole WebSocket utilise un pattern d'authentification basé sur le **premier message**, et non sur les paramètres de requête. Ce choix prévient l'exposition du token dans les logs du serveur et des proxies.

**Étapes de connexion :**

1. **Établissement de la connexion** : Le client établit une connexion WebSocket **sans paramètre de requête** :
   ```text
   ws://localhost:8000/ws
   ```

2. **Acceptation du serveur** : Le serveur accepte la connexion :
   ```python
   await websocket.accept()
   ```

3. **Envoi du token au premier message** : Le client envoie immédiatement un message avec le token API :
   ```json
   { "type": "auth", "token": "votre-clé-secrète" }
   ```

4. **Validation et handshake sécurisé** : Le serveur valide le token avec comparaison timing-safe :
   ```python
   if not hmac.compare_digest(provided_token, API_KEY):
       await websocket.close(code=4001, reason="Authentication failed")
       return
   ```

**Implémentation côté frontend** (hooks/useWebSocket.ts) :

```javascript
ws.onopen = () => {
  if (API_KEY) {
    ws.send(JSON.stringify({ type: "auth", token: API_KEY }))
  }
}
```

### Timeout d'authentification

Le serveur impose un **timeout de 5 secondes** après l'établissement de la connexion. Si le message d'authentification n'est pas reçu dans ce délai, la connexion est fermée automatiquement :

```python
auth_timeout = asyncio.wait_for(websocket.receive_text(), timeout=5.0)
```

Cela prévient les connexions zombies ou les tentatives d'attaque de déni de service par connexions non authentifiées.

### Code de fermeture

En cas d'authentification échouée, le serveur ferme la connexion avec le code WebSocket **4001 (Custom)** :

```text
Code: 4001
Raison: Authentication failed
```

Le client peut ainsi distinguer une erreur d'authentification d'une déconnexion normale.

### Pourquoi pas les paramètres de requête ?

Les paramètres de requête dans l'URL (`?token=...`) présentent un risque de sécurité critique :

- **Exposition dans les logs serveur** : Le serveur HTTP/WebSocket enregistre l'URL complète, y compris les paramètres
- **Exposition dans les logs proxy** : Les reverse proxies et load balancers enregistrent également l'URL
- **Exposition dans l'historique du navigateur** : Le token reste visible dans l'historique
- **Exposition en monitoring** : Les outils de monitoring capturent l'URL pour la analyse

Le pattern du premier message envoie le token **après** l'établissement de la connexion TLS/WebSocket, via le canal chiffré, sans qu'il n'apparaisse jamais dans les logs d'URL.

## 3. Support MQTT avec TLS

### Configuration

Le backend supporte une connexion MQTT sécurisée avec TLS (Transport Layer Security). Deux variables d'environnement contrôlent ce comportement :

```bash
# Active le TLS pour les connexions MQTT
MQTT_TLS=1

# Chemin vers le fichier CA certificates (optionnel)
MQTT_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
```

### Implémentation

La validation TLS est appliquée dans `mqtt_handler.py`, `subscriber.py` et `publisher.py` :

```python
MQTT_TLS = os.environ.get("MQTT_TLS", "").lower() in ("1", "true", "yes")
MQTT_CA_CERTS = os.environ.get("MQTT_CA_CERTS", "")

if MQTT_TLS:
    import ssl
    client.tls_set(
        ca_certs=MQTT_CA_CERTS if MQTT_CA_CERTS else None,
        cert_reqs=ssl.CERT_REQUIRED if MQTT_CA_CERTS else ssl.CERT_NONE,
    )
```

**Modes de validation :**

| Mode | Condition | Validation |
|------|-----------|-----------|
| Validation stricte | `MQTT_TLS=1` et `MQTT_CA_CERTS=/chemin/vers/ca.crt` | Certificat serveur validé contre la CA fournie |
| Validation partielle | `MQTT_TLS=1` sans `MQTT_CA_CERTS` | TLS activé sans validation de certificat (accept all) |
| Non chiffré | `MQTT_TLS=0` ou absent | Connexion MQTT en clair |

**Recommandation production** : Toujours fournir `MQTT_CA_CERTS` pointant vers les certificats CA de confiance du système d'exploitation ou une CA interne.

## 4. Validation des credentials au démarrage

### Fail-fast en production

Le backend valide les credentials configurées au démarrage (dans `config.py`). Si une configuration dangereuse est détectée en production, le processus s'arrête immédiatement :

```python
if ENVIRONMENT == "production":
    # Refuse les mots de passe par défaut
    if DB_PASSWORD == "change_me_in_production":
        raise RuntimeError("DB_PASSWORD must be changed from default in production mode")

    if MQTT_PASSWORD == "exploreiot_mqtt":
        raise RuntimeError("MQTT_PASSWORD must be changed from default in production mode")

# Refuse les configurations incohérentes
if MQTT_USER and not MQTT_PASSWORD:
    raise RuntimeError("MQTT_PASSWORD must be set when MQTT_USER is configured")
```

**Impacts :**

- En production, l'absence d'une clé API valide empêche le démarrage
- Les mots de passe par défaut sont détectés et refusés
- Une configuration d'authentification incomplète (utilisateur sans mot de passe) est détectée

Cette validation "fail-fast" prévient les déploiements accidentels avec une sécurité affaiblie.

## 5. Authentification du endpoint debug

### Endpoint `/debug/recent-messages`

Le endpoint de diagnostic `GET /debug/recent-messages` est protégé par authentification API :

```python
router = APIRouter(
    prefix="/debug",
    tags=["debug"],
    dependencies=[Depends(verify_api_key)]
)
```

**Tous les endpoints debug** héritent de cette dépendance. L'accès au endpoint nécessite donc un en-tête `X-API-Key` valide.

Cela empêche les attaquants d'exploiter les interfaces de diagnostic pour extraire des informations sur l'état du système sans authentification.

## 6. Rate limiting (limitation de débit)

### Outil : slowapi

La bibliothèque `slowapi` (adaptateur FastAPI de `limits`) applique une limite de débit par adresse IP.

### Configuration

```python
# 30 requêtes par minute par IP
@limiter.limit("30/minute")
```

### Endpoints protégés vs publics

| Endpoint | Limite | Raison |
|----------|--------|--------|
| `GET /devices` | 30/min | Potentiellement coûteux (requête DB) |
| `GET /alerts` | 30/min | Potentiellement coûteux (requête DB) |
| `GET /stats` | 30/min | Agrégation coûteuse |
| `GET /` | Illimité | Simple endpoint de statut |
| `GET /health` | Illimité | Utilisé par les healthchecks Docker |

### Dépassement de limite

En cas de dépassement, l'API retourne :
```text
HTTP 429 Too Many Requests
Retry-After: 60
```

Cette protection empêche :
- Le **brute-force** de la clé API (30 tentatives/minute maximum)
- Les attaques **DoS basiques** par saturation de requêtes

## 7. CORS (Cross-Origin Resource Sharing)

### Configuration

```python
allow_origins=["http://localhost:3000"]
allow_methods=["GET"]
allow_headers=["Content-Type", "X-API-Key"]
```

### Ce que cela implique

- Seul le dashboard Next.js (port 3000) peut appeler l'API depuis un navigateur
- Seule la méthode `GET` est autorisée (l'API est en lecture seule depuis le front)
- Les requêtes cross-origin de toute autre origine sont bloquées par le navigateur

En production, l'origine doit être mise à jour avec le domaine réel du dashboard.

## 8. Sécurité des conteneurs Docker

### Utilisateur non-root

Les Dockerfiles définissent un utilisateur non-privilégié pour l'exécution :

```dockerfile
# Backend FastAPI
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Frontend Next.js
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
USER nextjs
```

Un processus compromis s'exécutant en tant qu'utilisateur non-root ne peut pas modifier les fichiers système du conteneur ni escalader ses privilèges sur l'hôte.

### Exposition des ports limitée à localhost

Dans `docker-compose.yml`, les ports sont liés à `127.0.0.1` uniquement :

```yaml
ports:
  - "127.0.0.1:8000:8000"   # API non accessible depuis l'extérieur
  - "127.0.0.1:3000:3000"   # Dashboard non accessible depuis l'extérieur
```

Les services ne sont accessibles que depuis la machine hôte. Un accès depuis l'extérieur nécessite un reverse proxy (Nginx/Caddy) avec TLS.

### Isolation réseau

Les conteneurs communiquent via un réseau Docker interne (`exploreiot-net`). Seuls les ports explicitement publiés sont accessibles depuis l'hôte. Le broker MQTT (Mosquitto) et la base de données PostgreSQL ne sont **jamais** exposés à l'extérieur.

## 9. Validation des données entrantes

### Plages physiques capteur

Le subscriber et le mqtt_handler valident les valeurs avant traitement via la fonction `validate_sensor_reading()` :

```python
TEMP_MIN, TEMP_MAX = -40.0, 85.0
HUM_MIN,  HUM_MAX  =   0.0, 100.0

def validate_sensor_reading(temperature: float, humidite: float) -> None:
    if not (TEMP_MIN <= temperature <= TEMP_MAX):
        raise ValueError(f"Température hors plage : {temperature}")

    if not (HUM_MIN <= humidite <= HUM_MAX):
        raise ValueError(f"Humidité hors plage : {humidite}")
```

**Chemins de validation :**

Cette validation est appliquée en **deux points clés** pour assurer que aucune donnée invalide n'entre en système :

1. **Chemin WebSocket** : `mqtt_handler.py` → `mqtt_service.py` (transmet les données au dashboard en temps réel)
2. **Chemin persistance** : `subscriber.py` (stocke les données en PostgreSQL)

Cela protège contre :
- Les données corrompues
- Les erreurs de décodage
- Les tentatives d'injection de valeurs aberrantes
- Les capteurs défaillants ou mal configurés

### Paramètre `limit` borné

Les endpoints qui acceptent un paramètre `limit` pour la pagination le bornent strictement :

```python
async def get_measures(limit: int = Query(default=100, ge=1, le=1000)):
    ...
```

- Minimum : 1 (évite les requêtes sans résultat)
- Maximum : 1000 (évite les requêtes retournant des millions de lignes)

Un paramètre `limit=999999` envoyé par un client malveillant sera automatiquement rejeté avec une erreur de validation HTTP 422.

## 10. Security Headers HTTP

### Backend

Le middleware `SecurityHeadersMiddleware` (dans `backend/app/security_headers.py`) ajoute automatiquement les en-têtes de sécurité suivants à chaque réponse HTTP :

```python
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
X-Permitted-Cross-Domain-Policies: none
```

- **X-Content-Type-Options: nosniff** : Empêche le navigateur de deviner le type MIME. Les ressources doivent avoir un Content-Type explicite.
- **X-Frame-Options: DENY** : Interdit l'affichage de l'application dans une iframe, prévenant les attaques clickjacking.
- **Referrer-Policy: strict-origin-when-cross-origin** : Limite l'exposition de l'URL complète lors de navigations cross-origin, réduisant les fuites d'information.
- **X-Permitted-Cross-Domain-Policies: none** : Refuse les demandes Flash/PDF d'accès cross-domain.

### Frontend

Le fichier `next.config.ts` configure une politique de sécurité des contenus (CSP) et applique les mêmes en-têtes de sécurité au dashboard Next.js :

```typescript
headers: [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'} ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}`,
      "frame-ancestors 'none'",
    ].join("; ")
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' }
]
```

**Points clés CSP :**

- **Pas de `unsafe-eval`** : Les scripts ne peuvent pas être générés dynamiquement avec `eval()`
- **`unsafe-inline` uniquement pour scripts et styles** : Nécessaire pour Next.js, mais strictement limité
- **`connect-src` configuré par environnement** : Les URLs WebSocket et API sont contrôlées par les variables d'environnement `NEXT_PUBLIC_WS_URL` et `NEXT_PUBLIC_API_URL`
- **`frame-ancestors 'none'`** : Empêche l'affichage de l'application dans une iframe

## 11. Defense-in-depth sur les requêtes SQL

### Whitelist des intervalles (INTERVAL)

Le paramètre `interval` accepté par les endpoints `/stats` et `/devices` est validé contre une whitelist stricte dans `device_repo.py` :

```python
INTERVAL_SQL = {
    "1h": "1 hour",
    "6h": "6 hours",
    "24h": "24 hours",
    "7d": "7 days",
    "30d": "30 days",
}

if interval not in INTERVAL_SQL:
    raise ValueError(f"Intervalle non autorisé : {interval}")

# Utilise une lookup au lieu de paramétrisation
sql_interval = INTERVAL_SQL[interval]
query = f"SELECT ... WHERE time > NOW() - INTERVAL '{sql_interval}'"
```

**Pourquoi cette approche ?**

PostgreSQL ne supporte pas la paramétrisation de la syntaxe `INTERVAL` (ex. `INTERVAL $1`). La solution est d'utiliser une **whitelist stricte** et une **lookup de dictionnaire** :

- L'attaquant ne peut pas envoyer `1h); DROP TABLE devices; --`
- Seules les valeurs prédéfinies sont acceptées
- Les requêtes SQL sont construites de façon sûre

Cela prévient les injections SQL tout en permettant la flexibilité temporelle.

### Encodage URL des identifiants

Dans le client API du frontend (côté TypeScript), les identifiants de périphérique sont encodés en URL avant la construction de la requête :

```typescript
const encodedDeviceId = encodeURIComponent(deviceId);
const response = await fetch(`/api/devices/${encodedDeviceId}/stats`);
```

Cette pratique garantit que les caractères spéciaux (`:`, `/`, `?`, `&`, etc.) sont correctement échappés et ne perturbent pas le routage ou la sécurité de l'API.

## 12. Thread Safety et Concurrence MQTT

### Locks d'accès exclusif

La communication MQTT est **thread-safe** via des locks `threading.Lock()` :

**mqtt_handler.py :**
```python
_mqtt_lock = threading.Lock()

with _mqtt_lock:
    # Protection de _loop et _mqtt_client
    # Évite les conditions de course lors des callbacks MQTT
```

**subscriber.py :**
```python
_conn_lock = threading.Lock()

with _conn_lock:
    # Protection de la connexion partagée _conn
    # Garantit l'atomicité des opérations sur la DB
```

### Pourquoi est-ce critique ?

Les callbacks MQTT s'exécutent dans un thread séparé (thread de networking Paho-MQTT). Sans lock :

- Deux messages simultanés pourraient corrompre `_loop` ou `_mqtt_client`
- Les opérations de base de données pourraient être entrelacées, causant des inconsistances
- Les fermetures de connexion pourraient survenir au milieu d'une requête

Les locks garantissent que seul un thread à la fois accède à ces ressources partagées.

## 13. Pool de connexions et gestion des erreurs

### Rollback et restitution sécurisée

Le pool de connexions PostgreSQL (psycopg2) est géré de façon défensive :

```python
try:
    # Exécuter une requête
    cursor = conn.cursor()
    cursor.execute(query)
    conn.commit()
finally:
    # Rollback automatique sur erreur
    if not conn.closed:
        conn.rollback()
    # Restitution au pool
    pool.putconn(conn)
```

**Protections :**

- **Rollback d'erreur** : Si une exception est levée, `conn.rollback()` annule la transaction en cours
- **Prévention du poisoning de pool** : Aucune transaction partielle n'est restituée au pool
- **Vérification d'état** : Vérifie que la connexion n'est pas fermée avant rollback
- **Restitution garantie** : Même en cas d'exception, la connexion est restituée

Cela prévient les fuites mémoire, les deadlocks et les transactions zombies.

## 14. Sanitisation des exports

### Exports CSV

La fonction `sanitizeCsvField()` prévient l'injection de formules dans les fichiers CSV :

```python
def sanitizeCsvField(value: str) -> str:
    if value and value[0] in ('=', '+', '-', '@'):
        return "'" + value
    return value
```

Les caractères `=`, `+`, `-` et `@` au début d'une valeur sont échappés en ajoutant un guillemet simple. Cela empêche les outils comme Excel ou Google Sheets d'interpréter la cellule comme une formule.

### Exports PDF

La fonction `escapeHtml()` échappe tous les caractères HTML dans les valeurs interpolées pour prévenir les injections XSS :

```typescript
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
```

Chaque caractère HTML spécial est remplacé par son entité correspondante, garantissant qu'aucun code ne peut être injecté dans le PDF.

## 15. Modèle de confiance et déploiement

### Contexte de déploiement

ExploreIOT suppose un environnement de **confiance relative** :

- Réseau privé ou localhost
- Administrateurs de confiance
- Aucune exposition publique (ou derrière un reverse proxy TLS)

### Recommandations pour production

1. **Déployer derrière un reverse proxy TLS** (Nginx, Caddy, Apache) pour chiffrer tous les communications
2. **Utiliser des certificats TLS valides** signés par une CA reconnue
3. **Configurer `MQTT_TLS=1` et `MQTT_CA_CERTS`** pour sécuriser le broker MQTT
4. **Définir des credentials forts** pour `API_KEY`, `DB_PASSWORD` et `MQTT_PASSWORD`
5. **Monitorer les logs d'authentification** pour détecter les tentatives d'accès non autorisé
6. **Mettre en place des sauvegardes régulières** de PostgreSQL
7. **Limiter l'accès SSH/administrative** à la machine hôte
8. **Garder les dépendances Python et Node.js à jour** pour les correctifs de sécurité

### Audit et logging

- Les tentatives échouées d'authentification API sont enregistrées
- Les dépassements de rate limit sont enregistrés
- Les erreurs de validation MQTT sont enregistrées
- Tous les logs doivent être conservés pour audit

---

**Historique des mises à jour sécurité :**

- **v2.1.0** : Ajout WebSocket first-message auth, MQTT TLS, credential validation au démarrage, thread safety
- **v2.0.0** : Security headers, CSP, sanitisation exports
- **v1.0.0** : API Key auth, rate limiting, Docker hardening
