# Référence Sécurité : Implémentation et Configuration

!!! tip "Voir aussi"
    Pour comprendre les concepts et le modèle de confiance, voir les [explications sécurité](../explications/securite.md).

## 1. Support MQTT avec TLS

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

## 2. Validation des credentials au démarrage

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

## 3. Authentification du endpoint debug

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

## 4. Rate limiting (limitation de débit)

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

## 5. Security Headers HTTP

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

## 6. Defense-in-depth sur les requêtes SQL

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

## 7. Pool de connexions et gestion des erreurs

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

## 8. Sanitisation des exports

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
