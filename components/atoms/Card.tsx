import type { CSSProperties, ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/** Reusable dark card container — base design token for the dashboard. */
export default function Card({ children, className = "", style }: CardProps) {
  return (
    <div
      className={`bg-gray-900 rounded-xl p-4 border border-gray-800 ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
