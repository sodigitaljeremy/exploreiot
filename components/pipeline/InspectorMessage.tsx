"use client"

import { useState } from "react"

export default function InspectorMessage({ topic, payload, timestamp, protocol }: {
  topic?: string
  payload: Record<string, unknown> | string
  timestamp: string
  protocol: string
}) {
  const [expanded, setExpanded] = useState(false)
  const time = new Date(timestamp).toLocaleTimeString("fr-FR")
  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)
  const preview = typeof payload === "string"
    ? payload.slice(0, 60)
    : JSON.stringify(payload).slice(0, 60)

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-2 flex items-center gap-2 text-xs hover:bg-gray-800/50 transition-colors"
      >
        <span className={`inline-block transition-transform ${expanded ? "rotate-90" : ""}`}>
          ▶
        </span>
        <span className="text-gray-600 shrink-0">{time}</span>
        <span className="text-blue-400 shrink-0">{protocol}</span>
        {topic && <span className="text-yellow-400 truncate">{topic}</span>}
        <span className="text-gray-500 truncate">{preview}...</span>
      </button>
      {expanded && (
        <pre className="bg-gray-950 p-3 text-xs text-gray-300 overflow-x-auto border-t border-gray-800 max-h-[200px] overflow-y-auto">
          {payloadStr}
        </pre>
      )}
    </div>
  )
}
