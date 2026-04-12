# Démarrage rapide

Ce tutoriel vous guide pour lancer ExploreIOT en 5 minutes.

## Prérequis

- Docker et Docker Compose installés
- Git
- Navigateur web moderne

## Étapes

### 1. Cloner le projet

```bash
git clone <repo-url>
cd exploreiot-dashboard-ui
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
# Modifier les mots de passe si nécessaire
```

### 3. Lancer la stack

```bash
docker compose up --build
```

Attendez que tous les services soient prêts (environ 30 secondes).

### Alternative : Lancement rapide avec demo.sh

Si vous préférez un démarrage plus rapide sans build Docker complet :

```bash
# 1. Installer les dépendances frontend
npm install

# 2. Lancer le backend (PostgreSQL + Mosquitto + API + Publisher)
./demo.sh

# 3. Dans un autre terminal, lancer le frontend
npm run dev
```

Le script `demo.sh` lance l'infrastructure Docker (PostgreSQL, Mosquitto) et les services Python localement. Le frontend démarre en mode Mock par défaut — cliquez sur **API** dans le toggle en haut à droite pour basculer sur les données réelles.

### 4. Accéder au dashboard

- **Dashboard** : [http://localhost:3000](http://localhost:3000)
- **API Swagger** : [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health check** : [http://localhost:8000/health](http://localhost:8000/health)

### 5. Observer les données

Le publisher simule 3 capteurs qui envoient des données toutes les 5 secondes. Vous verrez :

- Les statistiques globales (nombre de capteurs, mesures, température moyenne)
- La liste des capteurs avec leurs dernières valeurs
- Le graphique temps réel avec température et humidité
- Les alertes si un capteur dépasse 33°C
- La **vue Pipeline** qui anime le parcours d'une mesure du capteur au navigateur
- Le **convertisseur** avec ses outils pédagogiques (manipulateur de bits, corruption, overhead)
- Le **glossaire interactif** — survolez les termes soulignés pour voir leur définition

### 6. Arrêter la stack

```bash
docker compose down
# Pour supprimer les données :
docker compose down -v
```

## Prochaines étapes

- [Configurer les alertes](../how-to/configurer-alertes.md)
- [Exporter les données](../how-to/exporter-donnees.md)
- [Explorer le pipeline IoT interactif](../explications/lorawan-pipeline.md)
- [Comprendre le pipeline LoRaWAN](../explications/lorawan-pipeline.md)
