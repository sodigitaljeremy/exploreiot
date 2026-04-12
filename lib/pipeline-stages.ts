// lib/pipeline-stages.ts
// Definitions of the 8 IoT pipeline stages from sensor to browser

import type { PipelineStage } from "./types"

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 0,
    label: "Capteur",
    icon: "🌡️",
    color: "blue",
    dataFormat: "Analogique → Numérique (ADC 12 bits)",
    codeSnippet: {
      language: "c",
      code: `// Dragino LHT65 — firmware capteur
float temperature = read_ntc_sensor();  // -40..+85 °C
float humidity    = read_capacitive();  // 0..100 %
uint16_t temp_int = (uint16_t)(temperature * 100);
uint16_t hum_int  = (uint16_t)(humidity * 10);
uint8_t payload[4] = {
  temp_int >> 8, temp_int & 0xFF,
  hum_int  >> 8, hum_int  & 0xFF
};`,
    },
    description:
      "Le capteur Dragino LHT65 mesure la température (thermistance NTC) et l'humidité (capteur capacitif). Les valeurs analogiques sont converties par un ADC 12 bits puis multipliées (×100 pour temp, ×10 pour hum) pour éliminer les décimales. Le résultat tient en 4 octets.",
  },
  {
    id: 1,
    label: "LoRaWAN",
    icon: "📡",
    color: "purple",
    dataFormat: "4 octets payload + headers LoRaWAN (~50 octets total)",
    codeSnippet: {
      language: "text",
      code: `LoRaWAN Frame (EU868):
┌──────────┬──────────┬─────────────┬─────┐
│ PHY HDR  │ MAC HDR  │ Payload 4B  │ MIC │
│ (1 byte) │ (7 byte) │ temp + hum  │ 4B  │
└──────────┴──────────┴─────────────┴─────┘
SF7 BW125 → débit ~5.5 kbit/s
Portée : 2-5 km urbain, 15 km rural`,
    },
    description:
      "La trame radio LoRaWAN encapsule le payload de 4 octets avec des headers MAC (adresse, compteur, port) et un MIC (Message Integrity Code) pour l'authentification. La modulation LoRa (Spreading Factor 7) permet une portée de plusieurs kilomètres avec très peu d'énergie.",
  },
  {
    id: 2,
    label: "MQTT",
    icon: "📨",
    color: "yellow",
    dataFormat: "JSON Chirpstack v4 (~500 octets)",
    codeSnippet: {
      language: "json",
      code: `// Chirpstack v4 — uplink event (simplifié)
{
  "deduplicationId": "550e8400-...",
  "time": "2026-04-12T10:30:05.123Z",
  "deviceInfo": {
    "tenantId": "52f14cd4-...",
    "applicationId": "a1b2c3d4-...",
    "deviceProfileName": "Dragino LHT65",
    "deviceName": "Capteur Salle Serveurs",
    "devEui": "a1b2c3d4e5f60001"
  },
  "fCnt": 1523, "fPort": 1,
  "data": "DLYDIA==",
  "object": {"temperature": 32.7, "humidite": 80.6},
  "rxInfo": [{"gatewayId": "0016c001ff10a567",
    "rssi": -78, "snr": 9.5, "crcStatus": "CRC_OK"}],
  "txInfo": {"frequency": 868100000,
    "modulation": {"lora": {"spreadingFactor": 7,
      "bandwidth": 125000, "codeRate": "CR_4_5"}}}
}`,
    },
    description:
      "Chirpstack (Network Server) reçoit la trame radio via la Gateway, vérifie le MIC, déchiffre, puis publie un message JSON sur MQTT. Le payload binaire est encodé en Base64 dans le champ 'data'. Le topic suit le format application/{id}/device/{devEui}/event/up.",
  },
  {
    id: 3,
    label: "Subscriber",
    icon: "🐍",
    color: "orange",
    dataFormat: "Python dict {temperature, humidite, device_id}",
    codeSnippet: {
      language: "python",
      code: `# subscriber.py — décodage du payload
import base64, struct, json

payload = json.loads(msg.payload)
data = base64.b64decode(payload["data"])
temp_raw, hum_raw = struct.unpack(">HH", data)

temperature = temp_raw / 100  # 3270 → 32.70
humidite    = hum_raw / 10    # 806  → 80.6`,
    },
    description:
      "Le subscriber Python se connecte au broker MQTT, reçoit les messages JSON, extrait le champ 'data' en Base64, le décode en 4 octets, puis utilise struct.unpack('>HH') pour extraire les deux entiers big-endian. Division par 100 et 10 pour retrouver les valeurs physiques.",
  },
  {
    id: 4,
    label: "PostgreSQL",
    icon: "🗄️",
    color: "green",
    dataFormat: "INSERT INTO mesures (device_id, temperature, humidite, recu_le)",
    codeSnippet: {
      language: "sql",
      code: `-- Stockage en base de données
INSERT INTO mesures (device_id, temperature, humidite, recu_le)
VALUES ('a1b2c3d4e5f60001', 32.70, 80.6, NOW());

-- Index pour requêtes rapides
CREATE INDEX idx_device_time
  ON mesures (device_id, recu_le DESC);`,
    },
    description:
      "Les mesures décodées sont insérées dans PostgreSQL. Chaque ligne contient le device_id, la température, l'humidité et le timestamp. Un index composite (device_id, recu_le DESC) optimise les requêtes de l'API qui filtrent par device et trient par date.",
  },
  {
    id: 5,
    label: "API REST",
    icon: "🔌",
    color: "red",
    dataFormat: "JSON HTTP {stats, devices, mesures, alertes}",
    codeSnippet: {
      language: "python",
      code: `# FastAPI route — GET /devices/{id}/metrics
@router.get("/devices/{device_id}/metrics")
async def get_metrics(device_id: str, limit: int = 20):
    rows = await db.fetch(
        "SELECT * FROM mesures WHERE device_id=$1 "
        "ORDER BY recu_le DESC LIMIT $2",
        device_id, limit
    )
    return {"mesures": rows}`,
    },
    description:
      "L'API FastAPI expose les données via des endpoints REST. GET /stats, GET /devices, GET /devices/{id}/metrics, GET /alerts. Chaque requête interroge PostgreSQL et retourne du JSON. L'authentification se fait par clé API (header X-API-Key).",
  },
  {
    id: 6,
    label: "WebSocket",
    icon: "⚡",
    color: "yellow",
    dataFormat: "JSON push {type: 'new_mesure', temperature, humidite, ...}",
    codeSnippet: {
      language: "python",
      code: `# Broadcast temps réel via WebSocket
message = {
    "type": "new_mesure",
    "device_id": decoded["device_id"],
    "temperature": decoded["temperature"],
    "humidite": decoded["humidite"],
    "recu_le": datetime.now().isoformat()
}
await manager.broadcast(message)`,
    },
    description:
      "En parallèle du stockage PostgreSQL, le subscriber broadcast chaque nouvelle mesure à tous les clients WebSocket connectés. Cela permet au dashboard de recevoir les données en temps réel sans polling. Le client maintient la connexion avec un ping/pong toutes les 25s.",
  },
  {
    id: 7,
    label: "Navigateur",
    icon: "🖥️",
    color: "blue",
    dataFormat: "React state → Recharts SVG → pixels sur l'écran",
    codeSnippet: {
      language: "typescript",
      code: `// Dashboard.tsx — réception temps réel
useEffect(() => {
  if (!latestMesure) return;
  setMetrics(prev => [
    ...prev,
    {
      device_id: latestMesure.device_id,
      temperature: latestMesure.temperature,
      humidite: latestMesure.humidite,
      recu_le: latestMesure.recu_le,
    }
  ]);
}, [latestMesure]);`,
    },
    description:
      "Le navigateur reçoit le message WebSocket, met à jour le state React (setMetrics), ce qui déclenche un re-render du composant Recharts. Le SVG du graphique est mis à jour avec le nouveau point de données. Du capteur physique au pixel : le cycle est complet.",
  },
]
