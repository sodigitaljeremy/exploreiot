# Arc42 — Section 2 : Contraintes

Les contraintes sont des décisions imposées dès le début du projet, qui ne sont pas négociables et qui influencent toutes les décisions d'architecture ultérieures.

---

## 2.1 Contraintes techniques

| Contrainte | Valeur imposée | Justification |
|------------|----------------|---------------|
| Langage backend | Python 3.11+ | Ecosystème IoT riche, FastAPI exige 3.8+ ; 3.11 apporte les améliorations de performance `tomllib` et le meilleur traceback |
| Base de données | PostgreSQL 15 (pas de NoSQL) | Données structurées time-series ; requêtes analytiques (moyennes glissantes, percentiles) ; SQL standard ; pas de surcoût d'apprentissage d'un nouvel ORM |
| Protocole IoT | MQTT via Mosquitto | Standard de facto IoT/LoRaWAN ; léger (pub/sub) ; Chirpstack publie nativement en MQTT |
| Orchestration | Docker Compose obligatoire | Reproductibilité totale de l'environnement ; pas de dépendance à l'OS hôte ; démarrage one-command |
| ORM | Interdit — psycopg2 brut uniquement | Performance maximale (pas de couche d'abstraction) ; contrôle total du SQL généré ; compétence SQL explicitement exercée ; évite la "magie" de l'ORM qui masque les problèmes N+1 |
| Framework backend | FastAPI | Support natif async/await ; WebSocket intégré ; documentation OpenAPI automatique ; typage Pydantic |
| Framework frontend | Next.js (version projet) avec TypeScript | Rendu hybride (SSR/CSR) ; typage statique ; écosystème React mature |
| Bibliothèque graphiques | Recharts | Composants React natifs ; SVG ; compatible TypeScript ; pas de dépendance à D3 brut |

### Pourquoi psycopg2 brut et pas SQLAlchemy ?

C'est une contrainte volontaire et justifiée. SQLAlchemy (ou tout ORM) apporte une abstraction précieuse pour les applications CRUD classiques, mais introduit des inconvénients dans ce contexte :

1. **Performance** : chaque INSERT de mesure passe par le pipeline de mapping ORM. Avec psycopg2 brut, on contrôle exactement le SQL exécuté et son plan d'exécution.
2. **Contrôle** : les requêtes analytiques (moyennes, aggrégations, window functions) sont écrites une fois en SQL optimisé, sans risque que l'ORM génère un sous-ensemble inefficace.
3. **Apprentissage** : ce projet est aussi un exercice pédagogique. Ecrire du SQL brut consolide la compétence fondamentale que l'ORM tendrait à masquer.
4. **Simplicité** : pas de modèles de mapping, pas de sessions, pas de migrations ORM — juste des connexions et des curseurs.

### Pourquoi MQTT et pas HTTP polling ?

MQTT est le protocole standard des réseaux LoRaWAN. Chirpstack (le serveur réseau LoRaWAN de référence) publie les trames décodées nativement sur un broker MQTT. Utiliser HTTP polling pour recevoir des données depuis un gateway LoRaWAN irait à l'encontre de l'architecture réelle du terrain.

---

## 2.2 Contraintes organisationnelles

| Contrainte | Détail |
|------------|--------|
| Projet individuel | Un seul développeur : conception, développement, tests, documentation, déploiement |
| Délai court | Projet réalisé dans un cadre de formation avec une fenêtre de temps limitée |
| Licence open source | Code source public sur GitHub ; pas de dépendances propriétaires |
| Environnement cible | Poste de développement Linux/macOS/Windows (WSL2) avec Docker Desktop |
| Pas de cloud requis | Tout fonctionne en local ; pas de dépendance à AWS, GCP ou Azure |

---

## 2.3 Conventions de développement

Ces conventions s'appliquent à l'ensemble du projet et ne sont pas négociables.

### Conventions de code

| Convention | Règle |
|------------|-------|
| Langue du code | Anglais — noms de variables, fonctions, classes, commentaires inline |
| Langue de la documentation | Français — fichiers Markdown, messages d'interface utilisateur |
| Langue des logs | Anglais — messages de log applicatif (pour compatibilité avec les outils de centralisation) |
| Style Python | PEP 8 ; formatage Black ; lint Ruff |
| Style TypeScript | ESLint standard Next.js ; Prettier |
| Nommage des routes API | snake_case pour les paramètres, kebab-case pour les segments d'URL |

### Conventions de logging

- Format JSON structuré sur toutes les couches (Python et Node.js)
- Pas d'emoji dans les messages de log
- Niveau `DEBUG` désactivé en production
- Chaque log inclut au minimum : `timestamp`, `level`, `service`, `event`
- Les erreurs incluent le contexte suffisant pour diagnostiquer sans accès à la base de données

### Conventions Git

- Commits en anglais, format Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- Pas de commit direct sur `main` — branches de fonctionnalité
- Pull Request avec description des changements et des tests associés

### Conventions de sécurité

- Pas de secret en dur dans le code source
- Variables d'environnement via fichier `.env` (non versionné)
- `.env.example` versionné avec des valeurs fictives
- Jamais de `print()` pour déboguer en production — uniquement `logger.debug()`
