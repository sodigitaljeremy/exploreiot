import type { PipelineStage } from "@/lib/types"

export default function StageCodeSnippet({ stage }: { stage: PipelineStage }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Code</span>
        <span className="text-xs text-gray-600">{stage.codeSnippet.language}</span>
      </div>
      <pre className="bg-gray-950 rounded-lg p-3 overflow-x-auto text-xs leading-relaxed border border-gray-800">
        <code className="text-gray-300">{stage.codeSnippet.code}</code>
      </pre>
    </div>
  )
}
