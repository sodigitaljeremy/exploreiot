# Attaques timing

## Le problème

Dans ExploreIOT, l'API FastAPI expose des endpoints proteges par une cle API. La verification initiale ressemblait a ceci :

```python
if api_key == SECRET_API_KEY:
    return True
```

Cette ligne, apparemment anodine, est une faille de securite connue sous le nom d'**attaque par timing** (timing attack). Un attaquant peut, en mesurant le temps de reponse de l'API avec differentes cles candidates, deduire progressivement la valeur de la cle secrete — sans jamais avoir besoin de la voir en clair.

## Ce que j'ai appris

### Comment fonctionne l'attaque

L'operateur `==` compare les chaines caractere par caractere et **s'arrete au premier caractere different**. Ce comportement cree une fuite d'information temporelle :

- Cle incorrecte des le 1er caractere : comparaison termine en ~100 ns
- Cle correcte sur les 10 premiers caracteres : comparaison termine en ~1000 ns

En envoyant des milliers de requetes avec des cles qui varient d'un caractere, un attaquant peut mesurer ces differences (meme de quelques nanosecondes) et identifier caractere par caractere la cle correcte. Sur un reseau local ou avec suffisamment de repetitions pour moyenner le bruit, l'attaque est realisable.

### La defense : comparaison en temps constant

`hmac.compare_digest(a, b)` compare deux chaines en **temps constant**, independamment de leur contenu. Il n'interrompt pas la comparaison au premier caractere different — il parcourt toujours l'integralite des deux chaines avant de retourner un resultat.

La duree de la comparaison ne depend que de la **longueur** des chaines, pas de leur contenu. L'attaquant ne peut plus extraire d'information en mesurant le temps de reponse.

## Code concret (extrait du projet)

### `security.py`

```python
import hmac
import os
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

# En-tete HTTP dans lequel le client envoie sa cle
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Verifie la cle API en temps constant pour resister aux attaques timing.
    Leve HTTPException 403 si la cle est absente ou incorrecte.
    """
    secret = os.environ.get("API_SECRET_KEY", "")

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cle API manquante"
        )

    # Les deux operandes doivent etre du meme type (bytes ou str)
    # hmac.compare_digest accepte str ou bytes, mais pas de melange
    is_valid = hmac.compare_digest(
        api_key.encode("utf-8"),
        secret.encode("utf-8")
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cle API invalide"
        )

    return api_key


# Utilisation dans un endpoint FastAPI
from fastapi import Depends

@app.get("/api/sensors")
async def get_sensors(key: str = Depends(verify_api_key)):
    ...
```

### Application aux WebSockets — `websocket.py`

```python
from fastapi import WebSocket, WebSocketDisconnect
import hmac
import os

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Authentification WebSocket : la cle est envoyee comme query param
    car les WebSockets ne supportent pas les en-tetes HTTP personnalises
    de facon universelle.
    """
    api_key = websocket.query_params.get("api_key", "")
    secret  = os.environ.get("API_SECRET_KEY", "")

    # Meme protection timing pour les WebSockets
    if not hmac.compare_digest(api_key.encode(), secret.encode()):
        await websocket.close(code=4003)  # 4003 = Forbidden (code personnalise)
        return

    await websocket.accept()
    # ... gestion de la connexion
```

## Piège a eviter

### "C'est juste pour le developpement"

Il est tentant d'utiliser `==` en phase de developpement et de "corriger ca plus tard". En pratique, le code de developpement finit souvent en production. Utiliser `hmac.compare_digest` couts zero effort supplementaire — autant le faire des le debut.

### Oublier d'encoder les chaines en bytes

`hmac.compare_digest` accepte `str` ou `bytes`, mais **pas un melange des deux**. Si `api_key` est une `str` et `secret` est des `bytes` (ou vice versa), Python leve un `TypeError` en production.

```python
# DANGER — TypeError si les types different
hmac.compare_digest(api_key, secret.encode())

# CORRECT — meme type pour les deux operandes
hmac.compare_digest(api_key.encode("utf-8"), secret.encode("utf-8"))
```

### Ne pas proteger les endpoints WebSocket

Les WebSockets sont souvent oublies dans les revues de securite parce qu'ils utilisent un protocole different de HTTP. Pourtant, un WebSocket non protege donne acces au flux de donnees en temps reel sans authentification. Appliquer la meme protection que pour les endpoints REST.

### Reponse differente selon "cle absente" vs "cle incorrecte"

Retourner des messages d'erreur differents selon que la cle est absente ou incorrecte aide un attaquant a affiner son approche. Toujours retourner le meme message generique (ex: "Acces refuse") dans les deux cas.

## Ressources

- [Python `hmac` — documentation officielle](https://docs.python.org/3/library/hmac.html)
- [OWASP — Testing for Timing Attacks](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/08-Test_HTTP_Strict_Transport_Security)
- [Coda Hale — "A Lesson In Timing Attacks"](https://codahale.com/a-lesson-in-timing-attacks/)
- [Wikipedia — Timing attack](https://en.wikipedia.org/wiki/Timing_attack)

!!! tip "Pour aller plus loin"
    - [Explication — Sécurité](../guide/explications/securite.md) : Modèle de sécurité complet d'ExploreIOT
    - [Référence — Sécurité](../guide/reference/securite-reference.md) : Implémentation des mécanismes de protection
