# WebSocket reconnection

## Le problème

Le tableau de bord ExploreIOT affiche les donnees de capteurs en temps reel via WebSocket. En phase de test, deux problemes sont apparus :

1. **Cote client** : apres un redemarrage du serveur FastAPI (deploy, crash), le tableau de bord affichait des donnees figees sans indiquer a l'utilisateur que la connexion etait perdue.
2. **Cote serveur** : apres 24h en production, le `ConnectionManager` accumulait des connexions "fantomes" — des clients qui s'etaient deconnectes sans que le serveur le sache (timeout reseau, fermeture d'onglet brutale). Chaque broadcast envoyait des messages a des sockets mortes, generant des exceptions.

## Ce que j'ai appris

### Backoff exponentiel

Reconnectez immediatement apres une deconnexion, ca semble intuitif. Mais si 500 clients se reconnectent tous simultanement au meme instant (apres un redemarrage serveur), c'est un **thundering herd** : le serveur recoit une rafale de 500 connexions qui peut le faire crasher a nouveau.

Le **backoff exponentiel** resout ce probleme : chaque tentative attend un delai croissant (1s, 2s, 4s, 8s...), avec une limite maximale et du jitter (variation aleatoire) pour etaler les reconnexions dans le temps.

```text
Tentative 1 : attendre 1s  + jitter aleatoire (0-1s)
Tentative 2 : attendre 2s  + jitter
Tentative 3 : attendre 4s  + jitter
...
Tentative N : attendre 30s + jitter (maximum)
```

### Heartbeat / Ping-Pong

Une connexion WebSocket peut etre "silencieuse" (aucun message echange) pendant des minutes. Certains intermediaires reseau (load balancers, NAT, proxies) ferment les connexions inactives sans notifier les deux extremites. Le **heartbeat** envoie periodiquement un message de ping pour maintenir la connexion active et detecter les coupures silencieuses.

### Gestion des connexions mortes cote serveur

Quand `websocket.send_text()` echoue (connexion perdue), l'exception doit etre capturee et la connexion supprimee de la liste des clients actifs. Sans ce nettoyage, la liste grandit indefiniment.

## Code concret (extrait du projet)

### Reconnexion cote client — `app-client.tsx`

```typescript
"use client";
import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";
const MAX_RECONNECT_DELAY = 30_000; // 30 secondes maximum
const HEARTBEAT_INTERVAL  = 25_000; // Ping toutes les 25 secondes

export function useWebSocket() {
  const wsRef            = useRef<WebSocket | null>(null);
  const reconnectDelay   = useRef(1_000);      // Delai initial : 1 seconde
  const heartbeatTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastData, setLastData]       = useState<unknown>(null);

  function clearHeartbeat() {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }

  function startHeartbeat(ws: WebSocket) {
    clearHeartbeat();
    heartbeatTimer.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  function connect() {
    const apiKey = process.env.NEXT_PUBLIC_API_KEY ?? "";
    const ws     = new WebSocket(`${WS_URL}?api_key=${apiKey}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectDelay.current = 1_000;  // Reinitialiser le delai apres succes
      startHeartbeat(ws);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== "pong") {          // Ignorer les reponses heartbeat
        setLastData(data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      clearHeartbeat();

      // Backoff exponentiel avec jitter
      const jitter = Math.random() * 1_000;
      const delay  = Math.min(reconnectDelay.current + jitter, MAX_RECONNECT_DELAY);
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY);

      console.log(`WebSocket ferme. Reconnexion dans ${Math.round(delay)}ms...`);
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close(); // Declenche onclose qui gere la reconnexion
    };
  }

  useEffect(() => {
    connect();
    return () => {
      clearHeartbeat();
      wsRef.current?.close();
    };
  }, []);

  return { isConnected, lastData };
}
```

### Gestionnaire de connexions cote serveur — `websocket.py`

```python
from fastapi import WebSocket
from typing import List
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Gere les connexions WebSocket actives avec nettoyage automatique."""

    MAX_CONNECTIONS = 100  # Limite pour eviter l'epuisement memoire

    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> bool:
        """Accepte une connexion si la limite n'est pas atteinte."""
        if len(self.active) >= self.MAX_CONNECTIONS:
            await websocket.close(code=1013)  # 1013 = Try Again Later
            return False
        await websocket.accept()
        self.active.append(websocket)
        logger.info(f"Nouvelle connexion WS. Total : {len(self.active)}")
        return True

    def disconnect(self, websocket: WebSocket) -> None:
        """Retire une connexion de la liste des actives."""
        if websocket in self.active:
            self.active.remove(websocket)
            logger.info(f"Deconnexion WS. Total : {len(self.active)}")

    async def broadcast(self, message: str) -> None:
        """
        Envoie un message a tous les clients connectes.
        Supprime les connexions mortes detectees lors du broadcast.
        """
        dead: List[WebSocket] = []

        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)  # Marquer pour suppression, pas supprimer pendant l'iteration

        # Nettoyer les connexions mortes apres l'iteration
        for ws in dead:
            self.disconnect(ws)

        if dead:
            logger.warning(f"{len(dead)} connexion(s) morte(s) supprimee(s)")


manager = ConnectionManager()
```

## Piège a eviter

### Reconnexion immediate (thundering herd)

Sans backoff, tous les clients se reconnectent en meme temps apres un redemarrage serveur. Avec 1000 clients et une reconnexion immediate, le serveur recoit 1000 connexions en une fraction de seconde — potentiellement plus que sa capacite maximale.

```typescript
// FAUX — thundering herd garantis avec 1000 clients
ws.onclose = () => {
  setTimeout(connect, 0);  // Reconnexion immediate
};

// CORRECT — backoff exponentiel avec jitter
ws.onclose = () => {
  const delay = Math.min(currentDelay * 2, MAX_DELAY) + Math.random() * 1000;
  setTimeout(connect, delay);
};
```

### Ne pas nettoyer les connexions mortes

Sans suppression des connexions fantomes, `broadcast()` accumule des exceptions et ralentit. Apres une semaine en production, une liste de 10 000 connexions mortes peut degrader significativement les performances.

### Aucune limite de connexions

Sans `MAX_CONNECTIONS`, un attaquant peut ouvrir des milliers de connexions WebSocket et epuiser la memoire du serveur (chaque connexion WebSocket consomme ~50-100 KB). Toujours definir une limite raisonnable.

### Oublier de reinitialiser le delai apres une connexion reussie

Si `reconnectDelay` n'est pas remis a sa valeur initiale apres une connexion reussie, le deuxieme incident de connexion commencera avec le dernier delai utilise (potentiellement 30s) plutot que 1s.

## Ressources

- [MDN — WebSocket API](https://developer.mozilla.org/fr/docs/Web/API/WebSockets_API)
- [RFC 6455 — The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [FastAPI — WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)
- [AWS — Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)

!!! tip "Pour aller plus loin"
    - [Memo 07 — Protocole WebSocket](../memos/07-protocole-websocket.md) : Handshake, frames, reconnexion
