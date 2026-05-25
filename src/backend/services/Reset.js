import api from "../utils/api"

export const RESOURCES_TO_RESET = [
    { order : 1,value: 'order_details', description: 'Détails de commande'},
    { order : 2,value: 'order_histories', description: 'Historique des commandes'},
    { order : 3,value: 'order_payments', description: 'Paiements de commande'},
    { order : 4,value: 'orders', description: 'Commandes'},
    { order : 5,value: 'carts', description: 'Paniers'},
    { order : 6,value: 'customers', description: 'Clients'},
    { order : 7,value: 'addresses', description: 'Adresses'},
    { order : 8,value: 'stock_movements', description: 'Mouvements de stock'},
    //{ order : 9,value: 'stock_availables', description: 'Stocks disponibles'},
    { order : 10,value: 'images', description: 'Images produits'},
    { order : 11,value: 'combinations', description: 'Combinaisons'},
    { order : 12,value: 'product_option_values', description: "Valeurs d'attributs"},
    { order : 13,value: 'product_options', description: "Groupes d'attributs"},
    { order : 14,value: 'products', description: 'Produits'},
    { order : 15,value: 'tax_rules', description: 'Règles de taxe'},
    { order : 16,value: 'tax_rule_groups', description: 'Groupes de règles de taxe'},
    { order : 17,value: 'taxes', description: 'Taxes'},
    { order : 18,value: 'categories', description: 'Catégories produits'},
];

export const PROTECTED_IDS = {
  // Catalogue
  products:                     [],
  categories:                   [1, 2],
  combinations:                 [],
  product_options:              [],
  product_option_values:        [],

  // Commandes
  orders:                       [],
  order_details:                [],
  order_payments:               [],
  order_histories:              [],

  // Clients
  customers:                    [1],
  addresses:                    [1],

  // Taxes
  taxes:                        [1],
  tax_rules:                    [1],
  tax_rule_groups:              [1],

  // Images
  images:                       [],

  // Paniers
  carts:                        [],

  // Stock
  stock_availables:             [],
  stock_movements:              [],
}

export const deleteAll = async (toDelete) => {

    for (const element of toDelete) {
        console.log(element)
        await api.deleteAll(element, PROTECTED_IDS[element])
    }

    return true;
}