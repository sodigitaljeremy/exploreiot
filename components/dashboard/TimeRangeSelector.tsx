export type TimeRange = "1h" | "6h" | "24h" | "7d"

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7j" },
]

export default function TimeRangeSelector({ value, onChange }: {
  value: TimeRange
  onChange: (v: TimeRange) => void
}) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
            value === opt.value
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
