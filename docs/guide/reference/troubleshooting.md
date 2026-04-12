# Troubleshooting

Guide de résolution des problèmes courants.

---

## MQTT : le subscriber ne reçoit pas de messages

**Symptômes** : Le subscriber tourne mais aucune mesure n'apparaît en base.

**Diagnostic** :

```bash
# Vérifier que Mosquitto est accessible
docker compose exec mosquitto mosquitto_sub -t '#' -v -C 1

# Vérifier les logs du publisher
docker compose logs publisher | tail -20

# Vérifier les logs du subscriber
docker compose logs subscriber | tail -20
```

**Causes fréquentes** :

| Cause | Solution |
|-------|----------|
| Mosquitto pas démarré | `docker compose up mosquitto` |
| Mauvais topic | Vérifier `MQTT_TOPIC` dans `.env` — doit être `application/+/device/+/event/up` |
| Authentification MQTT | Vérifier `MQTT_USER` et `MQTT_PASSWORD` si Mosquitto requiert une auth |
| Publisher pas démarré | `docker compose up publisher` |

---

## Base de données : connexion refusée

**Symptômes** : `psycopg2.OperationalError: could not connect to server`

**Diagnostic** :

```bash
# Vérifier que PostgreSQL est accessible
docker compose exec postgres pg_isready -U exploreiot

# Vérifier les logs PostgreSQL
docker compose logs postgres | tail -20
```

**Causes fréquentes** :

| Cause | Solution |
|-------|----------|
| PostgreSQL pas prêt | Attendre le healthcheck — `depends_on: condition: service_healthy` |
| Mauvais credentials | Vérifier `DB_USER`, `DB_PASSWORD`, `DB_NAME` dans `.env` |
| Port occupé | Changer `DB_PORT` dans `.env` (défaut: 5432) |
| Migrations non appliquées | `docker compose exec api alembic upgrade head` |

---

## WebSocket : pas de mise à jour temps réel

**Symptômes** : Le dashboard affiche des données mais ne se met pas à jour en temps réel.

**Diagnostic** :

```bash
# Tester la connexion WebSocket
npx wscat -c ws://localhost:8000/ws

# Vérifier les logs du mqtt_handler
docker compose logs api | grep "mqtt"
```

**Causes fréquentes** :

| Cause | Solution |
|-------|----------|
| Mode Mock actif | Basculer en mode API via le toggle dans la navbar |
| API_KEY configuré | Ajouter `NEXT_PUBLIC_API_KEY` dans `.env` du frontend |
| CORS bloqué | Vérifier `CORS_ORIGIN` dans `.env` — doit inclure `http://localhost:3000` |
| Navigateur bloque WS | Vérifier la console du navigateur (F12) pour les erreurs |

---

## Dashboard : écran blanc ou erreur de chargement

**Symptômes** : La page charge mais rien ne s'affiche.

**Diagnostic** :

```bash
# Vérifier le build frontend
npm run build

# Vérifier les logs du frontend Docker
docker compose logs frontend | tail -20
```

**Causes fréquentes** :

| Cause | Solution |
|-------|----------|
| Erreur TypeScript | `npx tsc --noEmit` pour identifier l'erreur |
| API_URL incorrect | Vérifier `NEXT_PUBLIC_API_URL` dans `.env` |
| Port 3000 occupé | Libérer le port ou changer dans `docker-compose.yml` |

---

## Health check : status "degraded"

**Symptômes** : `GET /health` retourne `{"status": "degraded", "database": false}`

**Diagnostic** :

```bash
curl -s http://localhost:8000/health | python3 -m json.tool
```

**Cause** : PostgreSQL n'est pas accessible depuis le conteneur API.

**Solution** : Vérifier que le service `postgres` est healthy et que les variables `DB_*` sont correctes.

---

## Rate limiting : erreur 429

**Symptômes** : `429 Too Many Requests`

**Cause** : Plus de `RATE_LIMIT_DEFAULT` requêtes par minute depuis la même IP.

**Solution** :
- Attendre 1 minute
- Augmenter `RATE_LIMIT_DEFAULT` dans `.env` (défaut: `30/minute`)
- En développement, utiliser une valeur plus élevée : `RATE_LIMIT_DEFAULT=1000/minute`

---

## MQTT TLS : problèmes de certificat

**Symptômes** : `ssl.SSLError: [SSL: CERTIFICATE_VERIFY_FAILED]` ou `[SSL: UNABLE_TO_GET_ISSUER_CERT]`

**Diagnostic** :

```bash
# Vérifier le chemin du certificat CA
ls -la /path/to/ca.crt

# Tester la connexion MQTT avec TLS
openssl s_client -connect localhost:8883 -CAfile /path/to/ca.crt

# Vérifier les logs du subscriber
docker compose logs subscriber | grep -i ssl
```

**Causes fréquentes** :

| Cause | Solution |
|-------|----------|
| Certificat CA non trouvé | Vérifier `MQTT_CA_CERTS` — chemin absolu dans le conteneur |
| Certificat expiré | Régénérer le certificat (`openssl req -new -x509 ...`) |
| Certificat du serveur auto-signé | Utiliser `-CAfile` et désactiver la vérification du hostname si nécessaire |
| Mauvais certificat CA | Utiliser le certificat racine qui a signé le certificat serveur |

**Conseil** : En développement local, créer des certificats auto-signés testables :

```bash
# Générer une clé privée
openssl genrsa -out ca.key 2048

# Générer un certificat auto-signé valable 365 jours
openssl req -new -x509 -days 365 -key ca.key -out ca.crt \
  -subj "/CN=mosquitto"

# Copier dans le conteneur
docker compose cp ca.crt mosquitto:/mosquitto/certs/
docker compose cp ca.key mosquitto:/mosquitto/certs/
```

---

## Validation des credentials au démarrage

**Symptômes** : L'API ou le subscriber ne démarre pas ; logs montrent `PostgreSQL impossible` ou `MQTT impossible`

**Diagnostic** :

```bash
# Vérifier si l'API a échoué au démarrage
docker compose logs api | head -30

# Vérifier si le subscriber a échoué
docker compose logs subscriber | head -30

# Tester la connectivité MQTT manuellement
docker compose exec api python -c "
import paho.mqtt.client as mqtt
client = mqtt.Client()
client.connect('mosquitto', 1883)
print('✓ MQTT OK')
"

# Tester PostgreSQL
docker compose exec api psql -U exploreiot -d exploreiot -c 'SELECT 1'
```

**Causes fréquentes** :

| Cause | Solution |
|-------|----------|
| Service PostgreSQL pas prêt | Vérifier que `depends_on: condition: service_healthy` |
| Credentials incorrects | Vérifier `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| Mosquitto pas prêt | Attendre le démarrage (`docker compose logs mosquitto`) |
| Port MQTT déjà utilisé | Changer le port dans `docker-compose.yml` ou `.env` |
| Certificat CA absent (TLS) | Vérifier `MQTT_CA_CERTS` en mode TLS |

Aucune requête n'est acceptée tant que la validation au démarrage n'a pas réussi — c'est intentionnel pour éviter un déploiement partiel.

---

## Thread safety : données manquantes ou doublons

**Symptômes** : Des mesures manquent en base de données ; des doublons apparaissent occasionnellement

**Diagnostic** :

```bash
# Vérifier les logs du subscriber pour les erreurs concurrence
docker compose logs subscriber | grep -i "lock\|thread\|deadlock"

# Compter les mesures reçues vs insérées
docker compose exec mosquitto mosquitto_sub -t 'application/+/device/+/event/up' -C 10
# vs
docker compose exec postgres psql -U exploreiot -d exploreiot -c \
  'SELECT COUNT(*) FROM mesures WHERE timestamp > NOW() - INTERVAL 10s'
```

**Causes fréquentes** :

| Cause | Solution |
|-------|----------|
| Lock pas utilisé correctement | Vérifier que tout accès à la DB est protégé par `with db_lock:` |
| Callback MQTT qui bloque | Réduire le temps de traitement dans `on_message()` |
| Race condition sur insert | Utiliser transactions PostgreSQL (`conn.commit()` après chaque groupe) |
| Deadlock PostgreSQL | Consulter les logs PG (`docker compose logs postgres`) et réduire la durée des transactions |

**Tips de debugging** :

```python
# Ajouter des logs pour tracer la concurrence
import logging
logging.basicConfig(level=logging.DEBUG)

with db_lock:
    logger.debug(f"[{threading.current_thread().name}] Inserting measurement...")
    cursor.execute("INSERT INTO mesures...")
    logger.debug(f"[{threading.current_thread().name}] Committed.")
```

---

## Frontend : tests avec Vitest

**Exécuter tous les tests** :

```bash
npm run test
```

**Exécuter un fichier de test spécifique** :

```bash
npm run test -- components/__tests__/Dashboard.test.tsx
```

**Mode watch (rechargement automatique)** :

```bash
npm run test -- --watch
```

**Couverture de code** :

```bash
npm run test -- --coverage
```

**Déboguer un test dans VS Code** :

1. Ajouter `debugger;` dans le test
2. Exécuter : `node --inspect-brk ./node_modules/vitest/vitest.mjs run test-file.test.tsx`
3. Ouvrir `chrome://inspect` dans Chromium

Les tests vérifient :
- Rendu des composants
- Hooks custom (`useWebSocket`, `useDataLoading`, `usePolling`)
- Intégration WebSocket
- Validation des données
- Gestion des erreurs
