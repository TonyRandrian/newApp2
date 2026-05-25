# Évolution de stock — `StockMvtService`

Fichier : [`src/backend/services/StockMvtService.js`](../src/backend/services/StockMvtService.js)

Ce service construit l'historique quotidien d'un produit (ou d'une déclinaison)
en agrégeant trois sources de données :

1. les **mouvements physiques de stock** (`StockMvt`, sign ±1),
2. les **commandes réservées** (`Order.currentState ∈ reservedStateIds`) qui retiennent du stock,
3. les **commandes livrées** (`Order.currentState ∈ deliveredStateIds`) qui libèrent ce stock à la date du sortant correspondant.

Le résultat est une liste de "buckets" par jour avec les colonnes attendues côté UI :
**Entrant / Sortant / Net / Stock physique en fin de journée / Réservé ce jour / Cumul réservé / Stock réel restant**.

---

## 1. Vue d'ensemble

```
                         getDailyMovement(idProduct, idProductAttribute, productDetails)
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
   attrId > 0                hasDeclinations                     produit simple
   (Cas 1)                   (Cas 2)                             (Cas 3)
        │                              │                              │
        ▼                              ▼                              ▼
 getDailyMovement-           getDailyMovement-                getDailyMovement-
 WithoutDeclination(attrId)  WithDeclinations(0)              WithoutDeclination(0)
        │                              │                              │
        └─────────── pipeline commun ──┴──────────────────────────────┘
                                       │
                                       ▼
        getAllByProductAndAttribute  →  aggregateByDay  →  fetchDailyReservedMap  →  enrichWithReservations
```

Trois cas en entrée :

| Cas | Condition | Fonction appelée | `allowedAttrIds` |
|---|---|---|---|
| 1 | `idProductAttribute > 0` | `getDailyMovementWithoutDeclination(idProduct, attrId)` | `{ attrId }` |
| 2 | `attrId=0` + `productDetails.declinations` non vide | `getDailyMovementWithDeclinations(idProduct, 0)` | `{ combinationId₁, combinationId₂, ... }` |
| 3 | `attrId=0` + pas de déclinaison | `getDailyMovementWithoutDeclination(idProduct, 0)` | `{ 0 }` |

---

## 2. Pipeline détaillé

### 2.1 Récupération des mouvements bruts

- **Cas 1 & 3** : `StockMvt.getAllByProductAndAttribute(idProduct, idProductAttribute)` retourne tous les `StockMvt` du `id_stock` correspondant à la (produit, déclinaison) cible.
- **Cas 2** : on boucle sur chaque déclinaison du produit et on concatène les résultats dans `allMovements` — l'agrégation globale donnera ensuite le stock total du produit.

Chaque `StockMvt` porte :

| Champ | Rôle ici |
|---|---|
| `dateAdd` | Détermine le jour (clé `YYYY-MM-DD`) |
| `sign` | `+1` (entrée) ou `-1` (sortie) |
| `physicalQuantity` | Quantité du mouvement |
| `idOrder` | Lien vers la commande déclenchant la sortie (utilisé pour libérer la réservation) |

### 2.2 `aggregateByDay(movements)`

Tri chronologique puis cumul jour par jour. Pour chaque mouvement :

```js
delta = sign * physicalQuantity
final += delta           // cumul global
bucket.final = final     // stock en fin de journée
```

Le `bucket.final` du dernier mouvement de la journée donne automatiquement le **stock physique en fin de journée** (puisque les mouvements sont triés).

Sortie : un tableau de buckets `{date, totalIn, totalOut, net, count, movements[], final}` triés par date.

### 2.3 `resolveAllowedAttrIds(idProductAttribute, productDetails)`

Calcule l'ensemble des `productAttributeId` à retenir pour filtrer les `OrderDetail` :

| Branche | Retour |
|---|---|
| `attrId > 0` | `Set { attrId }` |
| `declinations` non vide | `Set { combinationId, ... }` |
| Sinon | `Set { 0 }` |

C'est ce Set qui décide quelles lignes de commande sont attribuables au scope demandé.

### 2.4 `fetchDailyReservedMap(idProduct, allowedAttrIds, movements)`

Cette fonction renvoie une `Map<dayKey, delta>` où chaque jour porte un delta **signé** :
- **+quantité** au jour de la commande (`order.dateAdd`),
- **−quantité** au jour de libération si la commande est livrée.

#### Étapes internes

1. **États suivis** : on agrège `Order.reservedStateIds` (par défaut `[11]`) et `Order.deliveredStateIds` (par défaut `[5]`), puis on récupère toutes les commandes dans l'un de ces états.
2. **`OrderDetail`** : on récupère toutes les lignes de ces commandes.
3. **`exitDateByOrderId`** : on parcourt les `movements` pour bâtir une map `orderId → date du 1er sortant lié`. C'est cette date qui sera utilisée pour libérer la réservation (pas `order.deliveryDate`).
4. **`releaseDate` par commande** :
   ```js
   releaseDate = isDelivered
       ? (exitDateByOrderId.get(orderId) ?? order.deliveryDate)
       : null
   ```
   Si on ne trouve pas de sortant lié, on retombe sur `order.deliveryDate` (date prévue) comme fallback.
5. **Émission des deltas** : pour chaque `OrderDetail` qui matche `productId` et `allowedAttrIds`, on émet `+qty` au jour de commande et `−qty` au jour de libération (le cas échéant).

#### Pourquoi pas `order.deliveryDate` en priorité ?

`order.deliveryDate` est souvent une date **prévue** côté client (livraison estimée), alors que le sortant `StockMvt` est posé au moment où le stock quitte réellement l'entrepôt. C'est cette dernière date qui doit annuler la réservation — sinon, sur un même jour on peut avoir un sortant physique sans libération équivalente du réservé, ce qui conduit à un **Stock réel restant négatif**.

### 2.5 `enrichWithReservations(dayBuckets, dailyDelta)`

Fusionne les buckets de mouvements avec les deltas de réservation.

1. **Création des buckets manquants** : les jours présents dans `dailyDelta` mais pas dans les mouvements (typiquement les jours où une commande a été passée sans mouvement physique) sont créés avec `totalIn=0, totalOut=0, net=0, movements=[]`.
2. **Parcours chronologique** avec deux compteurs roulants :
   - `lastFinal` : stock physique du dernier jour connu (utilisé pour les buckets sans mouvement).
   - `reservedCum` : cumul des deltas réservés depuis le début.

Pour chaque jour :

```js
if (bucket.movements.length === 0) bucket.final = lastFinal
else lastFinal = bucket.final

reservedThisDay = dailyDelta.get(date) ?? 0
reservedCum += reservedThisDay

bucket.reservedDaily = reservedThisDay     // colonne "Réservé ce jour"
bucket.reserved      = reservedCum         // colonne "Cumul réservé"
bucket.remaining     = bucket.final - reservedCum  // colonne "Stock réel restant"
```

---

## 3. Configuration

Les états considérés "réservé" et "livré" sont déclarés sur l'entité [`Order`](../src/backend/entities/Order.js) :

```js
static reservedStateIds  = [11]   // commande passée, stock retenu
static deliveredStateIds = [5]    // commande livrée, stock libéré
```

Pour ajouter "Expédié" (id `4`) comme libérant aussi le réservé :

```js
static deliveredStateIds = [4, 5]
```

---

## 4. Exemple complet : T-Shirt avec déclinaisons "Kely" et "Ngoza"

### Données d'entrée

**Mouvements de stock (`StockMvt`)**

| Date | Déclinaison | sign × qty | `idOrder` |
|---|---|---|---|
| 2025-12-01 | Kely  | +10 | 0 |
| 2025-12-01 | Ngoza | +13 | 0 |
| 2026-05-08 | Kely  | −4  | C |
| 2026-05-24 | Kely  | −1  | B |

**Commandes (`Order` + `OrderDetail`)** — toutes sur la déclinaison Kely :

| Commande | `dateAdd` | `currentState` | qty | Sortant lié |
|---|---|---|---|---|
| A | 2026-04-16 | 11 (réservée) | 2 | — |
| B | 2026-05-07 | 5 (livrée) | 1 | mvt 2026-05-24 |
| C | 2026-05-08 | 5 (livrée) | 4 | mvt 2026-05-08 |

### Cas 1 — vue déclinaison "Kely" (`idProductAttribute = idKely`)

`allowedAttrIds = { idKely }`. Seuls les mouvements de Kely sont lus.

| Date | Entrant | Sortant | Net | Stock physique | Réservé ce jour | Cumul réservé | Stock réel restant |
|---|--:|--:|--:|--:|--:|--:|--:|
| 2025-12-01 | 10 | 0 | +10 | 10 | 0 | 0 | 10 |
| 2026-04-16 | 0  | 0 | 0   | 10 | +2 | 2 | 8 |
| 2026-05-07 | 0  | 0 | 0   | 10 | +1 | 3 | 7 |
| 2026-05-08 | 0  | 4 | −4  | 6  | 0  | 3 | 3 |
| 2026-05-24 | 0  | 1 | −1  | 5  | −1 | 2 | 3 |

Le jour 08/05 : `+4` (commande C placée) **et** `−4` (commande C libérée via le sortant lié) → net 0, le cumul réservé reste à 3.

### Cas 2 — vue T-Shirt complet (`idProductAttribute = 0`)

`allowedAttrIds = { idKely, idNgoza }`. Tous les mouvements des deux déclinaisons sont fusionnés. Le `+13` de Ngoza s'agrège dans le bucket du 01/12.

| Date | Entrant | Sortant | Net | Stock physique | Réservé ce jour | Cumul réservé | Stock réel restant |
|---|--:|--:|--:|--:|--:|--:|--:|
| 2025-12-01 | **23** | 0 | +23 | **23** | 0 | 0 | **23** |
| 2026-04-16 | 0 | 0 | 0  | 23 | +2 | 2 | **21** |
| 2026-05-07 | 0 | 0 | 0  | 23 | +1 | 3 | **20** |
| 2026-05-08 | 0 | 4 | −4 | **19** | 0  | 3 | **16** |
| 2026-05-24 | 0 | 1 | −1 | **18** | −1 | 2 | **16** |

→ Le **Cumul réservé** est identique au Cas 1 (Ngoza n'a aucune commande). Seul le **Stock physique** est décalé de +13 sur toutes les lignes après le 01/12.

### Cas 3 — produit simple (sans déclinaison)

Identique au Cas 1 avec `attrId = 0`. `allowedAttrIds = { 0 }` : on garde les `OrderDetail` dont `productAttributeId = 0` (pas de déclinaison).

---

## 5. Points d'attention

### 5.1 Commande livrée sans sortant lié

Si une commande est en `deliveredStateIds` mais qu'aucun `StockMvt` n'a `idOrder = orderId`, on retombe sur `order.deliveryDate`. Si **ce champ est aussi vide**, la libération est ignorée → la commande reste "réservée" dans le cumul, et `Stock réel restant` peut devenir incohérent.

À surveiller dans les données : les sortants doivent renseigner `id_order`.

### 5.2 Commande dans un état "autre"

Une commande qui n'est ni dans `reservedStateIds` ni dans `deliveredStateIds` (panier abandonné, annulée, en attente de paiement, etc.) est **complètement ignorée** par `fetchDailyReservedMap`. Elle n'apparaît jamais comme réservée — même si elle l'a été à un moment.

### 5.3 `order.dateAdd` vs date d'historique

La réservation est posée à `order.dateAdd` (date de création de la commande), pas à la date de passage en état "réservé". Si une commande passe par un autre état avant d'arriver en réservé, on perd l'info — sauf si `order.dateAdd` a été réécrit par le module (voir `Order.save()` qui synchronise `dateAdd` et `OrderHistory.dateAdd`).

### 5.4 Jours sans aucun événement

Les jours sans mouvement **et** sans réservation n'apparaissent pas du tout dans le résultat (pas de continuité visuelle jour par jour). C'est volontaire : la sortie est sparse.

---

## 6. Référence des fonctions

| Fonction | Ligne | Rôle |
|---|---|---|
| `getDailyMovement` | [8](../src/backend/services/StockMvtService.js#L8) | Routeur des 3 cas |
| `getDailyMovementWithoutDeclination` | [28](../src/backend/services/StockMvtService.js#L28) | Pipeline pour Cas 1 & 3 |
| `getDailyMovementWithDeclinations` | [259](../src/backend/services/StockMvtService.js#L259) | Pipeline pour Cas 2 |
| `aggregateByDay` | [42](../src/backend/services/StockMvtService.js#L42) | Buckets quotidiens des mouvements |
| `toDayKey` | (parsing.js) | Normalise un `dateAdd` en `YYYY-MM-DD` |
| `resolveAllowedAttrIds` | [91](../src/backend/services/StockMvtService.js#L91) | Set de `productAttributeId` autorisés |
| `fetchDailyReservedMap` | [119](../src/backend/services/StockMvtService.js#L119) | Deltas journaliers signés (réservation / libération) |
| `enrichWithReservations` | [218](../src/backend/services/StockMvtService.js#L218) | Fusionne mouvements + réservations, produit le tableau final |