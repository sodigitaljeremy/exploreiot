import { renderHook } from "@testing-library/react"
import { usePolling } from "@/hooks/usePolling"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("usePolling", () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it("execute le callback immediatement puis a chaque intervalle", () => {
    const fn = vi.fn()
    renderHook(() => usePolling(fn, 1000))
    expect(fn).toHaveBeenCalledTimes(1) // appel immediat
    vi.advanceTimersByTime(3000)
    expect(fn).toHaveBeenCalledTimes(4) // 1 immediat + 3 intervalles
  })

  it("ne poll pas quand enabled=false", () => {
    const fn = vi.fn()
    renderHook(() => usePolling(fn, 1000, false))
    vi.advanceTimersByTime(5000)
    expect(fn).not.toHaveBeenCalled()
  })

  it("arrete le polling au demontage du composant", () => {
    const fn = vi.fn()
    const { unmount } = renderHook(() => usePolling(fn, 1000))
    expect(fn).toHaveBeenCalledTimes(1)
    unmount()
    vi.advanceTimersByTime(5000)
    expect(fn).toHaveBeenCalledTimes(1) // pas d'appels supplementaires
  })
})
