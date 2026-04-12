"use client"

import Card from "@/components/atoms/Card"
import { PIPELINE_STAGES } from "@/lib/pipeline-stages"
import { usePipeline } from "@/lib/pipeline-context"
import { COLOR_MAP } from "@/lib/constants"

const STEP_EXPLANATIONS = [
  "Le capteur physique mesure l'environnement. La thermistance NTC change de résistance avec la température, et un ADC convertit cette résistance en nombre numérique. C'est le point de départ de toute donnée IoT.",
  "La couche LoRaWAN encapsule les 4 octets dans une trame radio. Le Spreading Factor détermine la portée vs le débit. SF7 = portée minimale mais débit maximal (~5.5 kbps). Chaque trame est chiffrée avec AES-128.",
  "Le Network Server (Chirpstack) reçoit la trame via la Gateway, vérifie l'intégrité (MIC), déchiffre le payload, puis publie un message JSON sur le broker MQTT. Le payload binaire est encodé en Base64 pour être transportable en JSON.",
  "Le subscriber Python se connecte au broker MQTT et reçoit chaque message. Il extrait le payload Base64, le décode en octets, puis utilise struct.unpack pour reconvertir les entiers en valeurs physiques (÷100 et ÷10).",
  "Les valeurs décodées sont stockées dans PostgreSQL pour l'historique. Un index composite optimise les requêtes par device et par date. C'est la persistance — sans cette étape, les données seraient perdues au redémarrage.",
  "L'API REST expose les données stockées via HTTP/JSON. FastAPI génère automatiquement la documentation OpenAPI. L'authentification par clé API protège l'accès. Le rate limiting empêche les abus.",
  "En parallèle du stockage, chaque nouvelle mesure est broadcastée à tous les clients WebSocket connectés. C'est du push : le serveur envoie les données sans que le client ait besoin de polling.",
  "Le navigateur reçoit le message WebSocket, met à jour le state React, ce qui déclenche un re-render. Recharts convertit les données en SVG. Le cycle est complet : du capteur physique au pixel sur l'écran.",
]

export default function StepExplanation() {
  const { selectedMessage, selectedStage } = usePipeline()
  const stage = PIPELINE_STAGES[selectedStage]

  if (!selectedMessage || !stage) return null

  return (
    <Card className="animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{stage.icon}</span>
        <h4 className={`text-sm font-bold ${COLOR_MAP[stage.color] ?? "text-gray-400"}`}>
          Pourquoi cette etape ?
        </h4>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        {STEP_EXPLANATIONS[selectedStage]}
      </p>
    </Card>
  )
}
