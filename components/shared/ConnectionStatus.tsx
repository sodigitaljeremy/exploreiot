"use client"

import { useState, useCallback } from "react"
import { useDataSource } from "@/lib/data-provider"
import { fetchSystemStatus, type SystemStatus } from "@/lib/api-client"
import { usePolling } from "@/hooks/usePolling"
import StatusDot from "@/components/atoms/StatusDot"

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function StatusCard({ icon, label, ok, children }: {
  icon: string; label: string; ok: boolean; children: React.ReactNode
}) {
  return (
    <div className={`bg-gray-800/50 rounded-lg p-3 border ${
      ok ? "border-green-900/50" : "border-red-900/50"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold text-gray-300">{label}</span>
        <StatusDot color={ok ? "green" : "red"} />
      </div>
      <div className="text-xs text-gray-400 space-y-0.5">
        {children}
      </div>
    </div>
  )
}

export default function ConnectionStatus() {
  const { mode, wsConnected, latestMesure } = useDataSource()
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [apiLatency, setApiLatency] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const start = performance.now()
      const s = await fetchSystemStatus()
      setApiLatency(Math.round(performance.now() - start))
      setStatus(s)
      setError(false)
    } catch {
      setError(true)
      setStatus(null)
    }
  }, [])

  usePolling(refresh, 10000, mode === "api")

  if (mode !== "api") return null

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 mb-6 overflow-hidden animate-slide-up">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-300">Statut des services</span>
          {!error && status && (
            <span className="text-xs text-gray-500">
              v{status.version} • uptime {formatUptime(status.uptime_seconds)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {error ? (
            <span className="text-xs text-red-400">API injoignable</span>
          ) : status ? (
            <div className="flex gap-1">
              <StatusDot color={status.api ? "green" : "red"} />
              <StatusDot color={status.database.connected ? "green" : "red"} />
              <StatusDot color={status.mqtt.connected ? "green" : "red"} />
              <StatusDot color={wsConnected ? "green" : "red"} />
            </div>
          ) : (
            <span className="text-xs text-gray-500">Chargement...</span>
          )}
          <span className={`text-gray-500 text-xs transition-transform ${collapsed ? "" : "rotate-180"}`}>
            ▼
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4">
          {error ? (
            <div className="bg-red-950/30 border border-red-900 rounded-lg p-3 text-xs text-red-400">
              Impossible de joindre l&apos;API sur localhost:8000.
              Lancez <code className="bg-red-950 px-1 rounded">./demo.sh</code> pour demarrer le backend.
            </div>
          ) : status ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatusCard icon="🔌" label="API FastAPI" ok={status.api}>
                <div>Latence : <span className="text-white">{apiLatency}ms</span></div>
                <div>Version : <span className="text-white">{status.version}</span></div>
              </StatusCard>

              <StatusCard icon="🗄️" label="PostgreSQL" ok={status.database.connected}>
                <div>Mesures : <span className="text-white">{status.database.mesure_count.toLocaleString()}</span></div>
                <div>{status.database.connected ? "Connectee" : "Hors ligne"}</div>
              </StatusCard>

              <StatusCard icon="📨" label="MQTT Broker" ok={status.mqtt.connected}>
                <div>Buffer : <span className="text-white">{status.mqtt.buffer_size}</span> msg</div>
                <div>{status.mqtt.connected ? "Connecte" : "Deconnecte"}</div>
              </StatusCard>

              <StatusCard icon="⚡" label="WebSocket" ok={wsConnected}>
                <div>Clients : <span className="text-white">{status.websocket.clients}</span></div>
                <div>{wsConnected ? "Connecte" : "Deconnecte"}</div>
                {latestMesure && (
                  <div className="truncate">Dernier : <span className="text-white">{latestMesure.temperature}°C</span></div>
                )}
              </StatusCard>

              <StatusCard icon="📡" label="Publisher" ok={status.mqtt.connected}>
                <div>Intervalle : <span className="text-white">{status.publisher.interval_seconds}s</span></div>
                <div>{status.mqtt.connected ? "Actif" : "Inactif"}</div>
              </StatusCard>
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center py-2">Connexion en cours...</div>
          )}
        </div>
      )}
    </div>
  )
}
