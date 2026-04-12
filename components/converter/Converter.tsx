"use client"

import { useState, useEffect } from "react"
import Card from "@/components/atoms/Card"
import { encode } from "@/lib/lorawan"
import type { LoRaWANFrame } from "@/lib/types"
import EncodingPipeline from "./EncodingPipeline"
import DecoderTool from "./DecoderTool"
import BitManipulator from "./BitManipulator"
import CorruptionDemo from "./CorruptionDemo"
import ProtocolOverhead from "./ProtocolOverhead"
import NegativeTemperatureDemo from "./NegativeTemperatureDemo"

const TOOL_TABS = ["Bits", "Corruption", "Overhead", "Negatifs"] as const
type ToolTab = typeof TOOL_TABS[number]

export default function Converter() {
  const [temp, setTemp] = useState(32.7)
  const [hum, setHum] = useState(80.6)
  const [frame, setFrame] = useState<LoRaWANFrame>(encode(32.7, 80.6))
  const [toolTab, setToolTab] = useState<ToolTab>("Bits")

  useEffect(() => {
    setFrame(encode(temp, hum))
  }, [temp, hum])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Convertisseur LoRaWAN</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pipeline complet d&apos;encodage / decodage — de la mesure physique au payload Base64
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card>
          <label className="text-xs text-gray-400 uppercase tracking-wider">
            Temperature (°C)
          </label>
          <input
            type="number" step="0.1" value={temp}
            onChange={e => setTemp(+e.target.value)}
            className="w-full bg-transparent text-3xl font-bold text-blue-400
                       border-none outline-none mt-2"
          />
          <input type="range" min={-10} max={60} step={0.1}
            value={temp} onChange={e => setTemp(+e.target.value)}
            className="w-full mt-2 accent-blue-400" />
        </Card>
        <Card>
          <label className="text-xs text-gray-400 uppercase tracking-wider">
            Humidite (%)
          </label>
          <input
            type="number" step="0.1" value={hum}
            onChange={e => setHum(+e.target.value)}
            className="w-full bg-transparent text-3xl font-bold text-green-400
                       border-none outline-none mt-2"
          />
          <input type="range" min={0} max={100} step={0.1}
            value={hum} onChange={e => setHum(+e.target.value)}
            className="w-full mt-2 accent-green-400" />
        </Card>
      </div>

      <EncodingPipeline frame={frame} />
      <DecoderTool />

      {/* Pedagogical tools */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Outils pedagogiques
        </h2>
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800 mb-4">
          {TOOL_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setToolTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                toolTab === tab
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <Card>
          {toolTab === "Bits" && <BitManipulator />}
          {toolTab === "Corruption" && <CorruptionDemo />}
          {toolTab === "Overhead" && <ProtocolOverhead />}
          {toolTab === "Negatifs" && <NegativeTemperatureDemo />}
        </Card>
      </div>
    </div>
  )
}
