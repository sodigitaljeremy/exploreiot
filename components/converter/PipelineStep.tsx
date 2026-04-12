"use client"

import { useState, type ReactNode } from "react"
import { COLOR_MAP, BORDER_MAP } from "@/lib/constants"

export default function PipelineStep({ num, title, color, comment, explanation, children }: {
  num: number
  title: string
  color: string
  comment: ReactNode
  explanation?: ReactNode
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-gray-900 rounded-xl p-4 border ${BORDER_MAP[color] ?? "border-gray-800"}`}>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-xs font-bold ${COLOR_MAP[color] ?? "text-gray-400"}`}>
          Etape {num}
        </span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <p className="text-xs text-gray-600 mb-3">{comment}</p>
      <div className="space-y-1">{children}</div>
      {explanation && (
        <div className="mt-3 pt-2 border-t border-gray-800">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <span className={`inline-block transition-transform ${expanded ? "rotate-90" : ""}`}>
              ▶
            </span>
            En savoir plus
          </button>
          {expanded && (
            <div className="text-xs text-gray-500 mt-2 leading-relaxed animate-fade-in">
              {explanation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
