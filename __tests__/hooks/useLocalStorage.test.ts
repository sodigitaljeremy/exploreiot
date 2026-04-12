import { renderHook, act } from "@testing-library/react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { describe, it, expect, beforeEach } from "vitest"

describe("useLocalStorage", () => {
  beforeEach(() => { localStorage.clear() })

  it("retourne la valeur par defaut si rien en storage", () => {
    const { result } = renderHook(() => useLocalStorage("key", 42))
    expect(result.current[0]).toBe(42)
  })

  it("persiste la valeur dans localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("key", "init"))
    act(() => { result.current[1]("updated") })
    expect(result.current[0]).toBe("updated")
    expect(JSON.parse(localStorage.getItem("key")!)).toBe("updated")
  })

  it("lit une valeur existante au montage", () => {
    localStorage.setItem("key", JSON.stringify("existante"))
    const { result } = renderHook(() => useLocalStorage("key", "defaut"))
    expect(result.current[0]).toBe("existante")
  })

  it("utilise la valeur par defaut si le JSON est invalide", () => {
    localStorage.setItem("key", "pas du json{{{")
    const { result } = renderHook(() => useLocalStorage("key", "fallback"))
    expect(result.current[0]).toBe("fallback")
  })

  it("rejette une valeur qui echoue la validation", () => {
    localStorage.setItem("key", JSON.stringify(-5))
    const { result } = renderHook(() =>
      useLocalStorage("key", 10, (v) => typeof v === "number" && v > 0)
    )
    expect(result.current[0]).toBe(10) // valeur par defaut car validation echouee
  })
})
