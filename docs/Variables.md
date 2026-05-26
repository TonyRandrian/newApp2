# Variables et changements à prévoir

Ce fichier centralise toutes les demandes de changements / variables nécessaires pour de nouvelles fonctionnalités. Ajoutez ici chaque fonctionnalité dictée et je remplirai les sections associées.

---

## Format d'une entrée de fonctionnalité
- **Nom de la fonctionnalité**: 
- **Résumé**: (description courte)
- **Impact**: (front / back / DB / infra)
- **Fichiers à modifier / créer**:
  - [chemin/vers/fichier1]
  - [chemin/vers/fichier2]
- **Variables d'environnement (nouveaux / modifiés)**:
  - `VITE_EXAMPLE_KEY` — description
- **Schema / Migration DB**:
  - description / script
- **API / Contrats**:
  - endpoints, payloads, réponses
- **Tâches de test**:
  - unitaires, intégration, e2e
- **Estimation / priorité**:
  - Jours/hommes, priorité
- **Risques / Notes**:
  - points d'attention
- **Statut**: `todo` / `en cours` / `done`

---

## Historique
- 2026-05-26: Fichier initial créé.


---

_Utilisation_: quand vous me dictez une nouvelle feature, je compléterai une nouvelle entrée en suivant ce modèle et j'indiquerai les changements précis (lignes à modifier, snippets, commandes de migration, etc.).

---

## Feature: `ModifyStock` (Ajouter / Retirer via la même page)
- **Nom de la fonctionnalité**: Modifier le comportement de `RemoveStock` pour supporter l'ajout et la suppression de stock depuis la même interface.
- **Résumé**: La page `RemoveStock` doit permettre soit d'ajouter soit de retirer du stock pour une catégorie sélectionnée. L'UI conserve un seul bouton `Valider`. Par défaut l'action doit privilégier "Ajouter" (priorité ajout). Le service back-end `RemoveStockService.js` sera refactoré pour exposer `modifyStockByCategory(categoryId, quantity, mode)` et conservera un wrapper `removeStockByCategory` pour compatibilité.
- **Impact**: front (UI) / back (service) — pas de modification de la DB au schéma, mais changements des appels API et de la logique de mouvements de stock.
- **Fichiers à modifier / créer**:
  - [src/pages/RemoveStock.jsx](src/pages/RemoveStock.jsx)
  - [src/backend/services/import/RemoveStockService.js](src/backend/services/import/RemoveStockService.js)
  - (optionnel) tests unitaires pour `RemoveStockService` et composant `RemoveStock`
- **Variables d'environnement (nouveaux / modifiés)**:
  - Aucune nouvelle variable d'environnement requise.
- **Schema / Migration DB**:
  - Aucune modification du schéma nécessaire.
- **API / Contrats**:
  - Signature proposée côté service JavaScript (internal):

```javascript
// signature
async function modifyStockByCategory(categoryId, quantityToModify, mode = 'add')
// mode: 'add' | 'remove'
// retourne: { total: number, totalNormal: number }
```

- Comportement détaillé:
  - `mode === 'add'` :
    - Pour chaque produit de la catégorie, calculer le delta = min(quantityToModify, quantité max souhaitée par produit?) — (le comportement actuel prends min(quantityActual, quantityToRemove) pour remove; pour add on appliquera la quantité demandée par déclinaison/produit: delta = Number(quantityToModify)).
    - Créer un `StockMvt` avec `sign: +1` et `idStockMvtReason` adapté (2 est utilisé pour retrait aujourd'hui; prévoir valeur `1` ou config selon la raison pour ajout) — laisser `idStockMvtReason: 1` par défaut pour ajout.
    - Incrémenter `stock_available.quantity` de `delta` et persister.
  - `mode === 'remove'` : conserver le comportement existant (sign: -1, delta = min(quantityAvailable, requested)).
  - `total` doit représenter la quantité effectivement touchée (positive) ; `totalNormal` conserve le sens actuel (par ex. total logique demandé — pour l'instant le service actuel incrémente `totalNormal` de Number(quantityToRemove) ; on conservera ce champ mais le documentera :
    - pour `add`: `totalNormal = total` (same as total)
    - pour `remove`: `totalNormal = Number(quantityToRemove)` (compatibility with existing UI)

- **Snippets/patch suggéré (haut-niveau)**:

1) Remplacer l'export actuel dans [src/backend/services/import/RemoveStockService.js](src/backend/services/import/RemoveStockService.js) par :

```javascript
export async function modifyStockByCategory(categoryId, quantityToModify, mode = 'add') {
  // implémentation unifiée: boucle produits, get stock, create StockMvt(sign), update StockAvailable
}

// wrapper pour compatibilité
export async function removeStockByCategory(categoryId, quantityToRemove) {
  return modifyStockByCategory(categoryId, quantityToRemove, 'remove')
}
```

2) Mettre à jour [src/pages/RemoveStock.jsx](src/pages/RemoveStock.jsx) :

- importer `modifyStockByCategory` au lieu de `removeStockByCategory` (ou conserver wrapper si on préfère ne pas toucher la page maintenant).
- ajouter `action` state ("add" | "remove") avec valeur par défaut `add`.
- remplacer le titre/subtitle dynamiquement selon l'action (ex: "Ajouter au stock" / "Retirer du stock").
- garder un seul bouton `Valider` qui appelle `modifyStockByCategory(categoryId, qtt, action)`.

Extrait UI attendu (concept):

```jsx
const [action, setAction] = useState('add') // 'add' prioritaire

<label>Action</label>
<select value={action} onChange={e => setAction(e.target.value)}>
  <option value="add">Ajouter</option>
  <option value="remove">Retirer</option>
</select>

// on submit
await modifyStockByCategory(categoryId, qtt, action)
```

- **Tâches de test**:
  - Unit tests: cas `add` / `remove` pour `modifyStockByCategory`, mocks de `StockAvailable` et `StockMvt`.
  - Test manuel: dans un environnement de test PrestaShop, vérifier que l'action `Ajouter` augmente bien les `stock_available.quantity` et crée un `stock_mvt` avec `sign = +1` ; l'action `Retirer` se comporte comme avant.

- **Estimation / priorité**:
  - Analyse + implémentation service + UI: ~0.5 à 1 jour selon les tests disponibles.
  - Priorité: moyenne; exigence: `add` prioritaire (valeur par défaut dans l'UI).

- **Risques / Notes**:
  - Attention aux raisons de mouvement (`idStockMvtReason`): vérifier que le code métier utilise la bonne raison pour l'ajout (aujourd'hui `2` est utilisé pour retrait dans l'impl. existante). Si les raisons sont importantes, ajouter une config ou constante explicitant `MVT_REASON_ADD` / `MVT_REASON_REMOVE`.
  - Potential race conditions si exécuté en parallèle pour la même déclinaison ; les appels `getById` / `update` sont conservateurs mais pas transactionnels.
  - Conserver le wrapper `removeStockByCategory` pour éviter de casser d'autres imports.

- **Statut**: todo

---

Ajoutez ci‑dessous d'autres instructions si vous voulez que j'implémente directement ces modifications (je peux appliquer les changements de code maintenant) ou que je génère les tests associés.
