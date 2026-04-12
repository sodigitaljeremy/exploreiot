# Pipeline LoRaWAN bout-en-bout

Ce document décrit le chemin complet d'une donnée capteur, depuis la mesure physique jusqu'à l'affichage sur le dashboard.

## Vue d'ensemble

```text
[Capteur] → [Radio LoRaWAN] → [Gateway] → [MQTT] → [Subscriber] → [PostgreSQL] → [WebSocket] → [Dashboard]
```

## Étapes détaillées

### 1. Mesure physique (Dragino LHT65)

Le capteur Dragino LHT65 est un thermomètre/hygromètre LoRaWAN de classe A. Il mesure en continu :

- La **température** avec une précision de ±0,3°C (plage : -40 à +85°C)
- l'**humidité relative** avec une précision de ±3% (plage : 0 à 100%)

Il se réveille périodiquement (selon la configuration, de quelques secondes à plusieurs heures), effectue la mesure, transmet la trame, puis retourne en veille profonde pour préserver la batterie.

### 2. Encodage binaire sur le capteur

Pour minimiser la taille de la trame radio, le firmware du capteur encode les valeurs en binaire compact :

- La **température** est multipliée par 100 pour supprimer les décimales, puis stockée en `uint16` big-endian (2 octets)
- l'**humidité** est multipliée par 10, puis stockée en `uint16` big-endian (2 octets)
- Le payload total fait exactement **4 octets**

**Exemple concret :**

| Valeur physique | Calcul | Entier | Hexadécimal |
|----------------|--------|--------|-------------|
| Température 24,50°C | 24,50 × 100 | 2450 | `0x0992` |
| Humidité 65,30% | 65,30 × 10 | 653 | `0x028D` |

Les 4 octets concaténés en big-endian : `09 92 02 8D`

Encodé en Base64 pour transport dans l'enveloppe JSON : `CZICjQ==`

**Pourquoi l'encodage binaire ?**

Un réseau LoRaWAN opère sur des bandes de fréquences radio libres (868 MHz en Europe) avec un débit très faible, typiquement quelques centaines de bits par seconde. La taille maximale d'une trame varie entre 51 et 222 octets selon le Spreading Factor (SF) choisi.

- Un payload JSON équivalent : `{"temperature": 24.50, "humidity": 65.30}` représente environ **200 octets**
- Un payload binaire : **4 octets**
- Rapport : **50 fois moins de données** sur le réseau radio

Cette économie est cruciale pour respecter le duty cycle réglementaire (1% maximum en Europe) et la durée de vie de la batterie.

### 3. Transmission LoRaWAN

Le capteur émet une trame radio chiffrée (AES-128) sur la bande 868 MHz. La portée typique est de 2 à 5 km en milieu urbain, jusqu'à 15 km en milieu rural dégagé.

Le protocole LoRaWAN garantit :
- Le chiffrement de bout en bout (AppSKey pour le payload)
- L'authentification du capteur (DevAddr + MIC)
- La déduplication en cas de réception par plusieurs gateways

### 4. Gateway et décodage radio

La gateway LoRaWAN reçoit la trame radio et la transmet immédiatement au serveur réseau (Network Server) via une connexion IP. Elle ne décode pas le payload applicatif, elle se contente de :

- Démoduler le signal LoRa
- Vérifier l'intégrité de la trame (CRC)
- Ajouter les métadonnées radio (RSSI, SNR, fréquence, timestamp)
- Forwarder en JSON via UDP ou MQTT vers le Network Server

### 5. Chirpstack et publication MQTT

**Chirpstack** est le Network Server LoRaWAN utilisé en production. Il :

1. Déchiffre le payload applicatif avec l'AppSKey
2. Décode éventuellement le binaire via un codec JavaScript configuré dans le Device Profile
3. Publie le message sur un topic MQTT de la forme :
   ```text
   application/{appId}/device/{devEUI}/event/up
   ```

L'enveloppe JSON publiée contient :
```json
{
  "deviceInfo": {
    "deviceName": "capteur-01",
    "devEui": "0102030405060708"
  },
  "time": "2026-04-11T10:00:00Z",
  "data": "CZICjQ=="
}
```

**En simulation**, le script `publisher.py` joue le rôle de Chirpstack. Il génère des mesures aléatoires réalistes pour 3 capteurs virtuels toutes les 5 secondes et publie le même format JSON sur Mosquitto.

### 6. Subscriber : décodage et persistance

Le `subscriber.py` est souscrit au topic MQTT. Dès qu'un message arrive, il effectue le décodage inverse :

```text
import base64
import struct

# Données reçues
data_b64 = "CZICjQ=="

# Étape 1 : décodage Base64 → 4 octets bruts
raw_bytes = base64.b64decode(data_b64)
# raw_bytes = b'\x09\x92\x02\x8D'

# Étape 2 : décodage struct big-endian → deux entiers non signés
temp_raw, hum_raw = struct.unpack('>HH', raw_bytes)
# temp_raw = 2450, hum_raw = 653

# Étape 3 : conversion vers valeurs physiques
temperature = temp_raw / 100.0   # 24.50°C
humidite    = hum_raw  / 10.0    # 65.30%
```

### 7. Validation des plages physiques

Avant toute insertion en base, les valeurs sont validées :

- Température : doit être comprise entre **-40°C et +85°C** (plage du capteur LHT65)
- Humidité : doit être comprise entre **0% et 100%** (plage physiquement possible)

Toute valeur hors plage est rejetée avec un log d'erreur. Cela protège la base de données contre des données corrompues ou des erreurs de décodage.

### 8. Insertion PostgreSQL

Les valeurs validées sont insérées dans la table `mesures` :

```sql
INSERT INTO mesures (device_id, temperature, humidite)
VALUES ('0102030405060708', 24.50, 65.30);
```

Le champ `recu_le` est automatiquement renseigné par la valeur par défaut `NOW()` côté PostgreSQL.

### 9. Broadcast WebSocket

L'API FastAPI maintient une liste de connexions WebSocket actives (une par onglet dashboard ouvert). Dès qu'une nouvelle mesure est insérée, elle est broadcastée en JSON à tous les clients connectés :

```json
{
  "device_id": "0102030405060708",
  "temperature": 24.50,
  "humidite": 65.30,
  "recu_le": "2026-04-11T10:00:05.123Z"
}
```

### 10. Affichage temps réel dans Recharts

Le dashboard Next.js reçoit les messages WebSocket et met à jour l'état React. La bibliothèque **Recharts** redessine les graphiques en temps réel sans rechargement de page. L'utilisateur voit les nouvelles mesures apparaître toutes les 5 secondes.

## Vue Pipeline interactive

Le dashboard ExploreIOT inclut une **vue Pipeline** dédiée (accessible via l'icône dans la barre de navigation) qui permet de visualiser interactivement le parcours complet d'une mesure à travers les 8 étapes décrites ci-dessus.

### Trois modes d'exploration

| Mode | Description |
|------|-------------|
| **Live** | Génération automatique de mesures toutes les 5 secondes avec animation du packet traversant le diagramme |
| **Pas à pas** | Progression manuelle étape par étape avec explication pédagogique détaillée à chaque niveau |
| **Inspecteur** | Visualisation des trames brutes MQTT (payloads Chirpstack v4), WebSocket et HTTP échangées entre les composants |

### Diagramme interactif

Le diagramme horizontal affiche les 8 étapes sous forme de noeuds cliquables :

```text
🌡️ Capteur → 📡 LoRaWAN → 📨 MQTT → 📥 Subscriber → 🗄️ PostgreSQL → 🔌 API → ⚡ WebSocket → 🖥️ Navigateur
```

Cliquer sur un noeud affiche :
- Les **données** à ce stade de la transformation (valeur brute, binaire, Base64, JSON, etc.)
- Le **snippet de code** correspondant (Python côté backend, TypeScript côté frontend)
- Une **description pédagogique** du rôle de ce composant dans le pipeline

### Fonctionnement en mode Mock

La vue Pipeline fonctionne intégralement en mode Mock (sans backend). Les données sont générées localement dans le navigateur en reproduisant fidèlement le pipeline d'encodage/décodage LoRaWAN. L'inspecteur de protocoles dérive des trames MQTT/WS/HTTP simulées à partir de ces données.

## Résumé de la latence bout-en-bout

| Étape | Latence typique |
|-------|----------------|
| Mesure → transmission radio | < 1 s |
| Gateway → MQTT Broker | < 100 ms |
| Subscriber → PostgreSQL | < 50 ms |
| API → WebSocket → Dashboard | < 100 ms |
| **Total** | **< 2 secondes** |
