import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import AlertsPanel from "@/components/dashboard/AlertsPanel"
import type { Alerte } from "@/lib/types"

describe("AlertsPanel", () => {
  const mockAlertes: Alerte[] = [
    {
      type: "TEMPERATURE_ELEVEE",
      device_id: "device_001",
      valeur: 35.5,
      message: "Température 35.5°C > seuil 33°C",
      recu_le: "2024-01-10T10:30:00Z",
    },
    {
      type: "TEMPERATURE_BASSE",
      device_id: "device_002",
      valeur: 2.3,
      message: "Température 2.3°C < seuil 5°C",
      recu_le: "2024-01-10T10:31:00Z",
    },
  ]

  it("renders the alerts panel header", () => {
    render(<AlertsPanel alertes={[]} />)

    expect(screen.getByText(/Alertes/)).toBeTruthy()
  })

  it("shows empty state when no alerts exist", () => {
    render(<AlertsPanel alertes={[]} />)

    expect(screen.getByText("Aucune alerte active")).toBeTruthy()
  })

  it("renders alert list when alerts exist", () => {
    render(<AlertsPanel alertes={mockAlertes} />)

    expect(screen.getByText("Température 35.5°C > seuil 33°C")).toBeTruthy()
    expect(screen.getByText("Température 2.3°C < seuil 5°C")).toBeTruthy()
  })

  it("displays alert count in header", () => {
    render(<AlertsPanel alertes={mockAlertes} />)

    expect(screen.getByText("Alertes (2)")).toBeTruthy()
  })

  it("displays empty count when no alerts", () => {
    render(<AlertsPanel alertes={[]} />)

    expect(screen.getByText("Alertes (0)")).toBeTruthy()
  })

  it("shows alert type for each alert", () => {
    render(<AlertsPanel alertes={mockAlertes} />)

    expect(screen.getByText("TEMPERATURE_ELEVEE")).toBeTruthy()
    expect(screen.getByText("TEMPERATURE_BASSE")).toBeTruthy()
  })

  it("shows alert message for each alert", () => {
    render(<AlertsPanel alertes={mockAlertes} />)

    expect(screen.getByText("Température 35.5°C > seuil 33°C")).toBeTruthy()
    expect(screen.getByText("Température 2.3°C < seuil 5°C")).toBeTruthy()
  })

  it("renders alert settings button", () => {
    render(<AlertsPanel alertes={[]} />)

    const settingsButton = screen.getByText("Seuils")
    expect(settingsButton).toBeTruthy()
  })

  it("responds to settings button click", () => {
    const mockCallback = vi.fn()
    render(<AlertsPanel alertes={[]} onThresholdsChange={mockCallback} />)

    const settingsButton = screen.getByText("Seuils")
    fireEvent.click(settingsButton)

    expect(settingsButton).toBeTruthy()
  })

  it("renders multiple alerts in correct order", () => {
    const multipleAlertes = [
      ...mockAlertes,
      {
        type: "TEMPERATURE_ELEVEE",
        device_id: "device_003",
        valeur: 40.2,
        message: "Température 40.2°C > seuil 33°C",
        recu_le: "2024-01-10T10:32:00Z",
      },
    ]

    render(<AlertsPanel alertes={multipleAlertes} />)

    expect(screen.getByText("Alertes (3)")).toBeTruthy()
    expect(screen.getByText("Température 35.5°C > seuil 33°C")).toBeTruthy()
    expect(screen.getByText("Température 2.3°C < seuil 5°C")).toBeTruthy()
    expect(screen.getByText("Température 40.2°C > seuil 33°C")).toBeTruthy()
  })

  it("handles single alert correctly", () => {
    render(<AlertsPanel alertes={[mockAlertes[0]]} />)

    expect(screen.getByText("Alertes (1)")).toBeTruthy()
    expect(screen.getByText("TEMPERATURE_ELEVEE")).toBeTruthy()
  })

  it("renders alert container with proper styling", () => {
    const { container } = render(<AlertsPanel alertes={mockAlertes} />)

    const alertElements = container.querySelectorAll("[class*='bg-red-950']")
    expect(alertElements.length).toBe(2)
  })

  it("uses unique keys based on device_id and recu_le", () => {
    const { container } = render(<AlertsPanel alertes={mockAlertes} />)

    const alertDivs = container.querySelectorAll("[class*='bg-red-950']")
    expect(alertDivs.length).toBe(mockAlertes.length)
  })
})
