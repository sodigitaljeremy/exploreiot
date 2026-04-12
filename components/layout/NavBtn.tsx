import type { ReactNode } from "react"

export default function NavBtn({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
        active
          ? "bg-blue-600 text-white"
          : "text-gray-400 hover:text-white hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  )
}
