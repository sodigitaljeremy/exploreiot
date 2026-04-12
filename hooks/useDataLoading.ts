"use client"

// hooks/useDataLoading.ts
// Charge les donnees depuis l'API ou le mock store avec fallback automatique
// Si l'API echoue → toast warning + bascule en mode mock

import { useCallback } from "react"
import {
  getStats, getDeviceStats, getAlertes, getHistory,
  addMesure, type AlertThresholds,
} from "@/lib/mock-store"
import { DEVICES } from "@/lib/device-registry"
import {
  fetchStats, fetchDevices, fetchHistory, fetchAlertes,
  type Stats, type DeviceStats, type Mesure,
} from "@/lib/api-client"
import type { Alerte } from "@/lib/mock-store"
import type { DataMode, Toast } from "@/lib/types"

type SetMode = (mode: DataMode) => void
type AddToast = (type: Toast["type"], message: string) => void

export function useDataLoading(mode: DataMode, setMode: SetMode, addToast: AddToast) {
  // Helper : appelle l'API, fallback vers mock si echec
  const apiWithFallback = useCallback(async <T,>(apiFn: () => Promise<T>, mockFn: () => T): Promise<T> => {
    if (mode !== "api") return mockFn()
    try {
      return await apiFn()
    } catch {
      addToast("warning", "API injoignable — basculement vers données simulées")
      setMode("mock")
      return mockFn()
    }
  }, [mode, setMode, addToast])

  const loadStats = useCallback(
    (): Promise<Stats> => apiWithFallback(fetchStats, getStats), [apiWithFallback])

  const loadDevices = useCallback(
    (): Promise<DeviceStats[]> => apiWithFallback(fetchDevices, getDeviceStats), [apiWithFallback])

  const loadHistory = useCallback(
    (deviceId: string, since?: string): Promise<Mesure[]> =>
      apiWithFallback(() => fetchHistory(deviceId, 20, since), () => getHistory(deviceId, 20, since)),
    [apiWithFallback])

  const loadAlertes = useCallback(
    (thresholds?: AlertThresholds): Promise<Alerte[]> =>
      apiWithFallback(fetchAlertes, () => getAlertes(thresholds)),
    [apiWithFallback])

  // En mode mock, genere une nouvelle mesure pour chaque device
  const refresh = useCallback(() => {
    if (mode === "mock") {
      DEVICES.forEach(d => addMesure(d.id))
    }
  }, [mode])

  const deviceIds = DEVICES.map(d => d.id)

  return { loadStats, loadDevices, loadHistory, loadAlertes, refresh, deviceIds }
}
