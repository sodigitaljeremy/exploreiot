"use client"

import { useState } from "react"
import Card from "@/components/atoms/Card"
import InspectorMqttTab from "./InspectorMqttTab"
import InspectorWsTab from "./InspectorWsTab"
import InspectorHttpTab from "./InspectorHttpTab"

const TABS = ["MQTT", "WebSocket", "HTTP"] as const
type InspectorTab = typeof TABS[number]

export default function ProtocolInspector() {
  const [tab, setTab] = useState<InspectorTab>("MQTT")

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Inspecteur de protocoles
      </h3>

      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mb-4">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              tab === t
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "MQTT" && <InspectorMqttTab />}
      {tab === "WebSocket" && <InspectorWsTab />}
      {tab === "HTTP" && <InspectorHttpTab />}
    </Card>
  )
}
