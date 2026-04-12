# Encodage LoRaWAN

## Le problème

LoRaWAN impose une contrainte sévère sur la taille des payloads : selon le facteur d'étalement (SF) et la région, la taille maximale d'un message varie de 11 à 222 octets. Un simple objet JSON comme `{"temperature": 23.5, "humidity": 61.2}` pèse déjà 38 octets — et ce n'est que pour deux valeurs. Avec des capteurs qui transmettent toutes les 15 minutes sur une batterie censée durer 2 ans, chaque octet compte.

Le problème concret rencontré : le capteur Dragino LHT65 envoie ses données en binaire encodé en base64. Le subscriber Python doit décoder ce flux sans perdre de précision sur les valeurs à virgule flottante.

## Ce que j'ai appris

### Le module `struct` de Python

`struct.pack` et `struct.unpack` permettent de convertir des données Python en séquences d'octets selon un format précis. Le format est décrit par une chaîne de caractères :

- `>` : big-endian (octet de poids fort en premier — standard réseau)
- `H` : unsigned short (entier non signé sur 2 octets, valeurs 0 à 65535)
- `h` : signed short (entier signé sur 2 octets, valeurs -32768 à 32767)
- `B` : unsigned byte (1 octet, valeurs 0 à 255)

### Pourquoi multiplier par 100 ?

Les flottants ne s'encodent pas efficacement en binaire compact. La technique consiste à éliminer la virgule par multiplication :
- `23.5°C` devient `2350` (multiplié par 100)
- Encodé sur 2 octets (uint16) au lieu de 4 octets (float32)
- À la réception, on divise par 100 pour retrouver `23.50`

### Base64

LoRaWAN transmet les octets bruts, mais les protocoles JSON (comme celui de The Things Network) les encodent en base64 pour le transport. `base64.b64decode()` reconvertit la chaîne en bytes avant le décodage `struct`.

## Code concret (extrait du projet)

### Encodage — `publisher.py`

```python
import struct
import base64

def encoder_payload(temperature: float, humidite: float) -> str:
    """
    Encode temperature et humidite en payload binaire LoRaWAN.
    Format: 4 octets total
      - 2 octets : temperature * 100 (signed short, big-endian)
      - 2 octets : humidite * 100   (unsigned short, big-endian)
    """
    temp_int = int(temperature * 100)   # ex: 23.5  -> 2350
    hum_int  = int(humidite * 100)      # ex: 61.2  -> 6120

    payload_bytes = struct.pack('>hH', temp_int, hum_int)
    return base64.b64encode(payload_bytes).decode('utf-8')
```

### Décodage — `subscriber.py`

```python
import struct
import base64

def decoder_payload(payload_b64: str) -> dict:
    """
    Décode un payload LoRaWAN base64 en valeurs lisibles.
    Retourne un dict avec 'temperature' et 'humidite'.
    """
    raw_bytes = base64.b64decode(payload_b64)

    # Décode exactement 4 octets : 1 signed short + 1 unsigned short
    temp_raw, hum_raw = struct.unpack('>hH', raw_bytes)

    return {
        "temperature": temp_raw / 100.0,   # 2350  -> 23.50
        "humidite":    hum_raw  / 100.0,   # 6120  -> 61.20
    }
```

## Piège à eviter

### Oublier le prefix big-endian `>`

Sans le `>`, `struct` utilise l'ordre natif de la machine (little-endian sur x86). Le décodage produit alors des valeurs absurdes sans lever d'exception — le bug est silencieux.

```python
# FAUX — little-endian par defaut sur x86
struct.pack('hH', 2350, 6120)   # -> b'\x2e\x09\xe8\x17'

# CORRECT — big-endian explicite
struct.pack('>hH', 2350, 6120)  # -> b'\x09\x2e\x17\xe8'
```

### Depassement de l'uint16 pour les grandes valeurs

Un `unsigned short` (uint16) peut contenir au maximum 65535. Apres multiplication par 100, cela correspond a une valeur maximale de **655.35**. Pour la temperature c'est suffisant, mais pour d'autres grandeurs (pression en Pa, CO2 en ppm), il faut utiliser un `uint32` (`I` dans le format struct) ou reduire le facteur de multiplication.

```python
# DANGER : pression 1013.25 hPa * 100 = 101325 > 65535
struct.pack('>H', 101325)  # -> struct.error: ubyte format requires 0 <= number <= 65535

# SOLUTION : utiliser uint32 ou encoder en dixiemes (101325 / 10 = 10132)
struct.pack('>I', 101325)  # unsigned int 32 bits, range 0 a 4294967295
```

### Signe manquant pour les temperatures negatives

La temperature peut etre negative en hiver. Utiliser `H` (unsigned) au lieu de `h` (signed) fait interpreter -5°C (soit -500) comme 65036.

```python
# FAUX — H est non signe, -500 devient 65036
struct.pack('>H', -500)  # -> struct.error ou valeur corrompue

# CORRECT — h est signe, accepte -32768 a 32767
struct.pack('>h', -500)  # -> b'\xfe\x0c'  ✓
```

## Ressources

- [Python `struct` — documentation officielle](https://docs.python.org/3/library/struct.html)
- [Specification LoRaWAN 1.0.4](https://lora-alliance.org/resource_hub/lorawan-104-specification-package/)
- [Dragino LHT65 — User Manual et payload format](https://www.dragino.com/products/temperature-humidity-sensor/item/151-lht65.html)
- [The Things Network — Payload Formatters](https://www.thethingsindustries.com/docs/integrations/payload-formatters/)
