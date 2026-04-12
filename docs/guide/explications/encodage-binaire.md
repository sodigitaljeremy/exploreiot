# Encodage binaire LoRaWAN

Ce document explique pourquoi et comment les données capteur sont encodées en binaire avant transmission sur le réseau LoRaWAN, et comment le système les décode.

## 1. Pourquoi l'encodage binaire ?

### Les contraintes de LoRaWAN

LoRaWAN est un protocole radio conçu pour la très longue portée et la très faible consommation d'énergie. Ces avantages ont un coût : la **bande passante est extrêmement limitée**.

La taille maximale d'une trame applicative (payload) dépend du Spreading Factor (SF) choisi :

| Spreading Factor | Portée | Débit | Taille max payload |
|-----------------|--------|-------|-------------------|
| SF7 (rapide) | ~2 km | ~5,5 kbps | 222 octets |
| SF9 (équilibré) | ~5 km | ~1,8 kbps | 115 octets |
| SF12 (longue portée) | ~15 km | ~250 bps | 51 octets |

De plus, la réglementation européenne impose un **duty cycle de 1%** : un capteur ne peut émettre que 1% du temps, soit 36 secondes par heure. Chaque octet transmis est précieux.

### La comparaison JSON vs binaire

Supposons que l'on veuille transmettre une température de 24,50°C et une humidité de 65,30%.

**En JSON :**
```json
{"temperature": 24.50, "humidity": 65.30}
```
Soit environ **40 octets** pour les données seules, beaucoup plus avec les métadonnées.

**En binaire compact :**
```text
09 92 02 8D
```
Soit **4 octets exactement**.

- Réduction : **90% de données en moins**
- Rapport de compression : environ **10×** pour ce payload seul
- Dans une trame complète avec enveloppe JSON (comme Chirpstack), le payload binaire de 4 octets encodé en Base64 (`CZICjQ==`) représente 8 caractères, contre ~200 octets pour un JSON complet : un rapport de **25 à 50×**

Cette économie est la différence entre un capteur qui émet toutes les 5 minutes et un capteur dont la batterie dure 5 ans.

## 2. Le processus d'encodage

### Principe : supprimer les décimales par multiplication

Les nombres à virgule flottante occupent 4 à 8 octets en mémoire. En revanche, un entier non signé de 2 octets (`uint16`) suffit pour représenter des valeurs de 0 à 65535.

L'astuce consiste à **multiplier la valeur par une puissance de 10** pour décaler la virgule et obtenir un entier, puis diviser lors du décodage.

### Encodage de la température

```text
24,50°C  ×  100  =  2450
```

- La précision conservée est 1/100°C = 0,01°C (amplement suffisant)
- 2450 en binaire sur 16 bits : `00001001 10010010`
- En hexadécimal : `0x09 0x92`

### Encodage de l'humidité

```text
65,30%  ×  10  =  653
```

- La précision conservée est 1/10% = 0,1% (suffisant pour une humidité)
- 653 en binaire sur 16 bits : `00000010 10001101`
- En hexadécimal : `0x02 0x8D`

### Packing big-endian avec struct.pack

```python
import struct

temp_raw = int(24.50 * 100)   # 2450
hum_raw  = int(65.30 * 10)    # 653

payload = struct.pack('>HH', temp_raw, hum_raw)
# b'\x09\x92\x02\x8d'
```

Décomposition du format `'>HH'` :
- `>` : big-endian (octet de poids fort en premier, convention réseau standard)
- `H` : unsigned short, 2 octets, valeurs de 0 à 65535
- `HH` : deux unsigned short consécutifs = 4 octets au total

**Convention big-endian vs little-endian :**

| Convention | Représentation de 2450 (0x0992) |
|------------|--------------------------------|
| Big-endian | `09 92` (poids fort en premier) |
| Little-endian | `92 09` (poids faible en premier) |

Le big-endian est la convention standard des protocoles réseau (RFC 1700). Chirpstack et le firmware Dragino utilisent tous deux le big-endian pour les payloads LoRaWAN.

### Encodage Base64 pour transport JSON

Le payload binaire brut contient des octets arbitraires qui ne peuvent pas être insérés directement dans du JSON (certains octets sont des caractères de contrôle non imprimables). L'encodage **Base64** convertit n'importe quelle séquence d'octets en une chaîne de caractères ASCII imprimables.

```python
import base64

b64_payload = base64.b64encode(payload).decode('ascii')
# "CZICjQ=="
```

Le résultat est une chaîne de 8 caractères valide dans n'importe quel JSON.

## 3. Le processus de décodage (subscriber.py)

Le décodage est l'opération inverse, réalisée étape par étape dans `subscriber.py` :

```python
import base64
import struct

# Données reçues dans le message MQTT
data_b64 = "CZICjQ=="

# Étape 1 : Base64 → octets bruts
raw_bytes = base64.b64decode(data_b64)
# b'\x09\x92\x02\x8d'   (4 octets)

# Étape 2 : struct.unpack → deux entiers
temp_raw, hum_raw = struct.unpack('>HH', raw_bytes)
# temp_raw = 2450
# hum_raw  = 653

# Étape 3 : entiers → valeurs physiques
temperature = temp_raw / 100.0   # 24.50°C
humidite    = hum_raw  / 10.0    # 65.3%
```

## 4. Représentation binaire détaillée

Voici la décomposition bit par bit des 4 octets du payload :

### Température : 2450 = 0x0992

```text
Bit position : 15 14 13 12  11 10  9  8   7  6  5  4   3  2  1  0
Valeur       :  0  0  0  0   1  0  0  1   1  0  0  1   0  0  1  0
               └──────────────────────────────────────────────────┘
               Octet de poids fort : 0x09       Octet de poids faible : 0x92
```

### Humidité : 653 = 0x028D

```text
Bit position : 15 14 13 12  11 10  9  8   7  6  5  4   3  2  1  0
Valeur       :  0  0  0  0   0  0  1  0   1  0  0  0   1  1  0  1
               └──────────────────────────────────────────────────┘
               Octet de poids fort : 0x02       Octet de poids faible : 0x8D
```

### Les 4 octets concaténés

```text
Position : Octet 0   Octet 1   Octet 2   Octet 3
Hex      :   09        92        02        8D
Binaire  : 00001001  10010010  00000010  10001101
           └────── température ──────┘└──── humidité ──────┘
```

### Résultat Base64

```text
Entrée (4 octets)  : 09 92 02 8D
Base64 (8 chars)   : C Z I C j Q = =
```

Base64 encode 3 octets en 4 caractères ASCII. Pour 4 octets d'entrée, on obtient 8 caractères (avec padding `==`).

## 5. Le convertisseur dans le dashboard

Le dashboard ExploreIOT inclut un **convertisseur interactif** accessible depuis la page "Convertisseur" (icône calculatrice dans la navigation).

### Fonctionnalités

L'outil principal permet de :

- **Encoder** : saisir une température et une humidité → obtenir les bytes hexadécimaux, le payload binaire et la chaîne Base64
- **Décoder** : coller une chaîne Base64 → obtenir les valeurs physiques reconstituées
- **Visualiser** : affichage étape par étape de chaque transformation avec les valeurs intermédiaires

Le convertisseur inclut également 4 **outils pédagogiques avancés** accessibles via des onglets :

- **Manipulateur de bits** : grille interactive de 16 bits — cliquez sur chaque bit pour le basculer et observez en temps réel l'impact sur la valeur décimale, hexadécimale et physique (température ou humidité)
- **Corruption de données** : simule un flip de bit aléatoire dans un payload valide et affiche côte à côte les valeurs correctes et corrompues, illustrant l'importance de la validation
- **Overhead protocolaire** : visualisation en barres de la taille du payload à chaque niveau du stack : 4 octets bruts → 8 Base64 → 50 JSON → 80 MQTT → 130 TCP/IP (ratio utile : 3,1%)
- **Températures négatives** : slider de -40°C à +85°C avec décomposition pas à pas du complément à 2, montrant comment un capteur encode les températures sous zéro

### Intérêt pédagogique

Le convertisseur est l'outil pédagogique central du projet. Il permet de :

1. **Comprendre intuitivement** l'encodage en voyant les nombres évoluer à chaque étape
2. **Vérifier** qu'un payload reçu d'un vrai capteur est correctement interprété
3. **Déboguer** en comparant ce que le publisher émet et ce que le subscriber reçoit
4. **Expliquer** le pipeline à un tiers sans avoir à ouvrir le code source

### Exemple d'utilisation

Pour vérifier qu'un payload reçu `"ABCD1234=="` correspond bien aux valeurs attendues, il suffit de le coller dans le champ "Décoder" du convertisseur pour obtenir immédiatement la température et l'humidité correspondantes, ainsi que toutes les valeurs intermédiaires.
