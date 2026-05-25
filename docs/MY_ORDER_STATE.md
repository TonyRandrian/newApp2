# Module `my_orde_state` — Endpoint Webservice `/api/my_order_state`

Expose la méthode `OrderHistory::changeIdOrderState()` via un endpoint Webservice
PrestaShop natif, avec une **date de mouvement configurable** (par défaut : aujourd'hui).

- PrestaShop : **8.2.6**
- Type de ressource : `specific_management` (comme `search`, `images`, …)
- Méthodes HTTP : **GET** et **POST**

---

## 1. Vue d'ensemble

Le besoin était double :

1. Créer un endpoint `/api/my_order_state` accessible comme les autres
   endpoints du Webservice PrestaShop, qui expose
   `changeIdOrderState($new_order_state, $id_order, $use_existing_payment)`.
2. Modifier `changeIdOrderState()` pour que la **date du mouvement** soit
   définissable depuis l'API, avec pour valeur par défaut la date du jour.

L'implémentation s'appuie sur le mécanisme officiel d'extension du Webservice
(hook `addWebserviceResources` + classe `WebserviceSpecificManagement…`), donc
sans modifier `WebserviceRequest::getResources()`.

---

## 2. Fichiers créés

| Fichier | Rôle |
|---|---|
| `modules/my_orde_state/my_orde_state.php` | Classe du module. Enregistre le hook `addWebserviceResources` à l'installation et déclare la ressource `my_order_state`. |
| `modules/my_orde_state/classes/WebserviceSpecificManagementMyOrderState.php` | Handler de la ressource : lecture des paramètres, validation, appel de `changeIdOrderState()`, rendu de la réponse. |
| `modules/my_orde_state/config.xml` | Métadonnées du module. |
| `modules/my_orde_state/index.php` | Stub de sécurité (anti-listing). |
| `modules/my_orde_state/classes/index.php` | Stub de sécurité. |
| `modules/my_orde_state/controller/index.php` | Stub de sécurité. |

> Note : `modules/my_orde_state/controller/shiporder.php` était présent (vide) et
> non utilisé. Il a été laissé en place.

## 3. Fichiers du cœur modifiés

> ⚠️ Ces deux fichiers font partie du cœur de PrestaShop. Les modifications ne
> sont **pas upgrade-safe** : il faudra les réappliquer après une mise à jour.

### `src/Core/Stock/StockManager.php` — `prepareMovement()`

Avant, la date du mouvement de stock était toujours « maintenant » :

```php
$stockMvt->setDateAdd(new DateTime());
```

Après, elle peut être forcée via `$params['date_add']` (objet `DateTime` ou
chaîne), avec repli sur la date courante :

```php
if (!empty($params['date_add'])) {
    $dateAdd = $params['date_add'] instanceof DateTime
        ? $params['date_add']
        : new DateTime((string) $params['date_add']);
} else {
    $dateAdd = new DateTime();
}
$stockMvt->setDateAdd($dateAdd);
```

`saveMovement()` a aussi reçu un **repli pour les contextes legacy** (Webservice) :
si `SymfonyContainer::getInstance()` est `null`, on persiste l'entité `StockMvt`
via l'`EntityManager` Doctrine du conteneur PrestaShop
(`Context::getContext()->container`) au lieu d'abandonner silencieusement.
Voir §5 « Mouvements de stock en contexte Webservice ».

### `classes/order/OrderHistory.php` — `changeIdOrderState()`

Signature étendue avec un 4ᵉ paramètre optionnel (rétro-compatible — tous les
appelants existants : `addWs`, BO, etc. continuent de fonctionner) :

```php
public function changeIdOrderState($new_order_state, $id_order, $use_existing_payment = false, $movement_date = null)
```

`$movement_date` est transmis à `StockManager::saveMovement()` uniquement
lorsqu'il est défini :

```php
$movement_params = [
    'id_order' => $order->id,
    'id_stock_mvt_reason' => (...),
];
if (!empty($movement_date)) {
    $movement_params['date_add'] = $movement_date;
}
(new StockManager())->saveMovement(..., $movement_params);
```

---

## 4. Contrat de l'API

`GET` **ou** `POST` sur `/api/my_order_state`. Les paramètres peuvent être
fournis :

- en **query string** (le dispatcher Webservice expose `$_GET` pour toutes les
  méthodes) ;
- et/ou dans un **corps XML** « façon PrestaShop » (POST/PUT/PATCH).

Si les deux sont présents, **la query string est prioritaire** sur le corps
(pratique pour surcharger ponctuellement, ex. `?sendemail=1`).

| Paramètre | Obligatoire | Défaut | Description |
|---|---|---|---|
| `id_order` | ✅ | — | Identifiant de la commande. |
| `id_order_state` | ✅ | — | Identifiant de l'état cible. |
| `id_employee` | ❌ | employé du contexte | Identifiant de l'employé associé à l'entrée d'historique. Validé (doit exister). À défaut, l'employé du contexte courant (souvent aucun en Webservice). |
| `date` | ❌ | aujourd'hui | Pilote **à la fois** `stock_mvt.date_add` et `order_history.date_add`. Toute valeur acceptée par `strtotime` (ex. `2026-05-18` ou `2026-05-18 14:30:00`). |
| `use_existing_payment` | ❌ | `0` | Transmis à `changeIdOrderState()`. |
| `sendemail` | ❌ | `0` | Envoie l'e-mail de changement d'état (comme `addWs`). |
| `ws_key` | ✅* | — | Clé API (ou via auth HTTP Basic). |
| `display` | ❌ | `full` | Champs à retourner, syntaxe Webservice standard (`full` / `[champ1,champ2]`). |

\* `ws_key` n'est pas nécessaire si la clé est fournie en authentification HTTP Basic.

### Réponse

La ressource `order_history` créée est renvoyée (complète par défaut) au format
de sortie négocié (XML par défaut, JSON si `Output-Format` / `?io=json`).

### Codes d'erreur

| Statut | Cas |
|---|---|
| `400` | `id_order` ou `id_order_state` manquant, `date` invalide, commande/état/**employé** inexistant, **corps XML mal formé**. |
| `405` | Méthode HTTP autre que GET/POST. |
| `500` | Échec de l'enregistrement de l'historique. |
| `401` | Clé API absente ou ressource non autorisée pour la clé. |

### Exemples

```bash
# GET — change la commande 2 en état 4, mouvement daté du 18/05/2026
curl "https://VOTRE_BOUTIQUE/api/my_order_state?id_order=2&id_order_state=4&date=2026-05-18&ws_key=VOTRE_CLE"

# POST — état 4 + e-mail client, date du jour, réponse JSON
curl -X POST -u VOTRE_CLE: \
  "https://VOTRE_BOUTIQUE/api/my_order_state?id_order=2&id_order_state=4&sendemail=1&io=json"
```

### Format du corps XML

Enveloppe PrestaShop standard. Seuls `id_order` et `id_order_state` sont
obligatoires ; les autres balises sont optionnelles (mêmes défauts que le
tableau ci-dessus). Une racine `<order_history>` nue est aussi acceptée.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_history>
    <id_order>2</id_order>
    <id_order_state>4</id_order_state>
    <id_employee>1</id_employee>
    <date>2026-05-18 14:30:00</date>
    <use_existing_payment>0</use_existing_payment>
    <sendemail>1</sendemail>
  </order_history>
</prestashop>
```

```bash
# POST avec corps XML
curl -X POST -u VOTRE_CLE: \
  -H "Content-Type: text/xml" \
  --data-binary @order_state.xml \
  "https://VOTRE_BOUTIQUE/api/my_order_state"
```

> Le préfixe `xml=` (envoi en `application/x-www-form-urlencoded` sous la forme
> `xml=<prestashop>…`) est géré automatiquement, comme côté cœur.

---

## 5. Comportement de la date

- `order_history.date_add` est **toujours** positionné à la valeur de `date`
  (l'historique est ajouté avec `autodate = false`).
- `stock_mvt.date_add` n'est concerné **que** lorsqu'un mouvement de stock est
  effectivement généré par le changement d'état — c.-à-d. transition de l'état
  `shipped` **et** gestion avancée des stocks désactivée
  (`PS_ADVANCED_STOCK_MANAGEMENT = 0`). C'est la logique existante de
  `changeIdOrderState()`, inchangée ; on ne fait qu'y injecter la date.

### Mouvements de stock en contexte Webservice

`StockManager::saveMovement()` écrit la ligne `stock_mvt` via un repository
Doctrine récupéré sur `SymfonyContainer::getInstance()`, qui dépend de
`global $kernel`. Or le point d'entrée Webservice (`webservice/dispatcher.php`)
ne démarre **jamais** le kernel Symfony : nativement, `saveMovement()` retourne
`false` silencieusement → **le stock physique change mais aucun mouvement de
stock n'est enregistré** (même limitation que le `POST /api/order_histories`
natif).

> Démarrer le kernel complet (`AppKernel`) depuis le handler a été testé puis
> **abandonné** : cela détourne le gestionnaire d'erreurs Symfony et renvoyait
> une page `500` HTML générique au lieu de l'erreur Webservice.

Correctif retenu, dans le cœur déjà modifié
[`StockManager::saveMovement()`](../../src/Core/Stock/StockManager.php) : si
`SymfonyContainer::getInstance()` est `null`, on bascule sur
l'`EntityManager` Doctrine **déjà présent** dans le conteneur Webservice
(`Context::getContext()->container->get('doctrine.orm.entity_manager')`) et on
`persist()` + `flush()` l'entité `StockMvt` — soit exactement ce que fait
`StockMovementRepository::saveStockMvt()`. Aucun kernel à démarrer, aucun effet
de bord sur la gestion d'erreurs. Le mouvement est alors écrit et daté.

Vérifié : l'EM du conteneur Webservice connaît bien le mapping
`PrestaShopBundle\Entity\StockMvt` → table `ps_stock_mvt`.

### Employé du mouvement de stock (NOT NULL)

`StockManager::prepareMovement()` lit l'employé depuis le **contexte**
(`Context::employee`), pas depuis l'`OrderHistory`. En Webservice il n'y a
aucun employé de contexte → `ps_stock_mvt.id_employee` (colonne **NOT NULL**)
recevait `null` →
`Doctrine\DBAL\Exception\NotNullConstraintViolationException` → `500`.

Le handler résout l'`Employee` demandé (`id_employee`, défaut `1`) et
l'injecte dans le contexte **avant** `changeIdOrderState()` :

```php
Context::getContext()->employee = $employee;
```

`prepareMovement()` renseigne alors `id_employee` (et
`employee_firstname` / `employee_lastname`), comme en back-office.

> Conséquence : `id_employee` doit pointer un employé existant lorsque le
> changement d'état génère un mouvement de stock (transition `shipped`). Le
> défaut `1` couvre le cas où la balise est omise.

Test de bout en bout (commande passée à l'état expédié via ce flux) — ligne
`ps_stock_mvt` créée avec `id_employee = 1`, `sign = -1`,
`date_add = 2030-01-01 14:30:00`, et `order_history.date_add` identique.

---

## 6. Installation / déploiement

Déjà réalisé sur cet environnement, mais pour rappel / autre environnement :

```bash
# 1. Installer le module (enregistre le hook addWebserviceResources)
php bin/console prestashop:module install my_orde_state --env=prod -n

# 2. Vider le cache
php bin/console cache:clear --env=prod --no-warmup
```

Alternative : **BO → Modules → Gestionnaire de modules**, rechercher
« Webservice - Change order state », puis Installer.

### Étape manuelle obligatoire

L'endpoint reste en `401` tant que la clé API n'a pas l'autorisation :

**BO → Paramètres avancés → Webservice → (votre clé) →**
cocher **`my_order_state`** en **GET** et **POST** → Enregistrer.

Vérifier aussi que le Webservice est activé (même page, réglages généraux).

---

## 7. Désinstallation

```bash
php bin/console prestashop:module uninstall my_orde_state --env=prod -n
php bin/console cache:clear --env=prod --no-warmup
```

La désinstallation retire la ressource Webservice. Les modifications du cœur
(`StockManager.php`, `OrderHistory.php`) restent en place et doivent être
retirées manuellement si souhaité (elles sont rétro-compatibles et sans effet
tant qu'aucune `date_add` n'est passée).

---

## 8. Détails techniques

- Résolution du nom de classe par PrestaShop :
  `'WebserviceSpecificManagement' . ucfirst(Tools::toCamelCase('my_order_state'))`
  → **`WebserviceSpecificManagementMyOrderState`**.
- La classe handler est `require`-ée dans `hookAddWebserviceResources()`, donc
  disponible avant que `WebserviceRequest` ne fasse son `class_exists()` — pas
  besoin de régénérer l'index de classes du cœur.
- Le handler suit le contrat `WebserviceSpecificManagementInterface`
  (`setObjectOutput` / `setWsObject` / `manage` / `getContent`), calqué sur le
  cœur `WebserviceSpecificManagementSearch`.
- Le rendu utilise `WebserviceOutputBuilder::getContent()` avec les
  `getWebserviceParameters()` de `OrderHistory` (nœud `order_histories`).
- Le corps de requête est lu via `file_get_contents('php://input')` dans le
  handler — même technique que le cœur `WebserviceSpecificManagementAttachments`.
  Aucune modification supplémentaire du cœur n'a été nécessaire pour le support
  XML (`WebserviceRequest` n'est pas touché). Le préfixe `xml=` est retiré
  exactement comme dans `webservice/dispatcher.php`.
