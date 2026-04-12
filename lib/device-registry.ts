// lib/device-registry.ts
// Couche : Lib (donnees statiques)
// Role : Registre des devices IoT avec leurs metadonnees (nom, temp/hum de base)
// Source : shared/device-ids.json (partage entre frontend et backend)

import deviceData from "../shared/device-ids.json"

export interface DeviceInfo {
  id: string
  name: string
  baseTemp: number
  baseHum: number
}

/** Simulation parameters per device (not shared — frontend-only). */
const BASE_CONFIGS: Record<string, { baseTemp: number; baseHum: number }> = {
  "a1b2c3d4e5f60001": { baseTemp: 28, baseHum: 45 },
  "a1b2c3d4e5f60002": { baseTemp: 22, baseHum: 65 },
  "a1b2c3d4e5f60003": { baseTemp: 18, baseHum: 72 },
}

export const DEVICES: DeviceInfo[] = deviceData.devices.map(d => ({
  ...d,
  ...(BASE_CONFIGS[d.id] ?? { baseTemp: 22, baseHum: 50 }),
}))

export const DEVICE_NAMES: Record<string, string> = Object.fromEntries(
  DEVICES.map(d => [d.id, d.name])
)

export const DEVICE_IDS: string[] = DEVICES.map(d => d.id)
