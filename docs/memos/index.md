# Memos CS — Fondamentaux informatiques

Fiches de cours interactives couvrant les concepts fondamentaux en informatique, avec des exemples concrets tires du projet ExploreIOT.

Chaque memo est aussi disponible en format slides (Marp) pour les presentations.

---

## Liste des memos

| # | Memo | Sujet | Lien ExploreIOT |
| - | ---- | ----- | --------------- |
| 01 | [Systemes de numeration](01-systemes-numeration.md) | Binaire, decimal, hex, octal | DevEUI en hex, payload binaire |
| 02 | [Representation des donnees](02-representation-donnees.md) | Bits, bytes, octets, mots | `struct.pack('>HH')` = 4 octets |
| 03 | [Encodage des donnees](03-encodage.md) | ASCII, UTF-8, Base64, URL encoding | Payload Base64 dans JSON MQTT |
| 04 | [Endianness](04-endianness.md) | Big-endian vs little-endian | `>` = big-endian dans struct.pack |
| 05 | [Reseaux fondamentaux](05-reseaux-fondamentaux.md) | TCP/IP, ports, DNS, TLS, MQTT | MQTT:1883, HTTP:8000, WS:8000/ws |
| 06 | [Architecture client-serveur](06-architecture-client-serveur.md) | Client-serveur, REST, HTTP | FastAPI endpoints, fetch() frontend |
| 07 | [Protocole WebSocket](07-protocole-websocket.md) | WebSocket, temps reel, polling | /ws broadcast, reconnexion backoff |
| 08 | [SQL fondamentaux](08-sql-fondamentaux.md) | SELECT, INSERT, INDEX, transactions | Table mesures, 3 index, pool |

---

## Generer les slides

```bash
# Generer les slides HTML dans docs/memos/output/
npm run marp:build

# Preview avec rechargement automatique
npm run marp:preview
```

---

## Methodologie

Chaque memo suit la structure :

1. **Concept** — Definition et explication du concept fondamental
2. **Pourquoi c'est important** — Lien direct avec le projet ExploreIOT
3. **Exemples concrets** — Code et diagrammes tires du projet
4. **Exercices** — Questions pour verifier la comprehension
5. **Resume** — Points cles a retenir
