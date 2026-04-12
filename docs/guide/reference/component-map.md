# Carte des composants Frontend

Hiérarchie des composants React après la refactorisation Phase 1. L'ancien monolithe `app-client.tsx` (814 lignes) a été décomposé en ~20 composants SRP.

## Arborescence

```text
app/page.tsx
  └── DataSourceProvider (lib/data-provider.tsx)
        └── App (components/app-client.tsx) ← Shell mince (~19 lignes)
              ├── ToastContainer (shared/)
              ├── NavBar (layout/)
              │     ├── WsIndicator (shared/)
              │     ├── HealthIndicator (shared/)
              │     ├── DataModeToggle (layout/)
              │     └── NavBtn (layout/)
              │
              ├── Dashboard (dashboard/) ← si view === "dashboard"
              │     ├── DashboardSkeleton (shared/Skeleton.tsx)
              │     ├── ConnectionStatus (shared/) ← si mode API
              │     ├── StatsCards (dashboard/)
              │     ├── DeviceSelector (dashboard/)
              │     ├── MetricsChart (dashboard/)
              │     └── AlertsPanel (dashboard/)
              │
              ├── Converter (converter/) ← si view === "converter"
              │     ├── EncodingPipeline (converter/)
              │     │     ├── PipelineStep (converter/)
              │     │     ├── SectionTitle (shared/)
              │     │     ├── Arrow (shared/)
              │     │     ├── Row (shared/)
              │     │     └── BinaryDisplay (shared/)
              │     ├── DecoderTool (converter/)
              │     ├── BitManipulator (converter/)
              │     ├── CorruptionDemo (converter/)
              │     ├── ProtocolOverhead (converter/)
              │     └── NegativeTemperatureDemo (converter/)
              │
              └── Pipeline (pipeline/) ← si view === "pipeline"
                    ├── PipelineProvider (lib/pipeline-context.tsx)
                    │     └── PipelineContent
                    │           ├── PipelineModeTabs (pipeline/)
                    │           ├── ConnectionStatus (shared/)
                    │           ├── SystemDiagram (pipeline/)
                    │           │     ├── DiagramNode (pipeline/)
                    │           │     └── DataPacketAnimation (pipeline/)
                    │           ├── StepByStepControls (pipeline/) ← si mode step-by-step
                    │           ├── StepExplanation (pipeline/) ← si mode step-by-step
                    │           ├── ProtocolInspector (pipeline/) ← si mode inspector
                    │           │     ├── InspectorMqttTab (pipeline/)
                    │           │     ├── InspectorWsTab (pipeline/)
                    │           │     └── InspectorHttpTab (pipeline/)
                    │           ├── DataTransformPanel (pipeline/)
                    │           ├── MessageTimeline (pipeline/)
                    │           │     └── MessageTimelineItem (pipeline/)
                    │           └── StageDetailPanel (pipeline/)
                    │                 ├── StageDataView (pipeline/)
                    │                 └── StageCodeSnippet (pipeline/)
```

## Composants par répertoire

### `components/shared/` — Composants réutilisables

| Composant | Props | Description |
|-----------|-------|-------------|
| `ToastContainer` | — (via Context) | Affiche les notifications toast (info, warning, error) |
| `WsIndicator` | — (via Context) | Pastille verte/jaune indiquant l'état WebSocket |
| `HealthIndicator` | — (via Context) | Indicateur de santé système (API + DB) |
| `Skeleton` | `className?` | Placeholder de chargement animé |
| `DashboardSkeleton` | — | Placeholder complet pour le dashboard |
| `SectionTitle` | `children` | Titre de section standardisé |
| `Arrow` | — | Flèche descendante entre les étapes du pipeline |
| `Row` | `label, value, color?` | Ligne label/valeur dans le pipeline |
| `BinaryDisplay` | `value, color` | Affichage binaire 16 bits avec séparateur |
| `Term` | `id, children` | Tooltip avec définition du glossaire au survol/clic |
| `ErrorBoundary` | `children` | Capteur d'erreurs avec bouton "Réessayer" pour rétablir l'interface |

### `components/layout/` — Navigation

| Composant | Props | Description |
|-----------|-------|-------------|
| `NavBar` | `view, setView` | Barre de navigation responsive (desktop + hamburger mobile) |
| `DataModeToggle` | `mode, setMode` | Toggle Mock / API |
| `NavBtn` | `active, onClick, children` | Bouton de navigation stylisé |

### `components/atoms/` — Composants atomiques réutilisables

| Composant | Props | Description |
|-----------|-------|-------------|
| `Card` | `children, className?` | Conteneur de carte réutilisable avec styling |
| `StatusDot` | `status` | Indicateur de statut (couleur selon l'état) |

### `components/shared/` — Composants réutilisables (suite)

| Composant | Props | Description |
|-----------|-------|-------------|
| `ConnectionStatus` | — (via Context) | Panneau dépliant avec 5 cartes de statut services (API, DB, MQTT, WS, Publisher) |

### `components/dashboard/` — Vue Dashboard

| Composant | Props | Description |
|-----------|-------|-------------|
| `Dashboard` | — (via Context) | Orchestrateur — charge stats, devices, metrics, alertes |
| `StatsCards` | `stats, alertCount, flash` | 4 cartes statistiques avec animation (React.memo) |
| `DeviceSelector` | `devices, selectedDevice, onSelect` | Liste cliquable des capteurs avec stats (React.memo) |
| `MetricsChart` | `metrics, selectedName, onExportCSV, onExportPDF` | Graphique Recharts (température + humidité) (React.memo) |
| `AlertsPanel` | `alertes` | Liste des alertes actives (React.memo) |

### `components/pipeline/` — Vue Pipeline IoT

| Composant | Props | Description |
|-----------|-------|-------------|
| `Pipeline` | — | Orchestrateur — wraps PipelineProvider, auto-génère des données en mode live |
| `PipelineModeTabs` | — (via Context) | Sélecteur de mode : Live, Pas à pas, Inspecteur |
| `SystemDiagram` | — (via Context) | Diagramme horizontal des 8 étapes avec animation de packet |
| `DiagramNode` | `stage, active, onClick` | Noeud cliquable avec icône, label, pulse animation |
| `DataPacketAnimation` | `active` | Point animé traversant le diagramme |
| `StageDetailPanel` | — (via Context) | Panneau latéral : description, format, snippet de code |
| `StageDataView` | `message, stageIndex` | Données au stage sélectionné pour un message donné |
| `StageCodeSnippet` | `code, language` | Bloc pre/code avec coloration syntaxique |
| `MessageTimeline` | — (via Context) | Liste scrollable des 50 derniers messages |
| `MessageTimelineItem` | `message, selected, onClick` | Ligne individuelle d'un message |
| `DataTransformPanel` | — (via Context) | Vue côte-à-côte de la transformation à chaque étape |
| `StepByStepControls` | — (via Context) | Boutons Générer/Suivant/Reset avec barre de progression |
| `StepExplanation` | — (via Context) | Contenu pédagogique pour chaque étape |
| `ProtocolInspector` | — (via Context) | Conteneur avec sous-onglets MQTT/WebSocket/HTTP |
| `InspectorMqttTab` | — (via Context) | Messages MQTT avec payloads Chirpstack v4 complets |
| `InspectorWsTab` | — (via Context) | Frames WebSocket (new_mesure, ping/pong) |
| `InspectorHttpTab` | — (via Context) | Requêtes HTTP (GET /stats, /devices, etc.) |
| `InspectorMessage` | `message` | Ligne extensible : protocole, topic, timestamp, JSON |

### `components/converter/` — Vue Convertisseur

| Composant | Props | Description |
|-----------|-------|-------------|
| `Converter` | — | Orchestrateur — sliders température/humidité + pipeline |
| `EncodingPipeline` | `frame` | Pipeline 6 étapes (valeurs → binaire → hex → base64 → décodage) |
| `PipelineStep` | `num, title, color, comment, children` | Conteneur d'une étape du pipeline |
| `DecoderTool` | — | Décodeur Base64 inverse interactif |
| `BitManipulator` | — | Grille 16 bits interactive : toggle bits, affiche décimal/hex/valeur physique |
| `CorruptionDemo` | — | Flip aléatoire de bit, comparaison valide vs corrompu |
| `ProtocolOverhead` | — | Visualisation en barres de l'overhead : 4 octets → 130 octets TCP/IP |
| `NegativeTemperatureDemo` | — | Slider -40 à +85°C avec visualisation complément à 2 |

## Source de données

| Module | Rôle |
|--------|------|
| `lib/types.ts` | Types partagés — re-exporte `Stats`, `Mesure`, `DeviceStats`, `Alerte`, `View` |
| `lib/device-registry.ts` | Source unique des IDs et noms de capteurs (élimine la duplication) |
| `lib/data-provider.tsx` | React Context — abstrait Mock vs API, gère WebSocket et reconnexion |
| `lib/constants.ts` | Constantes UI — intervalles polling, couleurs, hauteur graphique |
| `lib/pipeline-context.tsx` | React Context Pipeline — gère modes (live/step-by-step/inspector), messages, étape active |
| `lib/pipeline-stages.ts` | 8 définitions d'étapes du pipeline avec description, code, couleur |
| `lib/glossary.ts` | 15 entrées de glossaire IoT/LoRaWAN avec définitions et termes reliés |

## Hooks réutilisables

| Hook | Description |
|------|-------------|
| `usePolling` | Gère les polls périodiques (stats, devices, etc.) |
| `useToasts` | Accès au système de notifications toast |
| `useLocalStorage` | Persistance locale avec synchronisation état |
| `useWebSocket` | Gère la connexion WebSocket et les reconnexions automatiques |
| `useDataLoading` | Gère l'état de chargement des données avec states pending/error/success |

## Optimisation React 19

### Dashboard.tsx

Utilise `queueMicrotask` pour l'effet flash afin de respecter les contraintes d'impureté des fonctions de rendu React 19 — évite les setState dans le render principal.

### pipeline-context.tsx

Utilise `queueMicrotask` pour les mises à jour d'état différées (deferred setState) dans le contexte Pipeline, assurant la stabilité du rendu et l'absence de warnings React 19.
