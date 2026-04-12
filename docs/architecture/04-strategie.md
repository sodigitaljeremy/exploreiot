# Arc42 — Section 4 : Stratégie de solution

## 4.1 Approche globale

ExploreIOT repose sur une **architecture event-driven** (orientée événements) où le broker MQTT joue le rôle de bus central. Chaque mesure de capteur est un événement qui se propage de manière asynchrone à travers le système, sans couplage direct entre les composants.

Ce choix architectural reflète la réalité des systèmes IoT industriels : les capteurs publient des données à leur propre rythme, et le système doit être capable de les absorber, les persister et les diffuser sans créer de dépendance temporelle entre les composants.

```text
Capteur --> [MQTT Bus] --> Subscriber --> PostgreSQL
                                    \--> FastAPI --> WebSocket --> Dashboard
```

---

## 4.2 Découplage par processus indépendants

Les trois composants principaux du backend sont des **processus indépendants** :

| Composant | Processus | Redémarrage indépendant |
|-----------|-----------|------------------------|
| `publisher.py` | Processus Python autonome | Oui — simule les capteurs |
| `subscriber.py` | Processus Python autonome | Oui — consomme le MQTT |
| `app/main.py` (FastAPI) | Processus Uvicorn | Oui — sert l'API et les WS |

Ce découplage garantit que :
- Un crash du publisher n'affecte pas l'API (les données historiques restent disponibles)
- Un redémarrage du subscriber ne perd pas de messages si Mosquitto conserve les messages en attente (QoS 1)
- L'API peut être redémarrée sans interrompre la collecte de données

La communication entre le subscriber et FastAPI pour le push WebSocket est réalisée via `asyncio.run_coroutine_threadsafe()`, qui permet au thread MQTT (synchrone) d'appeler une coroutine dans la boucle asyncio de FastAPI sans bloquer.

---

## 4.3 Choix de psycopg2 brut au lieu de SQLAlchemy

Ce choix est une contrainte volontaire, documentée en Section 2, et justifiée ici d'un point de vue stratégique.

### Avantages pour ce projet

**Performance** : le subscriber insère potentiellement des centaines de mesures par heure. Chaque INSERT via SQLAlchemy passe par le pipeline ORM (instanciation de modèle, tracking de l'état, flush). Avec psycopg2 :

```python
cursor.execute(
    "INSERT INTO mesures (device_id, temperature, humidite, received_at) VALUES (%s, %s, %s, %s)",
    (device_id, temperature, humidite, datetime.utcnow())
)
```

C'est une requête directe, sans surcoût.

**Contrôle du SQL** : les requêtes analytiques (moyennes glissantes sur 24h, percentiles de température) nécessitent des fonctions SQL avancées (window functions, `date_trunc`). Ecrire ces requêtes directement en SQL garantit qu'elles correspondent exactement au plan d'exécution voulu.

**Transparence** : toute personne lisant le code voit exactement ce qui est exécuté en base. Pas de "magie" ORM qui génère des requêtes N+1 difficiles à détecter.

**Compétence SQL** : ce projet est aussi un exercice de formation. Manipuler psycopg2 directement consolide la maîtrise de SQL que l'ORM tendrait à abstraire.

---

## 4.4 Encodage binaire LoRaWAN

Le format de payload LoRaWAN est binaire et compact. Un capteur Dragino LHT65 encode sa mesure en 6 octets environ. Ce projet simule ce comportement avec `struct.pack`.

### Format d'encodage

```python
# Encodage (publisher.py via payload_codec.py)
temperature_int = int(temperature * 100)  # 23.45°C → 2345
humidite_int = int(humidite * 10)         # 61.2% → 612

payload_bytes = struct.pack('>HH', temperature_int, humidite_int)
# '>HH' = big-endian, deux unsigned short (2 octets chacun) = 4 octets total

payload_b64 = base64.b64encode(payload_bytes).decode()
# ex: "CSoBZA==" — ce que Chirpstack enverrait dans le champ "data"
```

### Format de décodage

```python
# Décodage (subscriber.py)
payload_bytes = base64.b64decode(payload_b64)
temperature_int, humidite_int = struct.unpack('>HH', payload_bytes)

temperature = temperature_int / 100.0  # 2345 → 23.45°C
humidite = humidite_int / 10.0         # 612 → 61.2%
```

### Pourquoi ce format ?

Ce format reproduit la contrainte réelle du terrain : les capteurs LoRaWAN ont une batterie et une bande passante limitées. Encoder en JSON (`{"temperature": 23.45, "humidity": 61.2}`) coûterait 35 octets contre 4 octets en binaire. La simulation avec `struct.pack` représente donc fidèlement les contraintes d'un déploiement IoT réel.

---

## 4.5 WebSocket pour le push temps réel, polling comme fallback

### WebSocket (stratégie principale)

Le dashboard Next.js maintient une connexion WebSocket persistante avec FastAPI. Dès qu'une nouvelle mesure est insérée par le subscriber, FastAPI la broadcast sur tous les clients WebSocket connectés. La latence est quasi-nulle (< 100 ms en local).

```typescript
// Côté client (lib/api-client.ts)
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onmessage = (event) => {
    const mesure = JSON.parse(event.data);
    updateChart(mesure);
};
```

### Polling (fallback)

Si la connexion WebSocket est perdue (reconnexion réseau, restart du backend), le client bascule sur un polling REST toutes les 5 secondes vers `GET /devices/{id}/mesures`. Ce fallback garantit que le dashboard reste fonctionnel même sans WebSocket, au prix d'une latence légèrement supérieure.

---

## 4.6 Rate limiting dès le design (pas après)

Le rate limiting est intégré dès le début avec **slowapi**, pas ajouté rétrospectivement. Cette approche "security by design" est conforme à OWASP A04 (Insecure Design).

```python
# app/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# app/routes/devices.py
@router.get("/devices")
@limiter.limit("60/minute")
async def get_devices(request: Request):
    ...
```

La limite de 60 requêtes par minute par IP est suffisante pour un usage normal (un dashboard rafraîchit rarement plus d'une fois par seconde) mais bloque les tentatives de scraping agressif ou d'attaque par déni de service applicatif.

---

## 4.7 Alembic pour l'évolution du schéma

Le schéma PostgreSQL est versionné avec **Alembic**, l'outil de migration de référence de l'écosystème SQLAlchemy (utilisable sans SQLAlchemy ORM).

Chaque modification du schéma (ajout de colonne, nouvel index, nouvelle table) est codée dans un fichier de migration versionné :

```text
backend/alembic/versions/
    0001_create_devices_table.py
    0002_create_mesures_table.py
    0003_add_alerts_table.py
    0004_add_index_device_received_at.py
```

Avantages :
- Reproductibilité : une base de données fraîche atteint l'état courant avec `alembic upgrade head`
- Traçabilité : chaque changement de schéma est daté, documenté, et réversible (`alembic downgrade -1`)
- Collaboration : deux développeurs ne peuvent pas modifier le schéma en parallèle sans conflit visible dans Git

Le conteneur Docker `backend` exécute `alembic upgrade head` au démarrage avant de lancer Uvicorn, garantissant que le schéma est toujours à jour.
