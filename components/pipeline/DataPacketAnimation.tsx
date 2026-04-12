"use client"

import { usePipeline } from "@/lib/pipeline-context"

export default function DataPacketAnimation() {
  const { activePacketId } = usePipeline()

  if (!activePacketId) return null

  return (
    <div className="relative h-2 w-full my-1">
      <div className="absolute h-full w-full bg-gray-800/50 rounded-full" />
      <div
        key={activePacketId}
        className="absolute h-3 w-3 -top-0.5 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50 animate-packet-traverse"
      />
    </div>
  )
}
