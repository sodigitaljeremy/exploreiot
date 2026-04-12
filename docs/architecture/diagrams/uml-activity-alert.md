# Diagramme UML — Activité : Détection des alertes

Logique de détection des deux types d'alertes dans `routes/alerts.py`.

```mermaid
flowchart TD
    START([GET /alerts]) --> QUERY_DEVICES[Requête SQL :<br/>SELECT DISTINCT device_id<br/>FROM mesures 24h]
    QUERY_DEVICES --> LOOP{Pour chaque<br/>device_id}

    LOOP --> CHECK_TEMP[Requête SQL :<br/>Dernière mesure<br/>du capteur]
    CHECK_TEMP --> TEMP_HIGH{temperature ><br/>ALERT_TEMP_THRESHOLD ?}

    TEMP_HIGH -->|Oui| ADD_TEMP_ALERT[Ajouter alerte<br/>TEMPERATURE_ELEVEE]
    TEMP_HIGH -->|Non| CHECK_SILENCE

    ADD_TEMP_ALERT --> CHECK_SILENCE

    CHECK_SILENCE --> SILENCE{Dernière mesure ><br/>ALERT_SILENCE_MINUTES<br/>dans le passé ?}

    SILENCE -->|Oui| ADD_SILENCE_ALERT[Ajouter alerte<br/>CAPTEUR_SILENCIEUX]
    SILENCE -->|Non| NEXT_DEVICE

    ADD_SILENCE_ALERT --> NEXT_DEVICE

    NEXT_DEVICE --> LOOP
    LOOP -->|Tous traités| RESPONSE[Retourner JSON :<br/>nb_alertes + alertes[]]

    style START fill:#4CAF50,color:#fff
    style RESPONSE fill:#2196F3,color:#fff
    style ADD_TEMP_ALERT fill:#F44336,color:#fff
    style ADD_SILENCE_ALERT fill:#FF9800,color:#fff
```

## Types d'alertes

| Type | Condition | Seuil configurable |
|------|-----------|-------------------|
| `TEMPERATURE_ELEVEE` | `temperature > ALERT_TEMP_THRESHOLD` | `ALERT_TEMP_THRESHOLD` (défaut : 33°C) |
| `CAPTEUR_SILENCIEUX` | `NOW() - derniere_mesure > ALERT_SILENCE_MINUTES` | `ALERT_SILENCE_MINUTES` (défaut : 10 min) |

## Caractéristiques

- Les alertes sont **calculées dynamiquement** à chaque appel `GET /alerts` — pas de table persistante
- Les seuils sont configurables via variables d'environnement
- Un même capteur peut déclencher les deux types d'alertes simultanément
