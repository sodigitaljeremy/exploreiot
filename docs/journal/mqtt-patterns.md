# Patterns MQTT

## Le problème

Dans ExploreIOT, le capteur LoRaWAN, le broker Mosquitto, le subscriber Python et l'API FastAPI sont quatre processus independants qui doivent echanger des donnees en temps reel. Une approche naive avec des appels HTTP directs creerait un couplage fort : le capteur devrait connaitre l'adresse de l'API, l'API devrait attendre que le capteur soit disponible, et la moindre panne d'un composant bloquerait la chaine entiere.

Le probleme concret : comment faire communiquer des services qui ne se connaissent pas, qui peuvent demarrer dans n'importe quel ordre, et dont certains peuvent etre temporairement hors ligne ?

## Ce que j'ai appris

### Le pattern Publish/Subscribe

MQTT repose sur un intermediaire central : le **broker**. Les producteurs de donnees (publishers) envoient des messages sur des **topics**. Les consommateurs (subscribers) s'abonnent aux topics qui les interessent. Le broker gere la distribution.

Avantages cles :
- **Decouplage** : publisher et subscriber ne se connaissent pas
- **Asynchronisme** : le publisher n'attend pas que le subscriber soit pret
- **Fan-out** : un message peut etre recu par plusieurs subscribers simultanement

### Hierarchie des topics

Les topics MQTT sont des chaines hierarchiques separees par `/`. Exemples :
```text
capteurs/bureau/temperature
capteurs/bureau/humidite
capteurs/entrepot/temperature
```

Deux wildcards pour les abonnements :
- `+` : remplace exactement un niveau (`capteurs/+/temperature` matche `capteurs/bureau/temperature` mais pas `capteurs/bureau/salle/temperature`)
- `#` : remplace tous les niveaux suivants (`capteurs/#` matche tout ce qui commence par `capteurs/`)

### Niveaux de QoS

| QoS | Garantie | Usage |
|-----|----------|-------|
| 0 | Au plus une fois (fire-and-forget) | Donnees capteur haute frequence |
| 1 | Au moins une fois (peut dupliquer) | Alertes, commandes |
| 2 | Exactement une fois (overhead eleve) | Transactions critiques |

Pour des donnees de capteurs IoT, **QoS 1 est le bon compromis** : on accepte un doublon occasionnel plutot que de perdre une mesure.

### Retained messages et Last Will

- **Retained** : le broker conserve le dernier message sur un topic et le livre immediatement aux nouveaux abonnes. Utile pour l'etat courant d'un capteur.
- **Last Will and Testament (LWT)** : message que le broker publie automatiquement si le client se deconnecte de facon inattendue. Permet de signaler qu'un capteur est hors ligne.

## Code concret (extrait du projet)

### Configuration du client MQTT — `subscriber.py`

```python
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

MQTT_BROKER  = "localhost"
MQTT_PORT    = 1883
MQTT_TOPIC   = "capteurs/lht65/#"
MQTT_CLIENT_ID = "exploreiot-subscriber"

def on_connect(client, userdata, flags, reason_code, properties):
    """Callback declenche a chaque (re)connexion au broker."""
    if reason_code == 0:
        print("Connecte au broker MQTT")
        # Reabonnement systematique ici — resilient aux reconnexions
        client.subscribe(MQTT_TOPIC, qos=1)
    else:
        print(f"Echec connexion, code : {reason_code}")

def on_message(client, userdata, message):
    """Callback declenche a reception d'un message."""
    payload = message.payload.decode('utf-8')
    topic   = message.topic
    print(f"[{topic}] {payload}")
    # ... traitement et insertion BDD

# Utilisation de CallbackAPIVersion.VERSION2 (paho-mqtt >= 2.0)
client = mqtt.Client(
    client_id=MQTT_CLIENT_ID,
    callback_api_version=CallbackAPIVersion.VERSION2
)

# Last Will : publier "offline" si deconnexion brutale
client.will_set(
    topic="capteurs/status/exploreiot-subscriber",
    payload="offline",
    qos=1,
    retain=True
)

client.on_connect = on_connect
client.on_message = on_message

# reconnect_delay_set active la reconnexion automatique
client.reconnect_delay_set(min_delay=1, max_delay=60)

client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
client.loop_forever()  # Boucle bloquante avec reconnexion automatique
```

### Publication depuis le simulateur — `publisher.py`

```python
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion
import json

client = mqtt.Client(
    client_id="exploreiot-publisher",
    callback_api_version=CallbackAPIVersion.VERSION2
)
client.connect("localhost", 1883)

payload = json.dumps({
    "temperature": 23.5,
    "humidite": 61.2,
    "timestamp": "2026-04-11T10:00:00Z"
})

# retain=True : les nouveaux subscribers recoivent immediatement la derniere valeur
client.publish("capteurs/lht65/bureau", payload, qos=1, retain=True)
```

## Piège a eviter

### Ne pas s'abonner dans `on_connect`

Si l'abonnement est fait une seule fois au demarrage (avant la boucle), une reconnexion apres coupure perd l'abonnement. Le placer dans `on_connect` garantit le reabonnement automatique apres chaque reconnexion.

```python
# FAUX — l'abonnement disparait apres une deconnexion
client.connect(broker, port)
client.subscribe(topic)      # <-- ici, avant loop_forever
client.loop_forever()

# CORRECT — reabonnement a chaque (re)connexion
def on_connect(client, userdata, flags, rc, props):
    client.subscribe(topic)  # <-- dans le callback
```

### QoS 2 pour les donnees capteur

QoS 2 implique un echange de 4 messages entre client et broker pour chaque publication. Pour un capteur qui publie toutes les 30 secondes, c'est negligeable. Pour 1000 capteurs qui publient toutes les secondes, c'est 4000 messages supplementaires par seconde sur le broker. **QoS 1 suffit pour les donnees de capteurs.**

### Confusion entre `+` et `#`

```text
capteurs/+/temperature  -> matche capteurs/bureau/temperature
                           ne matche PAS capteurs/bureau/salle/temperature

capteurs/#              -> matche capteurs/bureau/temperature
                           matche aussi capteurs/bureau/salle/temperature
                           matche aussi capteurs/ (topic racine)
```

Le `#` doit toujours etre le dernier caractere du topic. `capteurs/#/temperature` est invalide.

### Ignorer `CallbackAPIVersion` avec paho-mqtt 2.x

Depuis paho-mqtt 2.0, ne pas specifier `CallbackAPIVersion` declenche un `DeprecationWarning` et les signatures des callbacks ont change. Toujours specifier `CallbackAPIVersion.VERSION2` pour les nouveaux projets.

## Ressources

- [Specification MQTT 3.1.1](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html)
- [paho-mqtt — documentation Python](https://eclipse.dev/paho/files/paho.mqtt.python/html/index.html)
- [HiveMQ MQTT Essentials (serie d'articles)](https://www.hivemq.com/mqtt-essentials/)
- [Mosquitto — broker MQTT open source](https://mosquitto.org/documentation/)
