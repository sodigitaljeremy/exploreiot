"use client"

import { useEffect, useMemo, useState } from "react"
import { useDataSource } from "@/lib/data-provider"
import { usePipeline } from "@/lib/pipeline-context"
import InspectorMessage from "./InspectorMessage"

interface HttpEntry {
  method: string
  path: string
  duration: number
  status: number
  timestamp: string
}

export default function InspectorHttpTab() {
  const { mode } = useDataSource()
  const { messages: pipelineMessages } = usePipeline()
  const [realEntries, setRealEntries] = useState<HttpEntry[]>([])

  // Capture real API requests via PerformanceObserver (API mode)
  useEffect(() => {
    if (typeof window === "undefined" || !window.PerformanceObserver) return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming
        if (resource.initiatorType !== "fetch" && resource.initiatorType !== "xmlhttprequest") continue
        if (!resource.name.includes("/api") && !resource.name.includes("/health") && !resource.name.includes("/devices") && !resource.name.includes("/stats") && !resource.name.includes("/alerts")) continue

        try {
          setRealEntries(prev => [{
            method: "GET",
            path: new URL(resource.name).pathname,
            duration: Math.round(resource.duration),
            status: 200,
            timestamp: new Date().toISOString(),
          }, ...prev].slice(0, 30))
        } catch { /* malformed URL */ }
      }
    })

    try {
      observer.observe({ type: "resource", buffered: true })
    } catch { /* not supported */ }

    return () => observer.disconnect()
  }, [])

  // In mock mode, derive HTTP entries from pipeline messages (pure computation)
  const mockEntries = useMemo<HttpEntry[]>(() => {
    if (mode !== "mock" || pipelineMessages.length === 0) return []

    const last = pipelineMessages[pipelineMessages.length - 1]
    const base = new Date(last.timestamp).getTime()
    const uniqueDevices = [...new Set(pipelineMessages.map(m => m.deviceId))]

    return [
      { method: "GET", path: "/stats", duration: 18, status: 200, timestamp: new Date(base - 1000).toISOString() },
      { method: "GET", path: "/devices", duration: 25, status: 200, timestamp: new Date(base - 800).toISOString() },
      { method: "GET", path: "/alerts", duration: 14, status: 200, timestamp: new Date(base - 600).toISOString() },
      ...uniqueDevices.map(id => ({
        method: "GET", path: `/devices/${id}/metrics?limit=20`, duration: 22, status: 200, timestamp: new Date(base - 400).toISOString(),
      })),
      { method: "GET", path: "/health", duration: 8, status: 200, timestamp: new Date(base - 200).toISOString() },
    ]
  }, [mode, pipelineMessages])

  const allEntries = mode === "mock" ? mockEntries : realEntries

  if (allEntries.length === 0) {
    return (
      <div className="text-xs text-gray-600 italic p-4">
        Aucune requete HTTP capturee. Passez en mode Live pour voir les requetes simulees.
      </div>
    )
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {mode === "mock" && (
        <div className="flex items-center gap-2 text-xs text-yellow-400 mb-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          Mode simule — requetes API typiques du dashboard
        </div>
      )}
      {allEntries.map((e, i) => (
        <InspectorMessage
          key={i}
          topic={`${e.method} ${e.path}`}
          payload={`Status: ${e.status} | Duration: ${e.duration}ms`}
          timestamp={e.timestamp}
          protocol="HTTP"
        />
      ))}
    </div>
  )
}
