# Journal d'apprentissage

Ce journal documente les apprentissages clés réalisés pendant le développement d'ExploreIOT. Chaque fiche est un **micro-learning** autonome : un problème concret, une solution implémentée, et les pièges à éviter.

## Pourquoi ce journal ?

- Consolider les apprentissages par l'écriture
- Créer une référence personnelle réutilisable
- Démontrer une démarche de progression continue

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

## Méthodologie

Chaque fiche suit le format **micro-learning** :

1. **Le problème** — Contexte concret rencontré dans le projet
2. **Ce que j'ai appris** — Concept technique avec explication
3. **Code concret** — Extrait réel du projet (pas de code théorique)
4. **Piège à éviter** — Erreur classique ou subtilité
5. **Ressources** — Documentation officielle et articles de référence
