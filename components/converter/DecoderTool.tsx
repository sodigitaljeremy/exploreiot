"use client"

import { useState } from "react"
import Card from "@/components/atoms/Card"
import { decode } from "@/lib/lorawan"
import SectionTitle from "@/components/shared/SectionTitle"

interface DecodeResult {
  input: string
  output: string
  error: boolean
}

export default function DecoderTool() {
  const [decodeInput, setDecodeInput] = useState("")
  const [batchMode, setBatchMode] = useState(false)
  const [results, setResults] = useState<DecodeResult[]>([])

  const decodeSingle = (input: string): DecodeResult => {
    const trimmed = input.trim()
    if (!trimmed) return { input: trimmed, output: "", error: true }
    try {
      const result = decode(trimmed)
      return {
        input: trimmed,
        output: `Temperature : ${result.temperature.toFixed(2)}°C | Humidite : ${result.humidite.toFixed(1)}%`,
        error: false,
      }
    } catch {
      return { input: trimmed, output: "Payload invalide", error: true }
    }
  }

  const handleDecode = () => {
    if (batchMode) {
      const lines = decodeInput.split("\n").filter(l => l.trim())
      setResults(lines.map(decodeSingle))
    } else {
      setResults([decodeSingle(decodeInput)])
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <SectionTitle>Decodeur inverse</SectionTitle>
        <button
          onClick={() => { setBatchMode(!batchMode); setResults([]) }}
          className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
            batchMode
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          {batchMode ? "Batch" : "Simple"}
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-4">
        {batchMode
          ? "Entrez un payload Base64 par ligne pour decoder en lot."
          : "Entrez un payload Base64 valide pour retrouver les valeurs originales."}
      </p>

      {batchMode ? (
        <textarea
          value={decodeInput}
          onChange={e => setDecodeInput(e.target.value)}
          placeholder={"DLYDIA==\nCSkyZA==\nBxQD6A=="}
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2
                     text-white font-mono placeholder-gray-600 outline-none
                     focus:border-blue-500 transition-colors resize-none mb-3"
        />
      ) : (
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            value={decodeInput}
            onChange={e => setDecodeInput(e.target.value)}
            placeholder="Ex: DLYDIA=="
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2
                       text-white font-mono placeholder-gray-600 outline-none
                       focus:border-blue-500 transition-colors"
            onKeyDown={e => e.key === "Enter" && handleDecode()}
          />
          <button
            onClick={handleDecode}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg
                       font-semibold transition-colors">
            Decoder
          </button>
        </div>
      )}

      {batchMode && (
        <button
          onClick={handleDecode}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg
                     font-semibold transition-colors mb-3">
          Decoder {decodeInput.split("\n").filter(l => l.trim()).length} payload(s)
        </button>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.input} className={`p-3 rounded-lg text-sm font-mono ${
              r.error
                ? "bg-red-950/50 border border-red-900 text-red-400"
                : "bg-green-950/50 border border-green-900 text-green-400"
            }`}>
              {batchMode && (
                <span className="text-gray-500 mr-2">{r.input} →</span>
              )}
              {r.output}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
