"use client"

// lib/data-provider.tsx
// Contexte central qui compose les hooks specialises
// Les consumers utilisent useDataSource() — l'API reste identique

import { createContext, useContext, useState, type ReactNode } from "react"
import { useToasts } from "@/hooks/useToasts"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useDataLoading } from "@/hooks/useDataLoading"
import type { DataSource, DataMode } from "./types"

const DataSourceContext = createContext<DataSource | null>(null)

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DataMode>("mock")
  const { toasts, addToast, dismissToast } = useToasts()
  const { wsConnected, latestMesure, debugMessages } = useWebSocket(mode)
  const { loadStats, loadDevices, loadHistory, loadAlertes, refresh, deviceIds } =
    useDataLoading(mode, setMode, addToast)

  return (
    <DataSourceContext value={{
      mode, setMode,
      loadStats, loadDevices, loadHistory, loadAlertes,
      refresh, deviceIds,
      toasts, dismissToast, addToast,
      latestMesure, wsConnected,
      debugMessages,
    }}>
      {children}
    </DataSourceContext>
  )
}

export function useDataSource(): DataSource {
  const ctx = useContext(DataSourceContext)
  if (!ctx) throw new Error("useDataSource must be used within DataSourceProvider")
  return ctx
}
