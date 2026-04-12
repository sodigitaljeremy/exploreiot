"use client"

import { PIPELINE_STAGES } from "@/lib/pipeline-stages"
import { usePipeline } from "@/lib/pipeline-context"
import { COLOR_MAP, BORDER_MAP } from "@/lib/constants"
import StageDataView from "./StageDataView"
import StageCodeSnippet from "./StageCodeSnippet"

export default function StageDetailPanel() {
  const { selectedStage, selectedMessage } = usePipeline()
  const stage = PIPELINE_STAGES[selectedStage]
  if (!stage) return null

  return (
    <div className={`bg-gray-900 rounded-xl p-4 border ${BORDER_MAP[stage.color] ?? "border-gray-800"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{stage.icon}</span>
        <h3 className={`text-sm font-bold ${COLOR_MAP[stage.color] ?? "text-gray-400"}`}>
          {stage.label}
        </h3>
        <span className="text-xs text-gray-600">Etape {stage.id + 1}/8</span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        {stage.description}
      </p>

      <div className="text-xs text-gray-500 mb-3">
        <span className="text-gray-600">Format : </span>
        {stage.dataFormat}
      </div>

      <StageDataView stage={stage} message={selectedMessage} />
      <StageCodeSnippet stage={stage} />
    </div>
  )
}
