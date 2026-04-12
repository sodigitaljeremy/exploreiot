# Journal d'apprentissage

Ce journal documente les apprentissages clés réalisés pendant le développement d'ExploreIOT. Chaque fiche est un **micro-learning** autonome : un problème concret, une solution implémentée, et les pièges à éviter.

## Pourquoi ce journal ?

- Consolider les apprentissages par l'écriture
- Créer une référence personnelle réutilisable
- Démontrer une démarche de progression continue

## Parcours recommandé

Pour une progression logique, suivez cet ordre de lecture :

### Fondamentaux IoT

1. [Encodage LoRaWAN](lorawan-encoding.md) — Comment encoder des mesures capteur en binaire
1. [Patterns MQTT](mqtt-patterns.md) — Communication pub/sub entre les composants

### Sécurité

1. [Attaques timing](timing-attacks.md) — Protéger les secrets contre l'analyse temporelle

### Données

1. [Connection pooling](connection-pooling.md) — Gérer efficacement les connexions PostgreSQL
1. [Stratégie migrations](migrations-strategy.md) — Versionner le schéma de base de données

### Temps réel

1. [WebSocket reconnection](websocket-reconnection.md) — Maintenir la connexion dashboard-API

### Infrastructure & Architecture

1. [Docker multi-stage](docker-multistage.md) — Optimiser les images de production
1. [Principes SOLID](solid-principles.md) — Structurer le code backend proprement

### Intégration

1. [Intégration Chirpstack](chirpstack-integration.md) — Connecter un vrai serveur LoRaWAN

## Fiches

| Fiche | Domaine | Concept clé |
|-------|---------|-------------|
| [Encodage LoRaWAN](lorawan-encoding.md) | IoT | struct.pack, base64, big-endian |
| [Patterns MQTT](mqtt-patterns.md) | Messaging | Pub/sub, QoS, wildcards |
| [Attaques timing](timing-attacks.md) | Sécurité | hmac.compare_digest |
| [Connection pooling](connection-pooling.md) | Base de données | SimpleConnectionPool, context manager |
| [WebSocket reconnection](websocket-reconnection.md) | Temps réel | Backoff exponentiel, heartbeat |
| [Docker multi-stage](docker-multistage.md) | DevOps | Build optimisé, layer caching |
| [Principes SOLID](solid-principles.md) | Architecture | Single Responsibility, refactoring |
| [Stratégie migrations](migrations-strategy.md) | Base de données | Alembic, versioning schéma |
| [Intégration Chirpstack](chirpstack-integration.md) | Infrastructure | Docker profiles, gRPC, Chirpstack v4 |

## Liens avec le reste de la documentation

| Fiche journal | Memos associés | Explications / Référence |
|---------------|----------------|--------------------------|
| Encodage LoRaWAN | [03 - Encodage](../memos/03-encodage.md), [04 - Endianness](../memos/04-endianness.md) | [Encodage binaire](../guide/explications/encodage-binaire.md) |
| Patterns MQTT | [05 - Réseaux](../memos/05-reseaux-fondamentaux.md) | [Architecture MQTT](../guide/explications/mqtt-architecture.md), [Topics MQTT](../guide/reference/mqtt-topics.md) |
| Attaques timing | — | [Sécurité](../guide/explications/securite.md) |
| Connection pooling | [08 - SQL](../memos/08-sql-fondamentaux.md) | [Schéma DB](../guide/reference/schema-db.md) |
| WebSocket reconnection | [07 - WebSocket](../memos/07-protocole-websocket.md) | — |
| Docker multi-stage | — | [Déploiement Arc42](../architecture/07-deploiement.md) |
| Principes SOLID | — | [Blocs fonctionnels Arc42](../architecture/05-blocs.md) |
| Stratégie migrations | [08 - SQL](../memos/08-sql-fondamentaux.md) | [Schéma DB](../guide/reference/schema-db.md) |
| Intégration Chirpstack | — | [Pipeline LoRaWAN](../guide/explications/lorawan-pipeline.md), [Contexte Arc42](../architecture/03-contexte.md) |

## Méthodologie

Chaque fiche suit le format **micro-learning** :

1. **Le problème** — Contexte concret rencontré dans le projet
2. **Ce que j'ai appris** — Concept technique avec explication
3. **Code concret** — Extrait réel du projet (pas de code théorique)
4. **Piège à éviter** — Erreur classique ou subtilité
5. **Ressources** — Documentation officielle et articles de référence
