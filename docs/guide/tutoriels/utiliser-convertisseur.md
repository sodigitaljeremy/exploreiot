# Tutoriel : Utiliser le convertisseur LoRaWAN

Ce tutoriel vous guide dans l'utilisation du convertisseur interactif, un outil pédagogique qui permet de comprendre comment les capteurs IoT encodent et décodent leurs données.

## Prérequis

- Le dashboard est accessible sur [http://localhost:3000](http://localhost:3000)

## Étape 1 — Ouvrir le convertisseur

Cliquez sur l'onglet **Convertisseur** dans la barre de navigation.

Vous voyez un pipeline d'encodage avec les étapes :

```text
Valeurs décimales → Entiers × facteur → Octets binaires → Base64
```

## Étape 2 — Encoder une mesure

1. Saisissez une température (ex : `24.50`) et une humidité (ex : `65.30`)
2. Observez la transformation à chaque étape :
   - **Multiplication** : `24.50 × 100 = 2450`, `65.30 × 10 = 653`
   - **Binaire big-endian** : `2450 = 0x0992`, `653 = 0x028D`
   - **4 octets** : `09 92 02 8D`
   - **Base64** : `CZICjQ==`

## Étape 3 — Décoder un payload

Utilisez l'outil **Décodeur** pour l'opération inverse :

1. Entrez un payload Base64 (ex : `CZICjQ==`)
2. Observez le décodage étape par étape :
   - **Base64 → octets** : `09 92 02 8D`
   - **Big-endian → entiers** : `2450, 653`
   - **Division** : `24.50°C, 65.30%`

## Étape 4 — Manipulateur de bits

L'outil **Bit Manipulator** vous permet de modifier individuellement chaque bit d'un octet et de voir l'effet sur la valeur :

1. Cliquez sur un bit pour l'inverser (0 ↔ 1)
2. Observez comment la valeur décimale change
3. Comprenez pourquoi le **bit de poids fort** (MSB) a le plus d'impact

## Étape 5 — Démo de corruption

L'outil **Corruption Demo** montre ce qui se passe quand un seul bit est modifié dans une trame :

1. Observez le payload original et ses valeurs décodées
2. Un bit aléatoire est inversé
3. Comparez les valeurs décodées : une erreur d'un seul bit peut produire des valeurs complètement aberrantes

Cela illustre l'importance de la **validation des plages physiques** (-40°C à 85°C) dans le subscriber.

## Étape 6 — Overhead de protocole

L'outil **Protocol Overhead** compare la taille des données selon le format :

- **Binaire** : 4 octets (optimal pour LoRaWAN)
- **JSON** : ~35 octets (lisible mais volumineux)
- **XML** : ~80 octets (le plus verbeux)

Avec un **duty cycle de 1%** en LoRa, chaque octet compte.

## Ce que vous avez appris

- Comment `struct.pack('>HH')` encode des valeurs décimales en binaire big-endian
- Pourquoi la multiplication (×100, ×10) préserve la précision dans un entier
- L'impact de la corruption d'un seul bit sur les données
- Pourquoi le binaire est préféré au JSON pour les transmissions radio LoRaWAN

!!! tip "Pour aller plus loin"
    - [Encodage binaire](../explications/encodage-binaire.md) — explication conceptuelle complète
    - [Codec LoRaWAN](../reference/payload-codec.md) — référence technique du codec Python
    - [Tutoriel Pipeline](explorer-pipeline.md) — voir ces données traverser le système complet
