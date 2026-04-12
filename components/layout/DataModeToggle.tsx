"use client"

import { useState } from "react"
import type { DataMode } from "@/lib/types"
import { checkApiHealth } from "@/lib/api-client"
import { useDataSource } from "@/lib/data-provider"

export default function DataModeToggle({ mode, setMode }: { mode: DataMode; setMode: (m: DataMode) => void }) {
  const [checking, setChecking] = useState(false)
  const { addToast } = useDataSource()

  const handleApiClick = async () => {
    if (mode === "api") return
    setChecking(true)
    try {
      const ok = await checkApiHealth()
      if (ok) {
        setMode("api")
      } else {
        addToast("warning", "API injoignable sur localhost:8000 — lancez ./demo.sh pour demarrer le backend")
      }
    } catch {
      addToast("warning", "API injoignable sur localhost:8000 — lancez ./demo.sh pour demarrer le backend")
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-1.5 border border-gray-800">
      <button
        onClick={() => setMode("mock")}
        className={`text-xs font-semibold px-2 py-1 rounded transition-all ${
          mode === "mock"
            ? "bg-purple-600/30 text-purple-400"
            : "text-gray-500 hover:text-gray-300"
        }`}
      >
        Mock
      </button>
      <button
        onClick={handleApiClick}
        disabled={checking}
        className={`text-xs font-semibold px-2 py-1 rounded transition-all ${
          mode === "api"
            ? "bg-green-600/30 text-green-400"
            : checking
              ? "text-gray-600 cursor-wait"
              : "text-gray-500 hover:text-gray-300"
        }`}
      >
        {checking ? "..." : "API"}
      </button>
    </div>
  )
}
