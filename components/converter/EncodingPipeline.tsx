import type { LoRaWANFrame } from "@/lib/types"
import SectionTitle from "@/components/shared/SectionTitle"
import Arrow from "@/components/shared/Arrow"
import Row from "@/components/shared/Row"
import BinaryDisplay from "@/components/shared/BinaryDisplay"
import PipelineStep from "./PipelineStep"
import Term from "@/components/shared/Term"

export default function EncodingPipeline({ frame }: { frame: LoRaWANFrame }) {
  return (
    <div className="space-y-3 mb-8">
      <SectionTitle>Pipeline d&apos;encodage</SectionTitle>

      <PipelineStep num={1} title="Valeurs physiques reelles" color="blue"
        comment="Ce que le capteur mesure dans le monde reel"
        explanation="Le capteur Dragino LHT65 mesure la temperature via une thermistance NTC et l'humidite via un capteur capacitif. Ces valeurs analogiques sont converties en numerique par un ADC 12 bits.">
        <Row label="Temperature" value={`${frame.temperature}°C`} color="blue" />
        <Row label="Humidite" value={`${frame.humidite}%`} color="green" />
      </PipelineStep>

      <Arrow />

      <PipelineStep num={2} title="Conversion en entiers (x 100 / x 10)" color="purple"
        comment="Les capteurs ne transmettent pas de decimales — on multiplie pour les eliminer"
        explanation="En LoRaWAN, chaque octet compte car la bande passante est tres limitee (< 50 octets par trame). Les flottants IEEE 754 prendraient 4 octets chacun. En multipliant par 100 (temp) et 10 (hum), on obtient des entiers stockables en 2 octets (uint16), divisant la taille par 2.">
        <Row label="Temperature"
          value={`${frame.temperature} x 100 = ${frame.tempInt}`} color="blue" />
        <Row label="Humidite"
          value={`${frame.humidite} x 10 = ${frame.humInt}`} color="green" />
      </PipelineStep>

      <Arrow />

      <PipelineStep num={3} title="Representation binaire (16 bits)" color="yellow"
        comment={<>Comment l&apos;ordinateur stocke ces entiers en memoire — 16 bits = 2 octets</>}
        explanation={<>Un <Term id="uint16">uint16</Term> (unsigned integer 16 bits) peut representer des valeurs de 0 a 65535. L&apos;ordre des octets est <Term id="big-endian">big-endian</Term> (MSB first) — l&apos;octet de poids fort est transmis en premier, c&apos;est la convention reseau standard.</>}>
        <Row label={`${frame.tempInt} en binaire`}
          value={<BinaryDisplay value={frame.tempBinary} color="blue" />} />
        <Row label={`${frame.humInt} en binaire`}
          value={<BinaryDisplay value={frame.humBinary} color="green" />} />
      </PipelineStep>

      <Arrow />

      <PipelineStep num={4} title="Representation hexadecimale (2 octets)" color="orange"
        comment="Raccourci lisible du binaire — 1 chiffre hex = 4 bits, 2 chiffres hex = 1 octet"
        explanation="L'hexadecimal est le systeme base 16 (0-9, A-F). Chaque chiffre hex represente exactement 4 bits (un nibble). Deux chiffres hex = 1 octet. C'est le format standard pour afficher des donnees binaires car il est compact et bijectif.">
        <Row label="Temperature"
          value={`${frame.tempHex} → ${frame.bytes[0].toString(16).padStart(2,'0').toUpperCase()} ${frame.bytes[1].toString(16).padStart(2,'0').toUpperCase()}`}
          color="blue" />
        <Row label="Humidite"
          value={`${frame.humHex} → ${frame.bytes[2].toString(16).padStart(2,'0').toUpperCase()} ${frame.bytes[3].toString(16).padStart(2,'0').toUpperCase()}`}
          color="green" />
        <Row label="4 octets (decimal)"
          value={`[${frame.bytes.join(', ')}]`} color="gray" />
      </PipelineStep>

      <Arrow />

      <PipelineStep num={5} title="Payload Base64 (transport reseau)" color="red"
        comment={<>Encodage pour transporter des bytes bruts dans du texte JSON sur internet</>}
        explanation={<><Term id="Base64">Base64</Term> encode 3 octets en 4 caracteres ASCII (a-z, A-Z, 0-9, +, /). Le padding &apos;=&apos; complete si le nombre d&apos;octets n&apos;est pas multiple de 3. C&apos;est necessaire car <Term id="MQTT">MQTT</Term>/JSON ne supportent que du texte — les octets bruts seraient corrompus.</>}>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs">Payload LoRaWAN :</span>
          <code className="text-red-400 text-xl font-bold tracking-widest
                           bg-red-950/30 px-3 py-1 rounded">
            {frame.payload}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(frame.payload)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            copier
          </button>
        </div>
      </PipelineStep>

      <Arrow />

      <PipelineStep num={6} title="Decodage — ce que fait le worker Python" color="green"
        comment="subscriber.py recoit ce payload et retrouve les valeurs originales"
        explanation="Le subscriber Python utilise base64.b64decode() puis struct.unpack('>HH', data) pour extraire les deux uint16 big-endian. Il divise ensuite par 100 (temp) et 10 (hum) pour retrouver les valeurs flottantes originales. Ce decodage est identique au codec Chirpstack configure sur le network server.">
        <div className="font-mono text-sm space-y-1">
          <div className="text-gray-500">
            base64.b64decode(<span className="text-red-400">&quot;{frame.payload}&quot;</span>)
          </div>
          <div className="text-gray-500">
            → octets : <span className="text-yellow-400">[{frame.bytes.join(', ')}]</span>
          </div>
          <div className="text-gray-500">
            → temp_int = ({frame.bytes[0]} &lt;&lt; 8) | {frame.bytes[1]} = <span className="text-blue-400">{frame.tempInt}</span>
          </div>
          <div className="text-gray-500">
            → hum_int = ({frame.bytes[2]} &lt;&lt; 8) | {frame.bytes[3]} = <span className="text-green-400">{frame.humInt}</span>
          </div>
          <div className="text-gray-400 mt-2 pt-2 border-t border-gray-800">
            Resultat : <span className="text-blue-400 font-bold">{frame.temperature}°C</span>
            {" "} / <span className="text-green-400 font-bold">{frame.humidite}%</span>
          </div>
        </div>
      </PipelineStep>
    </div>
  )
}
