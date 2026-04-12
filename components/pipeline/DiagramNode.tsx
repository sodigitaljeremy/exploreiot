"use client"

import type { PipelineStage } from "@/lib/types"
import { COLOR_MAP, BORDER_MAP } from "@/lib/constants"

export default function DiagramNode({ stage, active, selected, onClick }: {
  stage: PipelineStage
  active: boolean
  selected: boolean
  onClick: () => void
}) {
  const borderClass = selected
    ? (BORDER_MAP[stage.color] ?? "border-gray-800")
    : "border-gray-800"
  const pulseClass = active ? "animate-node-pulse" : ""

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all
                  hover:bg-gray-800/50 min-w-[80px]
                  ${borderClass} ${pulseClass}
                  ${selected ? "bg-gray-800/70" : "bg-gray-900"}`}
    >
      <span className="text-2xl">{stage.icon}</span>
      <span className={`text-xs font-semibold ${selected ? (COLOR_MAP[stage.color] ?? "text-gray-400") : "text-gray-400"}`}>
        {stage.label}
      </span>
      {active && (
        <span className={`w-2 h-2 rounded-full ${COLOR_MAP[stage.color]?.replace("text-", "bg-") ?? "bg-gray-400"} animate-live-pulse`} />
      )}
    </button>
  )
}
