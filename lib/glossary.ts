// lib/glossary.ts
// Interactive glossary — definitions for IoT and protocol terms

export interface GlossaryEntry {
  term: string
  shortDef: string
  docLink?: string
  relatedTerms?: string[]
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  MQTT: {
    term: "MQTT",
    shortDef: "Message Queuing Telemetry Transport — protocole publish/subscribe léger, conçu pour l'IoT. Le client publie sur un topic, le broker distribue aux abonnés.",
    docLink: "https://mqtt.org/",
    relatedTerms: ["Broker", "Topic", "QoS"],
  },
  Base64: {
    term: "Base64",
    shortDef: "Encodage qui convertit des données binaires en texte ASCII (a-z, A-Z, 0-9, +, /). 3 octets → 4 caractères. Nécessaire pour transporter du binaire dans du JSON.",
    relatedTerms: ["Payload"],
  },
  "big-endian": {
    term: "Big-endian",
    shortDef: "Ordre des octets où l'octet de poids fort (MSB) est transmis en premier. C'est l'ordre réseau standard (network byte order).",
    relatedTerms: ["uint16"],
  },
  QoS: {
    term: "QoS (Quality of Service)",
    shortDef: "Niveau de garantie de livraison MQTT. QoS 0 = fire and forget, QoS 1 = au moins une fois, QoS 2 = exactement une fois.",
    relatedTerms: ["MQTT"],
  },
  RSSI: {
    term: "RSSI",
    shortDef: "Received Signal Strength Indicator — puissance du signal radio reçu, en dBm. Plus le nombre est proche de 0, meilleur est le signal. Typiquement -60 à -120 dBm en LoRaWAN.",
    relatedTerms: ["SNR", "LoRaWAN"],
  },
  SNR: {
    term: "SNR",
    shortDef: "Signal-to-Noise Ratio — rapport signal/bruit en dB. Un SNR positif signifie que le signal est plus fort que le bruit. LoRa peut décoder des signaux avec un SNR négatif.",
    relatedTerms: ["RSSI", "LoRaWAN"],
  },
  "spreading-factor": {
    term: "Spreading Factor (SF)",
    shortDef: "Paramètre LoRa qui contrôle le ratio portée/débit. SF7 = débit max (~5.5 kbps), SF12 = portée max mais débit très faible (~250 bps). Chaque incrément double le temps d'émission.",
    relatedTerms: ["LoRaWAN"],
  },
  WebSocket: {
    term: "WebSocket",
    shortDef: "Protocole de communication bidirectionnel full-duplex sur TCP. Contrairement à HTTP, le serveur peut envoyer des données au client sans requête (push). Idéal pour le temps réel.",
    relatedTerms: ["MQTT"],
  },
  LoRaWAN: {
    term: "LoRaWAN",
    shortDef: "Long Range Wide Area Network — protocole réseau IoT basé sur la modulation radio LoRa. Portée de plusieurs kilomètres, très faible consommation énergétique, débit limité.",
    relatedTerms: ["spreading-factor", "RSSI", "SNR"],
  },
  Chirpstack: {
    term: "Chirpstack",
    shortDef: "Network Server LoRaWAN open source. Gère l'authentification des devices, le déchiffrement des trames, et la publication des données sur MQTT.",
    docLink: "https://www.chirpstack.io/",
    relatedTerms: ["LoRaWAN", "MQTT"],
  },
  "complement-a-2": {
    term: "Complément à 2",
    shortDef: "Méthode standard pour représenter les entiers signés en binaire. Pour obtenir la valeur négative : inverser tous les bits puis ajouter 1. Permet l'addition/soustraction avec le même circuit.",
    relatedTerms: ["uint16"],
  },
  uint16: {
    term: "uint16",
    shortDef: "Unsigned integer 16 bits — entier non signé de 0 à 65535, stocké sur 2 octets. Utilisé en LoRaWAN pour encoder température (×100) et humidité (×10) de manière compacte.",
    relatedTerms: ["big-endian", "complement-a-2"],
  },
  Payload: {
    term: "Payload",
    shortDef: "Les données utiles transportées par un protocole, par opposition aux headers/métadonnées. En LoRaWAN, le payload fait typiquement 4 à 51 octets.",
    relatedTerms: ["Base64", "LoRaWAN"],
  },
  Broker: {
    term: "Broker MQTT",
    shortDef: "Serveur central qui reçoit les messages publiés et les redistribue aux clients abonnés. Exemples : Mosquitto, HiveMQ. Le broker ne stocke pas les messages (sauf retained).",
    relatedTerms: ["MQTT", "Topic"],
  },
  Topic: {
    term: "Topic MQTT",
    shortDef: "Chemin hiérarchique (ex: application/1/device/abc/event/up) utilisé pour le routage des messages. Les clients s'abonnent à des topics avec des wildcards (+, #).",
    relatedTerms: ["MQTT", "Broker"],
  },
}
