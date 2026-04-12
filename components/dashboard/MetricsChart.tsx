"use client"

import { memo } from "react"
import Card from "@/components/atoms/Card"
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { CHART_HEIGHT } from "@/lib/constants"
import type { Mesure } from "@/lib/types"
import TimeRangeSelector, { type TimeRange } from "./TimeRangeSelector"

function MetricsChart({ metrics, selectedName, onExportCSV, onExportPDF, timeRange, onTimeRangeChange }: {
  metrics: Mesure[]
  selectedName: string
  onExportCSV: () => void
  onExportPDF: () => void
  timeRange: TimeRange
  onTimeRangeChange: (v: TimeRange) => void
}) {
  return (
    <Card className="lg:col-span-2 bg-linear-to-br from-blue-500/5 via-transparent to-green-500/5 animate-slide-up"
      style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Historique — {selectedName}
        </h2>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
          <div className="flex gap-2">
            <button
              onClick={onExportCSV}
              className="text-xs text-gray-500 border border-gray-700 px-2 py-1 rounded
                         hover:text-white hover:border-gray-500 transition-colors"
            >
              CSV
            </button>
            <button
              onClick={onExportPDF}
              className="text-xs text-gray-500 border border-gray-700 px-2 py-1 rounded
                         hover:text-white hover:border-gray-500 transition-colors"
            >
              PDF
            </button>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={metrics}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="recu_le"
            tickFormatter={v => new Date(v).toLocaleTimeString("fr-FR")}
            tick={{ fill: "#6b7280", fontSize: 10 }}
          />
          <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontFamily: "monospace"
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="temperature"
            stroke="#60a5fa" strokeWidth={2} dot={false}
            name="Temperature (°C)" animationDuration={300} />
          <Line type="monotone" dataKey="humidite"
            stroke="#34d399" strokeWidth={2} dot={false}
            name="Humidite (%)" animationDuration={300} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

export default memo(MetricsChart)
