# Docker multi-stage

## Le problème

Lors du premier deploiement d'ExploreIOT, l'image Docker du backend Python pesait **1.2 Go**. L'image incluait GCC, les headers Python, les outils de build pip, les caches de compilation — tout ce qui est necessaire pour installer les dependances, mais absolument inutile en production.

Temps de deploiement : 4 minutes (push + pull de 1.2 Go). Apres optimisation avec le build multi-stage : **180 Mo**, deploiement en 45 secondes.

Meme constat pour le frontend Next.js : une image naive avec `node_modules` complet pesait 900 Mo. Apres optimisation avec le mode `standalone` : **120 Mo**.

## Ce que j'ai appris

### Le principe du build multi-stage

Docker permet de definir plusieurs etapes (`FROM ... AS nom`) dans un seul `Dockerfile`. Chaque etape produit une image intermediaire. La derniere etape (l'image finale) peut **copier selectivement** des artefacts des etapes precedentes, sans embarquer les outils de build.

```text
Stage 1 : builder
  - Image complete avec outils de build
  - Installe les dependances, compile le code
  - Produit des artefacts (binaires, bundles, wheels)

Stage 2 : production
  - Image minimale (python:slim, node:alpine, distroless...)
  - COPY --from=builder les seuls artefacts necessaires
  - Ne contient PAS les outils de build
```

### Layer caching

Docker met en cache chaque instruction `RUN`/`COPY` sous forme de **layer**. Si les fichiers impliques n'ont pas change, Docker reutilise le cache — le layer n'est pas reexecute.

Regle cle : **copier les fichiers de dependances avant le code source**. Le code change souvent ; les dependances rarement. En copiant `requirements.txt` avant `COPY . .`, la couche `pip install` est mise en cache et reutilisee a chaque build si les dependances n'ont pas change.

### Utilisateur non-root

Par defaut, les processus dans un container Docker tournent en tant que `root`. Si un attaquant exploite une vulnerabilite de l'application, il obtient un acces root au container (et potentiellement a l'host). Creer un utilisateur dedie minimise la surface d'attaque.

## Code concret (extrait du projet)

### `backend/Dockerfile`

```dockerfile
# =============================================================
# STAGE 1 : builder — installe les dependances Python
# =============================================================
FROM python:3.12-slim AS builder

WORKDIR /build

# Copier UNIQUEMENT requirements.txt en premier
# Si requirements.txt n'a pas change -> pip install est en cache
COPY requirements.txt .

# --no-cache-dir : ne pas stocker le cache pip dans l'image
# --prefix=/install : installe dans un dossier isole, facile a copier
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# =============================================================
# STAGE 2 : production — image finale minimale
# =============================================================
FROM python:3.12-slim AS production

# Creer un utilisateur non-root
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

# Copier uniquement les packages installes depuis le builder
# On n'embarque pas pip, setuptools, wheel, headers C, etc.
COPY --from=builder /install /usr/local

# Copier le code source de l'application
COPY . .

# Changer le proprietaire des fichiers
RUN chown -R appuser:appuser /app

# Basculer vers l'utilisateur non-root
USER appuser

# Exposer le port de l'API
EXPOSE 8000

# CMD avec exec form (pas shell form) pour gerer SIGTERM correctement
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `Dockerfile` (frontend Next.js — a la racine)

```dockerfile
# =============================================================
# STAGE 1 : dependances
# =============================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copier les manifestes de dependances avant le code source
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile


# =============================================================
# STAGE 2 : builder Next.js
# =============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copier node_modules depuis le stage precedent
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next build en mode standalone : genere une application autonome
# sans avoir besoin de node_modules complet en production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# =============================================================
# STAGE 3 : production — image minimale
# =============================================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# En mode standalone, Next.js produit un serveur Node.js autonome
# et un dossier .next/static pour les assets statiques
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
```

### `.dockerignore` (essentiel)

```text
# Exclure ce qui ne doit pas etre copie dans l'image
node_modules/
.next/
__pycache__/
*.pyc
.env
.env.local
.git/
*.md
docs/
```

## Piège a eviter

### Oublier de copier les dependances runtime

Le builder installe les packages dans `/install`. Si on oublie le `COPY --from=builder /install /usr/local` dans le stage production, l'application demarre et plante immediatement avec `ModuleNotFoundError`.

Verifier que tous les packages necessaires a l'**execution** (pas seulement au build) sont bien copiés.

### Tourner en root

```dockerfile
# FAUX — processus root dans le container
CMD ["uvicorn", "main:app", ...]

# CORRECT — creer et utiliser un utilisateur dedie
RUN useradd --create-home appuser
USER appuser
CMD ["uvicorn", "main:app", ...]
```

### `COPY . .` trop tot dans le Dockerfile

```dockerfile
# FAUX — COPY . . avant pip install invalide le cache a chaque changement de code
COPY . .
RUN pip install -r requirements.txt   # <- recalcule meme si requirements.txt n'a pas change

# CORRECT — copier requirements.txt en premier
COPY requirements.txt .
RUN pip install -r requirements.txt   # <- en cache si requirements.txt inchange
COPY . .
```

### Ne pas utiliser `.dockerignore`

Sans `.dockerignore`, `COPY . .` copie `node_modules/` (centaines de Mo), `.git/`, les fichiers `.env` avec des secrets, et les fichiers de build intermediaires. Cela gonfle l'image et peut exposer des donnees sensibles.

## Ressources

- [Docker — Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker — Dockerfile best practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Next.js — Output: standalone](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Snyk — 10 Docker security best practices](https://snyk.io/blog/10-docker-image-security-best-practices/)

!!! tip "Pour aller plus loin"
    - [Architecture — Déploiement](../architecture/07-deploiement.md) : Vue déploiement Arc42 et infrastructure Docker
    - [How-to — Déployer avec Docker](../guide/how-to/deployer-docker.md) : Guide de déploiement complet
