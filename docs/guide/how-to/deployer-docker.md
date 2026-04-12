# Déployer avec Docker

Ce guide décrit comment déployer ExploreIOT en environnement de production avec Docker Compose.

## Prérequis production

Avant de déployer en production, assurez-vous de disposer des éléments suivants :

- Un serveur Linux avec Docker Engine 24+ et Docker Compose v2+
- Un nom de domaine (recommandé) ou une adresse IP fixe
- Des certificats TLS (via Let's Encrypt ou un certificat signé par une autorité reconnue)
- Un plan de sauvegarde pour la base de données PostgreSQL
- Des secrets gérés hors du dépôt Git (pas de mots de passe en clair dans le code)

## Configuration de l'environnement de production

Copiez le fichier d'exemple et adaptez chaque valeur :

```bash
cp .env.example .env
```

Ouvrez `.env` et modifiez les variables sensibles :

```dotenv
# Base de données — choisir un mot de passe fort
DB_PASSWORD=MonSuperMotDePasse2024!

# Clé API — générer une valeur aléatoire sécurisée
API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Origines CORS autorisées — restreindre à votre domaine
CORS_ORIGINS=https://mondomaine.com

# URL publiques exposées au frontend
NEXT_PUBLIC_API_URL=https://api.mondomaine.com
NEXT_PUBLIC_WS_URL=wss://api.mondomaine.com/ws

# MQTT TLS (optionnel) — activer le chiffrement
MQTT_TLS=true
MQTT_CA_CERTS=/etc/ssl/certs/ca.crt
```

Pour générer une clé API aléatoire sécurisée :

```bash
openssl rand -hex 32
```

## Build et lancement

Construisez les images et démarrez tous les services en arrière-plan :

```bash
docker compose up --build -d
```

Suivez les journaux au démarrage pour vous assurer que tout est opérationnel :

```bash
docker compose logs -f
```

Le service `api` exécute automatiquement les migrations Alembic via `entrypoint.sh` avant de démarrer. Vous devriez voir dans les logs :

```text
api  | Running database migrations...
api  | INFO  [alembic.runtime.migration] Running upgrade ...
api  | Migrations complete. Starting API server...
```

## Vérification de la santé des services

Une fois les services démarrés, vérifiez que l'API répond correctement :

```bash
curl -s http://localhost:8002/health | python3 -m json.tool
```

Réponse attendue :

```json
{
  "api": true,
  "database": true,
  "status": "ok",
  "timestamp": "2026-04-11T12:00:00.000000"
}
```

Si `database` est `false`, vérifiez que le service PostgreSQL est bien démarré :

```bash
docker compose ps postgres
docker compose logs postgres
```

## Logs et monitoring

Consulter les logs d'un service spécifique en temps réel :

```bash
# Logs de l'API FastAPI
docker compose logs -f api

# Logs du subscriber MQTT
docker compose logs -f subscriber

# Logs du publisher (simulateur de capteurs)
docker compose logs -f publisher

# Logs de PostgreSQL
docker compose logs -f postgres
```

Vérifier l'état de tous les services :

```bash
docker compose ps
```

## Mise à jour de l'application

Pour déployer une nouvelle version :

```bash
# Récupérer les dernières modifications
git pull

# Reconstruire et redémarrer les services modifiés
docker compose up --build -d

# Vérifier que les migrations ont bien tourné
docker compose logs api | grep -i migration
```

Les migrations Alembic sont automatiquement appliquées au redémarrage du service `api` via `entrypoint.sh`. Il n'est pas nécessaire de les lancer manuellement.

## Indexes de base de données

ExploreIOT utilise 3 indexes de performance définis dans `backend/alembic/versions/init.sql` pour optimiser les requêtes courantes :

```sql
-- Index sur le timestamp des mesures (requêtes de plage temporelle)
CREATE INDEX idx_mesures_timestamp ON mesures (timestamp DESC);

-- Index sur le device_id (requêtes par capteur)
CREATE INDEX idx_mesures_device_id ON mesures (device_id);

-- Index composite pour les alertes (requêtes filtrées par type et timestamp)
CREATE INDEX idx_alertes_type_timestamp ON alertes (type, created_at DESC);
```

Ces indexes sont créés automatiquement lors de la migration initiale. Aucune action manuelle n'est requise.

## Notes de sécurité

- Ne jamais committer le fichier `.env` dans le dépôt Git
- Utiliser un reverse proxy (Nginx, Traefik) devant les services pour gérer TLS
- Activer l'authentification MQTT (`MQTT_USER` / `MQTT_PASSWORD`) en production
- Restreindre l'accès au port PostgreSQL (5432) au réseau interne Docker uniquement
- Conserver les sauvegardes de base de données hors du serveur de production (stockage externalisé)
