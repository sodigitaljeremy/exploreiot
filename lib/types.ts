// lib/types.ts
// Shared types — single source of truth for the entire frontend

// Re-export domain types from their source modules
export type { Stats, DeviceStats, Mesure, HealthStatus, WsNewMesure, WsDebugMqtt, WsMessage, DebugMqttMessage, SystemStatus } from "./api-client"
export type { Alerte, AlertThresholds } from "./mock-store"
export type { LoRaWANFrame } from "./lorawan"

// Toast notifications
export type { Toast } from "@/hooks/useToasts"

// Data source mode
export type DataMode = "mock" | "api"

// Data source context shape (consumed via useDataSource)
export interface DataSource {
  mode: DataMode
  setMode: (mode: DataMode) => void
  loadStats: () => Promise<import("./api-client").Stats>
  loadDevices: () => Promise<import("./api-client").DeviceStats[]>
  loadHistory: (deviceId: string, since?: string) => Promise<import("./api-client").Mesure[]>
  loadAlertes: (thresholds?: import("./mock-store").AlertThresholds) => Promise<import("./mock-store").Alerte[]>
  refresh: () => void
  deviceIds: string[]
  toasts: import("@/hooks/useToasts").Toast[]
  dismissToast: (id: string) => void
  addToast: (type: import("@/hooks/useToasts").Toast["type"], message: string) => void
  latestMesure: import("./api-client").WsNewMesure | null
  wsConnected: boolean
  debugMessages: import("./api-client").WsDebugMqtt[]
}

// App-level types
export type View = "dashboard" | "converter" | "pipeline"

// Pipeline types
export type PipelineMode = "live" | "step-by-step" | "inspector"

export interface PipelineStage {
  id: number
  label: string
  icon: string
  color: string
  dataFormat: string
  codeSnippet: { language: string; code: string }
  description: string
}

export interface PipelineMessage {
  id: string
  deviceId: string
  temperature: number
  humidite: number
  payload: string
  timestamp: string
  currentStage: number
}
