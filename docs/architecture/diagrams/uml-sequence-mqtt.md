# Diagramme UML — Séquence : Pipeline MQTT complet

De la génération de mesure dans le publisher jusqu'à l'affichage dans le navigateur.

```mermaid
sequenceDiagram
    participant PUB as Publisher
    participant CODEC as payload_codec
    participant MQ as Mosquitto
    participant SUB as Subscriber
    participant DB as PostgreSQL
    participant MQTT_H as mqtt_handler
    participant WS as ConnectionManager
    participant UI as Dashboard

    PUB->>PUB: generer_mesure(device_id)
    PUB->>CODEC: encode_payload(temp, hum)
    CODEC-->>PUB: base64 string
    PUB->>PUB: Build Chirpstack v4 JSON
    PUB->>MQ: PUBLISH application/{app_id}/device/{id}/event/up

    MQ->>SUB: on_message callback
    SUB->>CODEC: decode_chirpstack_payload(payload)
    CODEC-->>SUB: {device_id, temperature, humidite}
    SUB->>DB: INSERT INTO mesures

    MQ->>MQTT_H: on_message callback
    MQTT_H->>CODEC: decode_chirpstack_payload(payload)
    MQTT_H->>MQTT_H: validate_sensor_reading()
    MQTT_H->>MQTT_H: asyncio.run_coroutine_threadsafe()
    MQTT_H->>WS: broadcast({type: new_mesure, ...})
    WS->>UI: JSON via WebSocket

    UI->>UI: setMetrics(), setStats()
    UI->>UI: Re-render chart + cards
```

## Points clés

1. **Double consommateur** : Le subscriber (worker autonome) et le mqtt_handler (intégré à FastAPI) écoutent tous deux le broker MQTT
2. **Bridge asyncio** : Le callback MQTT s'exécute dans un thread paho-mqtt. `asyncio.run_coroutine_threadsafe()` permet d'appeler `broadcast()` dans la boucle asyncio de FastAPI
3. **Latence** : De l'étape PUBLISH à l'affichage dans le dashboard, la latence totale est < 500 ms en conditions normales
