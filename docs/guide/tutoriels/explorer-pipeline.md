# Tutoriel : Explorer le pipeline IoT interactif

Ce tutoriel vous guide dans l'exploration de la vue Pipeline, qui montre le parcours complet d'une mesure — du capteur au navigateur — en 8 étapes.

## Prérequis

- Le dashboard est accessible sur [http://localhost:3000](http://localhost:3000)
- Le mode Mock ou API est actif (le pipeline fonctionne dans les deux modes)

## Étape 1 — Ouvrir la vue Pipeline

Cliquez sur l'onglet **Pipeline** dans la barre de navigation. Vous verrez un diagramme avec 8 nœuds représentant les étapes du pipeline IoT :

1. **Capteur** — Mesure physique (température + humidité)
2. **Encodage LoRaWAN** — Conversion en binaire (`struct.pack`)
3. **Transmission radio** — LoRa 868 MHz
4. **Gateway** — Pont radio → IP
5. **Serveur réseau** — Chirpstack (décodage)
6. **Broker MQTT** — Mosquitto (routage)
7. **Backend** — Subscriber + PostgreSQL
8. **Dashboard** — WebSocket → affichage

## Étape 2 — Mode Live

Le mode **Live** est activé par défaut. Des mesures simulées traversent automatiquement le pipeline toutes les 5 secondes.

**Ce que vous voyez** : un paquet de données animé se déplace d'étape en étape. Cliquez sur n'importe quel nœud pour afficher :

- Les **données à cette étape** (valeurs brutes, encodées, JSON...)
- Le **snippet de code** correspondant (Python ou TypeScript)
- Une **explication** de la transformation effectuée

## Étape 3 — Mode Pas à pas

Cliquez sur l'onglet **Pas à pas** dans la barre de mode.

1. Cliquez sur **Générer** pour créer une nouvelle mesure (ex : 24.5°C, 61.2%)
2. Cliquez sur **Suivant** pour avancer d'une étape
3. À chaque étape, lisez l'explication et observez la transformation des données :
   - Étape 1 → 2 : `24.5°C` devient `0x0992` (2450 en big-endian)
   - Étape 2 → 3 : Les 4 octets deviennent `CZICjQ==` (Base64)
   - Étape 6 → 7 : Le JSON MQTT est décodé et inséré en base
4. Cliquez sur **Reset** pour recommencer avec de nouvelles valeurs

## Étape 4 — Inspecteur de protocoles

Cliquez sur l'onglet **Inspecteur** pour voir les trames brutes des protocoles :

- **Onglet MQTT** : Messages MQTT complets (deduplicationId, deviceInfo, rxInfo, txInfo)
- **Onglet WebSocket** : Frames WebSocket (`new_mesure`, `debug_mqtt`, `ping/pong`)
- **Onglet HTTP** : Requêtes/réponses REST (`GET /stats`, `/devices`, `/alerts`)

## Ce que vous avez appris

- Le parcours complet d'une mesure IoT en 8 étapes
- La différence entre données binaires, Base64, et JSON
- Comment le bridge thread/asyncio connecte MQTT à WebSocket
- Les protocoles utilisés à chaque étape (LoRaWAN, MQTT, HTTP, WebSocket)

!!! tip "Pour aller plus loin"
    - [Pipeline LoRaWAN](../explications/lorawan-pipeline.md) — explication conceptuelle détaillée
    - [Architecture MQTT](../explications/mqtt-architecture.md) — le pattern pub/sub en profondeur
    - [Tutoriel Convertisseur](utiliser-convertisseur.md) — explorer l'encodage en détail
