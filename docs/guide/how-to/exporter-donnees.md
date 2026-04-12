# Exporter les données

Ce guide explique comment exporter les données de vos capteurs depuis le dashboard ExploreIOT, au format CSV (tableur) ou PDF (rapport imprimable).

## Prérequis

- Le dashboard est accessible à [http://localhost:3000](http://localhost:3000)
- Au moins un capteur a des données enregistrées
- Pour l'export PDF : les popups doivent être autorisés pour `localhost:3000`

## Sélectionner un capteur

Avant d'exporter, sélectionnez le capteur dont vous souhaitez télécharger les données :

1. Dans la liste des capteurs affichée sur le dashboard, cliquez sur le capteur souhaité
2. Le graphique temps réel se met à jour pour afficher uniquement les mesures de ce capteur
3. Les boutons d'export deviennent actifs

## Export CSV

Le format CSV est idéal pour importer les données dans un tableur (Excel, LibreOffice Calc, Google Sheets) ou pour un traitement automatisé.

### Étapes

1. Sélectionnez un capteur dans la liste
2. Cliquez sur le bouton **"Export CSV"**
3. Le fichier est téléchargé automatiquement dans votre dossier de téléchargements

### Nom du fichier

Le fichier est nommé automatiquement selon le pattern :

```text
mesures_<device_id>_<date>.csv
```

Exemple : `mesures_a1b2c3d4e5f60001_20260411.csv`

### Format du fichier CSV

Le fichier contient une ligne d'en-tête suivie d'une ligne par mesure, avec les colonnes suivantes :

```text
device_id,temperature,humidite,recu_le
```

Exemple de contenu :

```csv
device_id,temperature,humidite,recu_le
a1b2c3d4e5f60001,24.3,61.2,2026-04-11T14:30:05.123456
a1b2c3d4e5f60001,24.7,60.8,2026-04-11T14:30:10.456789
a1b2c3d4e5f60001,25.1,59.5,2026-04-11T14:30:15.789012
```

Les colonnes sont :

| Colonne | Type | Description |
|---------|------|-------------|
| `device_id` | texte | Identifiant unique du capteur |
| `temperature` | décimal | Température en degrés Celsius |
| `humidite` | décimal | Humidité relative en pourcentage |
| `recu_le` | datetime ISO 8601 | Horodatage de réception de la mesure |

## Export PDF

Le format PDF génère un rapport mis en page incluant les métadonnées d'export et les données du capteur sélectionné.

### Étapes

1. Sélectionnez un capteur dans la liste
2. Cliquez sur le bouton **"Export PDF"**
3. Une fenêtre d'impression s'ouvre avec l'aperçu du rapport
4. Choisissez **"Enregistrer en PDF"** comme imprimante, ou imprimez directement

### Contenu du rapport PDF

Le rapport inclut :

- **Titre** : "Rapport ExploreIOT — Export des données"
- **Date d'export** : horodatage de la génération du rapport
- **Métadonnées globales** :
  - Nombre total de capteurs actifs
  - Nombre total de mesures enregistrées
  - Température moyenne globale
- **Données du capteur sélectionné** :
  - Identifiant du capteur (et nom convivial si configuré)
  - Tableau des dernières mesures avec température, humidité et horodatage

### Popups bloqués

Si la fenêtre d'impression ne s'ouvre pas, votre navigateur bloque peut-être les popups pour `localhost:3000`. Pour les autoriser :

**Google Chrome / Chromium :**
1. Cliquez sur l'icône de popup bloquée dans la barre d'adresse (à droite)
2. Sélectionnez **"Toujours autoriser les popups de localhost:3000"**
3. Cliquez à nouveau sur **"Export PDF"**

**Mozilla Firefox :**
1. Une barre de notification s'affiche en haut de la page
2. Cliquez sur **"Options"** puis **"Autoriser les popups pour localhost"**
3. Cliquez à nouveau sur **"Export PDF"**

**Safari :**
1. Allez dans **Safari > Préférences > Sites web > Fenêtres surgissantes**
2. Trouvez `localhost` et sélectionnez **"Autoriser"**

## Remarques

- L'export inclut uniquement les mesures récupérées par le dashboard (jusqu'à 1000 mesures par capteur selon la configuration de l'API)
- Les données exportées reflètent l'état au moment du clic sur le bouton d'export
- Pour exporter des données historiques sur une longue période, utilisez directement l'API : `GET /devices/{device_id}/metrics?limit=1000`
