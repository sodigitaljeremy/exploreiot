import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import Converter from "@/components/converter/Converter"

describe("Converter component (Pipeline-adjacent)", () => {
  describe("Converter rendering and interaction", () => {
    it("renders the converter title", () => {
      render(<Converter />)

      expect(screen.getByText("Convertisseur LoRaWAN")).toBeTruthy()
    })

    it("renders the converter description", () => {
      render(<Converter />)

      expect(
        screen.getByText(/Pipeline complet d'encodage \/ decodage/)
      ).toBeTruthy()
    })

    it("renders temperature label and input", () => {
      render(<Converter />)

      expect(screen.getByText(/Temperature \(°C\)/)).toBeTruthy()
    })

    it("renders humidity label and input", () => {
      render(<Converter />)

      expect(screen.getByText(/Humidite \(%\)/)).toBeTruthy()
    })

    it("renders pedagogical tools section header", () => {
      render(<Converter />)

      expect(screen.getByText(/Outils pedagogiques/)).toBeTruthy()
    })

    it("renders all four tool tabs", () => {
      render(<Converter />)

      expect(screen.getByText("Bits")).toBeTruthy()
      expect(screen.getByText("Corruption")).toBeTruthy()
      expect(screen.getByText("Overhead")).toBeTruthy()
      expect(screen.getByText("Negatifs")).toBeTruthy()
    })

    it("renders temperature and humidity input controls", () => {
      const { container } = render(<Converter />)

      const numberInputs = container.querySelectorAll('input[type="number"]')
      expect(numberInputs.length).toBeGreaterThanOrEqual(2)
    })

    it("renders temperature and humidity range sliders", () => {
      const { container } = render(<Converter />)

      const rangeInputs = container.querySelectorAll('input[type="range"]')
      expect(rangeInputs.length).toBeGreaterThanOrEqual(2)
    })

    it("has proper container structure with max-width", () => {
      const { container } = render(<Converter />)

      const mainDiv = container.querySelector("[class*='max-w-4xl']")
      expect(mainDiv).toBeTruthy()
    })

    it("renders input cards in grid layout", () => {
      const { container } = render(<Converter />)

      const gridDiv = container.querySelector("[class*='grid']")
      expect(gridDiv).toBeTruthy()
    })

    it("has proper padding on main container", () => {
      const { container } = render(<Converter />)

      const mainDiv = container.querySelector("[class*='p-6']")
      expect(mainDiv).toBeTruthy()
    })

    it("renders with proper styling elements", () => {
      const { container } = render(<Converter />)

      const labels = container.querySelectorAll("[class*='uppercase']")
      expect(labels.length).toBeGreaterThan(0)
    })

    it("has input cards with border and rounded styling", () => {
      const { container } = render(<Converter />)

      const cards = container.querySelectorAll("[class*='rounded']")
      expect(cards.length).toBeGreaterThan(0)
    })
  })
})
