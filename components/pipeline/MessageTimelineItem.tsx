import type { PipelineMessage } from "@/lib/types"
import { DEVICE_NAMES } from "@/lib/device-registry"

export default function MessageTimelineItem({ message, selected, onClick }: {
  message: PipelineMessage
  selected: boolean
  onClick: () => void
}) {
  const name = DEVICE_NAMES[message.deviceId] ?? message.deviceId.slice(0, 8)
  const time = new Date(message.timestamp).toLocaleTimeString("fr-FR")

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2 rounded-lg text-xs font-mono transition-all ${
        selected
          ? "bg-blue-950/50 border border-blue-800"
          : "bg-gray-800/50 border border-transparent hover:border-gray-700"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-400 truncate max-w-[120px]">{name}</span>
        <span className="text-gray-600">{time}</span>
      </div>
      <div className="flex gap-3">
        <span className="text-blue-400">{message.temperature}°C</span>
        <span className="text-green-400">{message.humidite}%</span>
        <span className="text-gray-600 truncate">{message.payload}</span>
      </div>
    </button>
  )
}
