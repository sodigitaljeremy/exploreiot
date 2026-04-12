# Section 11 — Glossaire

Ce glossaire définit les termes techniques utilisés dans la documentation du projet ExploreIOT. Les définitions sont volontairement concises et contextualisées par rapport au projet.

---

| Terme | Définition |
|-------|-----------|
| **LoRaWAN** | Protocole réseau longue portée, faible consommation pour l'IoT. LoRaWAN (Long Range Wide Area Network) définit la couche réseau au-dessus de la modulation radio LoRa. Il gère l'adressage des capteurs, la sécurité (chiffrement AES-128) et la gestion de la bande passante. |
| **MQTT** | Protocole de messagerie publish/subscribe léger pour l'IoT. Conçu pour les liaisons à faible bande passante et haute latence, il repose sur un broker central qui route les messages entre producteurs et consommateurs. |
| **QoS** | Quality of Service — niveau de garantie de livraison MQTT. QoS 0 : au plus une fois (fire and forget). QoS 1 : au moins une fois (avec accusé de réception). QoS 2 : exactement une fois (avec protocole en 4 étapes). ExploreIOT utilise QoS 1. |
| **Broker** | Serveur central de routage des messages MQTT. Dans ExploreIOT, le broker est Eclipse Mosquitto, déployé dans un conteneur Docker. Il reçoit les messages des publishers et les redistribue aux subscribers abonnés aux topics correspondants. |
| **Topic** | Canal de communication MQTT identifié par une chaîne hiérarchique (ex : `application/+/device/+/event/up`). Le caractère `+` est un joker à un niveau, `#` est un joker multi-niveaux. Les subscribers s'abonnent à un ou plusieurs topics. |
| **Payload** | Données utiles transportées dans un message MQTT. Dans ExploreIOT, le payload est un objet JSON contenant un champ `data` encodé en base64, qui lui-même contient les octets de la mesure (température, humidité). |
| **Base64** | Encodage binaire vers texte permettant de transporter des données binaires dans des formats textuels comme JSON. ExploreIOT reçoit les payloads LoRaWAN encodés en base64 et les décode avant d'extraire les valeurs numériques. |
| **struct.pack** | Fonction Python du module `struct` permettant d'encoder des valeurs numériques en octets selon un format précis (ex : big-endian 16 bits). Utilisé dans le publisher simulateur pour générer des payloads LoRaWAN conformes au format Dragino LHT65. |
| **EUI** | Extended Unique Identifier — identifiant unique sur 64 bits d'un capteur LoRaWAN, similaire à une adresse MAC. Dans ExploreIOT, le `device_eui` est la clé primaire naturelle utilisée pour identifier chaque capteur dans la base de données. |
| **Dragino LHT65** | Capteur LoRaWAN température/humidité utilisé comme référence dans ExploreIOT. Il mesure la température de -40 °C à +85 °C et l'humidité de 0 % à 100 %. Son format de payload binaire est reproduit par le simulateur. |
| **ASGI** | Async Server Gateway Interface — standard Python définissant l'interface entre un serveur web asynchrone et une application Python. FastAPI est un framework ASGI, servi par Uvicorn dans ExploreIOT. |
| **WebSocket** | Protocole de communication bidirectionnel full-duplex sur TCP, initié via une requête HTTP Upgrade. ExploreIOT expose un endpoint WebSocket (`/ws/measurements`) pour diffuser les nouvelles mesures en temps réel vers le frontend. |
| **Rate limiting** | Mécanisme de limitation du nombre de requêtes acceptées par unité de temps et par client (identifié par son adresse IP). ExploreIOT utilise `slowapi` pour appliquer une limite configurable (défaut : 30 requêtes par minute). |
| **Timing attack** | Attaque par analyse statistique du temps de réponse d'une opération cryptographique ou de comparaison. Si une comparaison de chaînes s'arrête dès la première différence, un attaquant peut déduire combien de caractères sont corrects en mesurant la latence. Voir ADR-001. |
| **Connection pool** | Ensemble de connexions à la base de données maintenues ouvertes et réutilisées entre les requêtes. ExploreIOT utilise `SimpleConnectionPool` de psycopg2 avec un minimum de 2 et un maximum de 10 connexions simultanées. |
| **Alembic** | Outil de migration de schéma de base de données pour Python, développé par les auteurs de SQLAlchemy. Dans ExploreIOT, Alembic est utilisé indépendamment de SQLAlchemy ORM : les migrations utilisent `op.execute()` avec du SQL brut. Voir ADR-002. |
| **ADR** | Architecture Decision Record — document court décrivant une décision d'architecture significative, son contexte, les alternatives envisagées et les conséquences. ExploreIOT documente ses ADR dans la section 9 de la documentation Arc42. |
| **Arc42** | Template standard pour la documentation d'architecture logicielle, organisé en 12 sections numérotées. Il couvre les objectifs, les contraintes, la vue contextuelle, les vues de décomposition, les concepts transversaux et les décisions. ExploreIOT suit ce template pour sa documentation. |
| **Chirpstack** | Serveur réseau LoRaWAN open source de référence (version 4 utilisée). Gère le déchiffrement des trames radio, l'authentification des appareils (OTAA/ABP) et publie les données décodées sur un broker MQTT au format JSON standardisé (deduplicationId, deviceInfo, rxInfo, txInfo). Dans ExploreIOT, Chirpstack est simulé par `publisher.py` ou déployé via le profil Docker Compose `--profile chirpstack`. |
| **Complément à 2** | Méthode standard de représentation des entiers signés en binaire. Pour un nombre sur N bits, le complément à 2 d'une valeur négative est obtenu en inversant tous les bits puis en ajoutant 1. Exemple : -10°C × 100 = -1000, soit `0xFC18` en complément à 2 sur 16 bits. Le dashboard inclut un outil interactif (`NegativeTemperatureDemo`) pour visualiser ce processus. |
| **RSSI** | Received Signal Strength Indicator — mesure de la puissance du signal radio reçu par la gateway, exprimée en dBm. Un RSSI de -50 dBm indique un signal fort, -120 dBm un signal très faible. Visible dans les métadonnées `rxInfo` des messages Chirpstack v4. |
| **SNR** | Signal-to-Noise Ratio — rapport signal/bruit en dB. Un SNR positif signifie que le signal est plus fort que le bruit ambiant. Avec LoRa, des SNR négatifs (jusqu'à -20 dB) restent exploitables grâce à la modulation à étalement de spectre (Spreading Factor). |
| **Spreading Factor** | Paramètre de modulation LoRa (SF7 à SF12) qui détermine le compromis portée/débit. Un SF élevé (SF12) offre une portée maximale (~15 km) mais un débit très faible (~250 bps). Un SF bas (SF7) offre un débit plus élevé (~5,5 kbps) mais une portée réduite (~2 km). |
| **uint16** | Unsigned integer sur 16 bits — entier non signé pouvant représenter des valeurs de 0 à 65535. Utilisé dans le payload LoRaWAN d'ExploreIOT : température × 100 et humidité × 10 sont encodées chacune sur un uint16 big-endian (2 octets), pour un total de 4 octets. |
| **Diataxis** | Framework de documentation technique organisé en 4 quadrants selon deux axes (pratique/théorique, acquisition/application) : tutoriels, guides pratiques, références et explications. Peut être utilisé comme complément à Arc42 pour structurer la documentation utilisateur et développeur. |

---

!!! tip "Glossaire interactif dans l'interface"
    Le dashboard ExploreIOT intègre un glossaire interactif directement dans l'interface. Les termes techniques soulignés en pointillé (comme MQTT, Base64, big-endian) affichent une infobulle au survol avec leur définition et des termes reliés. Ce glossaire est défini dans `lib/glossary.ts` et rendu par le composant `<Term>`.

---

*Dernière mise à jour : 2026-04-12*
