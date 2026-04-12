"use client"

import { useMemo } from "react"
import { useDataSource } from "@/lib/data-provider"
import { usePipeline } from "@/lib/pipeline-context"
import InspectorMessage from "./InspectorMessage"

export default function InspectorWsTab() {
  const { latestMesure, debugMessages, wsConnected, mode } = useDataSource()
  const { messages: pipelineMessages } = usePipeline()

  const frames = useMemo(() => {
    const all: { data: Record<string, unknown> | string; timestamp: string; direction: "incoming" | "outgoing" }[] = []

    if (mode === "mock") {
      // In mock mode, simulate WS frames from pipeline messages
      for (const m of pipelineMessages) {
        all.push({
          data: {
            type: "new_mesure",
            device_id: m.deviceId,
            temperature: m.temperature,
            humidite: m.humidite,
            recu_le: m.timestamp,
          },
          timestamp: m.timestamp,
          direction: "incoming",
        })
      }
      // Add simulated pong frames relative to the last pipeline message
      if (pipelineMessages.length > 0) {
        const lastTs = new Date(pipelineMessages[pipelineMessages.length - 1].timestamp).getTime()
        all.push({
          data: { type: "pong" },
          timestamp: new Date(lastTs - 25000).toISOString(),
          direction: "incoming",
        })
        all.push({
          data: "ping",
          timestamp: new Date(lastTs - 25500).toISOString(),
          direction: "outgoing",
        })
      }
    } else {
      // In API mode, use real data
      for (const m of debugMessages) {
        all.push({
          data: m as unknown as Record<string, unknown>,
          timestamp: m.timestamp,
          direction: "incoming",
        })
      }
      if (latestMesure) {
        all.push({
          data: latestMesure as unknown as Record<string, unknown>,
          timestamp: latestMesure.recu_le,
          direction: "incoming",
        })
      }
    }

    return all
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30)
  }, [latestMesure, debugMessages, pipelineMessages, mode])

  const isConnected = mode === "mock" ? pipelineMessages.length > 0 : wsConnected

  if (!isConnected && frames.length === 0) {
    return (
      <div className="text-xs text-gray-600 italic p-4">
        Aucune frame WebSocket. Passez en mode Live pour generer du trafic simule.
      </div>
    )
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {isConnected && (
        <div className="flex items-center gap-2 text-xs text-green-400 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-live-pulse" />
          {mode === "mock" ? "WebSocket simule (mock)" : "WebSocket connecte"}
        </div>
      )}
      {frames.length === 0 ? (
        <p className="text-xs text-gray-600 italic">En attente de frames WebSocket...</p>
      ) : (
        frames.map((f, i) => (
          <InspectorMessage
            key={i}
            payload={f.data}
            timestamp={f.timestamp}
            protocol={`WS ${f.direction === "incoming" ? "↓" : "↑"}`}
          />
        ))
      )}
    </div>
  )
}
