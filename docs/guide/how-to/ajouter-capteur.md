# Ajouter un capteur

Ce guide explique comment ajouter un nouveau capteur IoT dans ExploreIOT, que ce soit en mode simulation (développement) ou en production réelle avec Chirpstack.

## Contexte

En mode développement, les capteurs sont simulés par le service `publisher`. Ce service Python publie des mesures de température et d'humidité aléatoires sur le broker MQTT toutes les 5 secondes pour chaque capteur déclaré dans sa liste interne.

En production, les capteurs physiques LoRaWAN envoient leurs données via la passerelle LoRa et le serveur réseau Chirpstack, qui relaie les messages MQTT vers le subscriber.

## Ajouter un capteur simulé (développement)

### 1. Modifier la liste des capteurs dans publisher.py

Ouvrez le fichier `backend/publisher.py` et localisez la liste `CAPTEURS` :

```python
CAPTEURS = [
    "a1b2c3d4e5f60001",
    "a1b2c3d4e5f60002",
    "a1b2c3d4e5f60003",
]
```

Ajoutez votre nouveau capteur en respectant le format EUI-64 (16 caractères hexadécimaux) :

```python
CAPTEURS = [
    "a1b2c3d4e5f60001",
    "a1b2c3d4e5f60002",
    "a1b2c3d4e5f60003",
    "a1b2c3d4e5f60004",  # Nouveau capteur salle serveurs
]
```

### 2. Format du device_id

Le format attendu est un identifiant EUI-64 : 16 caractères hexadécimaux en minuscules.

```text
<16 caractères hexadécimaux>
```

Exemples valides :
- `a1b2c3d4e5f60004`
- `0011223344556677`
- `deadbeefcafe0001`

Ce format correspond au standard LoRaWAN Extended Unique Identifier (EUI-64).

### 3. Redémarrer le service publisher

```bash
docker compose restart publisher
```

Le nouveau capteur commencera à émettre des données dans les prochaines secondes. Il apparaîtra automatiquement dans le dashboard après la première mesure enregistrée par le subscriber.

## Ajouter un nom convivial dans le dashboard

Par défaut, le dashboard affiche le `device_id` brut (ex: `a1b2c3d4e5f60004`). Pour afficher un nom plus lisible, modifiez le mapping dans le frontend.

Ouvrez `lib/api-client.ts` et trouvez la constante `DEVICE_NAMES` :

```typescript
const DEVICE_NAMES: Record<string, string> = {
  "a1b2c3d4e5f60001": "Capteur Salle Serveurs",
  "a1b2c3d4e5f60002": "Capteur Entrepôt Nord",
  "a1b2c3d4e5f60003": "Capteur Extérieur Toit",
};
```

Ajoutez votre nouveau capteur :

```typescript
const DEVICE_NAMES: Record<string, string> = {
  "a1b2c3d4e5f60001": "Capteur Salle Serveurs",
  "a1b2c3d4e5f60002": "Capteur Entrepôt Nord",
  "a1b2c3d4e5f60003": "Capteur Extérieur Toit",
  "a1b2c3d4e5f60004": "Capteur Bureau 3",  // Nouveau
};
```

Reconstruisez le service frontend pour prendre en compte la modification :

```bash
docker compose up --build -d web
```

## Vérifier que le capteur est bien enregistré

Une fois le publisher redémarré, vérifiez que le capteur apparaît dans la liste via l'API :

```bash
curl -s http://localhost:8000/devices | python3 -m json.tool
```

Vous devriez voir votre nouveau `device_id` dans le tableau `devices`.

## En production réelle avec Chirpstack

En production, les capteurs physiques LoRaWAN sont enregistrés directement dans l'interface Chirpstack :

1. Connectez-vous à l'interface Chirpstack
2. Créez une nouvelle application (ou utilisez l'existante)
3. Ajoutez un nouveau device en renseignant son EUI DevEUI (identifiant physique du capteur)
4. Configurez le profil de device (OTAA ou ABP) et les clés de session
5. Le capteur rejoindra le réseau LoRaWAN et ses données seront transmises automatiquement via MQTT vers le subscriber ExploreIOT

Le `device_id` utilisé par ExploreIOT correspondra au DevEUI brut du capteur (16 caractères hexadécimaux).

Aucune modification du code n'est nécessaire en production : le subscriber traite tous les messages MQTT entrants et les enregistre en base de données.
