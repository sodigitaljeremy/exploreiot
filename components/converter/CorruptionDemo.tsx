"use client"

import { useState, useCallback } from "react"
import { encode, decode } from "@/lib/lorawan"

export default function CorruptionDemo() {
  const [temp] = useState(22.5)
  const [hum] = useState(65.0)
  const validFrame = encode(temp, hum)

  const [corruptedBytes, setCorruptedBytes] = useState<number[] | null>(null)
  const [corruptedBitIndex, setCorruptedBitIndex] = useState<number>(-1)

  const corrupt = useCallback(() => {
    const bytes = [...validFrame.bytes]
    // Pick a random byte and flip a random bit
    const byteIdx = Math.floor(Math.random() * bytes.length)
    const bitIdx = Math.floor(Math.random() * 8)
    bytes[byteIdx] = bytes[byteIdx] ^ (1 << bitIdx)
    setCorruptedBytes(bytes)
    setCorruptedBitIndex(byteIdx * 8 + (7 - bitIdx))
  }, [validFrame.bytes])

  const corruptedPayload = corruptedBytes
    ? btoa(String.fromCharCode(...corruptedBytes))
    : null

  const corruptedDecoded = corruptedPayload
    ? decode(corruptedPayload)
    : null

  const formatBinary = (bytes: number[]) =>
    bytes.map(b => b.toString(2).padStart(8, "0")).join(" ")

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Voyez comment un seul bit corrompu peut produire des valeurs completement aberrantes.
      </p>

      {/* Valid data */}
      <div className="bg-green-950/30 border border-green-900 rounded-lg p-3">
        <div className="text-xs text-green-400 font-semibold mb-2">Payload valide</div>
        <div className="font-mono text-xs space-y-1">
          <div className="text-gray-400">Octets : [{validFrame.bytes.join(", ")}]</div>
          <div className="text-gray-400">Binaire : {formatBinary(validFrame.bytes)}</div>
          <div className="text-gray-400">Base64 : <span className="text-green-400">{validFrame.payload}</span></div>
          <div className="text-gray-300 mt-1">
            → <span className="text-blue-400">{temp}°C</span>{" "}
            / <span className="text-green-400">{hum}%</span>
          </div>
        </div>
      </div>

      <button
        onClick={corrupt}
        className="w-full bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg
                   font-semibold text-sm transition-colors"
      >
        Corrompre 1 bit aleatoire
      </button>

      {/* Corrupted data */}
      {corruptedBytes && corruptedDecoded && (
        <div className="bg-red-950/30 border border-red-900 rounded-lg p-3 animate-slide-up">
          <div className="text-xs text-red-400 font-semibold mb-2">
            Payload corrompu (bit {corruptedBitIndex} flippe)
          </div>
          <div className="font-mono text-xs space-y-1">
            <div className="text-gray-400">Octets : [{corruptedBytes.join(", ")}]</div>
            <div className="text-gray-400">Binaire : {formatBinary(corruptedBytes)}</div>
            <div className="text-gray-400">Base64 : <span className="text-red-400">{corruptedPayload}</span></div>
            <div className="text-gray-300 mt-1">
              → <span className="text-blue-400">{corruptedDecoded.temperature.toFixed(2)}°C</span>{" "}
              / <span className="text-green-400">{corruptedDecoded.humidite.toFixed(1)}%</span>
            </div>
          </div>

          {/* Comparison */}
          <div className="mt-3 pt-2 border-t border-red-900/50 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Ecart temperature :</span>
              <span className={`ml-1 font-bold ${
                Math.abs(corruptedDecoded.temperature - temp) > 5 ? "text-red-400" : "text-yellow-400"
              }`}>
                {(corruptedDecoded.temperature - temp) > 0 ? "+" : ""}
                {(corruptedDecoded.temperature - temp).toFixed(2)}°C
              </span>
            </div>
            <div>
              <span className="text-gray-500">Ecart humidite :</span>
              <span className={`ml-1 font-bold ${
                Math.abs(corruptedDecoded.humidite - hum) > 10 ? "text-red-400" : "text-yellow-400"
              }`}>
                {(corruptedDecoded.humidite - hum) > 0 ? "+" : ""}
                {(corruptedDecoded.humidite - hum).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
