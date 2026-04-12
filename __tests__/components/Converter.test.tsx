import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import Converter from "@/components/converter/Converter"

describe("Converter", () => {
  beforeEach(() => {
    vi.clearAllMocks?.()
  })

  it("renders without errors", () => {
    render(<Converter />)
    expect(screen.getByText("Convertisseur LoRaWAN")).toBeTruthy()
  })

  it("renders the main title", () => {
    render(<Converter />)
    expect(screen.getByText("Convertisseur LoRaWAN")).toBeTruthy()
  })

  it("renders the description", () => {
    render(<Converter />)
    expect(
      screen.getByText(/Pipeline complet d'encodage \/ decodage/)
    ).toBeTruthy()
  })

  it("renders temperature label", () => {
    render(<Converter />)
    expect(screen.getByText(/Temperature \(°C\)/)).toBeTruthy()
  })

  it("renders humidity label", () => {
    render(<Converter />)
    expect(screen.getByText(/Humidite \(%\)/)).toBeTruthy()
  })

  it("renders pedagogical tools section", () => {
    render(<Converter />)
    expect(screen.getByText(/Outils pedagogiques/)).toBeTruthy()
  })

  it("renders all tool tabs", () => {
    render(<Converter />)

    expect(screen.getByText("Bits")).toBeTruthy()
    expect(screen.getByText("Corruption")).toBeTruthy()
    expect(screen.getByText("Overhead")).toBeTruthy()
    expect(screen.getByText("Negatifs")).toBeTruthy()
  })

  it("renders temperature and humidity number inputs", () => {
    const { container } = render(<Converter />)

    const numberInputs = container.querySelectorAll('input[type="number"]')
    expect(numberInputs.length).toBeGreaterThanOrEqual(2)
  })

  it("renders temperature and humidity range sliders", () => {
    const { container } = render(<Converter />)

    const rangeInputs = container.querySelectorAll('input[type="range"]')
    expect(rangeInputs.length).toBeGreaterThanOrEqual(2)
  })

  it("temperature input has step 0.1", () => {
    const { container } = render(<Converter />)

    const numberInputs = container.querySelectorAll('input[type="number"]')
    const tempInput = numberInputs[0] as HTMLInputElement

    expect(tempInput.step).toBe("0.1")
  })

  it("humidity input has step 0.1", () => {
    const { container } = render(<Converter />)

    const numberInputs = container.querySelectorAll('input[type="number"]')
    const humidityInput = numberInputs[1] as HTMLInputElement

    expect(humidityInput.step).toBe("0.1")
  })

  it("renders with default temperature value 32.7", () => {
    const { container } = render(<Converter />)

    const numberInputs = container.querySelectorAll('input[type="number"]')
    const tempInput = numberInputs[0] as HTMLInputElement

    expect(tempInput.value).toBe("32.7")
  })

  it("renders with default humidity value 80.6", () => {
    const { container } = render(<Converter />)

    const numberInputs = container.querySelectorAll('input[type="number"]')
    const humidityInput = numberInputs[1] as HTMLInputElement

    expect(humidityInput.value).toBe("80.6")
  })

  it("allows changing temperature via number input", () => {
    const { container } = render(<Converter />)

    const numberInputs = container.querySelectorAll('input[type="number"]')
    const tempInput = numberInputs[0] as HTMLInputElement

    fireEvent.change(tempInput, { target: { value: "25" } })

    expect(tempInput.value).toBe("25")
  })

  it("allows changing humidity via number input", () => {
    const { container } = render(<Converter />)

    const numberInputs = container.querySelectorAll('input[type="number"]')
    const humidityInput = numberInputs[1] as HTMLInputElement

    fireEvent.change(humidityInput, { target: { value: "60" } })

    expect(humidityInput.value).toBe("60")
  })

  it("temperature slider has correct range", () => {
    const { container } = render(<Converter />)

    const rangeInputs = container.querySelectorAll('input[type="range"]')
    const tempSlider = rangeInputs[0] as HTMLInputElement

    expect(tempSlider.min).toBe("-10")
    expect(tempSlider.max).toBe("60")
  })

  it("humidity slider has correct range", () => {
    const { container } = render(<Converter />)

    const rangeInputs = container.querySelectorAll('input[type="range"]')
    const humiditySlider = rangeInputs[1] as HTMLInputElement

    expect(humiditySlider.min).toBe("0")
    expect(humiditySlider.max).toBe("100")
  })

  it("renders main container with proper structure", () => {
    const { container } = render(<Converter />)

    const mainDiv = container.querySelector("[class*='p-6']")
    expect(mainDiv).toBeTruthy()
  })

  it("renders input grid layout", () => {
    const { container } = render(<Converter />)

    const gridDiv = container.querySelector("[class*='grid']")
    expect(gridDiv).toBeTruthy()
  })

  it("renders card components for temperature and humidity", () => {
    const { container } = render(<Converter />)

    const cards = container.querySelectorAll("[class*='rounded-xl']")
    expect(cards.length).toBeGreaterThanOrEqual(2)
  })

  it("can switch between tool tabs", () => {
    render(<Converter />)

    const corruptionTab = screen.getByText("Corruption")
    fireEvent.click(corruptionTab)

    const button = corruptionTab.closest("button")
    expect(button?.className).toContain("bg-blue-600")
  })
})
