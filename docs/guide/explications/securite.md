# Modèle de sécurité

ExploreIOT est conçu pour un déploiement local ou sur un réseau privé. Le modèle de sécurité couvre l'authentification, la limitation de débit, l'isolation des conteneurs, la validation des données entrantes et la protection des canaux de communication.

!!! tip "Voir aussi"
    Pour la configuration détaillée et l'implémentation des mécanismes de sécurité, voir la [référence sécurité](../reference/securite-reference.md).

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

## 3. CORS (Cross-Origin Resource Sharing)

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

## 4. Validation des données entrantes

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

## 5. Thread Safety et Concurrence MQTT

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

## 6. Modèle de confiance et déploiement

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

