"use client"

// Couche : Hook utilitaire
// Role : Execute un callback a intervalle regulier avec cleanup automatique
// Utilise par : ConnectionStatus (health polling), Dashboard (data refresh)

import { useEffect, useRef } from "react"

/**
 * Run a callback at a fixed interval while the component is mounted.
 *
 * @param callback - function to run on each tick
 * @param intervalMs - polling interval in milliseconds
 * @param enabled - set to false to pause polling
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  enabled = true,
) {
  const savedCallback = useRef(callback)
  useEffect(() => { savedCallback.current = callback })

  useEffect(() => {
    if (!enabled) return

    // Run immediately, then at interval
    savedCallback.current()
    const id = setInterval(() => savedCallback.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
