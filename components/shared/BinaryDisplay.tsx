import { COLOR_MAP } from "@/lib/constants"

export default function BinaryDisplay({ value, color }: { value: string; color: string }) {
  const colorClass = COLOR_MAP[color] ?? "text-gray-400"
  return (
    <span className={`font-mono text-xs tracking-widest ${colorClass}`}>
      {value.slice(0, 8)} <span className="text-gray-600">|</span> {value.slice(8)}
    </span>
  )
}
