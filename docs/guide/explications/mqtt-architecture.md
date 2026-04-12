# Architecture MQTT pub/sub

ExploreIOT utilise MQTT comme colonne vertébrale de communication entre les capteurs simulés, la base de données et le dashboard. Ce document explique le pattern pub/sub et son implémentation concrète dans le projet.

!!! tip "Voir aussi"
    Pour le format détaillé des messages JSON et le décodage binaire, voir [Topics MQTT](../reference/mqtt-topics.md). Pour la sécurité MQTT (TLS, threads), voir la [référence sécurité](../reference/securite-reference.md).

## 1. Le pattern Publish/Subscribe

### Découplage producteur/consommateur

Dans une architecture classique client/serveur, le producteur de données doit connaître l'adresse du consommateur et établir une connexion directe. Si le consommateur est hors ligne, les données sont perdues.

Le pattern **Publish/Subscribe** introduit un intermédiaire : le **broker**. Le producteur (publisher) envoie des messages sur un **topic** sans savoir qui les recevra. Le consommateur (subscriber) s'abonne aux topics qui l'intéressent sans savoir d'où viennent les données.

```text
Publisher ──publié sur topic──▶ [BROKER] ──distribué aux abonnés──▶ Subscriber(s)
```

Ce découplage offre plusieurs avantages :
- Le publisher peut envoyer des messages même si aucun subscriber n'est connecté
- Plusieurs subscribers peuvent recevoir le même message simultanément
- On peut ajouter un nouveau subscriber sans modifier le publisher

### Broker comme intermédiaire intelligent

Le broker MQTT (**Mosquitto** dans ExploreIOT) gère :
- L'authentification des clients (optionnel)
- La persistence des messages (selon le QoS)
- La distribution aux abonnés actifs
- La gestion des connexions persistantes

### Topics hiérarchiques avec wildcards

Les topics MQTT sont des chemins hiérarchiques séparés par `/` :

```text
application/1/device/0102030405060708/event/up
```

Les wildcards permettent des souscriptions flexibles :
- `+` : remplace exactement un niveau. `application/+/device/+/event/up` correspond à toutes les applications et tous les devices.
- `#` : remplace zéro ou plusieurs niveaux (doit être en dernier). `application/#` correspond à tous les messages de toutes les applications.

## 2. Topologie ExploreIOT

### Vue d'ensemble

```text
publisher.py ──────▶ [Mosquitto] ──────▶ subscriber.py ──▶ PostgreSQL
  (simule Chirpstack)       │
                            └─────────▶ main.py (FastAPI) ──▶ WebSocket ──▶ Dashboard
```

### Publisher (simulation de Chirpstack)

Le script `publisher.py` simule le comportement du Network Server LoRaWAN **Chirpstack** :

- Il gère **3 capteurs virtuels** avec des EUI distincts
- Il génère des mesures aléatoires réalistes (T: 18-30°C, H: 30-80%)
- Il publie un message toutes les **5 secondes** par capteur
- Il encode les valeurs en payload binaire (struct big-endian) puis en Base64

Topic de publication :
```text
application/1/device/{devEUI}/event/up
```

### Subscriber (persistance en base de données)

Le script `subscriber.py` est souscrit au topic `application/1/device/+/event/up` (wildcard `+` pour tous les capteurs). Il :

1. Reçoit le message JSON
2. Extrait le `device_id` depuis `deviceInfo.devEui`
3. Décode le payload Base64 → bytes → struct.unpack
4. Valide les plages physiques
5. Insère en PostgreSQL

### API FastAPI (broadcast WebSocket)

Le module `main.py` de l'API se souscrit au même topic MQTT que le subscriber. À chaque message reçu, il broadcaste les données décodées à tous les clients WebSocket connectés (un par onglet dashboard ouvert). Cela permet la mise à jour en temps réel du dashboard sans polling HTTP.

## 3. QoS 1 (at-least-once)

### Les trois niveaux de QoS MQTT

| QoS | Garantie | Mécanisme |
|-----|----------|-----------|
| 0 | Au plus une fois (fire & forget) | Aucun accusé de réception |
| 1 | Au moins une fois | PUBACK obligatoire, retransmission si absent |
| 2 | Exactement une fois | Échange en 4 temps (PUBREC/PUBREL/PUBCOMP) |

### Pourquoi QoS 1 dans ExploreIOT ?

**QoS 1** est le bon compromis pour des données de capteurs :

- **Garantie suffisante** : le message arrive toujours, même en cas de perte réseau temporaire
- **Doublons acceptables** : si le subscriber reçoit deux fois la même mesure, l'impact est faible (une ligne supplémentaire en base). Il n'y a pas de transaction financière ou d'action critique en jeu.
- **Overhead raisonnable** : un seul accusé de réception (PUBACK) par message

**QoS 2** apporterait la garantie "exactement une fois", mais au prix d'un échange en 4 messages au lieu de 2. Pour des données IoT émises toutes les 5 secondes, cet overhead est inutile.

**QoS 0** serait trop risqué : en cas de perte réseau momentanée, des mesures seraient définitivement perdues sans possibilité de retransmission.

## 4. Reconnexion automatique

### Configuration paho-mqtt

La bibliothèque Python `paho-mqtt` est configurée avec un délai de reconnexion exponentiel :

```python
client.reconnect_delay_set(min_delay=1, max_delay=60)
```

En cas de déconnexion du broker :
- Première tentative : après 1 seconde
- Tentatives suivantes : délai doublé à chaque fois (2s, 4s, 8s...)
- Délai maximum : 60 secondes (plafond)

### Backoff exponentiel pour la base de données

Le subscriber implémente également un backoff exponentiel pour les reconnexions à PostgreSQL :

```python
delay = 2
max_delay = 30
max_attempts = 5

for attempt in range(max_attempts):
    try:
        conn = psycopg2.connect(...)
        break
    except psycopg2.OperationalError:
        time.sleep(delay)
        delay = min(delay * 2, max_delay)
```

Cela évite de surcharger la base de données avec des tentatives de reconnexion rapides lors d'un redémarrage du conteneur PostgreSQL.

### Heartbeat file pour healthcheck Docker

Le subscriber écrit périodiquement un fichier `/tmp/subscriber_alive` avec le timestamp courant. Le healthcheck Docker vérifie que ce fichier a été modifié il y a moins de 30 secondes :

```dockerfile
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD test $(( $(date +%s) - $(date +%s -r /tmp/subscriber_alive) )) -lt 30
```

