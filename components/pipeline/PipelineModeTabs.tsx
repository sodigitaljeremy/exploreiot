"use client"

import { usePipeline } from "@/lib/pipeline-context"
import type { PipelineMode } from "@/lib/types"

const TABS: { mode: PipelineMode; label: string }[] = [
  { mode: "live", label: "Live" },
  { mode: "step-by-step", label: "Pas a pas" },
  { mode: "inspector", label: "Inspecteur" },
]

export default function PipelineModeTabs() {
  const { mode, setMode } = usePipeline()

  return (
    <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
      {TABS.map(tab => (
        <button
          key={tab.mode}
          onClick={() => setMode(tab.mode)}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
            mode === tab.mode
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
