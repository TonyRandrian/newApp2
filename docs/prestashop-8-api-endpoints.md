# 📦 PrestaShop 8.2.6 — Cartographie complète des expositions API

> **Sources** : Documentation officielle PrestaShop Dev Docs (devdocs.prestashop-project.org/8), GitHub PrestaShop, forums PrestaShop, mypresta.rocks, eewee.fr, surekhatech.com, deepwiki.com/PrestaShop
>
> **Date de compilation** : Mai 2026

---

## Table des matières

1. [Vue d'ensemble des API](#1-vue-densemble-des-api)
2. [Webservice API (Legacy REST)](#2-webservice-api-legacy-rest)
   - [Authentification & Accès](#21-authentification--accès)
   - [Paramètres globaux](#22-paramètres-globaux)
   - [Catalogue — Produits & Catégories](#23-catalogue--produits--catégories)
   - [Clients & Adresses](#24-clients--adresses)
   - [Commandes & Paiements](#25-commandes--paiements)
   - [Stock & Inventaire](#26-stock--inventaire)
   - [Configuration & Boutique](#27-configuration--boutique)
   - [Localisation & Taxes](#28-localisation--taxes)
   - [Médias & Images](#29-médias--images)
   - [Ressources de gestion interne](#210-ressources-de-gestion-interne)
   - [Endpoints en lecture seule](#211-endpoints-en-lecture-seule)
3. [Admin API (Nouvelle API OAuth2 — expérimentale PS 8.x)](#3-admin-api-nouvelle-api-oauth2--expérimentale-ps-8x)
4. [CloudSync & Billing API](#4-cloudsync--billing-api)
5. [Filtres, formats et paramètres de requête](#5-filtres-formats-et-paramètres-de-requête)
6. [Codes HTTP de réponse](#6-codes-http-de-réponse)
7. [Sécurité & Bonnes pratiques](#7-sécurité--bonnes-pratiques)
8. [Références & Sources](#8-références--sources)

---

## 1. Vue d'ensemble des API

PrestaShop 8.2.6 expose **deux familles d'API** :

| API | Type | Auth | Format | Statut |
|-----|------|------|--------|--------|
| **Webservice API** | REST-like (CRUD) | Basic Auth (clé API) | XML (défaut) / JSON | **Stable — Production** |
| **Admin API** | REST moderne (API Platform) | OAuth2 (client_credentials) | JSON | **Expérimental — PS 8.x** |
| **CloudSync API** | REST (Cloud) | OAuth2 | JSON | Module cloud PrestaShop |
| **Billing API** | REST (Cloud) | OAuth2 | JSON | Module cloud (WIP) |

> **Point d'entrée principal Webservice :**
> ```
> https://votre-boutique.com/api/
> ```
> **Point d'entrée Admin API :**
> ```
> https://votre-boutique.com/admin-dev/api/
> ```

---

## 2. Webservice API (Legacy REST)

### 2.1 Authentification & Accès

**Activation :** Back Office → Paramètres avancés → Service Web → Activer → Générer une clé

```
GET /api/
```

- **Méthode d'auth** : HTTP Basic Auth — username = clé API, password = vide
- **Format** : Ajouter `?output_format=JSON` pour JSON (lecture uniquement depuis PS 8.1)
- **Méthodes HTTP supportées** : `GET`, `POST`, `PUT`, `DELETE`, `HEAD`
- **PATCH** : disponible pour les mises à jour partielles (PS 8+)

```bash
# Tester la connexion et lister toutes les ressources accessibles
curl -u "VOTRE_CLE_API:" https://votre-boutique.com/api/?output_format=JSON
```

> ⚠️ Depuis **PS 8.1**, le Webservice ne peut **lire** que du XML en entrée (POST/PUT), mais peut **retourner** du JSON via `output_format=JSON`.

---

### 2.2 Paramètres globaux

Tous les endpoints supportent ces paramètres de requête :

| Paramètre | Exemple | Description |
|-----------|---------|-------------|
| `display` | `?display=full` | Affiche tous les champs |
| `display` | `?display=[id,name,price]` | Champs sélectifs |
| `output_format` | `?output_format=JSON` | Sortie JSON |
| `filter[champ]` | `?filter[active]=1` | Filtre exact |
| `filter[champ]` | `?filter[price]=[10,50]` | Plage de valeurs |
| `filter[champ]` | `?filter[name]=[Nike]%` | Commence par |
| `filter[champ]` | `?filter[city]=[paris\|lyon]` | Opérateur OR |
| `sort` | `?sort=[price_ASC]` | Tri ascendant |
| `sort` | `?sort=[date_upd_DESC]` | Tri descendant |
| `limit` | `?limit=50` | 50 premiers résultats |
| `limit` | `?limit=50,50` | Résultats 51 à 100 (pagination) |
| `schema` | `?schema=blank` | Retourne un XML vide de la ressource |
| `schema` | `?schema=synopsis` | Retourne la structure avec types et contraintes |

---

### 2.3 Catalogue — Produits & Catégories

#### `/api/products` — Produits

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/products` | Lister tous les produits (IDs) |
| `GET` | `/api/products?display=full` | Lister avec tous les champs |
| `GET` | `/api/products/{id}` | Détail d'un produit |
| `POST` | `/api/products` | Créer un produit |
| `PUT` | `/api/products/{id}` | Mettre à jour un produit |
| `PATCH` | `/api/products/{id}` | Mise à jour partielle |
| `DELETE` | `/api/products/{id}` | Supprimer un produit |
| `HEAD` | `/api/products` | Vérifier l'existence |
| `GET` | `/api/products?schema=blank` | Schéma XML vide |
| `GET` | `/api/products?schema=synopsis` | Schéma avec types |

**Champs clés disponibles :**
`id`, `id_manufacturer`, `id_supplier`, `id_category_default`, `reference`, `ean13`, `mpn`, `price`, `wholesale_price`, `active`, `state`, `name`, `description`, `description_short`, `link_rewrite`, `meta_title`, `weight`, `width`, `height`, `depth`, `minimal_quantity`, `quantity`

---

#### `/api/categories` — Catégories

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/categories` | Lister toutes les catégories |
| `GET` | `/api/categories/{id}` | Détail d'une catégorie |
| `POST` | `/api/categories` | Créer une catégorie |
| `PUT` | `/api/categories/{id}` | Modifier une catégorie |
| `DELETE` | `/api/categories/{id}` | Supprimer une catégorie |

---

#### `/api/combinations` — Déclinaisons

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/combinations` | Lister les déclinaisons |
| `GET` | `/api/combinations/{id}` | Détail d'une déclinaison |
| `POST` | `/api/combinations` | Créer une déclinaison |
| `PUT` | `/api/combinations/{id}` | Modifier une déclinaison |
| `DELETE` | `/api/combinations/{id}` | Supprimer une déclinaison |

**Note :** Le prix d'une déclinaison est un **impact de prix** ajouté au produit parent, pas le prix final. Le stock est géré via `/api/stock_availables`.

---

#### `/api/manufacturers` — Fabricants

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/manufacturers` | Lister les fabricants |
| `GET` | `/api/manufacturers/{id}` | Détail |
| `POST` | `/api/manufacturers` | Créer |
| `PUT` | `/api/manufacturers/{id}` | Modifier |
| `DELETE` | `/api/manufacturers/{id}` | Supprimer |

---

#### `/api/suppliers` — Fournisseurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/suppliers` | Lister |
| `GET` | `/api/suppliers/{id}` | Détail |
| `POST` | `/api/suppliers` | Créer |
| `PUT` | `/api/suppliers/{id}` | Modifier |
| `DELETE` | `/api/suppliers/{id}` | Supprimer |

---

#### `/api/product_features` — Caractéristiques produit

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/product_features` | Lister les caractéristiques |
| `GET` | `/api/product_features/{id}` | Détail |
| `POST` | `/api/product_features` | Créer |
| `PUT` | `/api/product_features/{id}` | Modifier |
| `DELETE` | `/api/product_features/{id}` | Supprimer |

---

#### `/api/product_feature_values` — Valeurs de caractéristiques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/product_feature_values` | Lister |
| `POST` | `/api/product_feature_values` | Créer |
| `PUT` | `/api/product_feature_values/{id}` | Modifier |
| `DELETE` | `/api/product_feature_values/{id}` | Supprimer |

---

#### `/api/product_options` — Groupes d'attributs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/product_options` | Lister les groupes d'attributs |
| `POST` | `/api/product_options` | Créer |
| `PUT` | `/api/product_options/{id}` | Modifier |
| `DELETE` | `/api/product_options/{id}` | Supprimer |

---

#### `/api/product_option_values` — Valeurs d'attributs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/product_option_values` | Lister |
| `POST` | `/api/product_option_values` | Créer |
| `PUT` | `/api/product_option_values/{id}` | Modifier |
| `DELETE` | `/api/product_option_values/{id}` | Supprimer |

---

#### `/api/product_suppliers` — Associations produit-fournisseur

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/product_suppliers` | Lister les associations |
| `POST` | `/api/product_suppliers` | Créer |
| `PUT` | `/api/product_suppliers/{id}` | Modifier |
| `DELETE` | `/api/product_suppliers/{id}` | Supprimer |

---

#### `/api/product_customization_fields` — Champs de personnalisation

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/product_customization_fields` | Lister |
| `POST` | `/api/product_customization_fields` | Créer |
| `PUT` | `/api/product_customization_fields/{id}` | Modifier |

---

#### `/api/tags` — Tags produits

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/tags` | Lister les tags |
| `POST` | `/api/tags` | Créer un tag |
| `PUT` | `/api/tags/{id}` | Modifier |
| `DELETE` | `/api/tags/{id}` | Supprimer |

---

#### `/api/attachments` — Pièces jointes produits

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/attachments` | Lister |
| `POST` | `/api/attachments` | Ajouter |
| `DELETE` | `/api/attachments/{id}` | Supprimer |

---

### 2.4 Clients & Adresses

#### `/api/customers` — Clients

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/customers` | Lister les clients |
| `GET` | `/api/customers/{id}` | Détail d'un client |
| `POST` | `/api/customers` | Créer un client |
| `PUT` | `/api/customers/{id}` | Modifier |
| `DELETE` | `/api/customers/{id}` | Supprimer |

**Champs disponibles :**
`id`, `id_default_group`, `id_lang`, `passwd`, `firstname`, `lastname`, `email`, `birthday`, `newsletter`, `active`, `is_guest`, `date_add`, `date_upd`

---

#### `/api/addresses` — Adresses

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/addresses` | Lister les adresses (clients, fabricants, boutiques) |
| `GET` | `/api/addresses/{id}` | Détail |
| `GET` | `/api/addresses?filter[id_customer]=1` | Adresses d'un client |
| `POST` | `/api/addresses` | Créer |
| `PUT` | `/api/addresses/{id}` | Modifier |
| `DELETE` | `/api/addresses/{id}` | Supprimer |

---

#### `/api/guests` — Visiteurs (non enregistrés)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/guests` | Lister |
| `GET` | `/api/guests/{id}` | Détail |

---

#### `/api/groups` — Groupes de clients

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/groups` | Lister les groupes |
| `POST` | `/api/groups` | Créer un groupe |
| `PUT` | `/api/groups/{id}` | Modifier |
| `DELETE` | `/api/groups/{id}` | Supprimer |

---

#### `/api/customer_messages` — Messages clients

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/customer_messages` | Lister |
| `GET` | `/api/customer_messages/{id}` | Détail |
| `POST` | `/api/customer_messages` | Envoyer un message |
| `PUT` | `/api/customer_messages/{id}` | Modifier |

---

#### `/api/customer_threads` — Fils de discussion SAV

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/customer_threads` | Lister les fils |
| `GET` | `/api/customer_threads/{id}` | Détail |
| `PUT` | `/api/customer_threads/{id}` | Modifier le statut |
| `DELETE` | `/api/customer_threads/{id}` | Supprimer |

---

### 2.5 Commandes & Paiements

#### `/api/orders` — Commandes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/orders` | Lister les commandes |
| `GET` | `/api/orders/{id}` | Détail d'une commande |
| `GET` | `/api/orders?filter[current_state]=2` | Filtrer par statut |
| `POST` | `/api/orders` | Créer une commande (⚠️ déconseillé) |
| `PUT` | `/api/orders/{id}` | Modifier |

> ⚠️ La création de commandes via API est **techniquement possible mais fortement déconseillée** : elle contourne la validation du panier, le calcul des taxes, le traitement du paiement et la décrémentation du stock.

---

#### `/api/order_details` — Lignes de commande

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/order_details` | Lister |
| `GET` | `/api/order_details/{id}` | Détail d'une ligne |
| `PUT` | `/api/order_details/{id}` | Modifier |

---

#### `/api/order_states` — Statuts de commande

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/order_states` | Lister les statuts |
| `GET` | `/api/order_states/{id}` | Détail |
| `POST` | `/api/order_states` | Créer un statut |
| `PUT` | `/api/order_states/{id}` | Modifier |
| `DELETE` | `/api/order_states/{id}` | Supprimer |

**Statuts par défaut (varient selon l'installation) :**

| ID | Libellé |
|----|---------|
| 1 | En attente de paiement |
| 2 | Paiement accepté |
| 3 | En cours de préparation |
| 4 | Expédié |
| 5 | Livré |
| 6 | Annulé |
| 7 | Remboursé |

---

#### `/api/order_histories` — Historique des statuts

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/order_histories` | Lister |
| `GET` | `/api/order_histories/{id}` | Détail |
| `POST` | `/api/order_histories` | Changer le statut d'une commande |

```xml
<!-- Exemple : passer une commande au statut "Expédié" (4) -->
<prestashop>
  <order_history>
    <id_order>1234</id_order>
    <id_order_state>4</id_order_state>
  </order_history>
</prestashop>
```

---

#### `/api/order_carriers` — Transporteurs de commande / Suivi

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/order_carriers` | Lister |
| `GET` | `/api/order_carriers/{id}` | Détail |
| `PUT` | `/api/order_carriers/{id}` | Ajouter/modifier le numéro de suivi |
| `GET` | `/api/order_carriers/{id}?sendemail=1` | Envoyer l'email de suivi au client |

> **PS 8 spécifique :** Le paramètre `sendemail=1` sur `/api/order_carriers/{id}` déclenche l'envoi automatique de l'email de suivi.

---

#### `/api/order_invoices` — Factures

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/order_invoices` | Lister les factures |
| `GET` | `/api/order_invoices/{id}` | Détail |
| `POST` | `/api/order_invoices` | Créer une facture |
| `PUT` | `/api/order_invoices/{id}` | Modifier |

---

#### `/api/order_payments` — Paiements

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/order_payments` | Lister |
| `GET` | `/api/order_payments/{id}` | Détail |
| `POST` | `/api/order_payments` | Enregistrer un paiement |
| `PUT` | `/api/order_payments/{id}` | Modifier |

---

#### `/api/order_slip` — Avoirs (bons de remboursement)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/order_slip` | Lister les avoirs |
| `GET` | `/api/order_slip/{id}` | Détail |
| `POST` | `/api/order_slip` | Créer un avoir |
| `PUT` | `/api/order_slip/{id}` | Modifier |

---

#### `/api/carts` — Paniers

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/carts` | Lister les paniers |
| `GET` | `/api/carts/{id}` | Détail d'un panier |
| `POST` | `/api/carts` | Créer un panier |
| `PUT` | `/api/carts/{id}` | Modifier |
| `DELETE` | `/api/carts/{id}` | Supprimer |

---

#### `/api/cart_rules` — Règles de panier (codes promo)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/cart_rules` | Lister les règles |
| `GET` | `/api/cart_rules/{id}` | Détail |
| `POST` | `/api/cart_rules` | Créer une règle |
| `PUT` | `/api/cart_rules/{id}` | Modifier |
| `DELETE` | `/api/cart_rules/{id}` | Supprimer |

---

#### `/api/customizations` — Personnalisations de produits en commande

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/customizations` | Lister |
| `GET` | `/api/customizations/{id}` | Détail |

---

#### `/api/messages` — Messages (SAV interne)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/messages` | Lister |
| `POST` | `/api/messages` | Envoyer |
| `PUT` | `/api/messages/{id}` | Modifier |
| `DELETE` | `/api/messages/{id}` | Supprimer |

---

### 2.6 Stock & Inventaire

#### `/api/stock_availables` — Stock disponible ⭐ Endpoint critique

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/stock_availables` | Lister les stocks |
| `GET` | `/api/stock_availables/{id}` | Détail d'un stock |
| `GET` | `/api/stock_availables?filter[id_product]=42` | Stock d'un produit |
| `GET` | `/api/stock_availables?filter[id_product]=42&filter[id_product_attribute]=15` | Stock d'une déclinaison |
| `PUT` | `/api/stock_availables/{id}` | Mise à jour complète du stock |
| `PATCH` | `/api/stock_availables/{id}` | Mise à jour partielle (ex: juste la quantité) |

> **Important :** La quantité d'un produit **ne peut pas** être modifiée via `/api/products`. Il faut obligatoirement passer par `/api/stock_availables`.

```bash
# Mise à jour efficace du stock en masse
for stockId in "${updates[@]}"; do
  curl -u "KEY:" -X PUT -H "Content-Type: application/xml" \
    -d "<prestashop><stock_available><id>$stockId</id><quantity>$qty</quantity></stock_available></prestashop>" \
    "https://votre-boutique.com/api/stock_availables/$stockId"
done
```

**Schéma XML de stock_available :**
```xml
<stock_available>
  <id/>
  <id_product/>
  <id_product_attribute/>
  <id_shop/>
  <id_shop_group/>
  <quantity/>
  <depends_on_stock/>
  <out_of_stock/>
  <location/>
</stock_available>
```

---

#### `/api/stocks` — Stocks avancés (Multimagasin)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/stocks` | Lister les stocks multi-boutiques |
| `GET` | `/api/stocks/{id}` | Détail |
| `PUT` | `/api/stocks/{id}` | Modifier |

---

#### `/api/stock_movements` — Mouvements de stock

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/stock_movements` | Lister les mouvements |
| `GET` | `/api/stock_movements/{id}` | Détail |

---

#### `/api/stock_movement_reasons` — Raisons de mouvement de stock

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/stock_movement_reasons` | Lister |
| `POST` | `/api/stock_movement_reasons` | Créer |
| `PUT` | `/api/stock_movement_reasons/{id}` | Modifier |
| `DELETE` | `/api/stock_movement_reasons/{id}` | Supprimer |

---

#### `/api/supply_orders` — Commandes fournisseurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/supply_orders` | Lister |
| `GET` | `/api/supply_orders/{id}` | Détail |
| `POST` | `/api/supply_orders` | Créer |
| `PUT` | `/api/supply_orders/{id}` | Modifier |

---

#### `/api/supply_order_details` — Détails commandes fournisseurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/supply_order_details` | Lister |
| `PUT` | `/api/supply_order_details/{id}` | Modifier |

---

#### `/api/supply_order_histories` — Historique commandes fournisseurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/supply_order_histories` | Lister |

---

#### `/api/supply_order_states` — Statuts commandes fournisseurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/supply_order_states` | Lister |
| `POST` | `/api/supply_order_states` | Créer |
| `PUT` | `/api/supply_order_states/{id}` | Modifier |

---

#### `/api/supply_order_receipt_histories` — Historique réceptions

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/supply_order_receipt_histories` | Lister |

---

#### `/api/deliveries` — Modes de livraison

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/deliveries` | Lister |
| `POST` | `/api/deliveries` | Créer |
| `PUT` | `/api/deliveries/{id}` | Modifier |
| `DELETE` | `/api/deliveries/{id}` | Supprimer |

---

### 2.7 Configuration & Boutique

#### `/api/configurations` — Variables de configuration

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/configurations` | Lister toutes les configurations |
| `GET` | `/api/configurations/{id}` | Détail |
| `POST` | `/api/configurations` | Créer |
| `PUT` | `/api/configurations/{id}` | Modifier |
| `DELETE` | `/api/configurations/{id}` | Supprimer |

---

#### `/api/shops` — Boutiques (Multimagasin)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/shops` | Lister les boutiques |
| `GET` | `/api/shops/{id}` | Détail |
| `POST` | `/api/shops` | Créer |
| `PUT` | `/api/shops/{id}` | Modifier |
| `DELETE` | `/api/shops/{id}` | Supprimer |

---

#### `/api/shop_groups` — Groupes de boutiques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/shop_groups` | Lister |
| `POST` | `/api/shop_groups` | Créer |
| `PUT` | `/api/shop_groups/{id}` | Modifier |

---

#### `/api/shop_urls` — URLs des boutiques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/shop_urls` | Lister les URLs |
| `POST` | `/api/shop_urls` | Créer |
| `PUT` | `/api/shop_urls/{id}` | Modifier |

---

#### `/api/carriers` — Transporteurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/carriers` | Lister les transporteurs |
| `GET` | `/api/carriers/{id}` | Détail |
| `POST` | `/api/carriers` | Créer |
| `PUT` | `/api/carriers/{id}` | Modifier |
| `DELETE` | `/api/carriers/{id}` | Supprimer |

---

#### `/api/contacts` — Contacts de la boutique

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/contacts` | Lister |
| `POST` | `/api/contacts` | Créer |
| `PUT` | `/api/contacts/{id}` | Modifier |
| `DELETE` | `/api/contacts/{id}` | Supprimer |

---

#### `/api/employees` — Employés (back-office)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/employees` | Lister |
| `GET` | `/api/employees/{id}` | Détail |
| `POST` | `/api/employees` | Créer |
| `PUT` | `/api/employees/{id}` | Modifier |
| `DELETE` | `/api/employees/{id}` | Supprimer |

---

#### `/api/content_management_system` — Pages CMS

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/content_management_system` | Lister les pages CMS |
| `POST` | `/api/content_management_system` | Créer |
| `PUT` | `/api/content_management_system/{id}` | Modifier |
| `DELETE` | `/api/content_management_system/{id}` | Supprimer |

---

#### `/api/stores` — Magasins physiques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/stores` | Lister |
| `POST` | `/api/stores` | Créer |
| `PUT` | `/api/stores/{id}` | Modifier |
| `DELETE` | `/api/stores/{id}` | Supprimer |

---

### 2.8 Localisation & Taxes

#### `/api/countries` — Pays

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/countries` | Lister les pays |
| `POST` | `/api/countries` | Créer |
| `PUT` | `/api/countries/{id}` | Modifier |
| `DELETE` | `/api/countries/{id}` | Supprimer |

---

#### `/api/states` — Régions / États

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/states` | Lister |
| `POST` | `/api/states` | Créer |
| `PUT` | `/api/states/{id}` | Modifier |
| `DELETE` | `/api/states/{id}` | Supprimer |

---

#### `/api/currencies` — Devises

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/currencies` | Lister les devises |
| `POST` | `/api/currencies` | Ajouter |
| `PUT` | `/api/currencies/{id}` | Modifier |
| `DELETE` | `/api/currencies/{id}` | Supprimer |

---

#### `/api/languages` — Langues

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/languages` | Lister les langues |
| `POST` | `/api/languages` | Ajouter |
| `PUT` | `/api/languages/{id}` | Modifier |
| `DELETE` | `/api/languages/{id}` | Supprimer |

---

#### `/api/taxes` — Taux de TVA

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/taxes` | Lister les taxes |
| `POST` | `/api/taxes` | Créer |
| `PUT` | `/api/taxes/{id}` | Modifier |
| `DELETE` | `/api/taxes/{id}` | Supprimer |

---

#### `/api/tax_rule_groups` — Groupes de règles de taxe

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/tax_rule_groups` | Lister |
| `POST` | `/api/tax_rule_groups` | Créer |
| `PUT` | `/api/tax_rule_groups/{id}` | Modifier |
| `DELETE` | `/api/tax_rule_groups/{id}` | Supprimer |

---

#### `/api/zones` — Zones géographiques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/zones` | Lister |
| `POST` | `/api/zones` | Créer |
| `PUT` | `/api/zones/{id}` | Modifier |
| `DELETE` | `/api/zones/{id}` | Supprimer |

---

### 2.9 Médias & Images

#### `/api/images` — Images ⭐

L'endpoint images est **spécial** : il gère les uploads via multipart/form-data.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/images` | Lister les types d'images |
| `GET` | `/api/images/products/{id_product}` | Images d'un produit |
| `GET` | `/api/images/products/{id_product}/{id_image}` | Image spécifique |
| `POST` | `/api/images/products/{id_product}` | **Upload** une image produit |
| `PUT` | `/api/images/products/{id_product}/{id_image}` | Remplacer une image |
| `DELETE` | `/api/images/products/{id_product}/{id_image}` | Supprimer une image |
| `GET` | `/api/images/categories/{id_category}` | Image d'une catégorie |
| `POST` | `/api/images/categories/{id_category}` | Upload image catégorie |
| `GET` | `/api/images/manufacturers/{id_manufacturer}` | Logo fabricant |
| `POST` | `/api/images/manufacturers/{id_manufacturer}` | Upload logo |
| `GET` | `/api/images/suppliers/{id_supplier}` | Logo fournisseur |
| `POST` | `/api/images/suppliers/{id_supplier}` | Upload logo |
| `GET` | `/api/images/stores/{id_store}` | Photo du magasin |
| `POST` | `/api/images/stores/{id_store}` | Upload photo |

```bash
# Upload d'image produit
curl -u "KEY:" -X POST \
  -F "image=@/chemin/vers/image.jpg" \
  "https://votre-boutique.com/api/images/products/42"
```

---

#### `/api/image_types` — Types d'images (dimensions)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/image_types` | Lister les formats d'images |
| `POST` | `/api/image_types` | Créer un format |
| `PUT` | `/api/image_types/{id}` | Modifier |
| `DELETE` | `/api/image_types/{id}` | Supprimer |

---

### 2.10 Ressources de gestion interne

#### `/api/specific_prices` — Prix spécifiques (promotions)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/specific_prices` | Lister les prix spécifiques |
| `GET` | `/api/specific_prices/{id}` | Détail |
| `POST` | `/api/specific_prices` | Créer une promotion |
| `PUT` | `/api/specific_prices/{id}` | Modifier |
| `DELETE` | `/api/specific_prices/{id}` | Supprimer |

---

#### `/api/specific_price_rules` — Règles de prix spécifiques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/specific_price_rules` | Lister |
| `POST` | `/api/specific_price_rules` | Créer |
| `PUT` | `/api/specific_price_rules/{id}` | Modifier |
| `DELETE` | `/api/specific_price_rules/{id}` | Supprimer |

---

#### `/api/price_ranges` — Tranches de prix (transporteurs)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/price_ranges` | Lister |
| `POST` | `/api/price_ranges` | Créer |
| `PUT` | `/api/price_ranges/{id}` | Modifier |
| `DELETE` | `/api/price_ranges/{id}` | Supprimer |

---

### 2.11 Endpoints en lecture seule

Ces endpoints ne supportent que `GET` et `HEAD` :

| Endpoint | Description |
|----------|-------------|
| `/api/search` | Recherche full-text dans la boutique |

```bash
# Recherche de produits
curl -u "KEY:" "https://votre-boutique.com/api/search?language=1&query=chaussures"
```

---

## 3. Admin API (Nouvelle API OAuth2 — expérimentale PS 8.x)

> ⚠️ **Statut :** Introduite expérimentalement dans PrestaShop 8.x via un **Feature Flag**, et finalisée dans PrestaShop 9. Elle est accessible en activant le flag dans le back-office.
>
> **Base URL :** `https://votre-boutique.com/admin-dev/api/`

### 3.1 Authentification OAuth2

```bash
# Obtenir un token d'accès (client_credentials flow)
POST /admin-dev/api/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=VOTRE_CLIENT_ID
&client_secret=VOTRE_CLIENT_SECRET
&scope=SCOPE_1 SCOPE_2
```

**Réponse :**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Utilisation du token :**
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://votre-boutique.com/admin-dev/api/api-client/infos
```

---

### 3.2 Endpoints Admin API disponibles en PS 8.x

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/admin-dev/api/oauth2/token` | Obtenir un token OAuth2 |
| `GET` | `/admin-dev/api/api-client/infos` | Informations sur le client API courant |

> **Note :** En PS 8.x, l'Admin API est en version très préliminaire. La quasi-totalité des endpoints métier (produits, commandes, etc.) sont en développement dans la branche PS 9.

### 3.3 Endpoints documentés pour PS 9 (roadmap depuis PS 8)

Les endpoints suivants sont définis via **API Platform** (CQRS + Symfony) :

| Ressource | Opérations | Description |
|-----------|------------|-------------|
| `api-client` | GET, POST, PUT, DELETE | Gestion des clients API OAuth2 |
| `products` | GET (list/detail) | Lecture produits (PS 9) |
| `hooks` | GET | Liste des hooks disponibles |
| `modules` | GET | Liste des modules |

**Architecture Admin API :**
- Basée sur **API Platform 3.x**
- Utilise le pattern **CQRS** (Command Query Responsibility Segregation)
- Kernel dédié : `AdminAPIKernel`
- Documentation auto-générée **Swagger/OpenAPI** : `/admin-dev/api/docs`

---

## 4. CloudSync & Billing API

### 4.1 CloudSync API

> **Usage :** Synchronisation cloud pour modules PrestaShop (nécessite l'abonnement PrestaShop)

**Capacités :**
- Lecture des données boutique : produits, catégories, paniers, commandes, transporteurs, prix, devises, thèmes
- Connexion de PrestaShop à des plateformes tierces
- Automatisation des workflows

**Documentation :** `https://docs.cloud.prestashop.com/8-apis/`

### 4.2 Billing API

> **Statut :** En cours de développement (WIP)

Fournit un point d'entrée unique pour les services de facturation PrestaShop Cloud.

**Documentation :** Disponible sur `docs.cloud.prestashop.com`

---

## 5. Filtres, formats et paramètres de requête

### Opérateurs de filtrage

```bash
# Égalité exacte
?filter[id_customer]=1

# Plage de valeurs
?filter[price]=[10,50]

# Recherche par date
?filter[date_upd]=[2025-01-01,2025-12-31]

# Commence par (LIKE %)
?filter[name]=[Nike]%

# Opérateur OR
?filter[city]=[paris|lyon]

# Combinaison de filtres
?filter[active]=1&filter[id_category_default]=5&display=[id,name,price]
```

### Cache PS 8.x

```bash
# Premier appel — stocker le header Content-Sha1
GET /api/products/42

# Appels suivants — envoyer le hash pour détecter les changements
GET /api/products/42
Local-Content-Sha1: [hash_precedent]
# → 304 Not Modified si rien n'a changé
# → 200 OK avec le nouveau contenu si modifié
```

### Schémas de ressource

```bash
# Obtenir la structure vide d'une ressource
GET /api/products?schema=blank

# Obtenir les types, champs requis et longueurs max
GET /api/products?schema=synopsis
```

---

## 6. Codes HTTP de réponse

| Code | Signification |
|------|---------------|
| `200 OK` | Succès (GET, PUT) |
| `201 Created` | Ressource créée (POST) |
| `304 Not Modified` | Contenu inchangé (cache) |
| `400 Bad Request` | XML invalide ou champs manquants |
| `401 Unauthorized` | Clé API invalide ou manquante |
| `403 Forbidden` | Permission insuffisante sur la ressource |
| `404 Not Found` | Ressource introuvable |
| `405 Method Not Allowed` | Méthode HTTP non autorisée pour cette ressource |
| `500 Internal Server Error` | Erreur côté serveur PrestaShop |
| `503 Service Unavailable` | Webservice désactivé |

---

## 7. Sécurité & Bonnes pratiques

### Configuration sécurisée

- Toujours utiliser **HTTPS** pour les appels Webservice (prévention MITM)
- Vérifier que les 5 méthodes HTTP sont activées sur le serveur (`GET`, `POST`, `PUT`, `DELETE`, `HEAD`)
- Activer `mod_rewrite` (Apache) et `AllowOverride All`
- Créer **une clé API par intégration** — révocation granulaire sans casser les autres

### Permissions granulaires

Dans le Back Office → Paramètres Avancés → Service Web, pour chaque clé API :
- Définir les **ressources accessibles**
- Définir les **méthodes HTTP autorisées** par ressource (matrice de permissions)

### Optimisation des performances

```bash
# ❌ Mauvais — charge tout
GET /api/products?display=full

# ✅ Bon — seulement les champs nécessaires
GET /api/products?display=[id,name,price,reference]

# ✅ Bon — filtrer par date de mise à jour pour les synchros
GET /api/products?filter[date_upd]=[2025-01-01,2025-12-31]&display=[id,reference,price]

# ✅ Bon — pagination
GET /api/products?limit=100,100   # résultats 101-200
```

### Gestion des erreurs XML

```xml
<!-- Toujours encapsuler dans la balise racine -->
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- Utiliser CDATA pour les caractères spéciaux -->
  <product>
    <description><![CDATA[Description avec <html> & caractères spéciaux]]></description>
  </product>
</prestashop>
```

---

## 8. Références & Sources

| Source | URL | Type |
|--------|-----|------|
| Documentation officielle PS 8 Webservice | `devdocs.prestashop-project.org/8/webservice/` | Officiel |
| Référence des ressources PS 8 | `devdocs.prestashop-project.org/8/webservice/reference/` | Officiel |
| Getting Started PS 8 | `devdocs.prestashop-project.org/8/webservice/getting-started/` | Officiel |
| Tutoriel création produit A-Z | `devdocs.prestashop-project.org/9/webservice/tutorials/create-product-az/` | Officiel |
| Admin API OAuth2 PS 9 | `devdocs.prestashop-project.org/9/admin-api/oauth/` | Officiel |
| GitHub PrestaShop | `github.com/PrestaShop/PrestaShop` | Source |
| GitHub PR OAuth2 (#29931) | `github.com/PrestaShop/PrestaShop/pull/29931` | Source |
| DeepWiki Admin API Analysis | `deepwiki.com/PrestaShop/PrestaShop/7.6-admin-api-and-oauth2` | Communauté |
| Guide complet Webservice (mypresta.rocks) | `mypresta.rocks/knowledge-base/guides/prestashop-webservice-api` | Communauté |
| Tutoriel API PrestaShop (eewee.fr) | `eewee.fr/utiliser-lapi-prestashop/` | Communauté |
| Liste des ressources (surekhatech.com) | `surekhatech.com/blog/how-to-access-prestashop-web-services` | Communauté |
| CloudSync & Billing APIs | `docs.cloud.prestashop.com/8-apis/` | Officiel Cloud |
| Blog Admin API PS 9 (prestaedit.github.io) | `prestaedit.github.io/2024/06/14/prestasho9-admin-api/` | Communauté |
| Annonce nouvelle API PS 9 (build.prestashop-project.org) | `build.prestashop-project.org/news/2024/meet-prestashop9-api/` | Officiel |
| PrestaSharp (.NET client) | `bukimedia.github.io/PrestaSharp/` | Librairie |
| binshops/prestashop-rest (module REST) | `github.com/binshops/prestashop-rest` | Module |

---

*Document généré par scraping multi-sources : devdocs.prestashop-project.org, github.com/PrestaShop, forums PrestaShop, deepwiki.com, mypresta.rocks, eewee.fr — Mai 2026*
