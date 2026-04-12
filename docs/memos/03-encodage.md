---
marp: true
theme: default
paginate: true
header: "ExploreIOT — Fondamentaux CS"
footer: "Memo 03 — Encodage des données"
---

# Encodage des données

ASCII, UTF-8, Base64, URL encoding en IoT

---

## Qu'est-ce que l'encodage ?

**Encoding** : Conversion d'une représentation à une autre.

- **Binaire brut** → Texte lisible (ASCII, UTF-8)
- **Binaire** → Texte sûr pour JSON/HTTP (Base64)
- **URL** → Caractères sûrs (URL encoding)

```python
# Même données, encodages différents
data = b'\x09\xb2'

print(f"Hex:    {data.hex()}")         # 09b2
print(f"Base64: {__import__('base64').b64encode(data).decode()}")  # CbI=
```python

---

## ASCII : American Standard Code

**ASCII** = 7 bits, 128 caractères (0-127).

Exemple : `A` = 0x41 = 65

```python
# ASCII
char = 'A'
ascii_val = ord(char)
print(f"'{char}' -> ASCII {ascii_val} -> 0x{ascii_val:02x}")  # A -> 65 -> 0x41

# Réverse
ascii_byte = 65
char_back = chr(ascii_byte)
print(f"ASCII 65 -> '{char_back}'")  # 65 -> 'A'
```json

**Limitation** : Pas de caractères accentués (é, ñ, ü, etc.)

---

## UTF-8 : Unicode Transformation

**UTF-8** = variable-length encoding, 1-4 bytes par caractère.

- ASCII (0-127) : 1 byte (compatible UTF-8)
- Accents (128-2047) : 2 bytes
- Asiatique, emoji : 3-4 bytes

```python
# UTF-8
text = "Température"
utf8_bytes = text.encode('utf-8')
print(f"Text: {text}")
print(f"UTF-8: {utf8_bytes.hex()}")  # 54656d7065724...

# Décode
decoded = utf8_bytes.decode('utf-8')
print(f"Decoded: {decoded}")  # Température
```json

**ExploreIOT** : Payloads MQTT souvent en UTF-8.

---

## Base64 : Encodage binaire-safe

**Pourquoi Base64 ?**

JSON et HTTP sont texte. Binaire brut = problèmes :
- Null bytes (`\x00`) cassent les strings
- Caractères spéciaux (`\r`, `\n`) interprétés comme contrôle
- Encodage mal défini

**Solution** : Base64 = 64 caractères "sûrs" (A-Z, a-z, 0-9, +, /)

```python
import base64

# Binaire brut
data = b'\x09\xb2\x00\x41'
print(f"Raw bytes: {data.hex()}")  # 09b20041

# Base64
encoded = base64.b64encode(data).decode()
print(f"Base64: {encoded}")  # CbIAQQ==

# Décode
decoded = base64.b64decode(encoded)
print(f"Decoded: {decoded.hex()}")  # 09b20041
```typescript

---

## Base64 : Alphabet et padding

**Alphabet** : 64 caractères

```text
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/
```text

Chaque caractère = 6 bits. 3 bytes bruts = 4 caractères Base64.

```text
Input:  [byte1][byte2][byte3]  (3 × 8 = 24 bits)
Output: [6b][6b][6b][6b]       (4 × 6 = 24 bits)
```typescript

---

## Base64 : Padding

Si entrée ≠ multiple de 3, **padding** avec `=`.

```python
import base64

# 1 byte
data1 = b'A'
b64_1 = base64.b64encode(data1).decode()
print(f"1 byte: {b64_1}")  # QQ== (2 chars + 2 padding)

# 2 bytes
data2 = b'AB'
b64_2 = base64.b64encode(data2).decode()
print(f"2 bytes: {b64_2}")  # QUI= (3 chars + 1 padding)

# 3 bytes
data3 = b'ABC'
b64_3 = base64.b64encode(data3).decode()
print(f"3 bytes: {b64_3}")  # QUJD (4 chars + 0 padding)
```python

| Input | Padding | Total |
|-------|---------|-------|
| n mod 3 = 1 | 2 `=` | 4 chars |
| n mod 3 = 2 | 1 `=` | 4 chars |
| n mod 3 = 0 | 0 `=` | 4 chars |

---

## ExploreIOT : Payload Base64 dans JSON MQTT

Capteur envoie payload brut (binaire). MQTT broker store en JSON.

```json
{
  "deveui": "a1b2c3d4e5f60001",
  "payload": "CbIAQQ==",
  "timestamp": 1681234567
}
```json

```python
import base64
import json

# Côté décoder
payload_b64 = "CbIAQQ=="
payload_bytes = base64.b64decode(payload_b64)
print(f"Decoded: {payload_bytes.hex()}")  # 09b20041

# Unpack
import struct
temp_raw, humidity_raw = struct.unpack('>HH', payload_bytes)
print(f"Temp: {temp_raw/100}°C, Humidity: {humidity_raw/100}%")
```python

---

## URL Encoding (percent encoding)

**Quand** : URL query strings, form data

Caractères non-alphanumériques → `%HH` (hex)

```python
import urllib.parse

text = "temp=24.5°C"
encoded = urllib.parse.quote(text)
print(f"Encoded: {encoded}")  # temp%3D24.5%C2%B0C

# Decode
decoded = urllib.parse.unquote(encoded)
print(f"Decoded: {decoded}")  # temp=24.5°C
```bash

| Char | ASCII | Encoded |
|------|-------|---------|
| ` ` | 32 | `%20` ou `+` |
| `=` | 61 | `%3D` |
| `&` | 38 | `%26` |
| `°` | 176 (UTF-8: `C2 B0`) | `%C2%B0` |

---

## Hex encoding

Binaire → texte hex (2 caractères par byte).

```python
# Hex
data = b'\x09\xb2\x00\x41'
hex_str = data.hex()
print(f"Hex: {hex_str}")  # 09b20041

# Reverse
data_back = bytes.fromhex(hex_str)
print(f"Bytes: {data_back}")  # b'\t\xb2\x00A'
```python

**Usage** : DevEUI, addresses MAC, short payloads.

**vs Base64** : Hex = 2 chars/byte, Base64 = 1.33 chars/byte (33% gain).

---

## ExploreIOT : Payload hex dans MQTT

Alternative au Base64 : Hex string (moins compact mais lisible).

```json
{
  "deveui": "a1b2c3d4e5f60001",
  "payload": "09b20041",
  "timestamp": 1681234567
}
```json

```python
# Décode
payload_hex = "09b20041"
payload_bytes = bytes.fromhex(payload_hex)

import struct
temp_raw, humidity = struct.unpack('>HH', payload_bytes)
print(f"Temp: {temp_raw/100}°C, Humidity: {humidity/100}%")
```python

---

## Comparaison : Tailles

Payload : `b'\x09\xb2\x00\x41'` (4 bytes)

| Encoding | Output | Chars | Overhead |
|----------|--------|-------|----------|
| Raw (invalid JSON) | `\x09\xb2\x00\x41` | - | Invalid |
| Hex | `09b20041` | 8 | 100% |
| Base64 | `CbIAQQ==` | 8 | 100% |
| Base64url | `CbIAQQ==` | 8 | 100% |

**Note** : Base64 avec padding peut atteindre 8 chars pour 6 bytes bruts.

---

## Encodage en chaîne

Souvent, on doit chaîner encodages :

```python
import base64
import json
import struct

# 1. Capteur envoie binaire
temp = 24.50
humidity = 65.0
payload_binary = struct.pack('>HH', int(temp*100), int(humidity*100))

# 2. Base64 pour JSON
payload_b64 = base64.b64encode(payload_binary).decode()

# 3. JSON pour MQTT
message = json.dumps({
    "payload": payload_b64,
    "deveui": "a1b2c3d4e5f60001"
})

print(message)
# {"payload": "CbIAQQ==", "deveui": "a1b2c3d4e5f60001"}

# 4. Décoder
parsed = json.loads(message)
decoded = base64.b64decode(parsed["payload"])
t, h = struct.unpack('>HH', decoded)
print(f"Temp: {t/100}°C")
```python

---

## Points clés à retenir

1. **ASCII** = 7 bits, anglais seulement (0-127)
2. **UTF-8** = variable-length, support accents/emojis
3. **Base64** = binaire-safe pour JSON/HTTP (4 chars = 3 bytes)
4. **Padding** `=` nécessaire si longueur % 3 ≠ 0
5. **Hex** = plus lisible, moins compact (2 chars = 1 byte)
6. **URL encoding** = escape caractères spéciaux (`%HH`)
7. **ExploreIOT** : MQTT JSON → Base64 payload → struct.unpack
