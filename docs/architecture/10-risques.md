# Section 10 — Risques et dette technique

## 10.1 Registre des risques

Le tableau suivant liste les risques identifiés sur le projet ExploreIOT, évalués selon leur impact potentiel et leur probabilité d'occurrence dans un contexte de mise en production.

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Pas de broker MQTT sécurisé (TLS) | Moyen | Elevée en prod | Configurer TLS sur Mosquitto avec certificats — voir `docker/mosquitto/mosquitto.conf` |
| Single point of failure PostgreSQL | Elevé | Moyenne | Mettre en place une réplication streaming ou des backups automatisés réguliers (pg_dump + stockage externe) |
| Pas de pagination sur `/devices` | Faible | Faible (peu de capteurs) | Ajouter des paramètres `offset` / `limit` sur l'endpoint si le nombre de capteurs dépasse quelques dizaines |
| API_KEY en clair dans les variables d'environnement | Moyen | Moyenne | Utiliser un gestionnaire de secrets (HashiCorp Vault, AWS Secrets Manager, Docker Secrets) en production |
| Pas de tests d'intégration avec base de données réelle | Moyen | Moyenne | Introduire `testcontainers-python` pour lancer un PostgreSQL éphémère dans les tests CI |
| Frontend sans tests automatisés | Moyen | Moyenne | Ajouter Jest et Testing Library pour les composants React critiques (graphiques, tableau de mesures) |

### Lecture du tableau

- **Impact Elevé** : risque pouvant entraîner une perte de données, une indisponibilité prolongée ou une compromission de sécurité.
- **Impact Moyen** : risque affectant la qualité des données, la confiance des utilisateurs ou la maintenabilité.
- **Impact Faible** : risque de dégradation mineure, sans conséquence sur la disponibilité ni la sécurité.
- **Probabilité Elevée** : risque quasi-certain si le projet est déployé tel quel en production sans modification.
- **Probabilité Moyenne** : risque conditionnel à la croissance du projet ou à certaines conditions d'exploitation.
- **Probabilité Faible** : risque improbable dans le contexte actuel (nombre de capteurs limité, usage interne).

---

## 10.2 Analyse détaillée des risques critiques

### Absence de TLS sur le broker MQTT

Le broker Mosquitto est configuré sans chiffrement TLS. Dans un déploiement local ou sur un réseau privé isolé, ce risque est acceptable. En production sur un réseau public ou partiellement public, les payloads MQTT (données capteurs) et les credentials circulent en clair sur le réseau. Un attaquant disposant d'un accès réseau peut :

- Intercepter les données capteurs (confidentialité).
- Injecter des messages falsifiés sur les topics MQTT (intégrité).

**Mitigation recommandée :** Activer le listener TLS dans `mosquitto.conf`, générer des certificats via Let's Encrypt ou une PKI interne, et mettre à jour les variables `MQTT_TLS_*` côté clients Paho.

### Single point of failure PostgreSQL

L'architecture actuelle dispose d'une instance PostgreSQL unique sans réplication ni failover automatique. Une défaillance matérielle ou une corruption de volume entraîne une perte de toutes les mesures historiques.

**Mitigation recommandée :** Mettre en place des exports `pg_dump` planifiés (cron ou service dédié) vers un stockage externe (S3, NFS). Pour une haute disponibilité, évaluer PostgreSQL Streaming Replication ou un service managé (RDS, Cloud SQL).

### API_KEY dans les variables d'environnement

La clé API est transmise via les variables d'environnement Docker Compose, qui sont visibles en clair dans `docker inspect` et les logs de certains orchestrateurs.

**Mitigation recommandée :** Utiliser Docker Secrets en mode Swarm ou un vault externe pour injecter la clé API au démarrage sans l'exposer dans les variables d'environnement du conteneur.

---

## 10.3 Dette technique

Cette section documente les compromis techniques intentionnels réalisés pour respecter les contraintes du projet (périmètre, délai, complexité cible). Ces éléments ne sont pas des bugs mais des décisions conscientes qui devront être traitées avant toute mise en production à grande échelle.

### Absence de tests d'intégration

Les tests actuels couvrent la logique métier unitaire (décodage de payload, validation des plages). Il n'existe pas de tests d'intégration qui exercent l'ensemble de la chaîne (réception MQTT → décodage → validation → insertion PostgreSQL → lecture API). Cette lacune rend difficile la détection de régressions lors de modifications du schéma ou du format de payload.

**Effort estimé :** 2 à 3 jours pour introduire `testcontainers-python` et écrire une suite de tests d'intégration de base.

### Frontend sans tests

Les composants React (graphiques Recharts, tableau de mesures, connexion WebSocket) ne sont pas couverts par des tests automatisés. Une régression sur l'affichage des données ne sera détectée que manuellement.

**Effort estimé :** 1 à 2 jours pour configurer Jest + Testing Library et écrire les tests des composants critiques.

### Absence de pagination sur les endpoints de liste

L'endpoint `/measurements` supporte des paramètres de filtrage mais ne dispose pas de pagination complète avec curseur ou offset/limit explicites sur `/devices`. Avec un faible nombre de capteurs (cas d'usage actuel), ce n'est pas un problème. Au-delà de quelques centaines de capteurs, les performances de l'endpoint se dégraderont.

**Effort estimé :** Moins d'une demi-journée pour ajouter `offset` et `limit` avec valeurs par défaut.

### Monitoring et observabilité

Il n'existe pas de collecte de métriques applicatives (latence des endpoints, nombre de messages MQTT traités, taux d'erreur). Les logs Docker sont le seul outil d'observabilité disponible. Un déploiement en production bénéficierait de l'intégration d'un stack Prometheus + Grafana ou d'un service APM.

**Effort estimé :** 1 à 2 jours pour exposer des métriques Prometheus via `prometheus-fastapi-instrumentator` et configurer un dashboard Grafana.

### Pas de rotation de la clé API

La clé API est statique et ne peut être changée qu'en redémarrant les conteneurs avec une nouvelle valeur de `API_KEY`. Il n'existe pas de mécanisme de rotation sans interruption de service.

**Effort estimé :** Modéré — nécessite l'introduction d'une gestion de tokens (JWT ou clés multiples) et potentiellement d'une table de clés en base de données.
