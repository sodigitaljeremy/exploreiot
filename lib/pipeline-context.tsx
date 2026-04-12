"use client"

// lib/pipeline-context.tsx
// Couche : Contexte React (state management)
// Role : Gere l'etat de la vue Pipeline — mode (live/step-by-step/inspector),
//        messages en transit, etape courante, animation des paquets
// Utilise par : Tous les composants dans components/pipeline/

import {
  createContext, useContext, useState, useCallback, useRef, useEffect,
  type ReactNode,
} from "react"
import type { PipelineMode, PipelineMessage } from "./types"
import { encode, generateMockMesure } from "./lorawan"
import { DEVICES } from "./device-registry"
import { PIPELINE_STAGES } from "./pipeline-stages"
import { useDataSource } from "./data-provider"

const MAX_MESSAGES = 50

export interface PipelineContextValue {
  mode: PipelineMode
  setMode: (m: PipelineMode) => void
  messages: PipelineMessage[]
  selectedMessage: PipelineMessage | null
  selectMessage: (m: PipelineMessage | null) => void
  selectedStage: number
  selectStage: (s: number) => void
  // Step-by-step controls
  generateMesure: () => void
  nextStep: () => void
  resetStep: () => void
  stageCount: number
  // Live animation
  activePacketId: string | null
}

const PipelineContext = createContext<PipelineContextValue | null>(null)

export function PipelineProvider({ children }: { children: ReactNode }) {
  const { latestMesure, mode: dataMode } = useDataSource()
  const [mode, setMode] = useState<PipelineMode>("live")
  const [messages, setMessages] = useState<PipelineMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<PipelineMessage | null>(null)
  const [selectedStage, setSelectedStage] = useState(0)
  const [activePacketId, setActivePacketId] = useState<string | null>(null)
  const lastProcessedRef = useRef<string | null>(null)

  const addMessage = useCallback((msg: PipelineMessage) => {
    setMessages(prev => {
      const next = [...prev, msg]
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
    })
    setActivePacketId(msg.id)
    setTimeout(() => setActivePacketId(null), 2000)
  }, [])

  // Auto-process incoming WS messages in live mode
  useEffect(() => {
    if (mode !== "live" || dataMode !== "api" || !latestMesure) return
    if (lastProcessedRef.current === latestMesure.recu_le) return
    lastProcessedRef.current = latestMesure.recu_le

    const frame = encode(latestMesure.temperature, latestMesure.humidite)
    const msg: PipelineMessage = {
      id: crypto.randomUUID(),
      deviceId: latestMesure.device_id,
      temperature: latestMesure.temperature,
      humidite: latestMesure.humidite,
      payload: frame.payload,
      timestamp: latestMesure.recu_le,
      currentStage: PIPELINE_STAGES.length - 1,
    }
    // Defer setState to avoid synchronous cascading render in effect body
    queueMicrotask(() => addMessage(msg))
  }, [mode, dataMode, latestMesure, addMessage])

  // Generate a mock mesure (used in live mock mode and step-by-step)
  const generateMesure = useCallback(() => {
    const device = DEVICES[Math.floor(Math.random() * DEVICES.length)]
    const mock = generateMockMesure(device.id, device.baseTemp, device.baseHum)
    const frame = encode(mock.temperature, mock.humidite)

    const msg: PipelineMessage = {
      id: crypto.randomUUID(),
      deviceId: mock.device_id,
      temperature: mock.temperature,
      humidite: mock.humidite,
      payload: frame.payload,
      timestamp: mock.recu_le,
      currentStage: mode === "step-by-step" ? 0 : PIPELINE_STAGES.length - 1,
    }

    if (mode === "step-by-step") {
      setSelectedMessage(msg)
      setSelectedStage(0)
    }
    addMessage(msg)
  }, [mode, addMessage])

  const nextStep = useCallback(() => {
    if (!selectedMessage) return
    const next = Math.min(selectedMessage.currentStage + 1, PIPELINE_STAGES.length - 1)
    const updated = { ...selectedMessage, currentStage: next }
    setSelectedMessage(updated)
    setSelectedStage(next)
    setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)))
    setActivePacketId(updated.id)
    setTimeout(() => setActivePacketId(null), 1000)
  }, [selectedMessage])

  const resetStep = useCallback(() => {
    setSelectedMessage(null)
    setSelectedStage(0)
  }, [])

  return (
    <PipelineContext value={{
      mode, setMode,
      messages,
      selectedMessage, selectMessage: setSelectedMessage,
      selectedStage, selectStage: setSelectedStage,
      generateMesure, nextStep, resetStep,
      stageCount: PIPELINE_STAGES.length,
      activePacketId,
    }}>
      {children}
    </PipelineContext>
  )
}

export function usePipeline(): PipelineContextValue {
  const ctx = useContext(PipelineContext)
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider")
  return ctx
}
