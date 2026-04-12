# Diagramme UML — Séquence : Chargement du Dashboard

Du chargement initial à la réception des données en temps réel, avec fallback automatique.

```mermaid
sequenceDiagram
    participant USER as Navigateur
    participant APP as App (shell)
    participant DP as DataProvider
    participant API as FastAPI
    participant WS as WebSocket
    participant MOCK as mock-store

    USER->>APP: Ouvre http://localhost:3000
    APP->>DP: useDataSource()

    alt Mode Mock (défaut)
        DP->>MOCK: getStats(), getDeviceStats()
        MOCK-->>DP: Données simulées
        DP-->>APP: stats, devices, metrics
        loop Toutes les 5s
            DP->>MOCK: addMesure() + refresh
            MOCK-->>DP: Nouvelle mesure
        end
    else Mode API
        DP->>API: fetchStats(), fetchDevices()
        API-->>DP: JSON responses

        DP->>WS: new WebSocket(ws://localhost:8000/ws)
        WS-->>DP: onopen → wsConnected = true

        alt WebSocket connecté
            loop Réception temps réel
                WS-->>DP: {type: "new_mesure", ...}
                DP-->>APP: setLatestMesure()
            end
        else WebSocket déconnecté (fallback)
            loop Polling toutes les 10s
                DP->>API: fetchStats(), fetchDevices()
                API-->>DP: JSON responses
            end
            DP->>WS: Reconnexion (backoff exponentiel 1s → 30s)
        end
    end

    alt API injoignable
        DP->>DP: addToast("warning", "API injoignable")
        DP->>DP: setMode("mock") — basculement automatique
    end
```

## Modes de fonctionnement

| Mode | Source | Intervalle | Latence |
|------|--------|-----------|---------|
| **Mock** | `mock-store.ts` (local) | 5s (polling simulé) | ~0 ms |
| **API + WebSocket** | FastAPI + WS push | Temps réel | < 500 ms |
| **API + Polling** | FastAPI REST | 10s (fallback) | ~100 ms |
| **Fallback auto** | Mock (après erreur API) | 5s | ~0 ms |
