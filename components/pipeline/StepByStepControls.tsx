"use client"

import Card from "@/components/atoms/Card"
import { usePipeline } from "@/lib/pipeline-context"
import { PIPELINE_STAGES } from "@/lib/pipeline-stages"

export default function StepByStepControls() {
  const { selectedMessage, generateMesure, nextStep, resetStep, stageCount } = usePipeline()

  const progress = selectedMessage
    ? ((selectedMessage.currentStage + 1) / stageCount) * 100
    : 0

  const isLastStep = selectedMessage?.currentStage === stageCount - 1

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Controles pas a pas
      </h3>

      {/* Progress bar */}
      <div className="h-2 bg-gray-800 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-400"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>
          {selectedMessage
            ? `Etape ${selectedMessage.currentStage + 1} / ${stageCount} — ${PIPELINE_STAGES[selectedMessage.currentStage]?.label}`
            : "Pret a demarrer"}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>

      <div className="flex gap-2">
        {!selectedMessage ? (
          <button
            onClick={generateMesure}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg
                       font-semibold text-sm transition-colors"
          >
            Generer une mesure
          </button>
        ) : isLastStep ? (
          <button
            onClick={resetStep}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg
                       font-semibold text-sm transition-colors"
          >
            Termine — Recommencer
          </button>
        ) : (
          <>
            <button
              onClick={nextStep}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg
                         font-semibold text-sm transition-colors"
            >
              Suivant →
            </button>
            <button
              onClick={resetStep}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg
                         text-sm transition-colors"
            >
              Reset
            </button>
          </>
        )}
      </div>
    </Card>
  )
}
