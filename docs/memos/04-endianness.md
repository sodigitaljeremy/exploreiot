---
marp: true
theme: default
paginate: true
header: "ExploreIOT — Fondamentaux CS"
footer: "Memo 04 — Endianness (ordre des octets)"
---

# Endianness

Big-endian vs little-endian : ordre des octets

---

## Le problème : Comment représenter un multi-byte ?

Valeur : `0x1234` (4660 décimal)

Comment stocker dans 2 bytes ?

**Option 1** : High byte d'abord → `0x12 0x34` (big-endian)
**Option 2** : Low byte d'abord → `0x34 0x12` (little-endian)

```text
0x1234 → Bytes en big-endian: [0x12, 0x34]
0x1234 → Bytes en little-endian: [0x34, 0x12]
```text

```python
import struct

value = 0x1234

# Big-endian
big_bytes = struct.pack('>H', value)
print(f"Big-endian:    {big_bytes.hex()}")  # 1234

# Little-endian
little_bytes = struct.pack('<H', value)
print(f"Little-endian: {little_bytes.hex()}")  # 3412
```json

---

## Big-endian (ordre réseau)

**High byte en premier.**

```text
0x1234 → [0x12, 0x34]  (12 est le "big" end)
```text

Aussi appelé : **network byte order**, **most significant byte first**.

**Avantage** : Lisible. Comparaisons numériques directes en mémoire.

```python
import struct

# Plusieurs valeurs
values = [0x1234, 0x5678, 0xABCD]

for v in values:
    big = struct.pack('>H', v)
    print(f"0x{v:04x} → {big.hex()}")

# Output:
# 0x1234 → 1234
# 0x5678 → 5678
# 0xabcd → abcd
```text

---

## Little-endian

**Low byte en premier.**

```text
0x1234 → [0x34, 0x12]  (34 est le "little" end)
```text

Aussi appelé : **least significant byte first**.

**Avantage** : Naturel sur architectures x86/x64 (Intel, AMD).

```python
import struct

# Même valeurs
values = [0x1234, 0x5678, 0xABCD]

for v in values:
    little = struct.pack('<H', v)
    print(f"0x{v:04x} → {little.hex()}")

# Output:
# 0x1234 → 3412
# 0x5678 → 7856
# 0xabcd → cdab
```python

---

## Exemple : 4-byte (uint32)

Valeur : `0x12345678`

```text
Big-endian:    [0x12, 0x34, 0x56, 0x78]
Little-endian: [0x78, 0x56, 0x34, 0x12]
```text

```python
import struct

value = 0x12345678

big = struct.pack('>I', value)
little = struct.pack('<I', value)

print(f"Value:         0x{value:08x}")
print(f"Big-endian:    {big.hex()}")      # 12345678
print(f"Little-endian: {little.hex()}")   # 78563412
```json

---

## LoRaWAN : Big-endian par protocole

**LoRaWAN standard = big-endian.**

Tous les payloads LoRaWAN → big-endian (`>` en struct.pack).

**Pourquoi ?** Protocole basé sur standards réseau (IEEE 802).

```python
import struct

# Température 24.50°C
temperature = 24.50
temp_raw = int(temperature * 100)  # 2450 = 0x0992

# LoRaWAN → big-endian
payload = struct.pack('>H', temp_raw)
print(f"LoRaWAN payload: {payload.hex()}")  # 0992

# Si on avait utilisé little-endian (FAUX pour LoRaWAN)
payload_wrong = struct.pack('<H', temp_raw)
print(f"Wrong (little):  {payload_wrong.hex()}")  # 9209
```json

---

## struct.pack format : `>` vs `<`

| Prefix | Endian | Network | CPU |
|--------|--------|---------|-----|
| `>` | **Big** | Standard | SPARC, ARM (BE), Network |
| `<` | **Little** | - | x86, x64, ARM (LE) |
| `=` | Native | - | Architecture default |
| `@` | Native | - | Default (with padding) |

```python
import struct

value = 0x1234

formats = {
    '>H': 'big-endian',
    '<H': 'little-endian',
    '=H': 'native (auto-detect)',
}

for fmt, desc in formats.items():
    packed = struct.pack(fmt, value)
    print(f"{fmt:3} ({desc:20}): {packed.hex()}")
```typescript

---

## CPU native endianness

Votre CPU (x86/ARM) a un endianness natif. Python `@` = auto-detect.

```python
import sys
import struct

print(f"Native endian: {sys.byteorder}")

# Encode
value = 0x1234
native = struct.pack('@H', value)
auto_le = struct.pack('<H', value)
auto_be = struct.pack('>H', value)

print(f"Native:        {native.hex()}")
print(f"Little-endian: {auto_le.hex()}")
print(f"Big-endian:    {auto_be.hex()}")

# Sur x86 (little-endian) :
# Native:        3412  (= little-endian)
# Little-endian: 3412
# Big-endian:    1234
```text

---

## ExploreIOT : Décoder payload LoRaWAN

Payload reçu en hex : `09b20041`

```python
import struct

# Payload hex (big-endian car LoRaWAN)
payload_hex = "09b20041"
payload_bytes = bytes.fromhex(payload_hex)

# Décodage avec struct
# '>HH' = big-endian, 2 × uint16
temp_raw, humidity_raw = struct.unpack('>HH', payload_bytes)

temperature = temp_raw / 100
humidity = humidity_raw / 100

print(f"Temperature: {temperature}°C")
print(f"Humidity: {humidity}%")

# Output:
# Temperature: 24.82°C
# Humidity: 16.57%
```text

---

## ExploreIOT : Encoder pour LoRaWAN

Capteur doit envoyer temperature (24.50°C) + humidity (65%).

```python
import struct

# Values
temperature = 24.50
humidity = 65.0

# Encoding
temp_raw = int(temperature * 100)      # 2450
humidity_raw = int(humidity * 100)     # 6500

# Pack as big-endian (LoRaWAN standard)
payload = struct.pack('>HH', temp_raw, humidity_raw)

print(f"Payload hex: {payload.hex()}")  # 09b2196c
print(f"Payload bytes: {list(payload)}")  # [9, 178, 25, 108]
```json

---

## Erreur classique : Mauvais endian

```python
import struct

# Data supposé big-endian (LoRaWAN)
payload_hex = "09b20041"
payload_bytes = bytes.fromhex(payload_hex)

# ✓ CORRECT : big-endian
correct = struct.unpack('>HH', payload_bytes)
print(f"Correct (>HH):   {correct}")  # (2482, 65)

# ✗ WRONG : little-endian
wrong = struct.unpack('<HH', payload_bytes)
print(f"Wrong (<HH):     {wrong}")    # (47369, 16640)

# Signification erronée ! 47369 / 100 = 473.69°C (impossible)
```json

**Symptôme** : Valeurs complètement déraisonnables.

---

## Multi-byte dans payloads

Toujours spécifier endian quand on pack/unpack.

```python
import struct

# Payload :
# - uint8 count = 5
# - uint16 distance = 1234 m
# - uint16 signal = -65 dBm (int16 en signé)

count = 5
distance = 1234
signal = -65

# Pack
payload = struct.pack('>BhH', count, signal, distance)
#         LoRaWAN big-endian: 1 byte, 1 int16, 1 uint16
print(f"Payload: {payload.hex()}")

# Unpack
c, s, d = struct.unpack('>BhH', payload)
print(f"Count: {c}, Signal: {s} dBm, Distance: {d} m")
```json

| Format | Big-endian | Little-endian |
|--------|-----------|---------------|
| `>BhH` | Correct pour LoRaWAN | Wrong |
| `<BhH` | Wrong | Correct pour x86 |

---

## Comparaison hex vs binary

Quelle est la valeur 0x1234 en binaire ?

```text
0x12   = 0001 0010 = high byte
0x34   = 0011 0100 = low byte

0x1234 = 0001 0010 0011 0100
       = 4660 décimal
```text

En big-endian, bytes sont dans l'ordre : `12 34` (left-to-right).
En little-endian, bytes inversés : `34 12`.

```python
import struct

val = 0x1234
print(f"Hex:      0x{val:04x}")
print(f"Binary:   {bin(val)}")
print(f"Decimal:  {val}")

big = struct.pack('>H', val)
print(f"Big-endian bytes:    {' '.join(f'{b:02x}' for b in big)}")  # 12 34

little = struct.pack('<H', val)
print(f"Little-endian bytes: {' '.join(f'{b:02x}' for b in little)}")  # 34 12
```json

---

## Checklist : Implémenter encodage/décodage

**Encoding (capteur → réseau)** :

```python
import struct

temp = 24.50
temp_raw = int(temp * 100)
payload = struct.pack('>H', temp_raw)  # ✓ big-endian, unsigned
# ✓ Envoyer `payload` en hex ou Base64
```bash

**Decoding (réseau → affichage)** :

```python
import struct

# ✓ Recevoir en hex ou Base64
payload_hex = "09b2"
payload_bytes = bytes.fromhex(payload_hex)

# ✓ Unpack avec même format : big-endian
temp_raw = struct.unpack('>H', payload_bytes)[0]
temp = temp_raw / 100
# ✓ Afficher temp
```python

**Règles** :
1. Encoder = pack (capteur)
2. Décoder = unpack (récepteur)
3. **Même format `>` ou `<` des deux côtés**
4. LoRaWAN = toujours `>`

---

## Points clés à retenir

1. **Big-endian** = high byte first (0x1234 → 12 34)
2. **Little-endian** = low byte first (0x1234 → 34 12)
3. **LoRaWAN** = big-endian (`>` en struct.pack)
4. **Network byte order** = big-endian (standard réseau)
5. **x86/x64 native** = little-endian, mais LoRaWAN force big-endian
6. **Mismatch** → valeurs aberrantes (−65 dBm devient 47000+)
7. **struct.pack('>HH', ...)** = big-endian 2 uint16
8. **struct.unpack('>HH', ...)** = doit être identique au pack
