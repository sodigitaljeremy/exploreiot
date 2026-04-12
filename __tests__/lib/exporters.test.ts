import { describe, it, expect, beforeEach, vi } from "vitest"
import { exportCSV, exportPDF } from "@/lib/exporters"
import type { Mesure, Stats } from "@/lib/api-client"

// Capture Blob content for assertions
let lastBlobContent: string[] = []
global.Blob = class MockBlob {
  constructor(content: string[]) { lastBlobContent = content }
} as any
global.URL.createObjectURL = vi.fn(() => "blob:mock-url")
global.URL.revokeObjectURL = vi.fn()

// Mock document and window
const mockElement = {
  href: "",
  download: "",
  click: vi.fn(),
}

vi.spyOn(document, "createElement").mockReturnValue(mockElement as any)
vi.spyOn(window, "open").mockReturnValue(null)

describe("exporters", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("exportCSV", () => {
    it("sanitizes values starting with = (formula injection)", () => {
      const metrics: Mesure[] = [
        {
          device_id: "=SUM(1,2)",
          temperature: 24.5,
          humidite: 65.0,
          recu_le: "2026-04-12T10:00:00Z",
        },
      ]

      exportCSV(metrics, "test-device")

      const csvContent = lastBlobContent[0]
      expect(csvContent).toContain("'=SUM")
    })

    it("sanitizes values starting with + (formula injection)", () => {
      const metrics: Mesure[] = [
        {
          device_id: "+1234",
          temperature: 24.5,
          humidite: 65.0,
          recu_le: "2026-04-12T10:00:00Z",
        },
      ]

      exportCSV(metrics, "test-device")

      const csvContent = lastBlobContent[0]
      expect(csvContent).toContain("'+1234")
    })

    it("sanitizes values starting with - (formula injection)", () => {
      const metrics: Mesure[] = [
        {
          device_id: "-1234",
          temperature: 24.5,
          humidite: 65.0,
          recu_le: "2026-04-12T10:00:00Z",
        },
      ]

      exportCSV(metrics, "test-device")

      const csvContent = lastBlobContent[0]
      expect(csvContent).toContain("'-1234")
    })

    it("sanitizes values starting with @ (formula injection)", () => {
      const metrics: Mesure[] = [
        {
          device_id: "@attacker.com",
          temperature: 24.5,
          humidite: 65.0,
          recu_le: "2026-04-12T10:00:00Z",
        },
      ]

      exportCSV(metrics, "test-device")

      const csvContent = lastBlobContent[0]
      expect(csvContent).toContain("'@attacker")
    })

    it("quotes values containing commas", () => {
      const metrics: Mesure[] = [
        {
          device_id: "device,1",
          temperature: 24.5,
          humidite: 65.0,
          recu_le: "2026-04-12T10:00:00Z",
        },
      ]

      exportCSV(metrics, "test-device")

      const csvContent = lastBlobContent[0]
      expect(csvContent).toContain('"device,1"')
    })

    it("includes CSV header", () => {
      const metrics: Mesure[] = [
        {
          device_id: "device1",
          temperature: 24.5,
          humidite: 65.0,
          recu_le: "2026-04-12T10:00:00Z",
        },
      ]

      exportCSV(metrics, "test-device")

      const csvContent = lastBlobContent[0]
      expect(csvContent).toContain("device_id,temperature,humidite,recu_le")
    })

    it("creates download link with correct filename", () => {
      const metrics: Mesure[] = [
        {
          device_id: "device1",
          temperature: 24.5,
          humidite: 65.0,
          recu_le: "2026-04-12T10:00:00Z",
        },
      ]

      exportCSV(metrics, "My Test Device")

      expect(mockElement.download).toContain("exploreiot-")
      expect(mockElement.download).toContain("my-test-device")
      expect(mockElement.click).toHaveBeenCalled()
    })
  })

  describe("exportPDF", () => {
    it("returns true when window.open succeeds", () => {
      const mockWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        print: vi.fn(),
      }

      vi.spyOn(window, "open").mockReturnValue(mockWindow as any)

      const metrics: Mesure[] = [
        {
          device_id: "device1",
          temperature: 24.5,
          humidite: 65.0,
          recu_le: "2026-04-12T10:00:00Z",
        },
      ]
      const stats: Stats = {
        nb_devices: 5,
        total_mesures: 1000,
        temp_moyenne_globale: 22.5,
        derniere_activite: "2026-04-12T10:00:00Z",
      }

      const result = exportPDF(metrics, "test-device", stats)
      expect(result).toBe(true)
      expect(mockWindow.document.write).toHaveBeenCalled()
      expect(mockWindow.print).toHaveBeenCalled()
    })

    it("returns false when window.open returns null", () => {
      vi.spyOn(window, "open").mockReturnValue(null)

      const metrics: Mesure[] = [
        {
          device_id: "device1",
          temperature: 24.5,
          humidite: 65.0,
          recu_le: "2026-04-12T10:00:00Z",
        },
      ]

      const result = exportPDF(metrics, "test-device", null)
      expect(result).toBe(false)
    })

    it("escapes HTML special characters in device name", () => {
      const mockWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        print: vi.fn(),
      }

      vi.spyOn(window, "open").mockReturnValue(mockWindow as any)

      const metrics: Mesure[] = []
      exportPDF(metrics, "<script>alert('xss')</script>", null)

      const htmlContent = mockWindow.document.write.mock.calls[0][0]
      expect(htmlContent).not.toContain("<script>")
      expect(htmlContent).toContain("&lt;script&gt;")
    })

    it("escapes HTML in measurement values", () => {
      const mockWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        print: vi.fn(),
      }

      vi.spyOn(window, "open").mockReturnValue(mockWindow as any)

      const metrics: Mesure[] = [
        {
          device_id: "<b>device</b>",
          temperature: 24.5,
          humidite: 65.0,
          recu_le: "2026-04-12T10:00:00Z",
        },
      ]

      exportPDF(metrics, "test", null)

      const htmlContent = mockWindow.document.write.mock.calls[0][0]
      expect(htmlContent).not.toContain("<b>device</b>")
      expect(htmlContent).toContain("&lt;b&gt;device&lt;/b&gt;")
    })

    it("includes stats in PDF when provided", () => {
      const mockWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        print: vi.fn(),
      }

      vi.spyOn(window, "open").mockReturnValue(mockWindow as any)

      const metrics: Mesure[] = []
      const stats: Stats = {
        nb_devices: 5,
        total_mesures: 1000,
        temp_moyenne_globale: 22.5,
        derniere_activite: "2026-04-12T10:00:00Z",
      }

      exportPDF(metrics, "test", stats)

      const htmlContent = mockWindow.document.write.mock.calls[0][0]
      expect(htmlContent).toContain("5 capteurs")
      expect(htmlContent).toContain("1000 mesures")
    })
  })
})
