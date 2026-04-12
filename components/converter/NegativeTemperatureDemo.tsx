"use client"

import { useState } from "react"

export default function NegativeTemperatureDemo() {
  const [temp, setTemp] = useState(-10)

  const tempInt = Math.round(temp * 100)
  const absValue = Math.abs(tempInt)
  const absBinary = absValue.toString(2).padStart(16, "0")
  const inverted = absBinary.split("").map(b => (b === "0" ? "1" : "0")).join("")
  const twosComplement = ((~absValue + 1) & 0xFFFF).toString(2).padStart(16, "0")
  const unsignedResult = parseInt(twosComplement, 2)

  // For positive values, just show direct encoding
  const isNeg = temp < 0

  const directBinary = isNeg
    ? twosComplement
    : Math.round(temp * 100).toString(2).padStart(16, "0")

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Deplacez le curseur pour voir comment les temperatures negatives sont encodees en complement a 2 sur 16 bits.
      </p>

      {/* Slider */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">-40°C</span>
          <span className={`text-2xl font-bold ${temp < 0 ? "text-blue-400" : "text-red-400"}`}>
            {temp.toFixed(1)}°C
          </span>
          <span className="text-xs text-gray-500">+85°C</span>
        </div>
        <input
          type="range"
          min={-40}
          max={85}
          step={0.5}
          value={temp}
          onChange={e => setTemp(+e.target.value)}
          className="w-full accent-blue-400"
        />
      </div>

      {/* Steps */}
      <div className="space-y-2 font-mono text-xs">
        <div className="bg-gray-800 rounded-lg p-3">
          <span className="text-gray-500">1. Valeur x 100 = </span>
          <span className="text-white font-bold">{tempInt}</span>
        </div>

        {isNeg ? (
          <>
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="text-gray-500">2. Valeur absolue = </span>
              <span className="text-white font-bold">{absValue}</span>
              <span className="text-gray-500"> → binaire : </span>
              <span className="text-yellow-400">{absBinary}</span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="text-gray-500">3. Inversion des bits : </span>
              <span className="text-orange-400">{inverted}</span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="text-gray-500">4. + 1 (complement a 2) : </span>
              <span className="text-red-400">{twosComplement}</span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="text-gray-500">5. Valeur non-signee : </span>
              <span className="text-purple-400">{unsignedResult}</span>
              <span className="text-gray-500"> (0x{unsignedResult.toString(16).toUpperCase().padStart(4, "0")})</span>
            </div>
          </>
        ) : (
          <div className="bg-gray-800 rounded-lg p-3">
            <span className="text-gray-500">2. Binaire direct (positif) : </span>
            <span className="text-green-400">{directBinary}</span>
            <span className="text-gray-500"> (0x{Math.round(temp * 100).toString(16).toUpperCase().padStart(4, "0")})</span>
          </div>
        )}
      </div>

      {/* Verification */}
      <div className="bg-blue-950/30 border border-blue-900 rounded-lg p-3 text-xs">
        <span className="text-blue-400 font-semibold">Verification : </span>
        <span className="text-gray-400">
          Le decodeur recoit <span className="text-yellow-400">{directBinary}</span>
          {isNeg && (
            <span> → valeur non-signee {unsignedResult} &gt; 32767 → soustrait 65536 → <span className="text-blue-400">{unsignedResult - 65536}</span></span>
          )}
          {" "}÷ 100 = <span className="text-white font-bold">{temp.toFixed(2)}°C</span>
        </span>
      </div>
    </div>
  )
}
