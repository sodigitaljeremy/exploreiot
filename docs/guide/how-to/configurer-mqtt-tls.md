# Configurer MQTT avec TLS

Ce guide explique comment sécuriser la communication MQTT avec le chiffrement TLS.

## Générer les certificats

Générez ou obtenez un certificat CA :

```bash
# Exemple avec OpenSSL (auto-signé pour test)
openssl genrsa -out ca.key 2048
openssl req -new -x509 -days 365 -key ca.key -out ca.crt
```

## Configurer Mosquitto

Copiez le certificat dans le conteneur Mosquitto :

```bash
docker compose cp ca.crt mosquitto:/etc/ssl/certs/
```

## Activer TLS dans l'environnement

Modifiez le fichier `.env` :

```dotenv
MQTT_TLS=true
MQTT_CA_CERTS=/etc/ssl/certs/ca.crt
```

## Redémarrer les services

```bash
docker compose up -d
```

## Vérification

Testez la connexion TLS avec mosquitto_sub :

```bash
mosquitto_sub -h localhost -p 8883 --cafile ca.crt -t '#' -v
```

!!! tip "Voir aussi"
    - [Modèle de sécurité](../explications/securite.md) — comprendre le modèle de confiance
    - [Variables d'environnement](../reference/env-variables.md) — référence complète des variables MQTT
