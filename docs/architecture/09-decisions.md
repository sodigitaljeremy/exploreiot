# Section 9 — Décisions d'architecture

Ce chapitre documente les décisions d'architecture significatives prises au cours du projet ExploreIOT, sous forme d'Architecture Decision Records (ADR). Chaque ADR décrit le contexte, la décision retenue et ses conséquences.

---

## ADR-001 : Comparaison timing-safe pour l'authentification

| Attribut | Valeur |
|----------|--------|
| Statut | Accepté |
| Date | 2026-04-11 |
| Référence | `backend/app/security.py:13-21` |

### Contexte

L'authentification de l'API repose sur la comparaison d'une clé API fournie par le client avec un secret stocké dans la configuration serveur. En Python, l'opérateur `==` effectue une comparaison lexicographique qui court-circuite dès la première différence de caractère. Ce comportement est mesurable : un attaquant qui envoie suffisamment de requêtes peut déduire, par analyse des temps de réponse, combien de caractères sont corrects au début de la clé. Cette technique est connue sous le nom de timing attack (ou attaque temporelle).

Dans un contexte réseau, la variabilité de la latence rend l'attaque plus difficile mais pas impossible, en particulier sur un réseau local ou interne.

### Décision

Utiliser `hmac.compare_digest()` (module standard Python) pour toutes les comparaisons de secrets dans le code d'authentification.

```python
import hmac

def verify_api_key(provided_key: str, expected_key: str) -> bool:
    return hmac.compare_digest(
        provided_key.encode("utf-8"),
        expected_key.encode("utf-8"),
    )
```

`hmac.compare_digest()` garantit un temps de comparaison constant quelle que soit la position de la première différence entre les deux chaînes.

### Conséquences

**Positives :**
- Protection contre les timing attacks sur la comparaison de clés API.
- Signal de maturité sécurité visible lors des revues de code.
- Aucune dépendance externe : `hmac` est un module de la bibliothèque standard Python.

**Négatives :**
- Le code est légèrement plus verbeux qu'un simple `==`.
- `hmac.compare_digest()` requiert que les deux arguments soient de même type (`str` ou `bytes`) — une erreur de type lève une `TypeError` au lieu d'un `False` silencieux, ce qui nécessite une attention lors de la gestion des entrées.

---

## ADR-002 : psycopg2 brut au lieu de SQLAlchemy ORM

| Attribut | Valeur |
|----------|--------|
| Statut | Accepté |
| Date | 2026-04-11 |
| Référence | `backend/app/database.py` |

### Contexte

Le projet ExploreIOT persiste des mesures IoT dans PostgreSQL. Le modèle de données est volontairement minimal : une seule table `measurements` avec une poignée de colonnes (identifiant du capteur, température, humidité, horodatage). Les opérations effectuées se limitent à des insertions et des lectures simples avec filtrages et tri.

L'utilisation d'un ORM complet comme SQLAlchemy implique :
- Une courbe d'apprentissage et une configuration non négligeable (session, engine, Base, modèles déclaratifs).
- Une abstraction supplémentaire entre le développeur et le SQL généré, qui peut produire des requêtes sous-optimales difficiles à déboguer.
- Des dépendances supplémentaires.

### Décision

Utiliser `psycopg2` directement avec un `SimpleConnectionPool` et des requêtes SQL écrites à la main. Les migrations de schéma sont gérées par Alembic, qui fonctionne parfaitement avec du SQL brut via `op.execute()`.

```python
# Insertion directe avec psycopg2
with get_conn() as conn:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO measurements (device_eui, temperature, humidity, received_at)
            VALUES (%s, %s, %s, NOW())
            """,
            (device_eui, temperature, humidity),
        )
```

### Conséquences

**Positives :**
- Contrôle total sur chaque requête SQL : pas de requête N+1, pas de JOIN inattendu.
- Pas d'abstraction inutile pour un modèle de données aussi simple.
- Le SQL généré est lisible et auditable directement.
- Alembic gère les migrations sans nécessiter SQLAlchemy ORM : les migrations utilisent `op.execute()` pour du SQL brut ou `op.create_table()` pour les helpers Alembic.

**Négatives :**
- Pas de génération automatique de modèles : toute modification du schéma nécessite une migration Alembic manuelle ET une mise à jour des requêtes.
- Pas de validation automatique des types au niveau ORM — la validation est assurée par la logique applicative.
- Si le modèle de données venait à croître significativement (plusieurs tables avec relations complexes), cette décision devrait être réévaluée.

---

## ADR-003 : Validation des plages physiques du capteur Dragino LHT65

| Attribut | Valeur |
|----------|--------|
| Statut | Accepté |
| Date | 2026-04-11 |
| Référence | `backend/app/mqtt_handler.py:33-41` |

### Contexte

Les données reçues via MQTT proviennent d'un décodage de payload binaire (base64 → bytes → `struct.unpack`). Ce pipeline de décodage peut produire des valeurs numériquement valides mais physiquement impossibles dans plusieurs situations :
- Corruption du payload pendant la transmission LoRaWAN.
- Erreur de décodage (mauvais format, décalage d'octets).
- Capteur défaillant ou hors tension transmettant des valeurs de registre par défaut (ex : `0xFFFF` → 655.35 °C après conversion).

Sans validation, ces valeurs aberrantes seraient insérées en base de données et affichées sur le dashboard, dégradant la confiance dans les données.

### Décision

Valider chaque mesure décodée contre les spécifications constructeur du capteur Dragino LHT65 avant toute insertion en base. Les valeurs hors plage sont loggées au niveau `WARNING` puis silencieusement ignorées.

```python
TEMP_MIN, TEMP_MAX = -40.0, 85.0
HUMIDITY_MIN, HUMIDITY_MAX = 0.0, 100.0

def validate_measurement(temperature: float, humidity: float) -> bool:
    if not (TEMP_MIN <= temperature <= TEMP_MAX):
        logger.warning(
            f"Température hors plage constructeur: {temperature}°C "
            f"(plage valide: {TEMP_MIN}–{TEMP_MAX}°C) — ignorée"
        )
        return False
    if not (HUMIDITY_MIN <= humidity <= HUMIDITY_MAX):
        logger.warning(
            f"Humidité hors plage constructeur: {humidity}% "
            f"(plage valide: {HUMIDITY_MIN}–{HUMIDITY_MAX}%) — ignorée"
        )
        return False
    return True
```

### Conséquences

**Positives :**
- Les données stockées en base sont cohérentes avec la réalité physique du capteur.
- Les valeurs aberrantes liées à des erreurs de décodage sont filtrées automatiquement.
- Les warnings de log permettent de détecter des problèmes récurrents de transmission ou de décodage.

**Négatives :**
- Si le projet venait à supporter d'autres modèles de capteurs avec des plages différentes, les constantes de validation devront être paramétrisées par type de capteur.
- Faux négatifs possibles dans des conditions environnementales extrêmes légitimes (environnements industriels froids ou chauds proches des limites). Ce risque est considéré comme négligeable pour le cas d'usage actuel.
- Une mesure ignorée n'est pas retransmise ni stockée pour audit ultérieur — elle est définitivement perdue.

---

## ADR-004 : Docker Compose profiles pour séparer simulation et production

| Attribut | Valeur |
|----------|--------|
| Statut | Accepté |
| Date | 2026-04-11 |
| Référence | `docker-compose.yml` |

### Contexte

Le projet ExploreIOT doit supporter deux environnements très différents :
1. **Simulation** : un worker Python (`publisher.py`) génère des données fictives et les publie sur MQTT. C'est le mode idéal pour le développement et les tests sans matériel.
2. **Production** : Chirpstack v4 est déployé en tant que service réel, recevant les données d'une gateway LoRaWAN physique ou d'une simulation de gateway (gateway bridge).

Initialement, tous les services étaient lancés ensemble. Cela pose un problème : en mode simulation, les conteneurs Chirpstack et gateway bridge consomment des ressources inutilement et peuvent causer des confusions (dois-je utiliser Chirpstack ou publisher.py ?).

### Décision

Utiliser les **Docker Compose profiles** pour isoler les deux modes :
- Le profil par défaut (pas d'argument) lance uniquement les services de base : PostgreSQL, Mosquitto, FastAPI, Subscriber, Publisher, Frontend. Publisher.py remplace Chirpstack.
- Le profil `chirpstack` (activé avec `docker compose --profile chirpstack up`) ajoute Chirpstack v4, Gateway Bridge, et Redis. Publisher.py est ignoré.

Configuration dans `docker-compose.yml` :
```yaml
services:
  publisher:
    profiles: ["simulation"]  # Inclus par défaut uniquement

  chirpstack:
    profiles: ["chirpstack"]  # Inclus seulement avec --profile chirpstack

  chirpstack-gateway-bridge:
    profiles: ["chirpstack"]  # Inclus seulement avec --profile chirpstack

  redis:
    profiles: ["chirpstack"]  # Inclus seulement avec --profile chirpstack
```

### Conséquences

**Positives :**
- Séparation claire et explicite des deux modes de fonctionnement.
- Zéro confusion : un seul producteur de données à la fois (publisher.py OU Chirpstack v4, jamais les deux).
- Économie de ressources en mode simulation (pas de conteneurs inutiles).
- Facile de basculer entre les deux : une seule ligne de commande change (`docker compose up` vs `docker compose --profile chirpstack up`).
- Éducatif : les développeurs voient clairement les différences d'infrastructure entre les deux modes.

**Négatives :**
- Nécessite une documentation claire pour que les utilisateurs comprennent les deux modes et comment les activiser.
- Si à l'avenir on souhaite lancer une variante "simulation + Chirpstack côte à côte" (par exemple pour comparer), il faudrait revoir cette architecture.
- Les variables d'environnement ne sont pas isolées par profil — il faut faire attention à ne pas accéder à des services du profil Chirpstack en mode simulation.

