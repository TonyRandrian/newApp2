Todo
- Fonction fromData mila Object.endpoint = "endpoint"
- Vérifier structure
- getExcl sy getIncl, soloina ilay map fa possible hisy erreur
- Panier
- Commande
- Dupliquer qtt panier
- Dupliquer panier/commande
- Page reset ampiana tout sélectionner 
- Filtre dans la page de liste de produit FO
- Utiliser l'utilisateur anonymous pour la connexion anonyme FO
- Page stock et évolution
- Statistiques

Todo détail: Statistiques
- Récupérer liste produits et categorie
- Récupérer liste des mouvements
- Fonction pour prendre tous les orders détails ampina prix d'achat sy benéfice sy ilay labelle categorie via la liste recuperer précédemment (DTO)
- Fonction pour filtrer ces orders par date début/fin puis regrouper par catégorie, sommer par agrégation
- Filtre par date des mouvements et puis concaténer-na par produit et calcul du prix sur prix ht * quantité puis somme se tout
- Tableau stock: Physique : utiliser la liste des mouvements concaténer par produit,puis pour les réservations : on utilise la liste des commandes apres filtrage de date et aggregation par catégorie et puis on calcul le stock dispo (de la date de fin)

Todo détail: Page stock et évolution
- Fonction pour agréger les stocks d'une déclinaison d'un produit
- Fonction pour agréger les stocks d'un produit en sommant les agrégations des déclinaisons d'un produit 
- Liste des produits avec inputs pour augmenter/réduire stock, input date, bouton Augmenter/Réduire, Bouton "voir évolution"
- Dropdown pour chaque produit avec déclinaison pour afficher/modifier stock déclinaison, si produit avec déclinaison, pas d'input pour modifier le stock
- Afficher l'évolution en bas du tableau après avoir cliquer sur "voir évolution"

Todo détail: dashboard
- Par défaut tout loader sauf état annulé
- Créer une fonction pour filtrer les commandes par état. Mettre dans utils.
- Afficher le nombre de ces commandes
- Prix total HT commandes
- Prix total TTC commandes
- Même KPI pour dans le panier
- Même KPI pour ces deux (somme dans JSX)
- Mettre deux inputs de dates pour tout filtrer
- Créer une fonction pour filtrer une commande entre deux date
- Fonction qui reçoit une liste de commandes agréger par jour (retourne le montant de ces commandes)
- Fonction pour sommer le nombre de commandes
- Fonction pour sommer montant TTC et HT

Todo détail: Login backoffice
- Protection des pages par authentification

Todo détail: Dupliquer panier
- Après clique sur bouton (qu'on cache) dans la liste des commandes
- Récupérer l'id.order puis récupérer id cart et appeler cloneOrder
- Créer une fonction cloneOrder(cartId, multiplicateur [default 1]): 
- Prendre le panier original en utilisant getById
- Boucler for int i = 0; i < multiplicateur; i++
- Créer un panier similaire à l'original
- Sauvegarder dans la base et prendre l'id de ce panier
- Créer un order associer à ce panier
- Sauvegarder

Todo détail: Dupliquer quantité dans panier
- Après bouton "Dupliquer" dans la liste des commandes
- Récupérer la valeur de l'input nommer le paramètre "multiplicateur"
- Appeler addToCart avec le multiplicateur puis renvoyer vers la page de panier
- Flow normal de panier

Todo détail: Panier
- Panier:
- Aperçu produit miaraka @ déclinaison, stock, prix, image: Champs qtt, bouton Ajouter panier
- "Ajouter panier": fonction addToCart(produitId, qtt, productAttributeId, customerId, dateAdd [default now], multiplicateur [default 1])
- fonction checkStock(productId, productAttributeId, qtt): ao @ service stockAvailableService: getStockAvailable by productId sy produAttributeId. Rehefa azo dia comparer-na ny qtt sy ny champ quantity ao @ stockAvailable
- Après clique sur "Commander" afficher les erreurs de stocks insuffisants si existe
- Création de Cart, puis .updateOrCreate()
- customerService.js: getLastCart(customerId)
- Stocker le dernier panier non commandé dans le localstorage (ne garder que l'ID)
- Update panier:
- dropdown de déclinaison: puis update de productAttributeId
- modification quantité: puis upadte de quantité dans cartRow
- supprimer: supprimer une ligne de panier, si c'était la dernière ligne, supprimer le panier
- Fonction save de cart: update de dateAdd
- Affichage: afficher l'image par défaut productAttributeId[0]
- Prix total: TTC et HT

Todo détail: Commande
- Après clique sur le bouton "Commander" dans le panier
- Mettre deux constantes de module: paiement à la livraison  -> default module: cashondelivery
- id par défaut: ao anaty md an'i Fetra
- fonction save() de order, ajoute run argument de date pour update order_history, order_paymenr, order_invoice, order_carriers