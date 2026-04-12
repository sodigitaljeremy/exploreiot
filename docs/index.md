# ExploreIOT Dashboard

Bienvenue dans la documentation technique du **ExploreIOT Dashboard**, une plateforme de supervision IoT LoRaWAN temps réel.

## Qu'est-ce qu'ExploreIOT ?

ExploreIOT est un dashboard de monitoring conçu pour superviser des capteurs IoT connectés via le protocole LoRaWAN. Il offre :

- **Visualisation temps réel** des données de température et d'humidité
- **Pipeline complet** d'encodage/décodage binaire LoRaWAN
- **Alertes automatiques** pour les anomalies (température élevée, capteurs silencieux)
- **Export de données** en CSV et PDF
- **Architecture sécurisée** avec authentification API, rate limiting, et comparaison timing-safe
- **Pipeline IoT interactif** : visualisation animée des 8 étapes du parcours d'une mesure (3 modes : live, pas à pas, inspecteur)
- **Outils pédagogiques** : manipulateur de bits, corruption de données, overhead protocolaire, complément à 2
- **Inspecteur de protocoles** : trames MQTT/WebSocket/HTTP brutes avec payloads Chirpstack v4
- **Glossaire interactif** : 15 termes techniques avec tooltips contextuels
- **Lancement one-click** : script `demo.sh` pour démarrer l'infrastructure en une commande

!!! info "Mosquitto vs Chirpstack — quelle différence ?"
    Dans une vraie infrastructure LoRaWAN, la chaîne est :
    **Capteur → Gateway → Chirpstack → Mosquitto → Application**.

    - **Chirpstack** est le *serveur réseau LoRaWAN* : il déchiffre les trames radio, authentifie les capteurs, et publie les données décodées sur un broker MQTT.
    - **Mosquitto** est le *broker MQTT* : un simple bus de messages qui route les publications vers les abonnés.

    Dans ce projet, **Mosquitto est bien présent** comme broker. En revanche, **Chirpstack est simulé** par `publisher.py`, qui génère des messages au même format que Chirpstack le ferait. Cela permet de tester le pipeline complet sans matériel physique.

## Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Frontend | Next.js 16, React 19, Recharts | Dashboard temps réel |
| Backend | FastAPI, Python 3.12 | API REST + WebSocket |
| Base de données | PostgreSQL 15 | Stockage time-series |
| Broker MQTT | Mosquitto | Bus de messages IoT |
| Migrations | Alembic | Versioning du schéma DB |
| Glossaire | lib/glossary.ts | 15 définitions techniques IoT |
| Conteneurs | Docker Compose | Orchestration 6 services |
| CI/CD | GitHub Actions | Tests + Build automatisés |

## Navigation

- **[Architecture](architecture/01-introduction.md)** — Documentation Arc42 complète (11 sections)
- **[Guide utilisateur](guide/tutoriels/demarrage-rapide.md)** — Tutoriels, how-to, référence, explications (Diataxis)
- **[Mémos informatique](memos/index.md)** — Fiches de révision (systèmes de numération, encodage, réseaux, SQL)
- **[Journal d'apprentissage](journal/index.md)** — Micro-learning et retours d'expérience

## Démarrage rapide

```bash
git clone <repo-url>
cd exploreiot-dashboard-ui
docker compose up --build
```

- Dashboard : [http://localhost:3000](http://localhost:3000)
- API Swagger : [http://localhost:8000/docs](http://localhost:8000/docs)
