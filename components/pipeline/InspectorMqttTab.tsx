"use client"

import { useEffect, useMemo, useState } from "react"
import { useDataSource } from "@/lib/data-provider"
import { usePipeline } from "@/lib/pipeline-context"
import { fetchRecentMqttMessages, type DebugMqttMessage } from "@/lib/api-client"
import { encode } from "@/lib/lorawan"
import { DEVICE_NAMES } from "@/lib/device-registry"
import InspectorMessage from "./InspectorMessage"

/** Deterministic hash for stable mock values across re-renders. */
function stableHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export default function InspectorMqttTab() {
  const { debugMessages, mode } = useDataSource()
  const { messages: pipelineMessages } = usePipeline()
  const [historicMessages, setHistoricMessages] = useState<DebugMqttMessage[]>([])

  // Fetch historic messages from API on mount
  useEffect(() => {
    if (mode === "api") {
      fetchRecentMqttMessages(20)
        .then(setHistoricMessages)
        .catch(() => { /* API not available */ })
    }
  }, [mode])

  // In mock mode, derive full Chirpstack v4 MQTT messages from pipeline messages
  const mockMqttMessages = useMemo(() => {
    if (mode !== "mock") return []
    return pipelineMessages.map((m, i) => {
      const frame = encode(m.temperature, m.humidite)
      const seed = `${m.deviceId}-${m.timestamp}-${i}`
      const h = stableHash(seed)
      return {
        topic: `application/a1b2c3d4-e5f6-7890-abcd-ef0123456789/device/${m.deviceId}/event/up`,
        payload: {
          deduplicationId: `mock-${seed}`,
          time: m.timestamp,
          deviceInfo: {
            tenantId: "52f14cd4-c10a-4b72-8f52-6a7f3e2d1a00",
            tenantName: "ExploreIOT",
            applicationId: "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
            applicationName: "exploreiot-demo",
            deviceProfileId: "d4e5f6a7-b8c9-0123-4567-89abcdef0123",
            deviceProfileName: "Dragino LHT65",
            deviceName: DEVICE_NAMES[m.deviceId] ?? m.deviceId,
            devEui: m.deviceId,
            deviceClassEnabled: "CLASS_A",
            tags: {},
          },
          devAddr: `01ab${m.deviceId.slice(-4)}`,
          adr: true,
          dr: 5,
          fCnt: 100 + i,
          fPort: 1,
          confirmed: false,
          data: frame.payload,
          object: {
            temperature: m.temperature,
            humidite: m.humidite,
          },
          rxInfo: [{
            gatewayId: "0016c001ff10a567",
            uplinkId: h % 99999,
            rssi: -(60 + (h % 40)),
            snr: +((h % 100) / 10 + 5).toFixed(1),
            channel: h % 8,
            crcStatus: "CRC_OK",
            context: "AAAA",
          }],
          txInfo: {
            frequency: 868100000,
            modulation: {
              lora: {
                bandwidth: 125000,
                spreadingFactor: 7,
                codeRate: "CR_4_5",
              },
            },
          },
        } as Record<string, unknown>,
        timestamp: m.timestamp,
        live: true,
      }
    })
  }, [mode, pipelineMessages])

  const allMessages = [
    ...mockMqttMessages,
    ...debugMessages.map(m => ({
      topic: m.topic,
      payload: m.payload,
      timestamp: m.timestamp,
      live: true,
    })),
    ...historicMessages.map(m => ({
      topic: m.topic,
      payload: m.payload,
      timestamp: m.timestamp,
      live: false,
    })),
  ]

  // Sort by timestamp desc
  const sorted = allMessages
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30)

  if (sorted.length === 0) {
    return (
      <div className="text-xs text-gray-600 italic p-4">
        Aucun message MQTT. Passez en mode Live pour generer des messages simules.
      </div>
    )
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {mode === "mock" && (
        <div className="flex items-center gap-2 text-xs text-yellow-400 mb-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          Mode simule — messages reconstitues a partir du pipeline
        </div>
      )}
      {sorted.map((m) => (
        <div key={`${m.topic}-${m.timestamp}`} className="relative">
          {m.live && (
            <span className="absolute -left-1 top-3 w-2 h-2 rounded-full bg-green-400 animate-live-pulse" />
          )}
          <InspectorMessage
            topic={m.topic}
            payload={m.payload}
            timestamp={m.timestamp}
            protocol="MQTT"
          />
        </div>
      ))}
    </div>
  )
}
