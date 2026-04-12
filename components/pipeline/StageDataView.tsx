import type { PipelineStage, PipelineMessage } from "@/lib/types"
import { encode } from "@/lib/lorawan"

export default function StageDataView({ stage, message }: {
  stage: PipelineStage
  message: PipelineMessage | null
}) {
  if (!message) {
    return (
      <div className="text-sm text-gray-600 italic">
        Aucun message selectionne — generez une mesure ou selectionnez-en une dans la timeline.
      </div>
    )
  }

  const frame = encode(message.temperature, message.humidite)

  const dataByStage: Record<number, { label: string; value: string }[]> = {
    0: [
      { label: "Temperature", value: `${message.temperature}°C` },
      { label: "Humidite", value: `${message.humidite}%` },
    ],
    1: [
      { label: "Payload (4 octets)", value: `[${frame.bytes.join(", ")}]` },
      { label: "SF / BW", value: "SF7 / BW125" },
      { label: "Frequence", value: "868.1 MHz" },
    ],
    2: [
      { label: "Topic MQTT", value: `application/1/device/${message.deviceId}/event/up` },
      { label: "data (Base64)", value: frame.payload },
    ],
    3: [
      { label: "temp_raw", value: `${frame.tempInt}` },
      { label: "hum_raw", value: `${frame.humInt}` },
      { label: "temperature", value: `${frame.tempInt} / 100 = ${message.temperature}` },
      { label: "humidite", value: `${frame.humInt} / 10 = ${message.humidite}` },
    ],
    4: [
      { label: "device_id", value: message.deviceId },
      { label: "temperature", value: `${message.temperature}` },
      { label: "humidite", value: `${message.humidite}` },
      { label: "recu_le", value: message.timestamp },
    ],
    5: [
      { label: "Endpoint", value: `GET /devices/${message.deviceId}/metrics` },
      { label: "Response", value: `{temperature: ${message.temperature}, humidite: ${message.humidite}}` },
    ],
    6: [
      { label: "type", value: "new_mesure" },
      { label: "device_id", value: message.deviceId },
      { label: "temperature", value: `${message.temperature}` },
      { label: "humidite", value: `${message.humidite}` },
    ],
    7: [
      { label: "State update", value: `setMetrics([...prev, {temp: ${message.temperature}, hum: ${message.humidite}}])` },
      { label: "Re-render", value: "Recharts SVG → pixel" },
    ],
  }

  const data = dataByStage[stage.id] ?? []

  return (
    <div className="space-y-2">
      <span className="text-xs text-gray-500 uppercase tracking-wider">
        Donnees a cette etape
      </span>
      <div className="font-mono text-xs space-y-1">
        {data.map(d => (
          <div key={d.label} className="flex gap-2">
            <span className="text-gray-500 shrink-0">{d.label}:</span>
            <span className="text-gray-300 break-all">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
