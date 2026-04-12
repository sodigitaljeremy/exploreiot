"use client"

import { useState, useCallback } from "react"

export default function BitManipulator() {
  const [bits, setBits] = useState<boolean[]>(
    // Default: 32.70°C → 3270 → 0x0CC6 → 0000110011000110
    Array.from({ length: 16 }, (_, i) => ((3270 >> (15 - i)) & 1) === 1)
  )
  const [mode, setMode] = useState<"temperature" | "humidite">("temperature")

  const toggleBit = useCallback((index: number) => {
    setBits(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }, [])

  const decimalValue = bits.reduce((acc, bit, i) => acc + (bit ? 1 << (15 - i) : 0), 0)
  // Two's complement for 16-bit signed
  const signedValue = decimalValue > 32767 ? decimalValue - 65536 : decimalValue
  const divisor = mode === "temperature" ? 100 : 10
  const physicalValue = signedValue / divisor
  const hexValue = "0x" + (decimalValue & 0xFFFF).toString(16).toUpperCase().padStart(4, "0")
  const byte1 = ((decimalValue >> 8) & 0xFF).toString(16).toUpperCase().padStart(2, "0")
  const byte2 = (decimalValue & 0xFF).toString(16).toUpperCase().padStart(2, "0")

  const unit = mode === "temperature" ? "°C" : "%"
  const color = mode === "temperature" ? "blue" : "green"

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode("temperature")}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            mode === "temperature" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
          }`}
        >
          Temperature (÷100)
        </button>
        <button
          onClick={() => setMode("humidite")}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            mode === "humidite" ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400"
          }`}
        >
          Humidite (÷10)
        </button>
      </div>

      {/* Bit grid */}
      <div>
        <div className="flex gap-0.5 mb-1">
          {bits.map((_, i) => (
            <span key={i} className="w-8 text-center text-[10px] text-gray-600">
              {15 - i}
            </span>
          ))}
        </div>
        <div className="flex gap-0.5">
          {bits.map((bit, i) => (
            <button
              key={i}
              onClick={() => toggleBit(i)}
              className={`w-8 h-8 rounded text-sm font-bold transition-all ${
                bit
                  ? `bg-${color}-600 text-white`
                  : "bg-gray-800 text-gray-500 hover:bg-gray-700"
              }`}
            >
              {bit ? "1" : "0"}
            </button>
          ))}
        </div>
        <div className="flex mt-1">
          <div className="w-[calc(8*2.125rem)] text-center text-[10px] text-gray-600 border-t border-gray-700">
            Octet haut (0x{byte1})
          </div>
          <div className="w-[calc(8*2.125rem)] text-center text-[10px] text-gray-600 border-t border-gray-700">
            Octet bas (0x{byte2})
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Decimal</div>
          <div className="text-lg font-bold text-white">{signedValue}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Hex</div>
          <div className="text-lg font-bold text-yellow-400">{hexValue}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Valeur physique</div>
          <div className={`text-lg font-bold text-${color}-400`}>
            {physicalValue.toFixed(mode === "temperature" ? 2 : 1)}{unit}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-600">
        Cliquez sur chaque bit pour le basculer. La valeur decimale est divisee par {divisor} pour obtenir la valeur physique.
        {signedValue < 0 && " (complement a 2 : valeur negative)"}
      </p>
    </div>
  )
}
