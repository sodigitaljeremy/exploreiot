const COLORS = {
  green: "bg-green-500 shadow-green-500/50",
  red: "bg-red-500 shadow-red-500/50",
  yellow: "bg-yellow-500 shadow-yellow-500/50",
  gray: "bg-gray-500",
} as const

interface StatusDotProps {
  color: keyof typeof COLORS
  pulse?: boolean
}

/** Small colored dot used as status indicator. */
export default function StatusDot({ color, pulse = false }: StatusDotProps) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shadow-sm ${COLORS[color]} ${
        pulse ? "animate-pulse" : ""
      }`}
    />
  )
}
