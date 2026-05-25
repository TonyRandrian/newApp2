# Annulation d'une commande livrée — retour automatique des mouvements de stock

Ce document décrit **les changements exacts à effectuer** pour ajouter la
fonctionnalité suivante :

> Lorsqu'on change l'état d'une commande vers **« Annulé » (id 6)**, on vérifie
> d'abord si la commande est déjà passée par l'état **« Livré » (id 5)**.
> Si oui, on **retourne les mouvements de stock** liés à cette commande en
> créant de **nouveaux** mouvements de signe opposé pour les contrer.

Aucune modification du cœur PrestaShop n'est nécessaire — toute la logique
s'ajoute côté frontend (service [OderService.js](../src/backend/services/OderService.js)).
Le module Webservice `my_orde_state` (voir [MY_ORDER_STATE.md](./MY_ORDER_STATE.md))
reste inchangé.

---

## 1. Vue d'ensemble du flux cible

```
UI BOOrderList → handleClick → orderService.updateOrderState(orderId, 6, date)
                                          │
                                          ▼
                              transition autorisée ?
                                          │
                       ┌──────────────────┼──────────────────┐
                       ▼                                     ▼
              currentState == 5 (Livré)            currentState != 5
                       │                                     │
                       ▼                                     ▼
        1. Lire les StockMvt de la commande           pas de retour de stock
           (idOrder = orderId, sign = -1)
        2. Pour chacun, créer un StockMvt
           inverse (sign = +1, même qty,
           même produit/déclinaison,
           raison = "entrée de retour")
        3. Continuer le changement d'état → 6
```

Le changement d'état lui-même reste géré par `MyOrderState.save()` qui appelle
le Webservice `/api/my_order_state`. Le retour des mouvements de stock est
exécuté **avant** ce changement d'état, afin que si l'inversion échoue,
l'annulation soit aussi annulée (échec rapide, état cohérent).

---

## 2. États et constantes concernés

Déjà déclarés dans [OderService.js:13-17](../src/backend/services/OderService.js#L13-L17) :

| Constante | Valeur | Rôle |
|---|---:|---|
| `LIVRE_ID` | `5` | État « Livré » — déclenche un sortant de stock `sign = -1`. |
| `ANNULE_ID` | `6` | État « Annulé » — cible de la nouvelle transition. |
| `PAIEMENT_A_DISTANCE_ACCEPTE_ID` | `11` | État initial « réservé ». |

Côté `StockMvt` ([StockMvt.js:9-12](../src/backend/entities/StockMvt.js#L9-L12)) :

| Constante | Valeur | Rôle |
|---|---|---|
| `stockEntryReasonIds` | `[1, 10]` | Raisons d'entrée. **10** correspond à « Retour client / annulation » en standard PrestaShop — à utiliser pour le mouvement inverse. |
| `stockEntrySign` | `+1` | Signe d'entrée. |
| `stockExitReasonIds` | `[2, 3]` | Raisons de sortie (commande livrée, etc.). |
| `stockExitSign` | `-1` | Signe de sortie. |

> ⚠️ Vérifier en BO (Paramètres avancés → Stocks → Raisons de mouvement) que
> l'ID `10` correspond bien à une raison d'entrée appropriée. Si ce n'est pas
> le cas, créer ou choisir une raison dédiée et exposer son ID en constante
> (par ex. `RETOUR_ANNULATION_REASON_ID = 10`) dans `OderService.js`.

---

## 3. Modifications à effectuer

### 3.1 [`src/backend/services/OderService.js`](../src/backend/services/OderService.js)

#### a) Ajouter une constante de raison de retour

En tête de fichier, à côté des autres constantes d'état :

```js
// Raison d'entrée de stock pour une annulation (retour client)
const RETOUR_ANNULATION_REASON_ID = 10
```

#### b) Mettre à jour la table des transitions autorisées

Aujourd'hui ([OderService.js:151](../src/backend/services/OderService.js#L151)) :

```js
const allowed = new Set(["11-5", "11-6", "5-6"])
```

La transition `5-6` (Livré → Annulé) est **déjà** autorisée — c'est elle qui
doit déclencher le retour de stock. **Aucune modification de cette ligne**,
juste s'assurer qu'elle reste présente.

#### c) Ajouter une fonction `revertStockMovementsForOrder(orderId, dateUpdate)`

À placer dans `OderService.js`, juste avant `updateOrderState`. Elle doit :

1. Charger tous les `StockMvt` ayant `idOrder = orderId` via
   `StockMvt.getByApi("id_order", orderId)` (filtre côté API).
2. Ne garder que les sortants (`sign === -1`) qui n'ont **pas déjà été
   contrés** — voir §4.1 pour la stratégie d'idempotence.
3. Pour chacun de ces sortants, instancier un nouveau `StockMvt` via
   `StockMvt.fromData({...})` avec :
   - `idProduct`, `idProductAttribute` : copiés du sortant d'origine.
   - `idStock` : laissé à 0 (le `save()` de `StockMvt` le réassigne à partir
     de `StockAvailable` — voir [StockMvt.js:69-76](../src/backend/entities/StockMvt.js#L69-L76)).
   - `physicalQuantity` : identique au sortant.
   - `sign` : `+1` (`StockMvt.stockEntrySign`).
   - `idStockMvtReason` : `RETOUR_ANNULATION_REASON_ID`.
   - `idOrder` : `orderId` (on garde la traçabilité — utile pour le §4.1 et
     pour [StockMvtService.js](../src/backend/services/StockMvtService.js),
     voir §5).
   - `idEmployee` : `1` (même valeur que celle passée à `my_order_state`).
   - `dateAdd` : `ensureLocalDateTime(dateUpdate)` (alignée sur la date du
     changement d'état).
   - Autres champs (`productName`, `ean13`, `reference`, etc.) : copiés du
     sortant d'origine pour cohérence des logs BO.
4. Appeler `await mvt.save()` séquentiellement (pas en parallèle — pour ne
   pas violer la cohérence de `StockAvailable.quantity` côté API).
5. Retourner la liste des nouveaux mouvements créés.

#### d) Intégrer l'appel dans `updateOrderState`

Dans [`updateOrderState`](../src/backend/services/OderService.js#L132), juste
**après** la vérification de la transition (`allowed.has(fromTo)`) et **avant**
la construction du `MyOrderState.fromData({...})`, ajouter :

```js
let revertedMovements = []
if (
    Number(newStateId) === ANNULE_ID &&
    Number(currentStateId) === LIVRE_ID
) {
    revertedMovements = await revertStockMovementsForOrder(
        Number(orderId),
        dateUpdate,
    )
}
```

Puis enrichir le retour de la fonction :

```js
return {
    success: true,
    orderId: Number(orderId),
    orderStateId: Number(newStateId),
    orderHistory: latest,
    revertedMovements,        // ← nouveau champ
    rawResponse: res,
}
```

#### e) Gestion d'erreur

Si `revertStockMovementsForOrder` lève une exception :
- Ne pas appeler `MyOrderState.save()`.
- Laisser l'erreur remonter dans le `try/catch` existant
  ([OderService.js:178](../src/backend/services/OderService.js#L178)) pour
  qu'elle soit propagée à l'UI sous forme de bannière d'erreur.

Si **certains** mouvements ont été contrés avant l'échec, l'état est
incohérent (entrées partielles, état de la commande inchangé). C'est acceptable
pour un v1 ; le §6 décrit une amélioration possible.

### 3.2 [`src/components/BOOrderRow.jsx`](../src/components/BOOrderRow.jsx)

Aucune modification fonctionnelle requise. L'option « Annulé » est déjà
proposée ([BOOrderRow.jsx:29](../src/components/BOOrderRow.jsx#L29)).

Optionnel : désactiver l'option « Annulé » quand le `currentState` n'est ni
`5` ni `11` pour éviter de soumettre une transition refusée. Pas obligatoire,
le service rejette déjà avec un message clair.

### 3.3 [`src/pages/BOOrderList.jsx`](../src/pages/BOOrderList.jsx)

Optionnel : afficher dans `actionResult` le nombre de mouvements contrés.
Dans la bannière de succès ([BOOrderList.jsx:84-91](../src/pages/BOOrderList.jsx#L84-L91)),
ajouter une ligne après l'historique :

```jsx
{actionResult.revertedMovements?.length > 0 && (
    <>
        {" "}
        Stock réintégré : {actionResult.revertedMovements.length} mouvement(s).
    </>
)}
```

---

## 4. Idempotence & garde-fous

### 4.1 Ne pas contrer deux fois le même sortant

Si l'utilisateur change l'état Livré → Annulé → Livré → Annulé, sans garde-fou
on créerait à chaque cycle un nouveau lot d'entrées de retour. Or :
- La première annulation crée des entrées (`sign = +1`,
  `idStockMvtReason = 10`) avec le même `idOrder`.
- Une nouvelle livraison crée à son tour un nouveau sortant (`sign = -1`,
  raison ∈ `[2, 3]`).
- La seconde annulation doit alors ne contrer **que** le nouveau sortant,
  pas l'ancien déjà contré.

**Stratégie** : dans `revertStockMovementsForOrder`, après filtrage sur
`sign === -1`, soustraire l'effet des entrées de retour déjà présentes.

```js
const allMvts = await new StockMvt({}, false)
    .getByApi("id_order", orderId)

const exits = allMvts.filter((m) => Number(m.sign) === -1)
const returns = allMvts.filter(
    (m) => Number(m.sign) === 1 &&
           Number(m.idStockMvtReason) === RETOUR_ANNULATION_REASON_ID,
)

// On regroupe par (idProduct, idProductAttribute) et on
// neutralise les retours déjà posés sur la quantité sortie cumulée.
```

Concrètement : pour chaque `(produit, déclinaison)`, calculer
`netSorti = Σ qty(exits) − Σ qty(returns)`. Si `netSorti > 0`, créer **une
seule** entrée de quantité `netSorti` (plutôt qu'une entrée par sortant). Ça
donne aussi un historique plus lisible en BO.

### 4.2 Commande livrée sans aucun StockMvt

Possible si la livraison a été enregistrée hors `my_order_state` (POST natif
sur `/api/order_histories` en contexte legacy — voir §5 de
[MY_ORDER_STATE.md](./MY_ORDER_STATE.md)). Dans ce cas `revertStockMovementsForOrder`
retourne `[]` et l'annulation se poursuit sans rien faire — comportement
voulu (rien à contrer).

### 4.3 Vérifier l'état actuel, pas seulement l'historique

`updateOrderState` détermine déjà `currentStateId` à partir du dernier
`OrderHistory` ([OderService.js:146-149](../src/backend/services/OderService.js#L146-L149)).
Ne **pas** se contenter de `order.currentState` côté UI — il peut être
désynchronisé si plusieurs onglets agissent en même temps. La logique en
place est correcte, la conserver.

---

## 5. Impact sur le calcul d'évolution de stock

Le service [StockMvtService.js](../src/backend/services/StockMvtService.js)
(voir [stock-evolution.md](./stock-evolution.md)) agrège les `StockMvt` pour
construire les histogrammes journaliers. Les entrées de retour générées par
cette fonctionnalité s'intégreront automatiquement :

- elles seront comptées dans `totalIn` du jour de retour ;
- `final` (stock physique en fin de journée) remontera de la quantité retournée ;
- côté commandes, **attention** : la commande passe en état `6` (Annulé) qui
  n'est ni dans `Order.reservedStateIds` ni dans `Order.deliveredStateIds`
  → elle disparaît du calcul de réservation (voir
  [stock-evolution.md §5.2](./stock-evolution.md#52-commande-dans-un-état-autre)).
  Le `−qty` de libération qui avait été émis au jour du sortant disparaît
  aussi → cohérent : la commande n'occupe plus ni le stock physique
  (réintégré) ni le réservé.

Aucune adaptation de `StockMvtService.js` n'est nécessaire.

---

## 6. Améliorations possibles (hors v1)

- **Transactionalité** : si l'inversion partielle échoue, recréer les sortants
  effacés (rollback applicatif). PrestaShop Webservice ne propose pas de
  transaction multi-ressources ; il faudrait soit un endpoint custom (étendre
  `my_orde_state`), soit accepter une étape de réconciliation manuelle.
- **Confirmation utilisateur** : demander confirmation dans
  [BOOrderList.jsx](../src/pages/BOOrderList.jsx) avant d'annuler une commande
  livrée (« Cela va réintégrer N article(s) au stock. Continuer ? »).
- **Trace d'annulation** : enregistrer dans `note` de la commande la liste des
  StockMvt contrés et leur date, pour audit.
- **Configurabilité** : exposer `RETOUR_ANNULATION_REASON_ID` dans
  [hardcoded-values.md](./hardcoded-values.md) puis le déplacer vers un
  fichier de config commun.

---

## 7. Tests manuels recommandés

| Scénario | Attendu |
|---|---|
| Commande état 11 → 6 | Pas de StockMvt créé, état → 6. |
| Commande état 11 → 5 → 6 | À la 2e transition : N entrées de retour créées avec `idOrder` correct, `sign=+1`, `idStockMvtReason=10`. État → 6. `StockAvailable.quantity` revient à sa valeur d'avant livraison. |
| Commande état 11 → 5 → 6 → 5 → 6 | À la dernière transition : seuls les sortants postérieurs à la 1re annulation sont contrés (idempotence §4.1). |
| Échec API pendant l'inversion | L'erreur remonte dans la bannière, l'état de la commande **n'a pas changé** (`MyOrderState.save()` n'a pas été appelé). |
| Commande livrée hors `my_order_state` (sans StockMvt) | Annulation simple, `revertedMovements = []`. |
