// lib/mock-store.ts
// Simule le flux de donnees IoT en temps reel
// Chaque mesure passe par le vrai pipeline d'encodage LoRaWAN
// Utilise en mode "mock" quand l'API backend n'est pas disponible

import { generateMockMesure } from "./lorawan"
import { DEVICES } from "./device-registry"
import type { Stats, DeviceStats, Mesure } from "./api-client"

// ─── Types alertes ─────────────────────────────────────────

export interface Alerte {
  type: string
  device_id: string
  valeur: number
  message: string
  recu_le: string
}

export interface AlertThresholds {
  tempHigh: number
  tempLow: number
  silenceMinutes: number
}

// ─── Constantes ────────────────────────────────────────────

// Mapping des labels de duree vers millisecondes (filtre "since" du dashboard)
const SINCE_TO_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
}

// Seuils d'alerte par defaut
const DEFAULT_THRESHOLDS: AlertThresholds = { tempHigh: 33, tempLow: 5, silenceMinutes: 10 }

// ─── Historique en memoire ─────────────────────────────────

// Stocke les dernieres mesures par device (max 100 par device)
const history: Record<string, ReturnType<typeof generateMockMesure>[]> = {}

// Pre-remplir 20 mesures historiques par device (espacees de 5s)
DEVICES.forEach(device => {
  history[device.id] = []
  for (let i = 20; i >= 0; i--) {
    const mesure = generateMockMesure(device.id, device.baseTemp, device.baseHum)
    mesure.recu_le = new Date(Date.now() - i * 5000).toISOString()
    history[device.id].push(mesure)
  }
})

// ─── Historique & mesures ──────────────────────────────────

/** Retourne les dernieres mesures d'un device, filtrees par duree optionnelle */
export function getHistory(deviceId: string, limit = 20, since?: string): Mesure[] {
  let data = history[deviceId] || []
  if (since && SINCE_TO_MS[since]) {
    const cutoff = Date.now() - SINCE_TO_MS[since]
    data = data.filter(m => new Date(m.recu_le).getTime() > cutoff)
  }
  return data.slice(-limit)
}

/** Genere et stocke une nouvelle mesure simulee pour un device */
export function addMesure(deviceId: string): ReturnType<typeof generateMockMesure> | null {
  const device = DEVICES.find(d => d.id === deviceId)
  if (!device) return null
  const mesure = generateMockMesure(deviceId, device.baseTemp, device.baseHum)
  history[deviceId].push(mesure)
  if (history[deviceId].length > 100) history[deviceId].shift()
  return mesure
}

// ─── Statistiques ──────────────────────────────────────────

/** Calcule les statistiques globales (nb devices, total mesures, temp moyenne) */
export function getStats(): Stats {
  const allMesures = Object.values(history).flat()
  const temps = allMesures.map(m => m.temperature)
  return {
    nb_devices: DEVICES.length,
    total_mesures: allMesures.length,
    temp_moyenne_globale: +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2),
    derniere_activite: new Date().toISOString(),
  }
}

/** Calcule les statistiques par device (min/max/moyenne, derniere mesure) */
export function getDeviceStats(): DeviceStats[] {
  return DEVICES.map(device => {
    const mesures = history[device.id] || []
    const temps = mesures.map(m => m.temperature)
    const last = mesures[mesures.length - 1]
    return {
      device_id: device.id,
      name: device.name,
      nb_mesures: mesures.length,
      temp_moyenne: +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2),
      temp_min: +Math.min(...temps).toFixed(2),
      temp_max: +Math.max(...temps).toFixed(2),
      derniere_mesure: last?.recu_le,
      last_payload: last?.raw_payload,
      last_lora: last?.lora,
    }
  })
}

// ─── Alertes ───────────────────────────────────────────────

/** Genere les alertes basees sur les seuils de temperature */
export function getAlertes(thresholds?: AlertThresholds): Alerte[] {
  const t = thresholds ?? DEFAULT_THRESHOLDS
  const alertes: Alerte[] = []
  DEVICES.forEach(device => {
    const mesures = history[device.id] || []
    const recent = mesures.filter(m =>
      new Date(m.recu_le) > new Date(Date.now() - t.silenceMinutes * 60 * 1000)
    )
    recent.forEach(m => {
      if (m.temperature > t.tempHigh) {
        alertes.push({
          type: "TEMPERATURE_ELEVEE",
          device_id: m.device_id,
          valeur: m.temperature,
          message: `Température ${m.temperature}°C > seuil ${t.tempHigh}°C`,
          recu_le: m.recu_le,
        })
      }
      if (m.temperature < t.tempLow) {
        alertes.push({
          type: "TEMPERATURE_BASSE",
          device_id: m.device_id,
          valeur: m.temperature,
          message: `Température ${m.temperature}°C < seuil ${t.tempLow}°C`,
          recu_le: m.recu_le,
        })
      }
    })
  })
  return alertes
}
