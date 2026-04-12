"use client"

import { useState, useMemo, memo } from "react"
import Card from "@/components/atoms/Card"
import type { DeviceStats } from "@/lib/types"

type SortKey = "name" | "temp" | "activity"

function DeviceSelector({ devices, selectedDevice, onSelect }: {
  devices: DeviceStats[]
  selectedDevice: string
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortKey>("name")

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = devices.filter(d =>
      (d.name ?? d.device_id).toLowerCase().includes(q) ||
      d.device_id.toLowerCase().includes(q)
    )
    return list.sort((a, b) => {
      if (sortBy === "temp") return b.temp_moyenne - a.temp_moyenne
      if (sortBy === "activity") return new Date(b.derniere_mesure).getTime() - new Date(a.derniere_mesure).getTime()
      return (a.name ?? a.device_id).localeCompare(b.name ?? b.device_id)
    })
  }, [devices, search, sortBy])

  return (
    <Card className="animate-slide-up"
      style={{ animationDelay: "0.1s" }}>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Capteurs ({devices.length})
      </h2>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5
                     text-xs text-white placeholder-gray-600 outline-none
                     focus:border-blue-500 transition-colors"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5
                     text-xs text-gray-400 outline-none cursor-pointer"
        >
          <option value="name">Nom</option>
          <option value="temp">Temp.</option>
          <option value="activity">Activite</option>
        </select>
      </div>
      <div className="space-y-2">
        {filtered.map(d => (
          <button
            key={d.device_id}
            onClick={() => onSelect(d.device_id)}
            className={`w-full text-left p-3 rounded-lg transition-all ${
              selectedDevice === d.device_id
                ? "bg-blue-600/30 border border-blue-500"
                : "bg-gray-800 border border-transparent hover:border-gray-600"
            }`}
          >
            <div className="text-xs text-gray-300 font-semibold">{d.name}</div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">{d.temp_moyenne}°C moy</span>
              {d.last_payload && (
                <span className="text-xs text-gray-600 font-mono text-[10px]">
                  {d.last_payload}
                </span>
              )}
            </div>
            {d.last_lora && (
              <div className="flex gap-3 mt-1">
                <span className="text-[10px] text-gray-600">
                  RSSI {d.last_lora.rssi} dBm
                </span>
                <span className="text-[10px] text-gray-600">
                  SNR {d.last_lora.snr}
                </span>
                <span className="text-[10px] text-gray-600">
                  SF{d.last_lora.spreading_factor}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </Card>
  )
}

export default memo(DeviceSelector)
