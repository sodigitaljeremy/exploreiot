"use client"

// Couche : Hook utilitaire
// Role : Synchronise un state React avec localStorage (persistance entre sessions)
// Utilise par : AlertSettings (seuils d'alerte), ThemeToggle (theme clair/sombre)

import { useState, useCallback } from "react"

/**
 * Type-safe localStorage hook with validation.
 *
 * @param key - localStorage key
 * @param defaultValue - fallback if key is missing or validation fails
 * @param validate - optional validator; returns false to reject stored data
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  validate?: (value: unknown) => boolean,
): [T, (value: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return defaultValue
      const parsed = JSON.parse(raw)
      if (validate && !validate(parsed)) return defaultValue
      return parsed as T
    } catch {
      return defaultValue
    }
  })

  const setValue = useCallback(
    (value: T) => {
      setStored(value)
      localStorage.setItem(key, JSON.stringify(value))
    },
    [key],
  )

  return [stored, setValue]
}
