"use client"

import { useState, memo } from "react"
import Card from "@/components/atoms/Card"
import type { Alerte } from "@/lib/types"
import AlertSettings, { type AlertThresholds } from "./AlertSettings"

function AlertsPanel({ alertes, onThresholdsChange }: {
  alertes: Alerte[]
  onThresholdsChange?: (t: AlertThresholds) => void
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <Card className="animate-slide-up"
      style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Alertes ({alertes.length})
        </h2>
        <button
          onClick={() => setSettingsOpen(true)}
          className="text-xs text-gray-500 border border-gray-700 px-2 py-1 rounded
                     hover:text-white hover:border-gray-500 transition-colors"
        >
          Seuils
        </button>
      </div>
      <AlertSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChange={t => onThresholdsChange?.(t)}
      />
      {alertes.length === 0 ? (
        <p className="text-gray-600 text-sm">Aucune alerte active</p>
      ) : (
        <div className="space-y-2">
          {alertes.map(a => (
            <div key={`${a.device_id}-${a.recu_le}`}
              className="p-3 rounded-lg text-sm bg-red-950/50 border border-red-900
                         border-l-2 border-l-red-500">
              <span className="text-red-400 font-semibold">{a.type}</span>
              <span className="text-gray-500 mx-2">—</span>
              <span className="text-gray-300">{a.message}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default memo(AlertsPanel)
