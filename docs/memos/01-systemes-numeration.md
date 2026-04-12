---
marp: true
theme: default
paginate: true
header: "ExploreIOT — Fondamentaux CS"
footer: "Memo 01 — Systèmes de numération"
---

# Systèmes de numération

Les bases numériques en informatique et IoT

---

## Pourquoi plusieurs bases ?

- **Décimal (base 10)** : Naturel pour les humains
- **Binaire (base 2)** : Langage des ordinateurs
- **Hexadécimal (base 16)** : Compact, facile à lire
- **Octal (base 8)** : Historiquement utilisé

En IoT, on croise tous les formats : DevEUI en hex, payloads en binaire, températures en décimal.

---

## Décimal (base 10)

Chiffres : 0-9

$$325 = 3 \times 10^2 + 2 \times 10^1 + 5 \times 10^0 = 300 + 20 + 5$$

**ExploreIOT exemple** : Température = `2450` (24.50°C × 100)

```python
temperature_raw = 2450
print(f"Temperature: {temperature_raw / 100}°C")  # 24.50°C
```python

---

## Binaire (base 2)

Chiffres : 0-1

$$1101_2 = 1 \times 2^3 + 1 \times 2^2 + 0 \times 2^1 + 1 \times 2^0 = 8 + 4 + 1 = 13_{10}$$

**ExploreIOT exemple** : Payload LoRaWAN

```python
import struct
payload = struct.pack('>HH', 2450, 65)  # temp, humidity
# b'\t\xb2\x00A'  -> en binaire
print(bin(0x09b2))  # '0b1001101100010'
```json

---

## Hexadécimal (base 16)

Chiffres : 0-9, A-F (10-15)

$$\text{2F4}_{16} = 2 \times 16^2 + 15 \times 16^1 + 4 \times 16^0 = 512 + 240 + 4 = 756_{10}$$

**ExploreIOT exemple** : DevEUI LoRaWAN

```python
deveui = "a1b2c3d4e5f60001"
print(f"DevEUI: {deveui}")
deveui_bytes = bytes.fromhex(deveui)
print(f"Binary: {deveui_bytes.hex()}")  # a1b2c3d4e5f60001
```sql

---

## Octal (base 8)

Chiffres : 0-7

$$317_8 = 3 \times 8^2 + 1 \times 8^1 + 7 \times 8^0 = 192 + 8 + 7 = 207_{10}$$

Moins commun en IoT moderne, mais parfois dans les permissions Unix :
```bash
chmod 755 script.sh  # octal notation
```bash

---

## Conversion : Décimal → Binaire

Diviser par 2 répétitivement, noter les restes.

$$45_{10} \to ?_2$$

```text
45 ÷ 2 = 22 reste 1
22 ÷ 2 = 11 reste 0
11 ÷ 2 = 5  reste 1
5  ÷ 2 = 2  reste 1
2  ÷ 2 = 1  reste 0
1  ÷ 2 = 0  reste 1
```bash

Résultat (lire de bas en haut) : $$45_{10} = 101101_2$$

---

## Conversion : Décimal → Hexadécimal

Diviser par 16 répétitivement.

$$255_{10} \to ?_{16}$$

```text
255 ÷ 16 = 15 reste 15 (F)
15  ÷ 16 = 0  reste 15 (F)
```python

Résultat : $$255_{10} = \text{FF}_{16}$$

---

## Conversion : Binaire ↔ Hexadécimal

Grouper par 4 bits (pour hex), 3 bits (pour octal).

**Binaire → Hex** (par groupes de 4) :

```text
1011 1101 0010
  B    D    2
→ BD2₁₆
```text

**ExploreIOT** :
```python
binary = "10110010"
hex_val = hex(int(binary, 2))
print(hex_val)  # 0xb2
```text

---

## Conversion : Hexadécimal → Binaire

Chaque hex digit = 4 bits.

$$\text{A5}_{16} \to ?_2$$

```text
A → 1010
5 → 0101
A5₁₆ = 10100101₂ = 165₁₀
```text

---

## ExploreIOT : Conversion MQTT payload

Payload reçu en MQTT (hex) : `09b2`

```python
import json

# Payload hex depuis MQTT
hex_payload = "09b2"

# Hex → bytes
payload_bytes = bytes.fromhex(hex_payload)

# Bytes → struct
temp_raw = int.from_bytes(payload_bytes[:2], 'big')
temperature = temp_raw / 100

print(f"Raw: {temp_raw}, Décimal: {temperature}°C")
# Output: Raw: 2482, Décimal: 24.82°C
```typescript

---

## ExploreIOT : DevEUI en hexadécimal

LoRaWAN DevEUI = identifiant unique, 8 octets, en hexadécimal.

```python
deveui_hex = "a1b2c3d4e5f60001"
deveui_bytes = bytes.fromhex(deveui_hex)

print(f"Hex:    {deveui_hex}")
print(f"Bytes:  {deveui_bytes}")
print(f"Decimal: {int(deveui_hex, 16)}")
# 11627594957220929 (énorme en décimal !)
```python

Pourquoi hex ? **Compact et lisible** pour les identifiants longs.

---

## Résumé

| Base | Notation | Chiffres | Usage |
|------|----------|----------|-------|
| Binaire | 0b | 0-1 | CPU, logique |
| Octal | 0o | 0-7 | Permissions Unix |
| Décimal | - | 0-9 | Lisibilité humaine |
| Hexadécimal | 0x | 0-F | Identifiants, payloads |

**ExploreIOT** : DevEUI (hex) → Payload (binaire) → JSON (décimal)

---

## Points clés à retenir

1. Conversion entre bases = compétence fondamentale
2. Hex = notation compacte pour les longs IDs (DevEUI, addresses MAC)
3. Binaire = représentation interne CPU
4. Python : `int(x, base)`, `hex()`, `bin()`, `oct()`, `.fromhex()`, `.hex()`
5. LoRaWAN = big-endian (hex left-to-right = high byte first)

!!! tip "Appliquer dans ExploreIOT"
    - Les DevEUI des capteurs sont des identifiants hexadécimaux (ex: `0102030405060708`)
    - Le payload binaire utilise la représentation en base 2 pour encoder température et humidité
    - Voir le [journal — Encodage LoRaWAN](../journal/lorawan-encoding.md) pour l'application concrète
