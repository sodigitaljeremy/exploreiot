# Sauvegarder et restaurer la base de données

Ce guide explique comment sauvegarder et restaurer la base de données PostgreSQL d'ExploreIOT.

## Script automatisé (backup-db.sh)

Un script de sauvegarde est fourni dans `scripts/backup-db.sh`. Il sauvegarde la base avec une politique de rétention de 30 jours.

```bash
# Rendre le script exécutable
chmod +x scripts/backup-db.sh

# Lancer une sauvegarde manuelle
./scripts/backup-db.sh
```

Le script :

- Crée un dump PostgreSQL au format custom (compressé)
- Nomme le fichier avec la date courante
- Supprime automatiquement les sauvegardes de plus de 30 jours
- Log toutes les opérations dans `backups/backup.log`

## Sauvegarde manuelle

```bash
docker compose exec postgres pg_dump \
  -U exploreiot \
  -d exploreiot \
  --format=custom \
  --file=/tmp/backup_$(date +%Y%m%d_%H%M%S).dump
```

Copiez le fichier hors du conteneur :

```bash
docker compose cp postgres:/tmp/backup_*.dump ./backups/
```

## Restaurer une sauvegarde

```bash
# Copier le fichier dans le conteneur
docker compose cp ./backups/backup_20260411_120000.dump postgres:/tmp/

# Restaurer
docker compose exec postgres pg_restore \
  -U exploreiot \
  -d exploreiot \
  --clean \
  /tmp/backup_20260411_120000.dump
```

## Automatiser avec cron

Ajoutez une entrée crontab pour une sauvegarde quotidienne à 2h du matin :

```bash
crontab -e
```

```text
0 2 * * * cd /opt/exploreiot && ./scripts/backup-db.sh
```

!!! tip "Voir aussi"
    - [Schéma base de données](../reference/schema-db.md) — structure et index
    - [Déployer avec Docker](deployer-docker.md) — guide de déploiement complet
