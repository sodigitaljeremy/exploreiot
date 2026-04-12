import { renderHook, act } from "@testing-library/react"
import { useToasts } from "@/hooks/useToasts"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("useToasts", () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it("ajoute un toast et le retourne dans la liste", () => {
    const { result } = renderHook(() => useToasts())
    act(() => { result.current.addToast("info", "Test message") })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe("Test message")
    expect(result.current.toasts[0].type).toBe("info")
  })

  it("dismiss un toast par son id", () => {
    const { result } = renderHook(() => useToasts())
    act(() => { result.current.addToast("error", "Erreur") })
    const id = result.current.toasts[0].id
    act(() => { result.current.dismissToast(id) })
    expect(result.current.toasts).toHaveLength(0)
  })

  it("auto-dismiss apres le timeout", () => {
    const { result } = renderHook(() => useToasts())
    act(() => { result.current.addToast("warning", "Temporaire") })
    expect(result.current.toasts).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(6000) })
    expect(result.current.toasts).toHaveLength(0)
  })

  it("gere plusieurs toasts simultanement", () => {
    const { result } = renderHook(() => useToasts())
    act(() => {
      result.current.addToast("info", "Premier")
      result.current.addToast("error", "Deuxieme")
    })
    expect(result.current.toasts).toHaveLength(2)
  })
})
