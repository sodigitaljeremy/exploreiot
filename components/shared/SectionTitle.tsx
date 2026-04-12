import type { ReactNode } from "react"

export default function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
      {children}
    </h2>
  )
}
