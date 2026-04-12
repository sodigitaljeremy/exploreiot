"use client"

// Couche : Composant racine (orchestrateur de vues)
// Role : Gere la navigation entre Dashboard, Converter et Pipeline
// Structure : ToastContainer (global) + NavBar + ErrorBoundary > {Vue active}

import { useState } from "react"
import type { View } from "@/lib/types"
import ToastContainer from "@/components/shared/ToastContainer"
import NavBar from "@/components/layout/NavBar"
import ErrorBoundary from "@/components/shared/ErrorBoundary"
import Dashboard from "@/components/dashboard/Dashboard"
import Converter from "@/components/converter/Converter"
import Pipeline from "@/components/pipeline/Pipeline"

export default function App() {
  const [view, setView] = useState<View>("dashboard")

  return (
    <div className="min-h-screen bg-gray-950 text-white font-mono">
      <ToastContainer />
      <NavBar view={view} setView={setView} />
      <ErrorBoundary>
        {view === "dashboard" && <Dashboard />}
        {view === "converter" && <Converter />}
        {view === "pipeline" && <Pipeline />}
      </ErrorBoundary>
    </div>
  )
}
