"use client"

// hooks/useWebSocket.ts
// Gere la connexion WebSocket temps reel avec le backend FastAPI
// Auth first-message, ping keepalive, reconnexion exponentielle (1s → 30s)

import { useState, useCallback, useRef, useEffect } from "react"
import { WS_URL, API_KEY, type WsNewMesure, type WsMessage, type WsDebugMqtt } from "@/lib/api-client"
import { WS_PING_INTERVAL } from "@/lib/constants"
import type { DataMode } from "@/lib/types"

const MAX_DEBUG_MESSAGES = 50

export function useWebSocket(mode: DataMode) {
  const [wsConnected, setWsConnected] = useState(false)
  const [latestMesure, setLatestMesure] = useState<WsNewMesure | null>(null)
  const [debugMessages, setDebugMessages] = useState<WsDebugMqtt[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const backoffRef = useRef(1000)
  const intentionalCloseRef = useRef(false)
  const connectWsRef = useRef<() => void>(() => {})

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    intentionalCloseRef.current = false

    try {
      const ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        if (API_KEY) {
          ws.send(JSON.stringify({ type: "auth", token: API_KEY }))
        }
        setWsConnected(true)
        backoffRef.current = 1000

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping")
        }, WS_PING_INTERVAL)
      }

      ws.onmessage = (event) => {
        if (wsRef.current !== ws) return
        try {
          const msg: WsMessage = JSON.parse(event.data)
          if (msg.type === "new_mesure") {
            setLatestMesure(msg)
          } else if (msg.type === "debug_mqtt") {
            setDebugMessages(prev => {
              const next = [...prev, msg]
              return next.length > MAX_DEBUG_MESSAGES ? next.slice(-MAX_DEBUG_MESSAGES) : next
            })
          }
        } catch { /* ignore malformed messages */ }
      }

      ws.onclose = () => {
        setWsConnected(false)
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)

        if (intentionalCloseRef.current || wsRef.current !== ws) {
          setLatestMesure(null)
          return
        }

        // Reconnexion avec backoff exponentiel (1s → 30s)
        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 2, 30000)
        reconnectTimeoutRef.current = setTimeout(() => connectWsRef.current(), delay)
      }

      ws.onerror = () => { ws.close() }
      wsRef.current = ws
    } catch { /* connection failed, will retry via onclose */ }
  }, [])

  // Update ref with current connectWs function; runs before connection effect
  // This pattern ensures reconnection callbacks use the latest connectWs implementation
  useEffect(() => {
    connectWsRef.current = connectWs
  }, [connectWs])

  // Connecter/deconnecter selon le mode
  useEffect(() => {
    if (mode === "api") {
      connectWs()
    } else {
      intentionalCloseRef.current = true
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
    }

    return () => {
      intentionalCloseRef.current = true
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
    }
  }, [mode, connectWs])

  return { wsConnected, latestMesure, debugMessages }
}
