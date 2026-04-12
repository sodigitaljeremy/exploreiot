# Topics MQTT

Référence complète de la structure des topics MQTT et du format des messages utilisés par ExploreIOT pour la communication entre les capteurs LoRaWAN et le backend.

!!! tip "Voir aussi"
    Pour comprendre le pattern pub/sub et l'architecture MQTT du projet, voir [Architecture MQTT](../explications/mqtt-architecture.md).

---

## Structure des topics

ExploreIOT utilise le format de topic Chirpstack v4 dans tous les modes (production et simulation) :

```text
application/{app_id}/device/{device_id}/event/up
```

| Segment | Description |
|---------|-------------|
| `application` | Préfixe fixe |
| `{app_id}` | Identifiant de l'application Chirpstack (UUID ou nom) |
| `device` | Préfixe fixe |
| `{device_id}` | EUI-64 du capteur, 16 caractères hexadécimaux (ex: `a1b2c3d4e5f60001`) |
| `event` | Préfixe fixe |
| `up` | Type d'événement — `up` désigne un uplink (données montantes du capteur) |

Exemple de topic complet :

```text
application/a1b2c3d4-e5f6-7890-abcd-ef0123456789/device/a1b2c3d4e5f60001/event/up
```

En mode simulation, `publisher.py` publie sur le même format de topic que Chirpstack v4, garantissant que le subscriber utilise un pipeline identique quel que soit le mode.

---

## Abonnement avec wildcard

Le subscriber MQTT s'abonne à tous les capteurs en une seule souscription grâce au wildcard `+` de MQTT, qui remplace exactement **un** niveau de topic.

```text
application/+/device/+/event/up
```

Ce pattern capture les messages de **n'importe quelle application** et **n'importe quel capteur**.

Configuré via la variable d'environnement `MQTT_TOPIC` :

```dotenv
MQTT_TOPIC=application/+/device/+/event/up
```

---

## Format du payload MQTT

Les messages MQTT publiés par Chirpstack suivent le format JSON de l'API Chirpstack v4. Le champ `data` contient la charge utile binaire du capteur encodée en **Base64**.

### Structure JSON complète

```json
{
  "deduplicationId": "550e8400-e29b-41d4-a716-446655440000",
  "time": "2026-04-11T14:30:05.123456789Z",
  "deviceInfo": {
    "tenantId": "52f14cd4-c6f1-4fbd-8f87-4025e1d49242",
    "tenantName": "exploreiot",
    "applicationId": "64dfc3f0-9c37-4d34-8b01-c9b6e1b2f3a4",
    "applicationName": "exploreiot-demo",
    "deviceProfileId": "a8f9b2c1-3e4d-5f6a-7b8c-9d0e1f2a3b4c",
    "deviceProfileName": "SHT31-LoRa",
    "deviceName": "Capteur Bureau 1",
    "devEui": "a1b2c3d4e5f60001",
    "tags": {}
  },
  "devAddr": "00a1b2c3",
  "adr": true,
  "dr": 5,
  "fCnt": 1523,
  "fPort": 1,
  "confirmed": false,
  "data": "AYgCKg==",
  "rxInfo": [
    {
      "gatewayId": "0016c001f1500812",
      "snr": 9.5,
      "rssi": -67,
      "location": {
        "latitude": 48.8566,
        "longitude": 2.3522,
        "altitude": 35
      }
    }
  ],
  "txInfo": {
    "frequency": 868100000,
    "modulation": {
      "lora": {
        "bandwidth": 125000,
        "spreadingFactor": 7,
        "codeRate": "CR_4_5"
      }
    }
  }
}
```

### Champs principaux

| Champ | Type | Description |
|-------|------|-------------|
| `time` | string (ISO 8601) | Horodatage de réception par la passerelle |
| `deviceInfo.devEui` | string (hex 16 car.) | EUI-64 du capteur LoRaWAN |
| `deviceInfo.deviceName` | string | Nom convivial configuré dans Chirpstack |
| `fPort` | entier | Port applicatif LoRaWAN (1–223) |
| `fCnt` | entier | Compteur de trames (frame counter) |
| `data` | string (Base64) | Charge utile binaire du capteur, encodée en Base64 |
| `rxInfo[].rssi` | entier | Force du signal en dBm (ex: `-67`) |
| `rxInfo[].snr` | décimal | Rapport signal/bruit en dB (ex: `9.5`) |
| `txInfo.frequency` | entier | Fréquence d'émission en Hz (ex: `868100000` = 868.1 MHz) |

---

## Encodage binaire du champ `data`

Le champ `data` contient la charge utile applicative du capteur encodée en **Base64**. Ce sont des octets bruts dont l'interprétation dépend du protocole applicatif défini par le fabricant du capteur.

### Exemple de décodage

Pour un capteur SHT31 typique, la charge utile de 4 octets encode la température et l'humidité :

```text
Payload Base64 : AYgCKg==
Décodé en hex  : 01 88 02 2A
```

Interprétation (format big-endian, valeurs sur 16 bits, facteur 0.1) :

```text
Octets 0-1 : 0x0188 = 392 → température = 39.2 / 1.6 = 24.5°C
Octets 2-3 : 0x022A = 554 → humidité    = 55.4 / 0.9 = 61.6%
```

Le subscriber ExploreIOT (`backend/subscriber.py`) contient le décodeur spécifique au format de payload utilisé. Pour adapter le décodage à un autre type de capteur, modifiez la fonction `decode_payload()` dans ce fichier.

### Décoder en Python

```python
import base64
import struct

# Payload reçu dans le message MQTT
b64_data = "AYgCKg=="

# Décoder depuis Base64
raw_bytes = base64.b64decode(b64_data)
print(f"Bytes hex : {raw_bytes.hex()}")  # 018802 2a

# Exemple d'interprétation (à adapter selon le capteur)
if len(raw_bytes) >= 4:
    temp_raw, hum_raw = struct.unpack(">HH", raw_bytes[:4])
    temperature = temp_raw / 16.0
    humidite = hum_raw / 9.0
    print(f"Température : {temperature:.1f}°C")
    print(f"Humidité    : {humidite:.1f}%")
```

---

## QoS (Quality of Service)

ExploreIOT utilise **QoS 1** (at-least-once) pour les publications et les souscriptions MQTT.

| Niveau | Nom | Garantie |
|--------|-----|----------|
| 0 | At-most-once | Message envoyé une fois, sans confirmation |
| **1** | **At-least-once** | **Message envoyé jusqu'à confirmation de réception (peut être dupliqué)** |
| 2 | Exactly-once | Message envoyé exactement une fois (le plus coûteux) |

QoS 1 est le bon compromis pour l'IoT : il garantit qu'aucune mesure n'est perdue en cas de coupure réseau, tout en restant léger pour les capteurs à batterie. Le subscriber gère la déduplication éventuelle grâce au compteur de trames `fCnt`.

---

## Identifiants de topic

### app_id

En mode simulation : `exploreiot-demo`

En production, l'`app_id` correspond à l'identifiant UUID de l'application dans Chirpstack. Il est visible dans l'interface d'administration Chirpstack sous **Applications**.

### device_id (DevEUI)

Format : 16 caractères hexadécimaux en minuscules (EUI-64).

Le DevEUI est un identifiant unique mondial gravé en usine dans chaque module LoRa. Il est imprimé sur l'étiquette du capteur ou visible dans l'interface Chirpstack.

Exemples :
- `a1b2c3d4e5f60001`
- `0016c001f1500812`
- `deadbeefcafe0042`

