---
marp: true
theme: default
paginate: true
header: "ExploreIOT — Fondamentaux CS"
footer: "Memo 02 — Représentation des données"
---

# Représentation des données

Bits, bytes, et types numériques en IoT

---

## Le bit et l'octet

**Bit** : Plus petite unité d'information (0 ou 1)

**Octet (Byte)** : 8 bits = 1 octet

```text
1 byte = 8 bits
11010101 = 1 octet
```typescript

En anglais : 1 byte = 8 bits
En français : 1 octet = 8 bits

**ExploreIOT** : Un capteur LoRaWAN envoie 11 octets minimum.

---

## Word et Multi-byte

**Word** : Groupement de bytes selon l'architecture

- 16-bit system : 1 word = 2 bytes
- 32-bit system : 1 word = 4 bytes
- 64-bit system : 1 word = 8 bytes

```python
import struct

# Format: '>HH' = big-endian, 2 unsigned shorts (16-bit each)
payload = struct.pack('>HH', 2450, 65)  # 4 octets (2 words de 2 bytes)
print(len(payload))  # 4
print(payload.hex())  # 09b20041
```typescript

---

## Entiers non signés (unsigned)

Plage : 0 à 2^n - 1

- uint8 : 0 à 255 (1 octet)
- uint16 : 0 à 65,535 (2 octets)
- uint32 : 0 à 4,294,967,295 (4 octets)
- uint64 : 0 à 18,446,744,073,709,551,615 (8 octets)

```python
import struct

# uint16 = 2 octets, non signé
temp_raw = 2450
payload = struct.pack('>H', temp_raw)  # '>H' = big-endian unsigned short
print(f"Bytes: {payload.hex()}")  # 09b2
print(f"Length: {len(payload)} octets")  # 2
```typescript

---

## Entiers signés (signed)

Plage : -(2^(n-1)) à 2^(n-1) - 1

- int8 : -128 à 127 (1 octet)
- int16 : -32,768 à 32,767 (2 octets)
- int32 : -2,147,483,648 à 2,147,483,647 (4 octets)

Représentation : Complément à deux.

```python
import struct

# int16 = 2 octets, signé
temp = -5
payload = struct.pack('>h', temp)  # '>h' = big-endian signed short
print(f"Bytes: {payload.hex()}")  # fffb
```bash

---

## Overflow : Débordement

**Integer overflow** : Quand la valeur dépasse la plage du type.

```python
import struct

# uint8 : 0-255
value = 256
packed = struct.pack('>B', value % 256)  # B = unsigned char (uint8)
print(f"256 % 256 = {256 % 256}")  # 0 (wraparound)

# ExploreIOT exemple : capteur > 255
temp_int = 301
# Si on utilise uint8 sans conversion : overflow !
temp_uint8 = temp_int % 256
print(f"301 as uint8: {temp_uint8}")  # 45
```json

**Solution IoT** : Utiliser uint16, uint32, ou compression (temp × 100).

---

## ExploreIOT : Température en uint16

Capteur de température = -40°C à +85°C.

**Problème** : -40 est négatif. Besoin de **int16** ou offset.

**Solution 1 : int16 (signé)**

```python
import struct

temp_celsius = -5.25
temp_raw = int(temp_celsius * 100)  # -525
payload = struct.pack('>h', temp_raw)  # big-endian signed short
print(f"Temp -5.25°C -> bytes: {payload.hex()}")  # fdef
```python

**Solution 2 : uint16 avec offset**

```python
import struct

temp_celsius = 24.50
temp_raw = int((temp_celsius + 40) * 100)  # Offset +40°C
# (24.50 + 40) * 100 = 6450
payload = struct.pack('>H', temp_raw)  # big-endian unsigned short
print(f"Temp 24.50°C -> bytes: {payload.hex()}")  # 193a
```bash

---

## Struct.pack format

| Format | Type | Bytes | Range |
|--------|------|-------|-------|
| `B` | uint8 | 1 | 0-255 |
| `b` | int8 | 1 | -128 to 127 |
| `H` | uint16 | 2 | 0-65535 |
| `h` | int16 | 2 | -32768 to 32767 |
| `I` | uint32 | 4 | 0-4294967295 |
| `i` | int32 | 4 | -2147483648 to 2147483647 |
| `f` | float | 4 | IEEE 754 |
| `d` | double | 8 | IEEE 754 |

**Prefix** : `>` = big-endian, `<` = little-endian

---

## ExploreIOT : Struct.pack multi-champs

Payload LoRaWAN : température (uint16) + humidité (uint16)

```python
import struct

temperature = 24.50
humidity = 65.0

temp_raw = int(temperature * 100)  # 2450
humidity_raw = int(humidity * 10)  # 650

# '>HH' = big-endian, 2 × uint16
payload = struct.pack('>HH', temp_raw, humidity_raw)
print(f"Payload hex: {payload.hex()}")  # 09b202 + 8a
print(f"Payload bytes: {len(payload)} octets")  # 4

# Décodage
t, h = struct.unpack('>HH', payload)
print(f"Temp: {t/100}°C, Humidity: {h/10}%")  # 24.5°C, 65.0%
```json

---

## Byte order (little vs big)

**Big-endian** (network byte order) :
```text
0x1234 → [0x12, 0x34]  (high byte first)
```python

**Little-endian** :
```text
0x1234 → [0x34, 0x12]  (low byte first)
```text

```python
import struct

value = 0x1234  # 4660

big = struct.pack('>H', value)  # big-endian
print(f"Big-endian:    {big.hex()}")  # 1234

little = struct.pack('<H', value)  # little-endian
print(f"Little-endian: {little.hex()}")  # 3412
```json

---

## Floating point : IEEE 754

**Float (4 bytes)** : ~7 chiffres significatifs

```python
import struct

temp = 24.50
payload_float = struct.pack('>f', temp)
print(f"Float: {payload_float.hex()}")  # 41c40000

# Décoder
unpacked = struct.unpack('>f', payload_float)[0]
print(f"Unpacked: {unpacked}")  # 24.5
```json

**Double (8 bytes)** : ~15 chiffres significatifs

En IoT : Floats pour capteurs, mais peu courant (consomme de la bande).

---

## Overflow vs underflow

**Overflow** : Valeur trop grande

```python
import struct
try:
    struct.pack('>H', 70000)  # uint16 max = 65535
except struct.error as e:
    print(f"Error: {e}")  # unsigned short format requires 0 <= number <= 65535
```bash

**Underflow** : Valeur trop petite (négatif pour unsigned)

```python
import struct
try:
    struct.pack('>H', -5)  # uint16 ne supporte pas les négatifs
except struct.error as e:
    print(f"Error: {e}")  # unsigned short format requires 0 <= number <= 65535
```bash

---

## Bits individuels (bitwise)

Parfois, on doit packer plusieurs petites valeurs dans 1 byte.

```python
# Flags : 3 bits + 5 bits dans 1 byte
status = 3  # 2 bits
config = 5  # 5 bits

value = (status << 5) | config
print(f"Packed: {bin(value)}")  # 0b1011101 = 93

# Unpack
status_unpacked = (value >> 5) & 0b11
config_unpacked = value & 0b11111
print(f"Status: {status_unpacked}, Config: {config_unpacked}")
```python

---

## Points clés à retenir

1. **Octet** = 8 bits, unité de base en IoT
2. **uint16** = 2 octets, 0-65535 : format classique LoRaWAN
3. **int16** = 2 octets signés : pour températures négatives
4. **struct.pack('>HH', x, y)** = 4 octets (2 × uint16)
5. **Overflow** = crashe ou wraparound silencieux
6. **Big-endian** = ordre réseau LoRaWAN
7. **Floats** = rares en IoT (bande limitée)
