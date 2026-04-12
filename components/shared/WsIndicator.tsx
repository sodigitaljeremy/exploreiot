"use client"

import { useDataSource } from "@/lib/data-provider"

export default function WsIndicator() {
  const { mode, wsConnected } = useDataSource()
  if (mode !== "api") return null

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`inline-block w-2 h-2 rounded-full ${
        wsConnected
          ? "bg-green-400 animate-live-pulse"
          : "bg-yellow-400"
      }`} />
      <span className={wsConnected ? "text-green-400" : "text-yellow-400"}>
        {wsConnected ? "WebSocket" : "Polling"}
      </span>
    </div>
  )
}
