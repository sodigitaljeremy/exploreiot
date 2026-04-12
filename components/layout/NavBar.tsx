"use client"

import { useState } from "react"
import { useDataSource } from "@/lib/data-provider"
import type { View } from "@/lib/types"
import WsIndicator from "@/components/shared/WsIndicator"
import HealthIndicator from "@/components/shared/HealthIndicator"
import DataModeToggle from "./DataModeToggle"
import NavBtn from "./NavBtn"
import ThemeToggle from "./ThemeToggle"

export default function NavBar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { mode, setMode } = useDataSource()

  return (
    <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between relative">
      <div className="flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
          <path d="M2 20h.01" />
          <path d="M7 20v-4" />
          <path d="M12 20v-8" />
          <path d="M17 20V8" />
          <path d="M22 4v16" />
        </svg>
        <span className="text-blue-400 font-bold text-xl tracking-tight">
          ExploreIOT
        </span>
        <span className="text-gray-500 text-sm ml-1 hidden sm:inline">
          LoRaWAN Supervision Platform
        </span>
      </div>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-4">
        <WsIndicator />
        <HealthIndicator />
        <DataModeToggle mode={mode} setMode={setMode} />
        <ThemeToggle />
        <div className="flex gap-2">
          <NavBtn active={view === "dashboard"} onClick={() => setView("dashboard")}>
            Dashboard
          </NavBtn>
          <NavBtn active={view === "converter"} onClick={() => setView("converter")}>
            Convertisseur
          </NavBtn>
          <NavBtn active={view === "pipeline"} onClick={() => setView("pipeline")}>
            Pipeline
          </NavBtn>
        </div>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden flex flex-col gap-1.5 p-2"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
      >
        <span className={`block w-5 h-0.5 bg-gray-400 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`block w-5 h-0.5 bg-gray-400 transition-all ${menuOpen ? "opacity-0" : ""}`} />
        <span className={`block w-5 h-0.5 bg-gray-400 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-gray-900 border-b border-gray-800
                        p-4 flex flex-col gap-3 md:hidden z-50 animate-slide-up">
          <div className="flex items-center gap-3">
            <WsIndicator />
            <HealthIndicator />
          </div>
          <div className="flex items-center gap-3">
            <DataModeToggle mode={mode} setMode={setMode} />
            <ThemeToggle />
          </div>
          <div className="flex gap-2">
            <NavBtn active={view === "dashboard"} onClick={() => { setView("dashboard"); setMenuOpen(false) }}>
              Dashboard
            </NavBtn>
            <NavBtn active={view === "converter"} onClick={() => { setView("converter"); setMenuOpen(false) }}>
              Convertisseur
            </NavBtn>
            <NavBtn active={view === "pipeline"} onClick={() => { setView("pipeline"); setMenuOpen(false) }}>
              Pipeline
            </NavBtn>
          </div>
        </div>
      )}
    </nav>
  )
}
