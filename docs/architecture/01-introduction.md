# Arc42 — Section 1 : Introduction et objectifs

## 1.1 Apercu des exigences

ExploreIOT Dashboard est une plateforme de supervision IoT temps réel, conçue pour collecter, traiter et visualiser les mesures de capteurs LoRaWAN (température, humidité). Le système couvre l'intégralité du pipeline de donnée, depuis la simulation de l'émission d'une trame binaire LoRaWAN jusqu'à l'affichage en temps réel dans un navigateur web.

### Objectifs du projet

| Objectif | Description |
|----------|-------------|
| Monitoring IoT temps réel | Recevoir et afficher les mesures des capteurs avec une latence inférieure à 1 seconde via WebSocket |
| Pipeline encodage/décodage | Simuler le format binaire LoRaWAN réel (struct.pack 4 octets) et le décoder côté subscriber |
| Alertes automatiques | Détecter les anomalies (température > seuil, capteur silencieux depuis N minutes) et les exposer via l'API |
| Export de données | Permettre l'export des mesures historiques en CSV et en PDF depuis le dashboard |
| Sécurité by design | Authentification par clé API, rate limiting (slowapi), comparaison timing-safe (hmac.compare_digest) |
| Observabilité | Logging structuré JSON sur toutes les couches, health check Docker intégré |
| Pipeline interactif | Visualiser le parcours d'une mesure à travers les 8 étapes du système avec animation et 3 modes (live, pas à pas, inspecteur) |
| Outils pédagogiques | Manipulateur de bits, corruption de données, overhead protocolaire, complément à 2 — outils interactifs pour comprendre l'encodage |
| Inspecteur de protocoles | Afficher les trames brutes MQTT, WebSocket et HTTP pour comprendre les échanges entre composants |
| Glossaire interactif | 15 termes techniques avec tooltips contextuels intégrés dans toute l'interface |
| Lancement one-click | Script demo.sh pour démarrer l'infrastructure complète en une commande |

---

## 1.2 Parties prenantes

| Partie prenante | Rôle | Attentes principales |
|-----------------|------|----------------------|
| Développeur (auteur) | Concepteur, développeur, testeur | Acquérir les compétences fullstack IoT, livrer un projet démontrable |
| CTO évaluateur | Evaluateur technique | Architecture claire, code propre, documentation exhaustive, décisions justifiées |
| Technicien IoT (utilisateur final) | Opérateur du dashboard | Interface intuitive, alertes fiables, données exportables, temps de réponse rapide |

---

## 1.3 Exigences de qualité

### Arbre de qualité (Quality Tree)

| Attribut | Critère mesurable | Priorité |
|----------|-------------------|----------|
| **Performance / Temps réel** | Latence WebSocket < 1 seconde entre l'insertion en base et l'affichage dans le navigateur | Haute |
| **Securite** | Toutes les routes API protégées par clé API ; comparaison timing-safe pour prévenir les attaques de timing ; rate limiting sur les endpoints publics | Haute |
| **Maintenabilite** | Séparation claire des responsabilités (un fichier = une responsabilité SOLID) ; couverture de tests sur les composants critiques (décodage, sécurité, alertes) | Haute |
| **Observabilite** | Chaque événement métier (mesure reçue, alerte déclenchée, erreur base de données) est loggué en JSON structuré avec timestamp, niveau, et contexte | Moyenne |
| **Portabilite** | L'ensemble du système démarre avec une seule commande (`docker compose up --build`) sur Linux, macOS et Windows (WSL2) | Moyenne |
| **Disponibilite** | Health check Docker sur FastAPI et PostgreSQL ; redémarrage automatique des services en cas de crash (`restart: unless-stopped`) | Moyenne |
| **Extensibilite** | Ajout d'un nouveau type de capteur ou d'un nouvel endpoint REST sans modification du code existant (Open/Closed Principle) | Basse |

### Détail des exigences de qualité critiques

**Temps réel (< 1 s de latence WebSocket)**

Le pipeline complet — de la publication MQTT à l'affichage dans le navigateur — doit s'exécuter en moins d'une seconde en conditions normales. Cela implique :
- Un subscriber Python léger (pas d'ORM, psycopg2 brut)
- Un broadcast WebSocket asynchrone immédiat après l'INSERT en base
- Un client Next.js qui met à jour le graphique Recharts sans rechargement de page

**Securite (conforme OWASP Top 10)**

Les risques OWASP adressés dans ce projet :

- A01 (Broken Access Control) : toutes les routes sensibles exigent une clé API dans le header `X-API-Key`
- A02 (Cryptographic Failures) : `hmac.compare_digest` pour prévenir les attaques timing sur la comparaison de clé
- A04 (Insecure Design) : rate limiting dès la conception (slowapi, 60 requêtes/minute/IP)
- A09 (Security Logging) : chaque tentative d'accès refusée est loggée avec l'IP source

**Maintenabilite (SOLID, tests)**

- **Single Responsibility** : chaque module Python a une responsabilité unique (ex. `security.py` ne fait que la vérification de clé, `database.py` ne fait que la gestion des connexions)
- **Open/Closed** : les routes FastAPI sont organisées en fichiers séparés par domaine (devices, alerts, stats, websocket) pour faciliter l'extension sans modification
- Tests unitaires sur les fonctions de décodage LoRaWAN, de validation des mesures, et de la logique d'alerte

**Observabilite (logging structuré)**

Chaque couche produit des logs JSON avec les champs suivants :

```json
{
  "timestamp": "2026-04-11T10:23:45.123Z",
  "level": "INFO",
  "service": "subscriber",
  "event": "mesure_inseree",
  "device_id": "dragino-001",
  "temperature": 23.4,
  "humidite": 61.2
}
```

Aucun emoji dans les logs (convention projet).
