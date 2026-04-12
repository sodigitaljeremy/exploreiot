"use client"

import { useState } from "react"

export interface AlertThresholds {
  tempHigh: number
  tempLow: number
  silenceMinutes: number
}

const STORAGE_KEY = "exploreiot-alert-thresholds"

const DEFAULTS: AlertThresholds = {
  tempHigh: 33,
  tempLow: 5,
  silenceMinutes: 10,
}

export function loadThresholds(): AlertThresholds {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    // Validate each field is a finite number to prevent XSS/injection via localStorage
    const tempHigh = Number(parsed.tempHigh)
    const tempLow = Number(parsed.tempLow)
    const silenceMinutes = Number(parsed.silenceMinutes)
    if (!Number.isFinite(tempHigh) || !Number.isFinite(tempLow) || !Number.isFinite(silenceMinutes)) {
      return DEFAULTS
    }
    return { tempHigh, tempLow, silenceMinutes }
  } catch {
    return DEFAULTS
  }
}

function saveThresholds(t: AlertThresholds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
}

export default function AlertSettings({ open, onClose, onChange }: {
  open: boolean
  onClose: () => void
  onChange: (t: AlertThresholds) => void
}) {
  const [thresholds, setThresholds] = useState<AlertThresholds>(loadThresholds)

  const handleSave = () => {
    saveThresholds(thresholds)
    onChange(thresholds)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md
                      animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">Configuration des alertes</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Seuil temperature haute (°C)
            </label>
            <input
              type="number"
              step="0.5"
              value={thresholds.tempHigh}
              onChange={e => setThresholds(t => ({ ...t, tempHigh: +e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                         text-white font-mono outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Seuil temperature basse (°C)
            </label>
            <input
              type="number"
              step="0.5"
              value={thresholds.tempLow}
              onChange={e => setThresholds(t => ({ ...t, tempLow: +e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                         text-white font-mono outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Alerte silence capteur (minutes)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={thresholds.silenceMinutes}
              onChange={e => setThresholds(t => ({ ...t, silenceMinutes: +e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                         text-white font-mono outline-none focus:border-yellow-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg
                       hover:text-white hover:border-gray-500 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg
                       hover:bg-blue-500 font-semibold transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
