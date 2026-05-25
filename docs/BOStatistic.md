# BOStatistic — Documentation détaillée

Page : [src/pages/BOStatistic.jsx](../src/pages/BOStatistic.jsx)

## Sommaire
1. [Rôle général](#1-rôle-général)
2. [État local et chargement initial](#2-état-local-et-chargement-initial)
3. [Filtres dérivés](#3-filtres-dérivés)
4. [Les trois agrégations métier](#4-les-trois-agrégations-métier)
   - [Agrégation 1 — Bénéfice produit (`orderCategoryMetrics`)](#agrégation-1--bénéfice-produit-ordercategorymetrics)
   - [Agrégation 2 — Bénéfice depuis les mouvements (`orderCategoryMetricsFromStock`)](#agrégation-2--bénéfice-depuis-les-mouvements-ordercategorymetricsfromstock)
   - [Agrégation 3 — Disponibilité du stock (`stockCategoryMetrics`)](#agrégation-3--disponibilité-du-stock-stockcategorymetrics)
5. [Exemple chiffré](#5-exemple-chiffré-fil-rouge)
6. [Détail fonction par fonction](#6-détail-fonction-par-fonction)
7. [Synthèse comparative](#7-synthèse-comparative)

---

## 1. Rôle général

Cette page Back-Office affiche **trois tableaux statistiques** agrégés par catégorie de produits, avec un filtre par plage de dates :

1. Ventes / bénéfices basés sur le **prix d'achat figé** dans la fiche produit
2. Ventes / bénéfices basés sur le **coût réel issu des mouvements de stock**
3. **Disponibilité du stock** (physique, réservée, disponible)

---

## 2. État local et chargement initial

### États (`useState`)
- Données brutes : `mvtStock`, `stockAvailables`, `productsWithDecl`, `categories`, `orders`, `baseOrderGroups`
- UI : `loading`, `error`
- Filtres : `dateMin`, `dateMax`

### Chargement (`useEffect` au montage)
1. Récupère catégories (hors racine via `getExclApi([1, 2])`), produits, mouvements de stock, stocks disponibles
2. Construit `productsWithDecl` via `ProductWithCombinations.listFromProductsWithCategories` (produits + combinaisons + catégorie)
3. Récupère les commandes non annulées (`currentState ≠ 6`) + leurs détails (`OrderDetail.getBy("orderId", [...orderIds])`)
4. Regroupe via `OrderWithDetails.groupOrdersWithDetails`
5. `setLoading(false)` dans le `finally` — le spinner disparaît même en cas d'erreur

---

## 3. Filtres dérivés

Trois `useMemo` filtrent les données brutes selon `dateMin` / `dateMax` :

| Variable | Source | Plage | Usage |
|---|---|---|---|
| `orderFiltered` | `baseOrderGroups` | `[dateMin, dateMax]` | Toutes les agrégations |
| `mvtFiltered` | `mvtStock` | `[dateMin, dateMax]` | Agrégation 2 (coût réel sur période) |
| `mvtFilteredWithoutMin` | `mvtStock` | `[−∞, dateMax]` | Agrégation 3 (stock cumulé à une date) |

> La différence entre `mvtFiltered` et `mvtFilteredWithoutMin` est essentielle : pour calculer un **solde de stock**, il faut additionner *tous* les mouvements depuis le début, pas seulement ceux de la période.

---

## 4. Les trois agrégations métier

### Agrégation 1 — Bénéfice produit (`orderCategoryMetrics`)

**Pipeline** :
```
orderFiltered + productsWithDecl
   → OrderLineMetrics.listFromOrderGroups
   → OrderLineMetrics.groupByProductAndCombinationLines
   → OrderCategoryMetrics.groupByCategoryFromProductLines
```

#### Étape A — `listFromOrderGroups`
Pour chaque `orderDetail` :
- `quantity = orderDetail.productQuantity`
- `basePurchasePrice = productDto.product.wholesalePrice` (prix d'achat figé dans la fiche produit)
- `declinaisonImpact = productDto.getCombinationPriceImpact(productAttributeId)`
- `unitPurchasePrice = basePurchasePrice + declinaisonImpact`
- `totalAchat = quantity × unitPurchasePrice`
- `totalVente = orderDetail.unitPriceTaxExcl × quantity` (HT)
- `benefice = totalVente − totalAchat`

Sortie : une ligne par `orderDetail`.

#### Étape B — `groupByProductAndCombinationLines`
Condense par clé `productId|productAttributeId`. Cumule les quantités, puis recalcule les totaux avec le **prix unitaire de la première ligne rencontrée** × quantité totale.

⚠️ **Limite** : si le prix de vente varie entre commandes (promo, remise), seul le prix de la première ligne est retenu.

#### Étape C — `groupByCategoryFromProductLines`
Refait un regroupement par produit/déclinaison puis agrège par catégorie (`line.productDto.category`).

**Interprétation métier** : *« Combien j'ai vendu et combien cela m'aurait coûté si j'avais payé chaque article au prix d'achat actuel du catalogue. »*

---

### Agrégation 2 — Bénéfice depuis les mouvements (`orderCategoryMetricsFromStock`)

**Pipeline** :
```
orderFiltered + productsWithDecl + mvtFiltered + stockAvailables
   → OrderLineMetrics.listFromProductsWithStockMovements
   → OrderCategoryMetrics.groupByCategoryFromTotals
```

#### Étape A — `listFromProductsWithStockMovements`

1. Indexation des `stockAvailables` par `id` et par clé `productId|attributeId`
2. Calcul des **entrées de stock** : on garde uniquement les mouvements avec `sign === StockMvt.stockEntrySign` ; on cumule `physicalQuantity` par clé
3. Cumul des ventes par produit/déclinaison à partir de `orderFiltered`
4. **Boucle pilotée par les produits** (pas les commandes) : pour chaque produit × déclinaison :
   - `totalEntryQty` = quantité totale entrée en stock sur la période
   - `totalAchat = totalEntryQty × unitPurchasePrice` ← **différence clé**
   - `totalVente` = ventes effectives
   - `benefice = totalVente − totalAchat`

#### Étape B — `groupByCategoryFromTotals`
Les totaux sont déjà calculés, on les somme directement par catégorie.

**Interprétation métier** : *« Sur la période, valeur des entrées de stock (coût) face aux ventes (chiffre d'affaires). »*

⚠️ **Conséquence importante** : si on a acheté 100 articles mais vendu seulement 10, le `totalAchat` reflète les 100 et le bénéfice apparent peut être très négatif. C'est une vue **trésorerie / flux**, pas une marge unitaire.

---

### Agrégation 3 — Disponibilité du stock (`stockCategoryMetrics`)

**Pipeline** :
```
mvtFilteredWithoutMin + orderFiltered + productsWithDecl + stockAvailables
   → StockProductAvailability.listFromProductsAndStockData
   → StockCategoryAvailability.groupByCategory
```

#### Étape A — `listFromProductsAndStockData`

1. **Quantité physique** : on parcourt **tous** les mouvements (entrées + sorties) jusqu'à `dateMax`. Aucune borne min, car le solde de stock est cumulé depuis l'origine.
   - `sign === entrySign` → `+ physicalQuantity`
   - `sign === exitSign` → `− physicalQuantity`

2. **Quantité réservée** : somme des `productQuantity` des `orderDetails` dont la commande est dans un état "réservé" (`Order.reservedStateIds` — commandes en cours, non livrées).

3. Pour chaque produit/déclinaison :
   - `availableQuantity = physicalQuantity − reservedQuantity`

#### Étape B — `groupByCategory`
Somme par catégorie des trois quantités.

**Interprétation métier** :
- **Physique** : ce que j'ai en entrepôt
- **Réservé** : engagé sur des commandes en cours
- **Disponible** : vendable immédiatement

---

## 5. Exemple chiffré (fil rouge)

### Contexte
Catégorie **"T-shirts"** avec un seul produit `T-shirt bleu` (ID = 10, pas de déclinaison) dont :
- `wholesalePrice` (fiche produit) = **8 €**
- Prix de vente HT = **20 €**

### Mouvements de stock (table `stock_mvt`)

| Date | Sign | Quantité | Sens |
|---|---|---|---|
| 2026-01-10 | +1 (entrée) | 100 | Réception fournisseur |
| 2026-03-05 | +1 (entrée) | 50  | Réapprovisionnement |
| 2026-03-20 | −1 (sortie) | 30  | Vente expédiée |

### Commandes (table `orders` + `order_detail`)

| Commande | Date | État | Qté | Prix vente HT |
|---|---|---|---|---|
| #1001 | 2026-02-15 | Livrée (1) | 20 | 20 € |
| #1002 | 2026-03-10 | En cours réservée (3) | 10 | 20 € |

### Filtre appliqué par l'utilisateur
`dateMin = 2026-02-01`, `dateMax = 2026-03-31`

---

### Résultat Agrégation 1 — Bénéfice produit

Les deux commandes sont dans la plage `[2026-02-01, 2026-03-31]`.

| Ligne | Qté | Vente | Achat | Bénéfice |
|---|---|---|---|---|
| #1001 | 20 | 20 × 20 = **400 €** | 20 × 8 = **160 €** | 240 € |
| #1002 | 10 | 10 × 20 = **200 €** | 10 × 8 = **80 €**  | 120 € |

Après regroupement par catégorie **"T-shirts"** :

| Catégorie | Qté | Vente totale | Achat total | Bénéfice |
|---|---|---|---|---|
| T-shirts | **30** | **600 €** | **240 €** | **360 €** |

> Marge théorique de **60 %** sur la période.

---

### Résultat Agrégation 2 — Bénéfice depuis les mouvements

On ne garde que les **entrées** de stock dans la plage :
- 2026-03-05 : +50 (✅ dans la plage)
- 2026-01-10 : +100 (❌ hors plage, exclu)

`totalEntryQty = 50`

| Catégorie | Qté entrée | Vente totale | Achat total | Bénéfice |
|---|---|---|---|---|
| T-shirts | 50 | 600 € | 50 × 8 = **400 €** | **200 €** |

> Sur la période, j'ai dépensé 400 € en réapprovisionnement contre 600 € de chiffre d'affaires : **flux net +200 €**.
> La marge apparente (33 %) est plus faible que l'agrégation 1, car j'ai acheté plus de stock que je n'en ai vendu sur la même période.

⚠️ Cas extrême : si la réception de 50 articles avait eu lieu le 31 mars sans aucune vente associée, on verrait un bénéfice négatif sur la période, alors que ces 50 articles génèreront du chiffre d'affaires *plus tard*. C'est bien un indicateur de **trésorerie**, pas de marge.

---

### Résultat Agrégation 3 — Disponibilité du stock au 2026-03-31

Tous les mouvements **jusqu'au 2026-03-31** comptent (pas de borne min) :

```
+100 (10/01)  +50 (05/03)  −30 (20/03)  =  120 unités physiques
```

Quantité réservée : seules les commandes en état "réservé" comptent. Ici #1002 (état 3) :
- Réservé = **10** unités

Disponible = 120 − 10 = **110**

| Catégorie | Qté physique | Qté réservée | Qté dispo |
|---|---|---|---|
| T-shirts | **120** | **10** | **110** |

---

## 6. Détail fonction par fonction

Cette section reprend, pour chaque fonction clé du pipeline, sa **signature**, un **exemple d'entrée**, les **transformations** appliquées et le **format de sortie**. Les données d'exemple reprennent en partie le fil rouge "T-shirt bleu" (produit ID = 10, `wholesalePrice` = 8 €).

---

### 6.1 `OrderWithDetails.groupOrdersWithDetails(orders, orderDetails)`

Source : [OrderWithDetails.js:22-47](../src/backend/dto/OrderWithDetails.js#L22-L47)

**Rôle** : associe chaque commande à ses lignes de détail.

#### Entrée
```js
orders = [
  { id: 1001, dateAdd: "2026-02-15", currentState: 1 },
  { id: 1002, dateAdd: "2026-03-10", currentState: 11 },
  { id: 1003, dateAdd: "2026-04-01", currentState: 6 }, // annulée
]

orderDetails = [
  { id: 1, orderId: 1001, productId: 10, productQuantity: 20, unitPriceTaxExcl: 20 },
  { id: 2, orderId: 1002, productId: 10, productQuantity: 10, unitPriceTaxExcl: 20 },
  // orderId 1003 sans détail
]
```

#### Transformations
1. **Indexation** : construit `detailsByOrderId = Map { 1001 → [detail1], 1002 → [detail2] }`
2. **Reconstruction** : pour chaque `order`, récupère ses détails ; **ignore les commandes sans détail** (`details.length === 0`)

#### Sortie
```js
[
  OrderWithDetails {
    order:        { id: 1001, dateAdd: "2026-02-15", currentState: 1 },
    orderDetails: [ { id: 1, orderId: 1001, productId: 10, productQuantity: 20, ... } ],
  },
  OrderWithDetails {
    order:        { id: 1002, dateAdd: "2026-03-10", currentState: 11 },
    orderDetails: [ { id: 2, orderId: 1002, productId: 10, productQuantity: 10, ... } ],
  },
]
// La commande 1003 disparaît : aucun détail rattaché.
```

---

### 6.2 `OrderWithDetails.filterGroupsByDate(list, dateMin, dateMax)`

Source : [OrderWithDetails.js:57-67](../src/backend/dto/OrderWithDetails.js#L57-L67)

**Rôle** : filtre les groupes commande+détails sur la date de la commande parente (`order.dateAdd`).

#### Entrée
```js
list    = [ groupe1001 (2026-02-15), groupe1002 (2026-03-10), groupe1004 (2026-04-12) ]
dateMin = "2026-02-01"
dateMax = "2026-03-31"
```

#### Transformations
- Si `dateMin` et `dateMax` sont vides → renvoie la liste telle quelle (court-circuit)
- Sinon : `list.filter(item => isDateInRange(order.dateAdd, dateMin, dateMax))`

#### Sortie
```js
[ groupe1001, groupe1002 ]  // groupe1004 exclu (> dateMax)
```

---

### 6.3 `StockMvt.filterByDateRange(list, dateMin, dateMax)`

Source : [StockMvt.js:269-296](../src/backend/entities/StockMvt.js#L269-L296)

**Rôle** : filtre les mouvements de stock sur leur `dateAdd`. Borne min mise à `00:00:00`, borne max à `23:59:59.999` pour inclure la journée entière.

#### Entrée
```js
list = [
  { id: 1, idProduct: 10, sign:  1, physicalQuantity: 100, dateAdd: "2026-01-10" },
  { id: 2, idProduct: 10, sign:  1, physicalQuantity:  50, dateAdd: "2026-03-05" },
  { id: 3, idProduct: 10, sign: -1, physicalQuantity:  30, dateAdd: "2026-03-20" },
]
```

#### Cas A — `dateMin = "2026-02-01"`, `dateMax = "2026-03-31"` (utilisé par `mvtFiltered`)
```js
[ mvt2 (2026-03-05), mvt3 (2026-03-20) ]
// mvt1 exclu (avant dateMin)
```

#### Cas B — `dateMin = null`, `dateMax = "2026-03-31"` (utilisé par `mvtFilteredWithoutMin`)
```js
[ mvt1, mvt2, mvt3 ]  // tout est conservé tant que dateAdd ≤ dateMax
```

> C'est ce **cas B** qui permet à l'agrégation 3 de calculer le **solde cumulé** du stock.

---

### 6.4 `OrderLineMetrics.createFromOrderDetail(orderDetail, order, productsDtoById)`

Source : [OrderLineMetrics.js:49-72](../src/backend/dto/OrderLineMetrics.js#L49-L72)

**Rôle** : construit une ligne métrique pour **un seul** `orderDetail`.

#### Entrée
```js
orderDetail = {
  id: 1, orderId: 1001, productId: 10,
  productAttributeId: 0,        // pas de déclinaison
  productQuantity: 20,
  unitPriceTaxExcl: 20,
}

order = { id: 1001, dateAdd: "2026-02-15", currentState: 1 }

productsDtoById = Map {
  10 → ProductWithCombinations {
    product:  { id: 10, name: "T-shirt bleu", wholesalePrice: 8 },
    category: { id: 5, name: "T-shirts" },
    getCombinationPriceImpact: (attrId) => 0,
    getCategoryDisplayName:    () => "T-shirts",
  }
}
```

#### Transformations
| Variable | Calcul | Valeur |
|---|---|---|
| `quantity` | `orderDetail.productQuantity` | 20 |
| `basePurchasePrice` | `productDto.product.wholesalePrice` | 8 |
| `declinaisonImpact` | `productDto.getCombinationPriceImpact(0)` | 0 |
| `unitPurchasePrice` | `8 + 0` | 8 |
| `totalAchat` | `20 × 8` | **160** |
| `totalVente` | `20 × 20` | **400** |
| `benefice` | `400 − 160` | **240** |

#### Sortie
```js
OrderLineMetrics {
  orderDetail:      { id: 1, ... },
  productDto:       <T-shirt bleu>,
  order:            { id: 1001, ... },
  totalVente:       400,
  totalAchat:       160,
  benefice:         240,
  categorieLibelle: "T-shirts",
  stockMovements:   null,
  stockAvailable:   null,
}
```

---

### 6.5 `OrderLineMetrics.listFromOrderGroups(orderGroups, productsWithCombinations)`

Source : [OrderLineMetrics.js:81-97](../src/backend/dto/OrderLineMetrics.js#L81-L97)

**Rôle** : applique `createFromOrderDetail` à **toutes les lignes de toutes les commandes**.

#### Entrée
```js
orderGroups = [
  { order: {id:1001, ...}, orderDetails: [ detail1 ] },
  { order: {id:1002, ...}, orderDetails: [ detail2 ] },
]
productsWithCombinations = [ <T-shirt bleu DTO> ]
```

#### Transformations
1. Indexe les produits : `productsDtoById = Map { 10 → <T-shirt bleu DTO> }`
2. Boucle sur chaque `group`, puis chaque `orderDetail`, et appelle `createFromOrderDetail`

#### Sortie
```js
[
  OrderLineMetrics { /* detail1, totalVente: 400, totalAchat: 160, benefice: 240 */ },
  OrderLineMetrics { /* detail2, totalVente: 200, totalAchat:  80, benefice: 120 */ },
]
```

> Une ligne par `orderDetail` : si un produit a été commandé dans 5 commandes différentes, on a 5 lignes ici.

---

### 6.6 `OrderLineMetrics.groupByProductAndCombinationLines(list)`

Source : [OrderLineMetrics.js:352-421](../src/backend/dto/OrderLineMetrics.js#L352-L421)

**Rôle** : condense plusieurs lignes du même produit/déclinaison en une seule, en cumulant les quantités.

#### Entrée
```js
list = [
  OrderLineMetrics { orderDetail: { productId: 10, productAttributeId: 0, productQuantity: 20, unitPriceTaxExcl: 20 }, ... },
  OrderLineMetrics { orderDetail: { productId: 10, productAttributeId: 0, productQuantity: 10, unitPriceTaxExcl: 20 }, ... },
]
```

#### Transformations
1. Clé `productId|attributeId` → ici `"10|0"` pour les deux lignes
2. Cumul des quantités : `20 + 10 = 30`
3. Recalcul des totaux : `quantity × unitPriceTaxExcl (de la 1ère ligne)`
   - `totalVente = 30 × 20 = 600`
   - `totalAchat = 30 × 8 = 240`
   - `benefice  = 360`

#### Sortie
```js
[
  OrderLineMetrics {
    orderDetail: { productId: 10, productAttributeId: 0, productQuantity: 30, unitPriceTaxExcl: 20 },
    totalVente:  600,
    totalAchat:  240,
    benefice:    360,
    ...
  }
]
```

⚠️ **Piège** : `unitPriceTaxExcl` retenu = celui de la **première ligne**. Si les commandes ont des prix différents (promo), seul le premier est appliqué à la quantité totale.

---

### 6.7 `OrderLineMetrics.listFromProductsWithStockMovements(orderGroups, productsWithCombinations, stockMovements, stockAvailables)`

Source : [OrderLineMetrics.js:108-301](../src/backend/dto/OrderLineMetrics.js#L108-L301)

**Rôle** : construit des lignes métriques en utilisant **les entrées de stock** comme base de calcul du coût (au lieu du `wholesalePrice` figé).

#### Entrée (avec fil rouge, mouvements de la plage `[2026-02-01, 2026-03-31]`)
```js
orderGroups = [ <#1001, qté 20>, <#1002, qté 10> ]

productsWithCombinations = [ <T-shirt bleu DTO, wholesalePrice 8> ]

stockMovements = [
  { idProduct: 10, sign:  1, physicalQuantity: 50, dateAdd: "2026-03-05" },  // ENTRÉE
  { idProduct: 10, sign: -1, physicalQuantity: 30, dateAdd: "2026-03-20" },  // SORTIE (ignorée)
]

stockAvailables = [
  { id: 1, idProduct: 10, idProductAttribute: 0, quantity: 120 }
]
```

#### Transformations
1. **Indexation** des `stockAvailables` par `id` et par clé `productId|attributeId`
2. **Filtre des entrées** : on ne garde que `sign === stockEntrySign (1)` → seule la ligne du 05/03 est retenue
3. **Agrégation des entrées** par clé `"10|0"` :
   - `entryQtyByKey = Map { "10|0" → 50 }`
   - `entryMovementsByKey = Map { "10|0" → [ {movement, stockAvailable} ] }`
4. **Cumul des ventes** par produit dans `orderTotalsByKey` :
   - `"10|0"` → `{ quantity: 30, totalVente: 600 }`
5. **Boucle par produit** (pas par commande) : pour chaque produit × déclinaison :
   - `totalEntryQty = 50`
   - `unitPurchasePrice = 8 + 0 = 8`
   - `totalAchat = 50 × 8 = 400` ← **calcul basé sur les entrées, pas sur les ventes**
   - `totalVente = 600`
   - `benefice  = 600 − 400 = 200`

#### Sortie
```js
[
  OrderLineMetrics {
    orderDetail:   { productId: 10, productAttributeId: 0, productQuantity: 30, unitPriceTaxExcl: 20 },
    productDto:    <T-shirt bleu>,
    totalVente:    600,
    totalAchat:    400,
    benefice:      200,
    stockMovements: [ { movement: <mvt 05/03>, stockAvailable } ],
    stockAvailable: { id: 1, ... },
  }
]
```

> Différence avec 6.6 : `totalAchat` passe de **240** à **400** parce qu'on a acheté 50 unités sur la période, pas seulement les 30 vendues.

---

### 6.8 `OrderCategoryMetrics.groupByCategoryFromProductLines(lines)`

Source : [OrderCategoryMetrics.js:27-110](../src/backend/dto/OrderCategoryMetrics.js#L27-L110)

**Rôle** : agrège par catégorie en repartant des lignes "produit" (recalcule les totaux à partir de la quantité × prix unitaire).

#### Entrée
```js
lines = [
  OrderLineMetrics { orderDetail: {productId:10, productAttributeId:0, productQuantity:30, unitPriceTaxExcl:20}, productDto:<DTO cat=T-shirts>, ... },
  OrderLineMetrics { orderDetail: {productId:20, productAttributeId:0, productQuantity: 5, unitPriceTaxExcl:50}, productDto:<DTO cat=T-shirts>, ... },
]
```

#### Transformations
1. **`byProduct`** : pour chaque ligne, stocke `{ quantity, unitSalePrice, unitPurchasePrice, category }`
   - `"10|0"` → `{ quantity: 30, unitSalePrice: 20, unitPurchasePrice: 8, category: T-shirts }`
   - `"20|0"` → `{ quantity:  5, unitSalePrice: 50, unitPurchasePrice: 30, category: T-shirts }`
2. **`byCategory`** : recalcule `totalVente`, `totalAchat`, `benefice` par produit, puis cumule par catégorie :
   - T-shirts.quantity   = 30 + 5 = **35**
   - T-shirts.totalVente = (30×20) + (5×50)  = 600 + 250 = **850**
   - T-shirts.totalAchat = (30×8)  + (5×30)  = 240 + 150 = **390**
   - T-shirts.benefice   = 850 − 390 = **460**

#### Sortie
```js
[
  OrderCategoryMetrics {
    category:   { id: 5, name: "T-shirts" },
    quantity:   35,
    totalVente: 850,
    totalAchat: 390,
    benefice:   460,
  }
]
```

---

### 6.9 `OrderCategoryMetrics.groupByCategoryFromTotals(lines)`

Source : [OrderCategoryMetrics.js:118-158](../src/backend/dto/OrderCategoryMetrics.js#L118-L158)

**Rôle** : variante plus simple, utilisée quand les totaux sont **déjà calculés** (sortie de `listFromProductsWithStockMovements`). Aucune multiplication, juste un cumul.

#### Entrée
```js
lines = [
  OrderLineMetrics { productDto:<DTO cat=T-shirts>, totalVente:600, totalAchat:400, benefice:200, orderDetail:{productQuantity:30} },
  OrderLineMetrics { productDto:<DTO cat=Casquettes>, totalVente:300, totalAchat:200, benefice:100, orderDetail:{productQuantity:10} },
]
```

#### Transformations
- T-shirts   → cumule directement : 600/400/200/30
- Casquettes → 300/200/100/10

#### Sortie
```js
[
  OrderCategoryMetrics { category: T-shirts,   quantity: 30, totalVente: 600, totalAchat: 400, benefice: 200 },
  OrderCategoryMetrics { category: Casquettes, quantity: 10, totalVente: 300, totalAchat: 200, benefice: 100 },
]
```

---

### 6.10 `StockProductAvailability.listFromProductsAndStockData(stockMovements, orderGroups, productsWithCombinations, stockAvailables)`

Source : [StockProductAvailability.js:50-225](../src/backend/dto/StockProductAvailability.js#L50-L225)

**Rôle** : calcule, par produit/déclinaison, le stock physique, réservé et disponible.

#### Entrée (fil rouge, mouvements **sans borne min**)
```js
stockMovements = [
  { idProduct: 10, sign:  1, physicalQuantity: 100, dateAdd: "2026-01-10" },
  { idProduct: 10, sign:  1, physicalQuantity:  50, dateAdd: "2026-03-05" },
  { idProduct: 10, sign: -1, physicalQuantity:  30, dateAdd: "2026-03-20" },
]

orderGroups = [
  { order: {id:1001, currentState: 1},  orderDetails: [{productId:10, productQuantity:20}] },
  { order: {id:1002, currentState: 11}, orderDetails: [{productId:10, productQuantity:10}] },  // état "réservé"
]

productsWithCombinations = [ <T-shirt bleu DTO sans déclinaison> ]
stockAvailables          = [ { id: 1, idProduct: 10, idProductAttribute: 0 } ]
```

#### Transformations
1. **Solde physique** (boucle sur tous les mouvements) :
   - `+100 + 50 − 30 = 120`
   - `entryQtyByKey = Map { "10|0" → 120 }`
2. **Quantités réservées** : seules les commandes en état `reservedStateIds = [11]` comptent → #1001 ignorée, #1002 retenue
   - `reservedQtyByKey = Map { "10|0" → 10 }`
3. **Boucle par produit × déclinaison** :
   - `physicalQuantity  = 120`
   - `reservedQuantity  = 10`
   - `availableQuantity = 120 − 10 = 110`

#### Sortie
```js
[
  StockProductAvailability {
    product:           { id: 10, name: "T-shirt bleu" },
    category:          { id: 5, name: "T-shirts" },
    declinaison:       null,
    physicalQuantity:  120,
    reservedQuantity:  10,
    availableQuantity: 110,
    stockAvailable:    { id: 1, ... },
    stockMovements:    [ /* 3 mouvements */ ],
    orderDetails:      [ /* 1 détail (celui de #1002) */ ],
  }
]
```

---

### 6.11 `StockCategoryAvailability.groupByCategory(list)`

Source : [StockCategoryAvailability.js:25-62](../src/backend/dto/StockCategoryAvailability.js#L25-L62)

**Rôle** : somme par catégorie les trois quantités (`physique`, `réservée`, `disponible`).

#### Entrée
```js
list = [
  StockProductAvailability { category: T-shirts,   physicalQuantity: 120, reservedQuantity: 10, availableQuantity: 110 },
  StockProductAvailability { category: T-shirts,   physicalQuantity:  50, reservedQuantity:  5, availableQuantity:  45 },
  StockProductAvailability { category: Casquettes, physicalQuantity:  20, reservedQuantity:  0, availableQuantity:  20 },
]
```

#### Transformations
- T-shirts   : 120+50 / 10+5 / 110+45 = **170 / 15 / 155**
- Casquettes : 20 / 0 / 20

#### Sortie
```js
[
  StockCategoryAvailability { category: T-shirts,   physicalQuantity: 170, reservedQuantity: 15, availableQuantity: 155 },
  StockCategoryAvailability { category: Casquettes, physicalQuantity:  20, reservedQuantity:  0, availableQuantity:  20 },
]
```

---

## 7. Synthèse comparative

| Aspect | Agrégation 1 | Agrégation 2 | Agrégation 3 |
|---|---|---|---|
| Source du coût | `product.wholesalePrice` (figé) | mouvements d'**entrée** de stock | — |
| Source des ventes | `orderDetail.unitPriceTaxExcl` × qty | idem | — |
| Itération principale | par lignes de commande | par produits | par produits |
| Filtre date appliqué à | commandes uniquement | commandes **et** mouvements | mouvements ≤ `dateMax` + commandes |
| Borne min sur les mouvements | — | oui | **non** (solde cumulé) |
| Question répondue | Marge théorique des ventes | Flux trésorerie achats/ventes | État du stock à la date max |

**Point clé à retenir** : l'agrégation 2 mélange "ce qui est entré" avec "ce qui est sorti", ce qui en fait un indicateur de flux et non une marge produit — c'est pourquoi l'agrégation 1 reste utile en parallèle.
