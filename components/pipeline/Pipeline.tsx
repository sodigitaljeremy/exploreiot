"use client"

import { useEffect, useRef } from "react"
import { PipelineProvider, usePipeline } from "@/lib/pipeline-context"
import PipelineModeTabs from "./PipelineModeTabs"
import SystemDiagram from "./SystemDiagram"
import StageDetailPanel from "./StageDetailPanel"
import MessageTimeline from "./MessageTimeline"
import DataTransformPanel from "./DataTransformPanel"
import StepByStepControls from "./StepByStepControls"
import StepExplanation from "./StepExplanation"
import ProtocolInspector from "./ProtocolInspector"
import ConnectionStatus from "@/components/shared/ConnectionStatus"

function PipelineContent() {
  const { mode, generateMesure, messages } = usePipeline()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-generate mock data in live mode every 5s
  useEffect(() => {
    if (mode === "live") {
      // Generate initial message
      if (messages.length === 0) generateMesure()
      intervalRef.current = setInterval(generateMesure, 5000)
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [mode, generateMesure, messages.length])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline IoT</h1>
          <p className="text-gray-500 text-sm mt-1">
            Suivez une mesure du capteur physique au pixel sur l&apos;ecran
          </p>
        </div>
        <PipelineModeTabs />
      </div>

      <ConnectionStatus />
      <SystemDiagram />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 space-y-4">
          {mode === "step-by-step" && <StepByStepControls />}
          {mode === "step-by-step" && <StepExplanation />}
          {mode === "inspector" && <ProtocolInspector />}
          {mode !== "inspector" && <DataTransformPanel />}
          <MessageTimeline />
        </div>
        <div className="space-y-4">
          <StageDetailPanel />
        </div>
      </div>
    </div>
  )
}

export default function Pipeline() {
  return (
    <PipelineProvider>
      <PipelineContent />
    </PipelineProvider>
  )
}
