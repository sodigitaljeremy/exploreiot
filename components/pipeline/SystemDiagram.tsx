"use client"

import Card from "@/components/atoms/Card"
import { PIPELINE_STAGES } from "@/lib/pipeline-stages"
import { usePipeline } from "@/lib/pipeline-context"
import DiagramNode from "./DiagramNode"
import DataPacketAnimation from "./DataPacketAnimation"

export default function SystemDiagram() {
  const { selectedStage, selectStage, activePacketId, selectedMessage } = usePipeline()

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Diagramme du systeme
      </h3>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {PIPELINE_STAGES.map((stage, i) => {
          const isActive = activePacketId !== null && (
            selectedMessage ? selectedMessage.currentStage === i : true
          )
          return (
            <div key={stage.id} className="flex items-center">
              <DiagramNode
                stage={stage}
                active={isActive}
                selected={selectedStage === i}
                onClick={() => selectStage(i)}
              />
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="flex-shrink-0 w-6 flex items-center justify-center text-gray-600">
                  →
                </div>
              )}
            </div>
          )
        })}
      </div>
      <DataPacketAnimation />
    </Card>
  )
}
