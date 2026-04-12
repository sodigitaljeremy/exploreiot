// lib/constants.ts
// Shared UI constants — extracted for DRY and maintainability

export const POLLING_INTERVALS = {
  mock: 5000,
  apiFallback: 10000,
} as const

export const HEALTH_CHECK_INTERVAL = 15000
export const WS_PING_INTERVAL = 25000
export const METRICS_HISTORY_LIMIT = 20
export const TOAST_TIMEOUT = 6000
export const CHART_HEIGHT = 220

export const STAT_ACCENTS = [
  "border-l-3 border-l-blue-500",
  "border-l-3 border-l-green-500",
  "border-l-3 border-l-yellow-500",
  "border-l-3 border-l-red-500",
] as const

export const COLOR_MAP: Record<string, string> = {
  blue: "text-blue-400",
  green: "text-green-400",
  purple: "text-purple-400",
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  red: "text-red-400",
  gray: "text-gray-400",
}

export const BORDER_MAP: Record<string, string> = {
  blue: "border-blue-800",
  green: "border-green-800",
  purple: "border-purple-800",
  yellow: "border-yellow-800",
  orange: "border-orange-800",
  red: "border-red-800",
  gray: "border-gray-800",
}
