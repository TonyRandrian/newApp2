# Duplication de panier à partir d'une commande

Ce document décrit comment fonctionne la **duplication d'un panier** depuis une
commande existante dans l'interface front-office (page "Mes commandes").

> Depuis la liste des commandes du client, un bouton « Dupliquer » permet de
> recréer un panier à partir des lignes d'une commande passée, en appliquant
> éventuellement un **multiplicateur** sur les quantités et une **date** de
> mise à jour.

La logique est entièrement côté frontend, répartie sur trois couches :

| Couche | Fichier | Rôle |
|---|---|---|
| UI | [FOOrderList.jsx](../src/pages/FOOrderList.jsx) | Saisie du multiplicateur / date et déclenchement de l'action |
| Service commande | [OderService.js](../src/backend/services/OderService.js) | Récupération de la commande et de son panier source |
| Service panier | [CartService.js](../src/backend/services/CartService.js) | Création/réutilisation du panier client et ajout des lignes |

---

## 1. Vue d'ensemble du flux

```
UI FOOrderList → handleClick(orderId)
                         │
                         ▼
        orderService.duplicateCart(orderId, multiplicateur, dateUpdate)
                         │
                         ▼
        1. Charger la commande par id
        2. Charger le panier source via order.cartId
        3. Déléguer à CartService.duplicateCart(cart, multiplicateur, dateUpdate)
                         │
                         ▼
        Pour chaque cartRow du panier source :
            row.quantity *= multiplicateur
            addProductToCart(customerId, productId, productAttributeId, quantity)
                         │
                         ▼
        addProductToCart → createOrUpdateCart(customer, date, [cartRow])
            ├── si un panier "actif" (sans commande) existe → on l'enrichit
            └── sinon → nouveau panier créé pour le client
```

L'utilisateur ne crée pas une *copie* du panier source, mais un (ou le)
**panier ouvert du client**, dans lequel les lignes de la commande sont
ajoutées.

---

## 2. Côté UI — [FOOrderList.jsx](../src/pages/FOOrderList.jsx)

L'état local `edit` retient ce que l'utilisateur saisit pour la ligne en
cours d'édition :

```js
const [edit, setEdit] = useState({
    orderId: null,
    cartId: null,
    multiplicateur: 1,
    dateUpdate: "",
    cartDateOrder: "",
})
```

Le clic sur « Dupliquer » appelle [handleClick](../src/pages/FOOrderList.jsx#L41) :

```js
const handleClick = async (orderId) => {
    setBanner(null)
    try {
        await orderService.duplicateCart(
            orderId,
            edit?.multiplicateur ?? 1,
            edit?.dateUpdate || formatDateInput(new Date())
        )
        // ... recharge la liste des commandes et paniers du client
    } catch (error) {
        // bannière d'erreur
    }
}
```

Points à noter :

- `multiplicateur` défaut = **1** (pas de changement de quantité).
- `dateUpdate` défaut = **date du jour** (`formatDateInput(new Date())`).
- Après succès, on rafraîchit la liste des commandes **et** des paniers sans
  commande, pour que le nouveau panier apparaisse.

---

## 3. Service commande — [OderService.duplicateCart](../src/backend/services/OderService.js#L316)

```js
const duplicateCart = async (orderId, multiplicateur, dateUpdate) => {
    const orderClass = new Order("", false)
    const order = await orderClass.getById(Number(orderId))
    let cart = null

    if (order && order.cartId) {
        const cartClass = new Cart({}, false)
        cart = await cartClass.getById(Number(order.cartId))
    }

    await CartService.duplicateCart(cart, multiplicateur, dateUpdate);
    return { success: !!cart, cart, orderId: Number(orderId) }
}
```

Son rôle est de **résoudre le panier source** lié à la commande :

1. Récupère la commande par son `orderId`.
2. Récupère le panier d'origine via `order.cartId` (chaque commande PrestaShop
   est issue d'un panier).
3. Délègue la copie effective à [CartService.duplicateCart](../src/backend/services/CartService.js#L162).

> Note : le paramètre `dateUpdate` est transmis mais n'est **pas utilisé**
> actuellement par `CartService.duplicateCart` (voir §5).

---

## 4. Service panier — [CartService.duplicateCart](../src/backend/services/CartService.js#L162)

```js
const duplicateCart = async (cart, multiplicateur, dateUpdate) => {
    for (const row of cart.cartRows) {
        row.quantity = Number(row.quantity) * multiplicateur
        await addProductToCart(
            cart.customerId,
            row.productId,
            row.productAttributeId,
            row.quantity
        );
    }
}
```

Itération **séquentielle** sur les lignes du panier source. Pour chacune :

1. Multiplie la quantité par `multiplicateur`.
2. Appelle [addProductToCart](../src/backend/services/CartService.js#L140) qui
   se charge de la création/mise à jour du panier client.

### 4.1. `addProductToCart`

```js
const addProductToCart = async (idCustomer, idProduct, idProductAttribute, quantity, multiplicateur = 1) => {
    const factor = Number(multiplicateur) || 1;
    const safeQty = Math.max(1, Math.trunc((Number(quantity) || 0) * factor));

    const cartRow = {
        productId: idProduct,
        productAttributeId: idProductAttribute,
        quantity: safeQty,
        addressDeliveryId: 0,
    };

    const { cart, isNew } = await createOrUpdateCart(idCustomer, new Date(), [cartRow]);
    if (isNew) return cart;

    cartRow.addressDeliveryId = cart.addressDeliveryId;
    cart.cartRows = [...(cart.cartRows ?? []), cartRow];
    await cart.update();
    return cart;
}
```

- Garantit `quantity >= 1`.
- Délègue à [createOrUpdateCart](../src/backend/services/CartService.js#L69) :
  - s'il existe déjà un panier actif (sans commande) pour ce client →
    le panier est **réutilisé** et la ligne y est ajoutée ;
  - sinon → un **nouveau** panier est créé avec cette ligne comme contenu
    initial.

### 4.2. Qu'est-ce qu'un panier "actif" ?

[isCartActive](../src/backend/services/CartService.js#L34) considère un panier
actif s'il **n'a pas encore donné lieu à une commande** :

```js
const isCartActive = async (idCart) => {
    const orderApi = new Order({}, false);
    const xml = await api.get(`${orderApi.endpoint}?display=full&filter[id_cart]=[${idCart}]`);
    const orders = toOrderJSONList(xml);
    return orders.length === 0;
}
```

Conséquence : si le client a déjà un panier ouvert, **dupliquer une commande
ajoute ses lignes à ce panier existant** plutôt que d'en créer un nouveau.

---

## 5. Limites et points d'attention

- **`dateUpdate` non appliquée**
  Le paramètre est propagé jusqu'à `CartService.duplicateCart` mais n'est
  jamais transmis à `addProductToCart` / `createOrUpdateCart`. Aujourd'hui
  c'est `new Date()` (utilisé par `addProductToCart`) qui prime, pas la
  date saisie côté UI. À corriger si cette date est censée être visible
  dans `dateAdd` / `dateUpd` du panier.

- **Mutation du panier source**
  La boucle fait `row.quantity = Number(row.quantity) * multiplicateur` —
  elle modifie en mémoire l'objet `cart.cartRows` issu du panier source.
  Comme aucun `cart.update()` n'est appelé sur ce panier source, l'effet
  reste local, mais c'est fragile : si une logique de partage de cache
  était introduite, le panier source serait corrompu.

- **Pas de copie atomique**
  Les lignes sont ajoutées **une par une** (un appel `addProductToCart`
  par ligne). Si l'une échoue, le panier client peut se retrouver dans un
  état partiel.

- **Fusion implicite avec le panier en cours**
  Si le client a déjà un panier ouvert, ses anciennes lignes sont
  conservées et celles de la commande viennent s'**ajouter** par-dessus.
  Ce comportement est volontaire (voir [createOrUpdateCart](../src/backend/services/CartService.js#L69))
  mais doit être clair pour l'utilisateur.

- **Multiplicateur non-entier**
  `addProductToCart` fait `Math.trunc(quantity * factor)`. Un multiplicateur
  fractionnaire est accepté mais la quantité finale est tronquée à
  l'entier inférieur (avec un minimum de 1).

---

## 6. Schéma récapitulatif des appels

```
FOOrderList.handleClick(orderId)
        │
        ▼
OderService.duplicateCart(orderId, multiplicateur, dateUpdate)
        │
        ├── Order.getById(orderId)
        ├── Cart.getById(order.cartId)               ← panier source
        │
        ▼
CartService.duplicateCart(cart, multiplicateur, dateUpdate)
        │
        └── pour chaque row :
            CartService.addProductToCart(
                customerId, productId, productAttributeId, qty*multiplicateur
            )
                    │
                    ▼
            CartService.createOrUpdateCart(customerId, new Date(), [cartRow])
                    │
                    ├── getLastCartByCustomer → isCartActive
                    │       ├── actif  → cart.update()  (ajout de la ligne)
                    │       └── inexistant/clos → new Cart(...).save()
```
