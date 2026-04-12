"use client"

import { useState, useEffect, useRef } from "react"
import { useDataSource } from "@/lib/data-provider"
import { exportCSV, exportPDF } from "@/lib/exporters"
import { POLLING_INTERVALS, METRICS_HISTORY_LIMIT } from "@/lib/constants"
import type { Stats, DeviceStats, Mesure, Alerte } from "@/lib/types"
import { DashboardSkeleton } from "@/components/shared/Skeleton"
import Term from "@/components/shared/Term"
import ConnectionStatus from "@/components/shared/ConnectionStatus"
import StatsCards from "./StatsCards"
import DeviceSelector from "./DeviceSelector"
import MetricsChart from "./MetricsChart"
import AlertsPanel from "./AlertsPanel"
import { type TimeRange } from "./TimeRangeSelector"
import { loadThresholds, type AlertThresholds } from "./AlertSettings"

export default function Dashboard() {
  const {
    mode, loadStats, loadDevices, loadHistory, loadAlertes,
    refresh, deviceIds, addToast, wsConnected, latestMesure
  } = useDataSource()
  const [stats, setStats] = useState<Stats | null>(null)
  const [devices, setDevices] = useState<DeviceStats[]>([])
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [selectedDevice, setSelectedDevice] = useState(deviceIds[0])
  const [metrics, setMetrics] = useState<Mesure[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>("24h")
  const [thresholds, setThresholds] = useState<AlertThresholds>(loadThresholds)
  const prevStatsRef = useRef<{total: number; temp: number} | null>(null)
  const [flash, setFlash] = useState(false)

  const pollInterval = (mode === "api" && wsConnected) ? null : (mode === "api" ? POLLING_INTERVALS.apiFallback : POLLING_INTERVALS.mock)

  useEffect(() => {
    let active = true
    const run = async () => {
      refresh()
      const [s, d, a, m] = await Promise.all([
        loadStats(), loadDevices(), loadAlertes(thresholds), loadHistory(selectedDevice, timeRange),
      ])
      if (!active) return
      setStats(s)
      setDevices(d)
      setAlertes(a)
      setMetrics(m)
    }
    run()
    if (pollInterval) {
      const t = setInterval(run, pollInterval)
      return () => { active = false; clearInterval(t) }
    }
    return () => { active = false }
  }, [loadStats, loadDevices, loadAlertes, loadHistory, refresh, selectedDevice, timeRange, thresholds, pollInterval])

  /* eslint-disable react-hooks/set-state-in-effect -- WS external subscription */
  useEffect(() => {
    if (!latestMesure) return
    const m = latestMesure
    if (m.device_id === selectedDevice) {
      setMetrics(prev => [...prev, {
        device_id: m.device_id,
        temperature: m.temperature,
        humidite: m.humidite,
        recu_le: m.recu_le,
      }].slice(-METRICS_HISTORY_LIMIT))
    }
    setStats(prev => prev ? {
      ...prev,
      total_mesures: prev.total_mesures + 1,
      derniere_activite: m.recu_le,
    } : prev)
  }, [latestMesure, selectedDevice])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!stats) return
    const prev = prevStatsRef.current
    if (prev && prev.total !== stats.total_mesures) {
      queueMicrotask(() => {
        setFlash(true)
        setTimeout(() => setFlash(false), 700)
      })
    }
    prevStatsRef.current = { total: stats.total_mesures, temp: stats.temp_moyenne_globale }
  }, [stats])

  const selectedName = devices.find(d => d.device_id === selectedDevice)?.name ?? selectedDevice

  const handleExportCSV = () => {
    if (metrics.length === 0) {
      addToast("warning", "Aucune donnee a exporter")
      return
    }
    exportCSV(metrics, selectedName)
    addToast("info", `Export CSV — ${metrics.length} mesures`)
  }

  const handleExportPDF = () => {
    if (metrics.length === 0) {
      addToast("warning", "Aucune donnee a exporter")
      return
    }
    const ok = exportPDF(metrics, selectedName, stats)
    if (!ok) {
      addToast("error", "Popup bloquee — autorisez les popups pour exporter en PDF")
    }
  }

  if (!stats) return <DashboardSkeleton />

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Supervision de parc IoT</h1>
        <p className="text-gray-500 text-sm mt-1">
          {mode === "mock" ? "Donnees simulees" : "API FastAPI"} • Pipeline <Term id="LoRaWAN">LoRaWAN</Term> complet •{" "}
          <span className="text-green-400 animate-live-pulse">●</span>
          <span className="text-green-400 ml-1">Live</span>
        </p>
      </div>

      <ConnectionStatus />
      <StatsCards stats={stats} alertCount={alertes.length} flash={flash} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <DeviceSelector
          devices={devices}
          selectedDevice={selectedDevice}
          onSelect={setSelectedDevice}
        />
        <MetricsChart
          metrics={metrics}
          selectedName={selectedName}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      </div>

      <AlertsPanel alertes={alertes} onThresholdsChange={setThresholds} />
    </div>
  )
}
