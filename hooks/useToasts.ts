"use client"

// Couche : Hook utilitaire
// Role : File d'attente de notifications toast avec auto-dismiss
// Utilise par : DataSourceProvider (via composition), ToastContainer (affichage)

import { useState, useCallback } from "react"
import { TOAST_TIMEOUT } from "@/lib/constants"

export interface Toast {
  id: string
  type: "info" | "warning" | "error"
  message: string
}

/** Manage a list of auto-dismissing toast notifications. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, TOAST_TIMEOUT)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, dismissToast }
}
