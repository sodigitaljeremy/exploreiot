"use client"

import { useState, useEffect } from "react"
import { useDataSource } from "@/lib/data-provider"
import { fetchHealth } from "@/lib/api-client"
import { HEALTH_CHECK_INTERVAL } from "@/lib/constants"
import type { HealthStatus } from "@/lib/types"

export default function HealthIndicator() {
  const { mode } = useDataSource()
  const [health, setHealth] = useState<HealthStatus | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect -- health polling from external API */
  useEffect(() => {
    if (mode !== "api") {
      setHealth(null)
      return
    }
    const check = async () => {
      try {
        const h = await fetchHealth()
        setHealth(h)
      } catch {
        setHealth({ api: false, database: false, status: "degraded", timestamp: "" })
      }
    }
    check()
    const t = setInterval(check, HEALTH_CHECK_INTERVAL)
    return () => clearInterval(t)
  }, [mode])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (mode !== "api" || !health) return null

  const isOk = health.status === "ok"
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`inline-block w-2 h-2 rounded-full ${isOk ? "bg-green-400" : "bg-red-400"}`} />
      <span className="text-gray-500">
        {isOk ? "Systeme OK" : "Degradee"}
      </span>
      {!health.database && (
        <span className="text-red-400">DB hors ligne</span>
      )}
    </div>
  )
}
