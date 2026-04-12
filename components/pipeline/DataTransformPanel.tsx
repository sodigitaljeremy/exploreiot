"use client"

import Card from "@/components/atoms/Card"
import { usePipeline } from "@/lib/pipeline-context"
import { PIPELINE_STAGES } from "@/lib/pipeline-stages"
import { encode } from "@/lib/lorawan"
import { COLOR_MAP } from "@/lib/constants"

export default function DataTransformPanel() {
  const { selectedMessage } = usePipeline()

  if (!selectedMessage) {
    return (
      <Card>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Transformation des donnees
        </h3>
        <p className="text-xs text-gray-600 italic">
          Selectionnez un message pour voir la transformation a chaque etape.
        </p>
      </Card>
    )
  }

  const frame = encode(selectedMessage.temperature, selectedMessage.humidite)

  const transforms = [
    { stage: 0, data: `${selectedMessage.temperature}°C, ${selectedMessage.humidite}%` },
    { stage: 1, data: `[${frame.bytes.join(", ")}] (4 octets)` },
    { stage: 2, data: `"data": "${frame.payload}" (Base64 dans JSON)` },
    { stage: 3, data: `temp=${frame.tempInt}/100=${selectedMessage.temperature}, hum=${frame.humInt}/10=${selectedMessage.humidite}` },
    { stage: 4, data: `INSERT (${selectedMessage.deviceId.slice(0, 8)}..., ${selectedMessage.temperature}, ${selectedMessage.humidite})` },
    { stage: 5, data: `{"temperature": ${selectedMessage.temperature}, "humidite": ${selectedMessage.humidite}}` },
    { stage: 6, data: `{type: "new_mesure", temp: ${selectedMessage.temperature}, hum: ${selectedMessage.humidite}}` },
    { stage: 7, data: `setMetrics → Re-render SVG` },
  ]

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Transformation des donnees
      </h3>
      <div className="space-y-1">
        {transforms.map(t => {
          const stage = PIPELINE_STAGES[t.stage]
          return (
            <div key={t.stage} className="flex gap-2 items-start text-xs font-mono">
              <span className={`shrink-0 ${COLOR_MAP[stage.color] ?? "text-gray-400"}`}>
                {stage.icon}
              </span>
              <span className="text-gray-500 shrink-0 w-20">{stage.label}</span>
              <span className="text-gray-300 break-all">{t.data}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
