import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import StatsCards from "@/components/dashboard/StatsCards"
import AlertsPanel from "@/components/dashboard/AlertsPanel"
import type { Stats, Alerte } from "@/lib/types"

describe("Dashboard view components", () => {
  describe("Dashboard integration (via StatsCards and AlertsPanel)", () => {
    const mockStats: Stats = {
      nb_devices: 3,
      total_mesures: 150,
      temp_moyenne_globale: 24.5,
      derniere_activite: "2024-01-10T10:30:00Z",
    }

    it("renders stats cards with correct structure", () => {
      render(<StatsCards stats={mockStats} alertCount={0} flash={false} />)

      expect(screen.getByText("Capteurs")).toBeTruthy()
      expect(screen.getByText("Mesures")).toBeTruthy()
      expect(screen.getByText("Temp. moyenne")).toBeTruthy()
      expect(screen.getByText("Alertes")).toBeTruthy()
    })

    it("renders alerts panel with correct structure", () => {
      const mockAlertes: Alerte[] = []
      render(<AlertsPanel alertes={mockAlertes} />)

      expect(screen.getByText(/Alertes/)).toBeTruthy()
      expect(screen.getByText("Aucune alerte active")).toBeTruthy()
    })

    it("displays device count in stats", () => {
      render(<StatsCards stats={mockStats} alertCount={0} flash={false} />)

      expect(screen.getByText("Capteurs").parentElement?.textContent).toContain("3")
    })

    it("displays total measures in stats", () => {
      render(<StatsCards stats={mockStats} alertCount={0} flash={false} />)

      expect(screen.getByText("Mesures").parentElement?.textContent).toContain("150")
    })

    it("displays average temperature with correct unit", () => {
      render(<StatsCards stats={mockStats} alertCount={0} flash={false} />)

      expect(screen.getByText("24.5°C")).toBeTruthy()
    })

    it("renders alerts panel with alert count", () => {
      const mockAlertes: Alerte[] = [
        {
          type: "TEMPERATURE_ELEVEE",
          device_id: "device_001",
          valeur: 35.5,
          message: "High temperature",
          recu_le: "2024-01-10T10:30:00Z",
        },
      ]
      render(<AlertsPanel alertes={mockAlertes} />)

      expect(screen.getByText("Alertes (1)")).toBeTruthy()
    })

    it("displays alert details when alerts exist", () => {
      const mockAlertes: Alerte[] = [
        {
          type: "TEMPERATURE_ELEVEE",
          device_id: "device_001",
          valeur: 35.5,
          message: "High temperature alert",
          recu_le: "2024-01-10T10:30:00Z",
        },
      ]
      render(<AlertsPanel alertes={mockAlertes} />)

      expect(screen.getByText("TEMPERATURE_ELEVEE")).toBeTruthy()
      expect(screen.getByText("High temperature alert")).toBeTruthy()
    })

    it("handles multiple alerts display", () => {
      const mockAlertes: Alerte[] = [
        {
          type: "TEMPERATURE_ELEVEE",
          device_id: "device_001",
          valeur: 35.5,
          message: "Temperature too high",
          recu_le: "2024-01-10T10:30:00Z",
        },
        {
          type: "TEMPERATURE_BASSE",
          device_id: "device_002",
          valeur: 2.3,
          message: "Temperature too low",
          recu_le: "2024-01-10T10:31:00Z",
        },
      ]
      render(<AlertsPanel alertes={mockAlertes} />)

      expect(screen.getByText("Alertes (2)")).toBeTruthy()
      expect(screen.getByText("Temperature too high")).toBeTruthy()
      expect(screen.getByText("Temperature too low")).toBeTruthy()
    })

    it("shows proper empty state in alerts", () => {
      render(<AlertsPanel alertes={[]} />)

      expect(screen.getByText("Aucune alerte active")).toBeTruthy()
    })

    it("displays high alert count correctly", () => {
      render(<StatsCards stats={mockStats} alertCount={5} flash={false} />)

      expect(screen.getByText("Alertes").parentElement?.textContent).toContain("5")
    })

    it("renders stats with zero measures", () => {
      const zeroStats: Stats = {
        ...mockStats,
        total_mesures: 0,
      }
      render(<StatsCards stats={zeroStats} alertCount={0} flash={false} />)

      expect(screen.getByText("Mesures").parentElement?.textContent).toContain("0")
    })
  })
})
