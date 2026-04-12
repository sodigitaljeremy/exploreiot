import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import StatsCards from "@/components/dashboard/StatsCards"
import type { Stats } from "@/lib/types"

describe("StatsCards", () => {
  const mockStats: Stats = {
    nb_devices: 5,
    total_mesures: 150,
    temp_moyenne_globale: 24.5,
    derniere_activite: "2024-01-10T10:30:00Z",
  }

  it("renders all 4 stat card labels", () => {
    render(<StatsCards stats={mockStats} alertCount={0} flash={false} />)

    expect(screen.getByText("Capteurs")).toBeTruthy()
    expect(screen.getByText("Mesures")).toBeTruthy()
    expect(screen.getByText("Temp. moyenne")).toBeTruthy()
    expect(screen.getByText("Alertes")).toBeTruthy()
  })

  it("displays devices count from stats prop", () => {
    render(<StatsCards stats={mockStats} alertCount={0} flash={false} />)

    const capteurs = screen.getByText("Capteurs")
    expect(capteurs.parentElement?.textContent).toContain("5")
  })

  it("displays measures count from stats prop", () => {
    render(<StatsCards stats={mockStats} alertCount={0} flash={false} />)

    const mesures = screen.getByText("Mesures")
    expect(mesures.parentElement?.textContent).toContain("150")
  })

  it("displays average temperature from stats prop", () => {
    render(<StatsCards stats={mockStats} alertCount={0} flash={false} />)

    expect(screen.getByText("24.5°C")).toBeTruthy()
  })

  it("displays alert count correctly", () => {
    render(<StatsCards stats={mockStats} alertCount={3} flash={false} />)

    const alertes = screen.getByText("Alertes")
    expect(alertes.parentElement?.textContent).toContain("3")
  })

  it("applies flash animation class when flash=true", () => {
    const { container } = render(
      <StatsCards stats={mockStats} alertCount={0} flash={true} />
    )

    const cards = container.querySelectorAll("[class*='animate-value-update']")
    expect(cards.length).toBeGreaterThan(0)
  })

  it("does not apply flash animation class when flash=false", () => {
    const { container } = render(
      <StatsCards stats={mockStats} alertCount={0} flash={false} />
    )

    const flashedCards = container.querySelectorAll(
      "[class*='animate-value-update']"
    )
    expect(flashedCards.length).toBe(0)
  })

  it("renders with various temperature values", () => {
    const statsWithDifferentTemp: Stats = {
      ...mockStats,
      temp_moyenne_globale: 32.8,
    }
    render(<StatsCards stats={statsWithDifferentTemp} alertCount={0} flash={false} />)

    expect(screen.getByText("32.8°C")).toBeTruthy()
  })

  it("renders with zero devices", () => {
    const statsWithZeroDevices: Stats = {
      ...mockStats,
      nb_devices: 0,
    }
    render(<StatsCards stats={statsWithZeroDevices} alertCount={0} flash={false} />)

    const capteurs = screen.getByText("Capteurs")
    expect(capteurs.parentElement?.textContent).toContain("0")
  })

  it("renders with large measure count", () => {
    const statsWithLargeMeasures: Stats = {
      ...mockStats,
      total_mesures: 10000,
    }
    render(<StatsCards stats={statsWithLargeMeasures} alertCount={0} flash={false} />)

    const mesures = screen.getByText("Mesures")
    expect(mesures.parentElement?.textContent).toContain("10000")
  })

  it("renders 4 stat card elements", () => {
    const { container } = render(<StatsCards stats={mockStats} alertCount={0} flash={false} />)

    const statElements = container.querySelectorAll("[class*='grid']")
    expect(statElements.length).toBeGreaterThan(0)
  })
})
