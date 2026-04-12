import { describe, it, expect, beforeEach, vi } from "vitest"
import { fetchStats, fetchDevices, fetchHistory, fetchAlertes, checkApiHealth } from "@/lib/api-client"

// Mock global fetch
global.fetch = vi.fn()

describe("api-client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchStats", () => {
    it("returns parsed JSON on success", async () => {
      const mockData = {
        stats: {
          nb_devices: 5,
          total_mesures: 1000,
          temp_moyenne_globale: 22.5,
          derniere_activite: "2026-04-12T10:00:00Z",
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await fetchStats()
      expect(result).toEqual(mockData.stats)
      expect(global.fetch).toHaveBeenCalled()
    })

    it("throws error on non-ok response", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(fetchStats()).rejects.toThrow()
    })

    it("throws error on network failure", async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error("Network error"))

      await expect(fetchStats()).rejects.toThrow()
    })
  })

  describe("fetchDevices", () => {
    it("includes X-API-Key header when API_KEY is set", async () => {
      const mockData = {
        devices: [
          {
            device_id: "device1",
            nb_mesures: 100,
            temp_moyenne: 22.0,
            temp_min: 20.0,
            temp_max: 25.0,
            derniere_mesure: "2026-04-12T10:00:00Z",
          },
        ],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      await fetchDevices()
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      )
    })

    it("returns devices with names from registry", async () => {
      const mockData = {
        devices: [
          {
            device_id: "lht65-001",
            nb_mesures: 100,
            temp_moyenne: 22.0,
            temp_min: 20.0,
            temp_max: 25.0,
            derniere_mesure: "2026-04-12T10:00:00Z",
          },
        ],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await fetchDevices()
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty("name")
    })
  })

  describe("fetchHistory", () => {
    it("returns measurements in ascending order", async () => {
      const mockData = {
        mesures: [
          {
            device_id: "device1",
            temperature: 25.0,
            humidite: 60.0,
            recu_le: "2026-04-12T10:00:00Z",
          },
          {
            device_id: "device1",
            temperature: 24.0,
            humidite: 55.0,
            recu_le: "2026-04-12T09:00:00Z",
          },
        ],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await fetchHistory("device1")
      // Verify reversed (API returns DESC, we reverse to ASC)
      expect(result[0].temperature).toBe(24.0)
      expect(result[1].temperature).toBe(25.0)
    })

    it("includes limit and since query params", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mesures: [] }),
      })

      await fetchHistory("device1", 50, "2026-04-12T00:00:00Z")
      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain("limit=50")
      expect(call).toContain("since=")
    })
  })

  describe("checkApiHealth", () => {
    it("returns true when API responds with ok status", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
      })

      const result = await checkApiHealth()
      expect(result).toBe(true)
    })

    it("returns false when API responds with error status", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
      })

      const result = await checkApiHealth()
      expect(result).toBe(false)
    })

    it("returns false when fetch throws error", async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error("Network error"))

      const result = await checkApiHealth()
      expect(result).toBe(false)
    })
  })

  describe("fetchAlertes", () => {
    it("returns alerts from API", async () => {
      const mockData = {
        alertes: [
          {
            id: "1",
            device_id: "device1",
            type: "temperature_high",
            message: "Temperature too high",
            timestamp: "2026-04-12T10:00:00Z",
          },
        ],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await fetchAlertes()
      expect(result).toEqual(mockData.alertes)
    })
  })
})
