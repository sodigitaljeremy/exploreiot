import { memo } from "react"
import Card from "@/components/atoms/Card"
import { STAT_ACCENTS } from "@/lib/constants"
import type { Stats } from "@/lib/types"

function Stat({ label, value, alert, accent, delay, flash }: {
  label: string
  value: string | number
  alert?: boolean
  accent: string
  delay: number
  flash: boolean
}) {
  return (
    <Card
      className={`${accent} hover:border-gray-700 hover:bg-gray-900/80 transition-all animate-slide-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${alert ? "text-red-400" : "text-white"}
                       ${flash ? "animate-value-update" : ""}`}>
        {value}
      </div>
    </Card>
  )
}

function StatsCards({ stats, alertCount, flash }: {
  stats: Stats
  alertCount: number
  flash: boolean
}) {
  const items = [
    { label: "Capteurs", value: stats.nb_devices },
    { label: "Mesures", value: stats.total_mesures },
    { label: "Temp. moyenne", value: `${stats.temp_moyenne_globale}°C` },
    { label: "Alertes", value: alertCount, alert: alertCount > 0 },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {items.map((s, i) => (
        <Stat
          key={s.label}
          label={s.label}
          value={s.value}
          alert={s.alert}
          accent={STAT_ACCENTS[i]}
          delay={i * 80}
          flash={flash}
        />
      ))}
    </div>
  )
}

export default memo(StatsCards)
