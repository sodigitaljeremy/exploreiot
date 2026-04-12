# Configurer les alertes

Ce guide explique comment paramétrer le système d'alertes d'ExploreIOT pour détecter les anomalies de vos capteurs IoT.

## Types d'alertes

ExploreIOT génère deux catégories d'alertes :

| Type | Description | Déclencheur |
|------|-------------|-------------|
| `TEMPERATURE_ELEVEE` | La température mesurée dépasse le seuil configuré | `temperature >= ALERT_TEMP_THRESHOLD` |
| `CAPTEUR_SILENCIEUX` | Un capteur n'a pas envoyé de mesure depuis trop longtemps | Dernier message > `ALERT_SILENCE_MINUTES` minutes |

## Variables de configuration

Les alertes sont contrôlées par deux variables d'environnement :

### ALERT_TEMP_THRESHOLD

Seuil de température en degrés Celsius au-delà duquel une alerte `TEMPERATURE_ELEVEE` est générée.

- **Valeur par défaut** : `33`
- **Type** : entier ou décimal
- **Exemple** : `ALERT_TEMP_THRESHOLD=28` déclenchera une alerte si un capteur mesure 28°C ou plus

### ALERT_SILENCE_MINUTES

Durée en minutes sans mesure d'un capteur au-delà de laquelle une alerte `CAPTEUR_SILENCIEUX` est générée.

- **Valeur par défaut** : `10`
- **Type** : entier
- **Exemple** : `ALERT_SILENCE_MINUTES=5` déclenchera une alerte si un capteur n'a pas répondu depuis 5 minutes

## Modifier la configuration

### Via le fichier .env

Ouvrez le fichier `.env` à la racine du projet et ajoutez ou modifiez les variables :

```dotenv
ALERT_TEMP_THRESHOLD=28
ALERT_SILENCE_MINUTES=5
```

### Via docker-compose.yml

Vous pouvez aussi définir les variables directement dans `docker-compose.yml` sous la section `environment` du service `api` :

```yaml
services:
  api:
    environment:
      - ALERT_TEMP_THRESHOLD=28
      - ALERT_SILENCE_MINUTES=5
```

Les valeurs définies dans `docker-compose.yml` ont priorité sur celles du fichier `.env`.

## Appliquer la configuration

Après modification, redémarrez uniquement le service `api` pour prendre en compte les nouvelles valeurs :

```bash
docker compose restart api
```

Vérifiez que le service a bien redémarré avec les nouveaux paramètres :

```bash
docker compose logs api | tail -20
```

## Consulter les alertes actives

### Via l'API

Appelez l'endpoint `/alerts` pour obtenir la liste des anomalies détectées :

```bash
curl -s http://localhost:8000/alerts | python3 -m json.tool
```

Exemple de réponse avec des alertes actives :

```json
{
  "nb_alertes": 2,
  "alertes": [
    {
      "type": "TEMPERATURE_ELEVEE",
      "device_id": "a1b2c3d4e5f60001",
      "message": "Température élevée : 35.2°C (seuil : 33°C)",
      "temperature": 35.2,
      "recu_le": "2026-04-11T14:32:10.000000"
    },
    {
      "type": "CAPTEUR_SILENCIEUX",
      "device_id": "a1b2c3d4e5f60002",
      "message": "Aucune mesure depuis 12 minutes",
      "derniere_mesure": "2026-04-11T14:20:05.000000"
    }
  ]
}
```

Si `nb_alertes` vaut `0`, aucune anomalie n'est détectée :

```json
{
  "nb_alertes": 0,
  "alertes": []
}
```

### Via le dashboard

Les alertes actives apparaissent dans le **panneau rouge** en haut du dashboard. Le panneau est masqué automatiquement s'il n'y a aucune alerte. Chaque alerte affiche :

- Le type d'alerte (température élevée ou capteur silencieux)
- L'identifiant du capteur concerné (ou son nom convivial si configuré)
- Le message d'explication

Le dashboard interroge l'endpoint `/alerts` toutes les 30 secondes pour maintenir la liste à jour.

## Dépannage

**Les alertes ne se déclenchent pas malgré une température élevée**
- Vérifiez la valeur de `ALERT_TEMP_THRESHOLD` dans votre `.env`
- Confirmez que le service `api` a bien été redémarré après la modification
- Consultez les logs : `docker compose logs api`

**Fausses alertes CAPTEUR_SILENCIEUX au démarrage**
- C'est normal si le publisher n'a pas encore émis de données. Les alertes disparaissent dès que le capteur envoie sa première mesure.
- Vous pouvez augmenter `ALERT_SILENCE_MINUTES` pour réduire les faux positifs au démarrage.
