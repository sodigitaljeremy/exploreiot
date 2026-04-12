# Référence : Codec LoRaWAN (payload_codec.py)

Module unifié d'encodage/décodage des payloads binaires LoRaWAN, compatible Chirpstack v4.

## Format binaire

Le format reproduit le payload d'un capteur **Dragino LHT65** :

```text
Octet 0-1 : température × 100 (uint16, big-endian)
Octet 2-3 : humidité × 10 (uint16, big-endian)
Total     : 4 octets
```

### Exemple

| Valeur | Calcul | Entier | Hex | Octets |
|--------|--------|--------|-----|--------|
| 23.45°C | 23.45 × 100 = 2345 | 2345 | `0x0929` | `09 29` |
| 61.2% | 61.2 × 10 = 612 | 612 | `0x0264` | `02 64` |

Payload final : `09 29 02 64` → Base64 : `CSkyZA==`

## Fonctions

### `encode_payload(temperature, humidite) → str`

Encode une paire température/humidité en base64.

```python
from app.payload_codec import encode_payload

b64 = encode_payload(23.45, 61.2)
# "CSkyZA=="
```

### `decode_payload(data_b64) → dict | None`

Décode un payload base64 en valeurs flottantes.

```python
from app.payload_codec import decode_payload

result = decode_payload("CSkyZA==")
# {"temperature": 23.45, "humidite": 61.2}
```

Retourne `None` si le payload est invalide (mauvais base64, trop court).

### `decode_chirpstack_payload(payload) → dict | None`

Décode un message JSON Chirpstack v4 complet.

**Priorité** : utilise le champ `object` (pré-décodé par le codec Chirpstack) si présent, sinon décode le champ `data` (base64).

```python
from app.payload_codec import decode_chirpstack_payload

# Payload Chirpstack v4
msg = {
    "deviceInfo": {"devEui": "a1b2c3d4e5f60001"},
    "data": "CSkyZA==",
    "object": {"temperature": 23.45, "humidite": 61.2}
}

result = decode_chirpstack_payload(msg)
# {"device_id": "a1b2c3d4e5f60001", "temperature": 23.45, "humidite": 61.2}
```

### `validate_device_id(device_id) → bool`

Valide qu'un identifiant est au format EUI-64 (16 caractères hexadécimaux).

```python
from app.payload_codec import validate_device_id

validate_device_id("a1b2c3d4e5f60001")  # True
validate_device_id("invalid")            # False
```

## Pipeline complet

```text
Capteur physique
    │
    ▼ struct.pack('>HH', temp×100, hum×10)
4 octets binaires
    │
    ▼ base64.b64encode()
Payload Base64 (champ "data" dans le JSON MQTT)
    │
    ▼ decode_chirpstack_payload()
{"device_id": "...", "temperature": 23.45, "humidite": 61.2}
    │
    ▼ INSERT INTO mesures
PostgreSQL
```
