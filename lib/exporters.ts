// lib/exporters.ts
// Couche : Lib utilitaire (export)
// Role : Exporte les mesures en CSV et PDF avec sanitization anti-injection
// Securite : escapeHtml (XSS dans PDF), sanitizeCsvField (formula injection)
// Utilise par : Dashboard (boutons CSV/PDF)

import type { Mesure, Stats } from "./api-client"

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function sanitizeCsvField(value: string | number): string {
  const s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) return `'${s}`
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCSV(metrics: Mesure[], deviceName: string) {
  const header = "device_id,temperature,humidite,recu_le"
  const rows = metrics.map(m =>
    [m.device_id, m.temperature, m.humidite, m.recu_le].map(sanitizeCsvField).join(",")
  )
  const csv = [header, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement("a")
  a.href = url
  a.download = `exploreiot-${deviceName.replace(/\s+/g, "-").toLowerCase()}-${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportPDF(
  metrics: Mesure[],
  deviceName: string,
  stats: Stats | null,
): boolean {
  const rows = metrics.map(m =>
    `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid #333">${escapeHtml(m.device_id)}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #333">${escapeHtml(m.temperature)}°C</td>
      <td style="padding:4px 8px;border-bottom:1px solid #333">${escapeHtml(m.humidite)}%</td>
      <td style="padding:4px 8px;border-bottom:1px solid #333">${new Date(m.recu_le).toLocaleString("fr-FR")}</td>
    </tr>`
  ).join("")

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>ExploreIOT — ${escapeHtml(deviceName)}</title>
<style>
  body { font-family: monospace; background: #fff; color: #111; padding: 2rem; }
  h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 1.5rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
  th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #111; }
</style></head>
<body>
  <h1>ExploreIOT — ${escapeHtml(deviceName)}</h1>
  <div class="meta">
    Exporté le ${new Date().toLocaleString("fr-FR")}
    ${stats ? ` — ${escapeHtml(stats.nb_devices)} capteurs, ${escapeHtml(stats.total_mesures)} mesures totales` : ""}
  </div>
  <table>
    <thead><tr><th>Device</th><th>Température</th><th>Humidité</th><th>Date</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`

  const win = window.open("", "_blank")
  if (win) {
    win.document.write(html)
    win.document.close()
    win.print()
  }
  return !!win
}
