# Diagramme C4 ��� Niveau 1 : Contexte système

Le diagramme de contexte montre ExploreIOT dans son environnement, avec les acteurs et systèmes externes.

```mermaid
graph TB
    TECH["👤 Technicien IoT<br/><i>Surveille les capteurs<br/>via le navigateur web</i>"]
    ETUD["👤 Étudiant<br/><i>Explore le pipeline LoRaWAN<br/>via le convertisseur</i>"]

    subgraph ExploreIOT["ExploreIOT Dashboard"]
        SYS["📊 Système ExploreIOT<br/><i>Dashboard de supervision IoT<br/>Pipeline LoRaWAN complet</i>"]
    end

    CAPTEURS["📡 Capteurs Dragino LHT65<br/><i>Température + Humidité<br/>LoRaWAN 868 MHz</i>"]
    GW["📶 Gateway LoRaWAN<br/><i>Pont radio LoRa → IP</i>"]
    CS["⚙️ Chirpstack v4<br/><i>Serveur réseau LoRaWAN<br/>(réel ou simulé)</i>"]

    TECH -->|"HTTP / WebSocket"| SYS
    ETUD -->|"HTTP"| SYS
    CAPTEURS -->|"LoRaWAN radio"| GW
    GW -->|"MQTT / UDP"| CS
    CS -->|"MQTT publish<br/>JSON + base64"| SYS

    style SYS fill:#1168bd,color:#fff,stroke:#0b4884
    style TECH fill:#08427b,color:#fff
    style ETUD fill:#08427b,color:#fff
    style CAPTEURS fill:#999,color:#fff
    style GW fill:#999,color:#fff
    style CS fill:#999,color:#fff
```

## Acteurs

| Acteur | Rôle |
|--------|------|
| **Technicien IoT** | Utilisateur principal — surveille le parc de capteurs, configure les alertes, exporte les données |
| **Étudiant** | Utilisateur pédagogique — explore le convertisseur LoRaWAN pour comprendre l'encodage binaire |

## Systèmes externes

| Système | Description |
|---------|-------------|
| **Capteurs Dragino LHT65** | Capteurs physiques LoRaWAN (simulés par `publisher.py` en développement) |
| **Gateway LoRaWAN** | Pont radio-IP (simulé par `publisher.py` en développement) |
| **Chirpstack v4** | Serveur réseau LoRaWAN — disponible en mode réel via `docker compose --profile chirpstack up` |
