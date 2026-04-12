// lib/lorawan.ts
// Couche : Lib utilitaire (encodage/decodage)
// Role : Encode/decode les payloads LoRaWAN (temperature + humidite en 4 octets)
// Format : [temp_high, temp_low, hum_high, hum_low] → Base64
// Utilise par : mock-store (generation), pipeline-context (live), converter (pedagogie)

export interface LoRaWANFrame {
  // Valeurs physiques réelles
  temperature: number
  humidite: number

  // Couche entiers (× 100 et × 10)
  tempInt: number
  humInt: number

  // Couche binaire (16 bits chacun)
  tempBinary: string
  humBinary: string

  // Couche hexadécimale (2 octets chacun)
  tempHex: string
  humHex: string

  // Couche bytes bruts
  bytes: number[]

  // Couche Base64 (transport réseau)
  payload: string
}

/**
 * Encode température + humidité en trame LoRaWAN
 * Reproduit exactement ce que fait un capteur Dragino LHT65
 */
export function encode(temperature: number, humidite: number): LoRaWANFrame {
  // Étape 1 — Éliminer les décimales en multipliant
  const tempInt = Math.round(temperature * 100)
  const humInt = Math.round(humidite * 10)

  // Étape 2 — Convertir en représentations lisibles
  const tempBinary = tempInt.toString(2).padStart(16, '0')
  const humBinary = humInt.toString(2).padStart(16, '0')

  // Étape 3 — Représentation hexadécimale (2 octets = 4 chiffres hex)
  const tempHex = '0x' + tempInt.toString(16).toUpperCase().padStart(4, '0')
  const humHex = '0x' + humInt.toString(16).toUpperCase().padStart(4, '0')

  // Étape 4 — Extraire les bytes individuels (big-endian, two's complement 16 bits)
  const tempUnsigned = tempInt & 0xFFFF  // masquage 16 bits pour gérer les négatifs
  const humUnsigned = humInt & 0xFFFF
  const t1 = (tempUnsigned >> 8) & 0xFF  // octet de poids fort
  const t2 = tempUnsigned & 0xFF          // octet de poids faible
  const h1 = (humUnsigned >> 8) & 0xFF
  const h2 = humUnsigned & 0xFF
  const bytes = [t1, t2, h1, h2]

  // Étape 5 — Encoder en Base64 pour le transport
  const payload = btoa(String.fromCharCode(...bytes))

  return {
    temperature, humidite,
    tempInt, humInt,
    tempBinary, humBinary,
    tempHex, humHex,
    bytes,
    payload
  }
}

/**
 * Décode une trame Base64 en valeurs lisibles
 * Reproduit ce que fait le worker Python subscriber.py
 */
export function decode(payload: string): { temperature: number; humidite: number } {
  const binary = atob(payload)
  const bytes = Array.from(binary).map(c => c.charCodeAt(0))

  const tempRaw = (bytes[0] << 8) | bytes[1]
  const humRaw = (bytes[2] << 8) | bytes[3]

  // Two's complement : si la valeur dépasse 32767, c'est un nombre négatif sur 16 bits
  const tempInt = tempRaw > 32767 ? tempRaw - 65536 : tempRaw
  const humInt = humRaw > 32767 ? humRaw - 65536 : humRaw

  return {
    temperature: tempInt / 100,
    humidite: humInt / 10
  }
}

/**
 * Génère des mesures mockées réalistes avec vrais payloads LoRaWAN
 */
export function generateMockMesure(deviceId: string, baseTemp: number, baseHum: number) {
  // Variation réaliste — les capteurs ne changent pas brutalement
  const temp = +(baseTemp + (Math.random() - 0.5) * 2).toFixed(2)
  const hum = +(baseHum + (Math.random() - 0.5) * 5).toFixed(1)

  const frame = encode(temp, hum)

  return {
    device_id: deviceId,
    recu_le: new Date().toISOString(),
    temperature: temp,
    humidite: hum,
    // La trame brute comme Chirpstack la reçoit
    raw_payload: frame.payload,
    // Métadonnées LoRaWAN
    lora: {
      rssi: -(60 + Math.floor(Math.random() * 40)), // signal radio en dBm
      snr: +(5 + Math.random() * 10).toFixed(1),    // rapport signal/bruit
      frequency: 868.1,                              // fréquence EU868
      spreading_factor: 7                            // SF7 = débit max
    }
  }
}