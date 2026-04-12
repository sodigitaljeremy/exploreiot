const LAYERS = [
  { label: "Donnees brutes", bytes: 4, color: "bg-blue-500", desc: "2 × uint16 (temp + hum)" },
  { label: "Base64", bytes: 8, color: "bg-purple-500", desc: "4 octets → 8 caracteres ASCII" },
  { label: "JSON Chirpstack", bytes: 50, color: "bg-yellow-500", desc: '{"data": "...", "deviceInfo": {...}}' },
  { label: "MQTT", bytes: 80, color: "bg-orange-500", desc: "Topic + headers MQTT + JSON" },
  { label: "TCP/IP", bytes: 130, color: "bg-red-500", desc: "TCP headers + IP headers + MQTT" },
]

const MAX_BYTES = 130

export default function ProtocolOverhead() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Comparez la taille des donnees utiles (4 octets) avec l&apos;overhead de chaque couche protocolaire.
      </p>

      <div className="space-y-3">
        {LAYERS.map(layer => {
          const pct = (layer.bytes / MAX_BYTES) * 100
          return (
            <div key={layer.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">{layer.label}</span>
                <span className="text-gray-500 font-mono">{layer.bytes} octets</span>
              </div>
              <div className="h-6 bg-gray-800 rounded-full overflow-hidden relative">
                <div
                  className={`h-full ${layer.color} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white/80 font-mono">
                  {layer.desc}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Ratio */}
      <div className="bg-gray-800 rounded-lg p-3 text-center">
        <div className="text-xs text-gray-500 mb-1">Ratio donnees utiles / total</div>
        <div className="text-2xl font-bold text-red-400">
          {((4 / MAX_BYTES) * 100).toFixed(1)}%
        </div>
        <div className="text-xs text-gray-600 mt-1">
          4 octets de donnees utiles sur {MAX_BYTES} octets transmis via TCP/IP
        </div>
      </div>
    </div>
  )
}
