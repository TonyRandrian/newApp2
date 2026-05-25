# Page « Dépenses totales par client »

Ce document décrit les **changements exacts à effectuer** pour ajouter une
nouvelle page Back-Office listant le total dépensé par chaque client,
agrégé depuis ses commandes.

Aucune modification du cœur PrestaShop ni du module Webservice
(`my_orde_state`) n'est nécessaire — la page consomme les endpoints
`/api/orders` et `/api/customers` existants.

---

## 1. Vue d'ensemble

| Aspect | Choix |
|---|---|
| Route | `/customer-spending` |
| Fichier page | [src/pages/BOCustomerSpending.jsx](../src/pages/BOCustomerSpending.jsx) (à créer) |
| Lien sidebar | Bloc « Pilotage » de [BOMainLayout.jsx](../src/layouts/BOMainLayout.jsx) |
| Données | `Order.getAll()` + `Customer.getAll()` (jointure côté client par `customerId`) |
| Filtres | Plage de dates (`dateAdd`), statut de commande (optionnel) |
| Affichage | `MaterialReactTable` avec tri sur le total, ligne **Total** en pied de tableau |
| Exclusions | Commandes annulées (`currentState = 6`) écartées par défaut |

Pipeline :

```
Order.getAll()  ──▶  filtre par dateAdd (plage choisie)
                 │
                 └─▶ exclure currentState = 6 (annulées)
                          │
                          ▼
                 group by customerId  →  Σ totalPaidTaxIncl
                          │
                          ▼
                 join Customer (id → "Prénom Nom" / email)
                          │
                          ▼
                 trier desc par total  →  table
```

---

## 2. Champ « total » à agréger

Le `Order` expose plusieurs champs de total
([Order.js:46-49](../src/backend/entities/Order.js#L46-L49)) :

| Champ | Sens | Recommandation |
|---|---|---|
| `totalPaid` | Total TTC théorique de la commande. | — |
| `totalPaidTaxIncl` | Total TTC effectif. | ✅ **À utiliser** — c'est ce que le client doit payer. |
| `totalPaidTaxExcl` | Total HT. | Si la page veut une vue HT. |
| `totalPaidReal` | Total réellement encaissé (peut différer si paiement partiel). | Alternative pour une vue « encaissé » plutôt que « facturé ». |

Choix par défaut : **`totalPaidTaxIncl`** — aligné sur la bannière de
[BOOrderList.jsx](../src/pages/BOOrderList.jsx) qui parle de « total » TTC.
Exposer un sélecteur dans l'UI si plusieurs vues sont utiles (cf. §6).

---

## 3. Modifications à effectuer

### 3.1 Nouveau fichier : `src/pages/BOCustomerSpending.jsx`

Squelette aligné sur [BOStatistic.jsx](../src/pages/BOStatistic.jsx) (mêmes
classes CSS, mêmes patrons `bo-card` / `bo-filters` / `bo-kpis`).

Responsabilités :

1. **Chargement initial** (`useEffect`, vide en deps) :
   - `await new Order({}, false).getByNot("currentState", 6)` → exclut les
     annulées dès la source (même règle que `BOStatistic`,
     [BOStatistic.jsx:45](../src/pages/BOStatistic.jsx#L45)).
   - `await new Customer({}, false).getAll()` → pour résoudre le nom.
   - Stocker `orders` et `customers` dans le state.

2. **Filtrage par dates** (`useMemo` sur `dateMin`, `dateMax`) :
   - Utiliser `Order.filterByDateRange(orders, dateMin, dateMax)` qui existe
     déjà ([Order.js:104](../src/backend/entities/Order.js#L104)).

3. **Agrégation par client** (`useMemo`) :
   ```js
   const byCustomer = new Map()
   for (const order of filteredOrders) {
       const id = Number(order.customerId)
       const prev = byCustomer.get(id) ?? {
           customerId: id,
           orderCount: 0,
           totalSpent: 0,
       }
       prev.orderCount += 1
       prev.totalSpent += Number(order.totalPaidTaxIncl ?? 0)
       byCustomer.set(id, prev)
   }
   ```
   Puis enrichissement avec `Customer` :
   ```js
   const customerById = new Map(
       customers.map((c) => [Number(c.id), c]),
   )
   const rows = Array.from(byCustomer.values()).map((row) => {
       const c = customerById.get(row.customerId)
       return {
           ...row,
           customerName: c ? `${c.firstname} ${c.lastname}`.trim() : `Client #${row.customerId}`,
           customerEmail: c?.email ?? "",
       }
   }).sort((a, b) => b.totalSpent - a.totalSpent)
   ```

4. **KPI** : total global (`Σ totalSpent`), nombre de clients (taille du Map),
   panier moyen (`totalSpent / orderCount`).

5. **Table `MaterialReactTable`** avec colonnes :
   | Colonne | accessor | Cell |
   |---|---|---|
   | Client | `customerName` | brut |
   | Email | `customerEmail` | brut |
   | Nombre de commandes | `orderCount` | brut |
   | Total dépensé | `totalSpent` | `formatNumber` (2 décimales) + `Footer` = total global |

6. **Filtres UI** dans une `bo-card` en haut : `<input type="date">` pour
   `dateMin` / `dateMax` + bouton « Réinitialiser » (calque de
   [BOStatistic.jsx:305-330](../src/pages/BOStatistic.jsx#L305-L330)).

7. **États** : `loading`, `error`, mêmes patrons que `BOStatistic`
   (`bo-status--loading`, `bo-banner bo-banner--error`).

> Pas de service backend dédié dans un premier temps — la logique tient en
> ~30 lignes dans la page. Si elle grossit (export CSV, pagination serveur,
> graphes…), extraire vers `src/backend/services/CustomerSpendingService.js`
> en s'inspirant de [DashboardService.js](../src/backend/services/DashboardService.js).

### 3.2 [src/router/index.jsx](../src/router/index.jsx)

Ajouter l'import et l'entrée de route dans le bloc `BOMainLayout` (children) :

```jsx
import BOCustomerSpending from "../pages/BOCustomerSpending.jsx";

// ... dans children du layout BO, après "statistics" :
{
    path: "customer-spending",
    element: <BOCustomerSpending/>
},
```

### 3.3 [src/layouts/BOMainLayout.jsx](../src/layouts/BOMainLayout.jsx)

Ajouter le lien dans la section « Pilotage » de la sidebar (après le lien
« Statistics », [BOMainLayout.jsx:37](../src/layouts/BOMainLayout.jsx#L37)) :

```jsx
<Link to={"/customer-spending"} className="bo-sidebar__link">Customer spending</Link>
```

### 3.4 Aucune nouvelle entité

`Order` et `Customer` couvrent tout le besoin. Pas de DTO requis pour la v1.

---

## 4. Règles métier — points à trancher

| Question | Décision par défaut | Notes |
|---|---|---|
| Inclure les commandes annulées ? | **Non** (`currentState != 6`). | Aligné sur `BOStatistic`. |
| Inclure les commandes non livrées ? | **Oui** — toute commande non annulée compte. | Si on veut « encaissé réel », filtrer aussi sur `currentState ∈ [LIVRE_ID]` ou utiliser `totalPaidReal`. |
| Client anonyme (id `1`) ? | Inclus, affiché « Utilisateur anonyme ». | Pas un client réel mais utile pour ne pas perdre du CA. |
| Clients sans commande sur la période ? | **Non affichés** (on part des commandes, pas des clients). | Si besoin de les afficher, partir de `customers` et `LEFT JOIN` avec `byCustomer`. |
| Doublons par devise ? | Ignorés. | La boutique est mono-devise (`currencyId = 1`, voir [hardcoded-values.md](./hardcoded-values.md)). Convertir via `conversionRate` sinon. |

---

## 5. Performance

- `Order.getAll()` ramène **toutes** les commandes (`?display=full`). C'est
  déjà ce que fait `BOStatistic` et `BOOrderList` — pas de régression.
- `Customer.getAll()` ramène tous les clients. Idem.
- L'agrégation est en O(n) sur les commandes filtrées, donc négligeable.

Si le catalogue dépasse plusieurs milliers de commandes, envisager :
- un filtre serveur sur la plage de dates (`filter[date_add]=…`) pour réduire
  le payload — non implémenté actuellement dans `Order` mais le pattern
  `buildApiFilterQuery` se prête à un nouvel helper.
- une pagination côté table (`MaterialReactTable` la fournit nativement
  via `enablePagination`).

---

## 6. Améliorations possibles (hors v1)

- **Sélecteur de total** : radio `TTC / HT / Encaissé réel` qui change le
  champ agrégé entre `totalPaidTaxIncl`, `totalPaidTaxExcl`, `totalPaidReal`.
- **Drill-down** : clic sur une ligne client → navigation vers
  `/orders?customerId=…` (à coupler avec un filtre côté `BOOrderList`).
- **Export CSV** : `MaterialReactTable` propose un export natif, à activer
  via `enableTopToolbar` + `MRT_ExportButton`.
- **Graphique** : top 10 clients en barres (Recharts, déjà disponible si
  utilisé ailleurs — sinon nouvelle dépendance).
- **Statut au sélecteur** : reprendre le `<select>` de `BODashboard` pour
  filtrer par `currentState` (utile pour ne compter que les commandes
  livrées par exemple).

---

## 7. Tests manuels recommandés

| Scénario | Attendu |
|---|---|
| Aucun filtre de date | Toutes les commandes non annulées agrégées, somme totale = somme de `BOStatistic` (KPI « Ventes (Commandes) ») au format TTC. |
| Plage de dates restreinte | Total et nombre de commandes baissent en conséquence ; clients sans commande sur la plage disparaissent. |
| Client avec 2 commandes (1 livrée, 1 en attente) | `orderCount = 2`, `totalSpent` = somme des deux `totalPaidTaxIncl`. |
| Client anonyme (id 1) avec une commande | Apparaît sous « Utilisateur anonyme » ou « Client #1 » selon le résolveur. |
| Commande annulée | Absente du calcul (filtrée par `getByNot("currentState", 6)`). |
| Tri | Par défaut décroissant sur `totalSpent` ; chaque colonne cliquable pour inverser. |
| Pied de tableau | La somme `totalSpent` au pied doit égaler la somme affichée dans le KPI. |
