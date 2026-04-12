import type { ReactNode } from "react"
import { COLOR_MAP } from "@/lib/constants"

export default function Row({ label, value, color }: {
  label: string
  value: ReactNode
  color?: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono font-semibold ${COLOR_MAP[color ?? "gray"]}`}>
        {value}
      </span>
    </div>
  )
}
