// lib/api-client.ts
// Couche : Client HTTP/WebSocket
// Role : Interface typee vers l'API FastAPI (REST + WebSocket)
// Endpoints : /stats, /devices, /devices/:id/metrics, /alerts, /health, /ws
// Fallback : En cas d'echec, useDataLoading bascule automatiquement vers mock-store

import type { Alerte } from "./mock-store"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"
export const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ""

export function getApiUrl(): string { return API_URL }

// ─── Types partagés ──────────────────────────────────────

export interface Stats {
  nb_devices: number
  total_mesures: number
  temp_moyenne_globale: number
  derniere_activite: string
}

export interface DeviceStats {
  device_id: string
  name?: string
  nb_mesures: number
  temp_moyenne: number
  temp_min: number
  temp_max: number
  derniere_mesure: string
  last_payload?: string
  last_lora?: {
    rssi: number
    snr: number
    spreading_factor: number
  }
}

export interface Mesure {
  device_id: string
  temperature: number
  humidite: number
  recu_le: string
}

export interface HealthStatus {
  api: boolean
  database: boolean
  status: "ok" | "degraded"
  timestamp: string
}

// ─── WebSocket types ────────────────────────────────────────

export interface WsNewMesure {
  type: "new_mesure"
  device_id: string
  temperature: number
  humidite: number
  recu_le: string
}

export interface WsDebugMqtt {
  type: "debug_mqtt"
  topic: string
  payload: Record<string, unknown>
  timestamp: string
}

export type WsMessage = WsNewMesure | WsDebugMqtt | { type: "pong" }

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8002/ws"

// ─── Noms des devices (l'API ne les retourne pas) ────────

import { DEVICE_NAMES } from "./device-registry"

// ─── Fonctions fetch ─────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {}
  if (API_KEY) {
    headers["X-API-Key"] = API_KEY
  }
  const res = await fetch(`${API_URL}${path}`, { headers })
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`)
  return res.json()
}

export async function fetchStats(): Promise<Stats> {
  const data = await apiFetch<{ stats: Stats }>("/stats")
  return data.stats
}

export async function fetchDevices(): Promise<DeviceStats[]> {
  const data = await apiFetch<{ devices: DeviceStats[] }>("/devices")
  return data.devices.map(d => ({
    ...d,
    name: DEVICE_NAMES[d.device_id] || d.device_id,
  }))
}

export async function fetchHistory(deviceId: string, limit = 20, since?: string): Promise<Mesure[]> {
  let path = `/devices/${encodeURIComponent(deviceId)}/metrics?limit=${limit}`
  if (since) path += `&since=${since}`
  const data = await apiFetch<{ mesures: Mesure[] }>(path)
  // L'API retourne DESC, on veut ASC pour le graphique
  return data.mesures.reverse()
}

export async function fetchAlertes(): Promise<Alerte[]> {
  const data = await apiFetch<{ alertes: Alerte[] }>("/alerts")
  return data.alertes
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) })
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
  return res.json()
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

export interface DebugMqttMessage {
  topic: string
  payload: Record<string, unknown>
  qos: number
  timestamp: string
}

export async function fetchRecentMqttMessages(limit = 50): Promise<DebugMqttMessage[]> {
  const data = await apiFetch<{ messages: DebugMqttMessage[] }>(`/debug/recent-messages?limit=${limit}`)
  return data.messages
}

export interface SystemStatus {
  api: boolean
  version: string
  uptime_seconds: number
  database: { connected: boolean; mesure_count: number }
  mqtt: { connected: boolean; buffer_size: number }
  websocket: { clients: number }
  publisher: { interval_seconds: number }
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  return apiFetch<SystemStatus>("/status")
}
