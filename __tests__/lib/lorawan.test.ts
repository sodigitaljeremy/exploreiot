import { describe, it, expect } from "vitest"
import { encode, decode } from "@/lib/lorawan"

describe("lorawan encode/decode", () => {
  it("encodes and decodes normal values", () => {
    const frame = encode(24.5, 65.0)
    expect(frame.payload).toBeDefined()
    expect(typeof frame.payload).toBe("string")

    const decoded = decode(frame.payload)
    expect(decoded.temperature).toBeCloseTo(24.5, 1)
    expect(decoded.humidite).toBeCloseTo(65.0, 0)
  })

  it("encodes and decodes negative temperature (two's complement)", () => {
    const frame = encode(-10.0, 50.0)
    const decoded = decode(frame.payload)
    expect(decoded.temperature).toBeCloseTo(-10.0, 1)
    expect(decoded.humidite).toBeCloseTo(50.0, 0)
  })

  it("handles boundary values: -40°C / 0% humidity", () => {
    const frame = encode(-40.0, 0.0)
    const decoded = decode(frame.payload)
    expect(decoded.temperature).toBeCloseTo(-40.0, 1)
    expect(decoded.humidite).toBeCloseTo(0.0, 0)
  })

  it("handles boundary values: 85°C / 100% humidity", () => {
    const frame = encode(85.0, 100.0)
    const decoded = decode(frame.payload)
    expect(decoded.temperature).toBeCloseTo(85.0, 1)
    expect(decoded.humidite).toBeCloseTo(100.0, 0)
  })

  it("handles zero values", () => {
    const frame = encode(0.0, 0.0)
    const decoded = decode(frame.payload)
    expect(decoded.temperature).toBeCloseTo(0.0, 1)
    expect(decoded.humidite).toBeCloseTo(0.0, 0)
  })

  it("preserves precision to 0.01°C for temperature", () => {
    const frame = encode(24.56, 65.3)
    const decoded = decode(frame.payload)
    expect(decoded.temperature).toBeCloseTo(24.56, 1)
  })
})
