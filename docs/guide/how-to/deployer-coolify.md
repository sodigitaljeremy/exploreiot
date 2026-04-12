# Déployer sur un VPS avec Coolify

Ce guide explique comment déployer ExploreIOT en production sur un VPS avec [Coolify](https://coolify.io), un PaaS open-source auto-hébergé qui gère le reverse proxy (Traefik), les certificats SSL (Let's Encrypt) et le déploiement Docker.

!!! tip "Voir aussi"
    Pour un déploiement local, voir [Déployer avec Docker](deployer-docker.md).

## Prérequis

- Un compte GitHub avec le repo ExploreIOT
- Une carte bancaire pour le VPS (~5€/mois)
- Un nom de domaine (optionnel mais recommandé pour HTTPS)

---

## Étape 1 — Louer un VPS

### Fournisseur recommandé : Hetzner

| Plan | CPU | RAM | SSD | Prix | Datacenter |
|------|-----|-----|-----|------|------------|
| **CX22** (recommandé) | 2 vCPU | 4 GB | 40 GB | ~4,50€/mois | Allemagne (UE/RGPD) |
| CX32 | 4 vCPU | 8 GB | 80 GB | ~8€/mois | Allemagne (UE/RGPD) |

Alternatives : OVH (~6€/mois), DigitalOcean (~6$/mois).

### Configuration initiale

1. Créer un compte sur [hetzner.com/cloud](https://www.hetzner.com/cloud/)
2. Créer un serveur :
   - **Image** : Ubuntu 24.04 LTS
   - **Type** : CX22 (Shared vCPU, 4 GB RAM)
   - **Localisation** : Falkenstein ou Nuremberg (Allemagne)
   - **SSH Key** : Ajouter votre clé publique SSH

3. Noter l'adresse IP du serveur (ex: `65.109.xxx.xxx`)

4. Se connecter en SSH :
```bash
ssh root@65.109.xxx.xxx
```

---

## Étape 2 — Installer Coolify

Sur le VPS, exécuter la commande d'installation :

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Cette commande installe automatiquement :

- Docker Engine (v24+)
- Traefik (reverse proxy)
- Coolify (interface de gestion)

!!! warning "Compte admin"
    Accédez immédiatement à `http://<IP_VPS>:8000` après l'installation.
    La **première personne** à se connecter devient administrateur.
    Créez votre compte sans attendre.

---

## Étape 3 — Configurer un nom de domaine

### Acheter un domaine

Fournisseurs recommandés :

- [Namecheap](https://www.namecheap.com) — domaines `.dev` à ~12€/an
- [OVH](https://www.ovh.com/fr/domaines/) — domaines `.fr` à ~7€/an
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) — prix coûtant

### Configurer les DNS

Dans le panneau de gestion DNS de votre registrar, ajoutez ces enregistrements **A** pointant vers l'IP de votre VPS :

```
Type    Nom        Valeur           TTL
─────────────────────────────────────────
A       @          65.109.xxx.xxx   3600
A       api        65.109.xxx.xxx   3600
A       docs       65.109.xxx.xxx   3600
A       pgadmin    65.109.xxx.xxx   3600
```

!!! info "Sans nom de domaine"
    Vous pouvez utiliser directement l'IP du VPS, mais :

    - Pas de HTTPS (les navigateurs afficheront un avertissement)
    - Pas de WebSocket sécurisé (`wss://`)
    - Moins professionnel pour une démo

---

## Étape 4 — Déployer avec Coolify

### 4.1 Connecter GitHub

1. Dans Coolify : **Sources** → **Add** → **GitHub App**
2. Suivre l'assistant pour autoriser Coolify à accéder au repo

### 4.2 Créer le projet

1. **Projects** → **New Project** → Nommer "ExploreIOT"
2. Dans le projet : **New** → **Resource** → **Docker Compose**
3. Source : **GitHub** → Sélectionner `sodigitaljeremy/exploreiot`
4. Fichier Compose : `docker-compose.yml`

### 4.3 Variables d'environnement

Dans l'onglet **Environment Variables** de Coolify, configurer :

```bash
# ─── Mode production ──────────────────────────────────
ENVIRONMENT=production

# ─── Sécurité (générer des secrets forts) ─────────────
# Exécuter sur votre machine : openssl rand -hex 32
API_KEY=votre_cle_api_generee
NEXT_PUBLIC_API_KEY=votre_cle_api_generee

# Exécuter : openssl rand -hex 16
DB_PASSWORD=votre_mot_de_passe_db
MQTT_PASSWORD=votre_mot_de_passe_mqtt

# ─── URLs (adapter à votre domaine) ──────────────────
NEXT_PUBLIC_API_URL=https://api.votre-domaine.fr
NEXT_PUBLIC_WS_URL=wss://api.votre-domaine.fr/ws
CORS_ORIGIN=https://votre-domaine.fr

# ─── pgAdmin ───────────────────────────────────────��─
PGADMIN_EMAIL=votre@email.com
PGADMIN_PASSWORD=votre_mot_de_passe_pgadmin
```

!!! danger "Secrets"
    Ne réutilisez jamais les mots de passe par défaut en production.
    Le mode `ENVIRONMENT=production` refusera de démarrer si les mots de passe
    sont ceux par défaut (`change_me_in_production`, `exploreiot_mqtt`).

### 4.4 Assigner les domaines

Pour chaque service exposé, configurer le domaine dans Coolify :

| Service | Domaine | Port interne |
|---------|---------|--------------|
| `web` | `https://votre-domaine.fr` | 3000 |
| `api` | `https://api.votre-domaine.fr` | 8000 |
| `docs` | `https://docs.votre-domaine.fr` | 8000 (MkDocs) |
| `pgadmin` | `https://pgadmin.votre-domaine.fr` | 80 |

Coolify configure automatiquement :

- **Traefik** comme reverse proxy (routing par sous-domaine)
- **Let's Encrypt** pour les certificats SSL (renouvellement automatique)

### 4.5 Déployer

Cliquer **Deploy**. Coolify :

1. Clone le repo depuis GitHub
2. Build les images Docker (backend, frontend, mosquitto)
3. Démarre tous les services dans l'ordre des dépendances
4. Configure le reverse proxy Traefik
5. Obtient les certificats SSL

---

## Étape 5 — Lancer les données de démo

Le publisher (simulateur de capteurs) est dans le profil `demo`. Pour l'activer :

**Option A** — Via Coolify : ajouter `COMPOSE_PROFILES=demo` dans les variables d'environnement.

**Option B** — Via SSH sur le VPS :
```bash
cd /data/coolify/applications/<app-uuid>
docker compose --profile demo up -d publisher
```

Vérifier que les données arrivent :
```bash
curl -H "X-API-Key: votre_cle_api" https://api.votre-domaine.fr/api/devices
```

---

## Étape 6 — Consulter la base avec pgAdmin

### Connexion

1. Accéder à `https://pgadmin.votre-domaine.fr` (ou `http://localhost:5050` en local)
2. Se connecter avec les identifiants configurés (PGADMIN_EMAIL / PGADMIN_PASSWORD)

### Naviguer dans les données

Le serveur PostgreSQL est **pré-configuré** (via `servers.json`). Il suffit de :

1. **Servers** → **ExploreIOT** (entrer le mot de passe DB au premier accès)
2. **Databases** → **exploreiot** → **Schemas** → **public** → **Tables**
3. Clic droit sur `mesures` → **View/Edit Data** → **All Rows**

### Requêtes utiles

Ouvrir l'outil **Query Tool** (icône éclair) et exécuter :

```sql
-- Dernières 20 mesures
SELECT * FROM mesures ORDER BY recu_le DESC LIMIT 20;

-- Moyenne par capteur (dernière heure)
SELECT device_id,
       ROUND(AVG(temperature), 2) AS temp_moy,
       ROUND(AVG(humidite), 2) AS hum_moy,
       COUNT(*) AS nb_mesures
FROM mesures
WHERE recu_le > NOW() - INTERVAL '1 hour'
GROUP BY device_id;

-- Nombre total de mesures
SELECT COUNT(*) FROM mesures;

-- Mesures en alerte (température > seuil)
SELECT * FROM mesures
WHERE temperature > 33
ORDER BY recu_le DESC;
```

---

## Étape 7 — Maintenance

### Sauvegardes automatiques

Configurer un cron sur le VPS pour sauvegarder PostgreSQL :

```bash
# Éditer le crontab
crontab -e

# Ajouter (sauvegarde quotidienne à 2h du matin)
0 2 * * * docker exec exploreiot-postgres-1 pg_dump -U exploreiot exploreiot | gzip > /backups/exploreiot-$(date +\%Y\%m\%d).sql.gz
```

### Mises à jour

Dans Coolify, cliquer **Redeploy** pour mettre à jour depuis GitHub.
Coolify rebuild les images et redéploie automatiquement.

### Monitoring

- **Coolify Dashboard** : monitoring CPU, RAM, disque en temps réel
- **API Health** : `https://api.votre-domaine.fr/health`
- **pgAdmin** : état des connexions et requêtes en cours

---

## Récapitulatif des URLs

| Service | URL locale | URL production |
|---------|-----------|----------------|
| Dashboard | http://localhost:3000 | https://votre-domaine.fr |
| API Swagger | http://localhost:8000/docs | https://api.votre-domaine.fr/docs |
| Documentation | http://localhost:8081 | https://docs.votre-domaine.fr |
| pgAdmin | http://localhost:5050 | https://pgadmin.votre-domaine.fr |
| Coolify | — | http://IP_VPS:8000 |
