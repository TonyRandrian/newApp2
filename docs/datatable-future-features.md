# Évolutions possibles des datatables du projet

Catalogue de **fonctionnalités à valeur ajoutée** que l'on peut greffer sur
les `MaterialReactTable` déjà en place. Chaque recette est autonome, donne le
code à insérer, et précise sur quelle table elle a le plus de sens.

Pré-requis : connaître l'API MRT — voir
[material-react-table.md](./material-react-table.md). Cette doc-ci ne
ré-explique pas les bases, elle propose des évolutions concrètes.

## Tables concernées

| Table | Fichier | Données |
|---|---|---|
| Liste des commandes | [src/components/BOOrderRow.jsx](../src/components/BOOrderRow.jsx) | Commandes (état, total, client). |
| Dashboard journalier | [src/components/BODashboardTable.jsx](../src/components/BODashboardTable.jsx) | Agrégats jour (commandes/paniers). |
| Stats par catégorie | [src/pages/BOStatistic.jsx](../src/pages/BOStatistic.jsx) (×3 tables) | Ventes, achats, bénéfice, disponibilités. |
| Stock | [src/pages/BOStock.jsx](../src/pages/BOStock.jsx) | Quantités physique / réservée / dispo. |

---

## 1. Coloration conditionnelle de cellule

Recette la plus courante : signaler visuellement une valeur hors seuil.

### 1.1 Couleur de fond sur une cellule

API MRT : `muiTableBodyCellProps` au niveau **colonne** (peut être une
fonction de `({ cell, row })`).

```jsx
{
    header: "Stock dispo",
    accessorKey: "availableQuantity",
    Cell: ({ cell }) => Number(cell.getValue() ?? 0),
    muiTableBodyCellProps: ({ cell }) => {
        const v = Number(cell.getValue() ?? 0)
        if (v <= 0)  return { sx: { backgroundColor: "#fee2e2", color: "#991b1b" } } // rouge
        if (v < 10)  return { sx: { backgroundColor: "#fef3c7", color: "#92400e" } } // orange
        return { sx: { backgroundColor: "#dcfce7", color: "#166534" } }              // vert
    },
}
```

**Où l'appliquer** :
- [BOStatistic.jsx](../src/pages/BOStatistic.jsx) colonne « Qte dispo » du
  tableau « Disponibilité du stock ».
- [BOStock.jsx](../src/pages/BOStock.jsx) sur la quantité physique.
- [BOStatistic.jsx](../src/pages/BOStatistic.jsx) colonne « Benefice » :
  vert si > 0, rouge si négatif.

### 1.2 Couleur de la ligne entière

API MRT : `muiTableBodyRowProps` au niveau **table**.

```jsx
const table = useMaterialReactTable({
    columns,
    data,
    muiTableBodyRowProps: ({ row }) => {
        const state = Number(row.original?.currentState ?? 0)
        if (state === 6) return { sx: { backgroundColor: "#fafafa", opacity: 0.6 } } // annulée
        if (state === 5) return { sx: { backgroundColor: "#f0fdf4" } }              // livrée
        return {}
    },
})
```

**Où l'appliquer** : [BOOrderRow.jsx](../src/components/BOOrderRow.jsx) — la
table garde déjà un zébrage par index ; il suffit de **conserver** ce zébrage
en `else` et d'ajouter les couleurs métier en `if`.

### 1.3 Badge / pastille au lieu de fond plein

Quand la couleur de fond fait trop « brut », préférer une pastille colorée
dans la cellule :

```jsx
{
    header: "État",
    accessorKey: "orderStateName",
    Cell: ({ cell, row }) => {
        const state = Number(row.original?.currentState ?? 0)
        const palette = {
            5:  { bg: "#dcfce7", fg: "#166534" }, // Livrée
            6:  { bg: "#fee2e2", fg: "#991b1b" }, // Annulée
            11: { bg: "#dbeafe", fg: "#1e40af" }, // En attente
        }
        const c = palette[state] ?? { bg: "#f3f4f6", fg: "#374151" }
        return (
            <span
                style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: c.bg,
                    color: c.fg,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                }}
            >
                {cell.getValue()}
            </span>
        )
    },
}
```

---

## 2. Icônes et indicateurs de tendance

### 2.1 Flèche ↑↓ pour comparer à une référence

Utile sur [BODashboardTable](../src/components/BODashboardTable.jsx) pour
comparer le jour courant à la veille / moyenne :

```jsx
{
    header: "Total TTC",
    accessorKey: "totalTTC",
    Cell: ({ cell, row, table }) => {
        const value = Number(cell.getValue() ?? 0)
        const rows = table.getRowModel().rows
        const idx = rows.findIndex((r) => r.id === row.id)
        const prev = idx > 0 ? Number(rows[idx - 1].original.totalTTC ?? 0) : null
        const delta = prev != null ? value - prev : 0
        const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "—"
        const color = delta > 0 ? "#166534" : delta < 0 ? "#991b1b" : "#6b7280"
        return (
            <>
                {value.toFixed(2)}{" "}
                <span style={{ color, fontWeight: 600 }}>{arrow}</span>
            </>
        )
    },
}
```

### 2.2 Mini-barre de remplissage (mini sparkline cellule)

Pour la colonne « Qte dispo » du
[BOStatistic](../src/pages/BOStatistic.jsx) (table disponibilité stock) :

```jsx
{
    header: "Qte dispo",
    accessorFn: (row) => row?.availableQuantity ?? 0,
    Cell: ({ cell, row }) => {
        const v = Number(cell.getValue() ?? 0)
        const max = Number(row.original?.physicalQuantity ?? 1)
        const ratio = max > 0 ? Math.min(v / max, 1) : 0
        const color = ratio < 0.2 ? "#dc2626" : ratio < 0.5 ? "#d97706" : "#16a34a"
        return (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ minWidth: 30, textAlign: "right" }}>{v}</span>
                <div style={{ width: 80, height: 6, background: "#e5e7eb", borderRadius: 3 }}>
                    <div style={{ width: `${ratio * 100}%`, height: "100%", background: color, borderRadius: 3 }} />
                </div>
            </div>
        )
    },
}
```

---

## 3. Filtres avancés sur colonne

MRT supporte nativement les filtres par colonne (à activer via
`enableColumnFilters: true`). Quelques variantes utiles :

### 3.1 Filtre « select » à la place du texte

```jsx
{
    header: "État",
    accessorKey: "orderStateName",
    filterVariant: "select",   // dropdown au lieu de champ texte
    filterSelectOptions: ["Livrée", "Annulée", "En attente"],
}
```

### 3.2 Filtre « range » pour les montants

```jsx
{
    header: "Total",
    accessorKey: "totalPaid",
    filterVariant: "range",    // deux champs (min/max)
}
```

### 3.3 Filtre « date range »

Nécessite `@mui/x-date-pickers` (déjà installé) + `LocalizationProvider`
(voir [material-react-table.md §2](./material-react-table.md#2-configuration-globale-themeprovider)).

```jsx
{
    header: "Date",
    accessorKey: "dateAdd",
    filterVariant: "date-range",
}
```

**Où l'appliquer** : [BOOrderRow.jsx](../src/components/BOOrderRow.jsx) pour
gagner les filtres date/montant/état — aujourd'hui ces filtres existent au
niveau page, on les rapprocherait des colonnes.

---

## 4. Tri custom et tri stable

MRT trie par défaut alphabétiquement / numériquement selon le type. Cas où
on veut un ordre métier :

```jsx
{
    header: "État",
    accessorKey: "currentState",
    sortingFn: (rowA, rowB) => {
        const order = { 11: 0, 5: 1, 6: 2 }
        const a = order[Number(rowA.original.currentState)] ?? 99
        const b = order[Number(rowB.original.currentState)] ?? 99
        return a - b
    },
}
```

> Trie en mettant « En attente » > « Livrée » > « Annulée », plutôt qu'un
> ordre numérique brut.

---

## 5. Regroupement par colonne

Activer `enableGrouping: true` au niveau table, puis sur la colonne :

```jsx
{
    header: "Catégorie",
    accessorFn: (row) => row?.category?.name,
    enableGrouping: true,
    GroupedCell: ({ cell, row }) => (
        <strong>
            {cell.getValue()} ({row.subRows?.length} produits)
        </strong>
    ),
    AggregatedCell: ({ cell }) => `Total : ${cell.getValue()}`,
}
```

**Où l'appliquer** : [BOStatistic.jsx](../src/pages/BOStatistic.jsx) — au
lieu de précalculer `OrderCategoryMetrics`, laisser MRT grouper les lignes
détaillées et calculer le sous-total par catégorie.

---

## 6. Actions par ligne (menu contextuel)

Pour remplacer les boutons inline (Modifier, Facture PDF, etc.) par un menu
trois points qui se déploie au clic — gain de place sur les écrans étroits.

```jsx
import { MenuItem } from "@mui/material"

const table = useMaterialReactTable({
    columns,
    data,
    enableRowActions: true,
    renderRowActionMenuItems: ({ row, closeMenu }) => [
        <MenuItem key="edit" onClick={() => { onEdit(row.original.id); closeMenu() }}>
            Modifier l'état
        </MenuItem>,
        <MenuItem key="pdf" onClick={() => { exportInvoice(row.original); closeMenu() }}>
            Télécharger facture PDF
        </MenuItem>,
        <MenuItem key="cancel" onClick={() => { onCancel(row.original.id); closeMenu() }}>
            Annuler la commande
        </MenuItem>,
    ],
})
```

**Où l'appliquer** : [BOOrderRow.jsx](../src/components/BOOrderRow.jsx) une
fois que l'export PDF et l'annulation avec retour de stock seront en place
(voir [pdf-export.md](./pdf-export.md) et
[order-cancel-stock-revert.md](./order-cancel-stock-revert.md)).

---

## 7. Édition inline

MRT propose l'édition de cellules en place. Pratique pour
[BOOrderRow.jsx](../src/components/BOOrderRow.jsx) (état + date) au lieu du
formulaire externe actuel.

```jsx
{
    header: "État",
    accessorKey: "currentState",
    editVariant: "select",
    editSelectOptions: [
        { label: "Livrée", value: 5 },
        { label: "Annulée", value: 6 },
    ],
    muiEditTextFieldProps: ({ row }) => ({
        select: true,
        onChange: (event) => {
            // mise à jour optimiste, puis appel API
            updateOrderState(row.original.id, event.target.value)
        },
    }),
}

// Au niveau table :
enableEditing: true,
editDisplayMode: "cell",   // édite au clic sur la cellule
```

> Avantage : pas de bouton « Modifier » à part, ni de state `edit` au niveau
> page. Inconvénient : moins d'opportunité de valider le formulaire complet
> avant envoi.

---

## 8. Pinning de colonnes

Geler la colonne « Référence » à gauche et « Action » à droite — utile
quand on ajoute beaucoup de colonnes :

```jsx
const table = useMaterialReactTable({
    columns,
    data,
    enableColumnPinning: true,
    initialState: {
        columnPinning: {
            left: ["id"],
            right: ["mrt-row-actions"],
        },
    },
})
```

**Où l'appliquer** : [BOOrderRow.jsx](../src/components/BOOrderRow.jsx)
après §6 (menu d'actions).

---

## 9. Lignes développables (détail produit)

API MRT : `renderDetailPanel`. Idéal pour
[BOOrderRow.jsx](../src/components/BOOrderRow.jsx) : afficher les lignes de
commande (`OrderDetail`) sans changer de page.

```jsx
const table = useMaterialReactTable({
    columns,
    data,
    renderDetailPanel: ({ row }) => (
        <div style={{ padding: 16 }}>
            <h4>Lignes de commande</h4>
            <ul>
                {row.original.orderRows?.map((line) => (
                    <li key={line.id}>
                        {line.productName} × {line.productQuantity} — {Number(line.unitPrice).toFixed(2)} €
                    </li>
                ))}
            </ul>
        </div>
    ),
})
```

---

## 10. Sélection multi-lignes + actions groupées

Activer la sélection puis exposer une toolbar contextuelle :

```jsx
import { Button } from "@mui/material"

const table = useMaterialReactTable({
    columns,
    data,
    enableRowSelection: true,
    renderTopToolbarCustomActions: ({ table }) => {
        const selected = table.getSelectedRowModel().rows
        if (selected.length === 0) return null
        return (
            <Button
                onClick={() => {
                    const ids = selected.map((r) => r.original.id)
                    exportInvoicesZip(ids)
                }}
            >
                Exporter {selected.length} facture(s) en ZIP
            </Button>
        )
    },
})
```

`jszip` est déjà installé (voir `package.json`) — utile pour packer les PDF.

---

## 11. Conditionner l'affichage d'une colonne

### 11.1 Visibilité par défaut

```jsx
const table = useMaterialReactTable({
    columns,
    data,
    initialState: {
        columnVisibility: { totalPaidTaxExcl: false }, // HT masqué par défaut
    },
})
```

L'utilisateur peut le ré-afficher via le bouton « Colonnes » de la toolbar.

### 11.2 Selon le rôle

```jsx
const columns = useMemo(() => {
    const base = [/* colonnes communes */]
    if (currentUser.role === "admin") {
        base.push({ header: "Coût d'achat", accessorKey: "totalAchat" })
    }
    return base
}, [currentUser.role])
```

---

## 12. Pied de tableau dynamique

Déjà utilisé dans [BOStatistic.jsx](../src/pages/BOStatistic.jsx). Extension :
afficher non seulement le total mais aussi la moyenne et le nombre de lignes
filtrées :

```jsx
{
    header: "Total TTC",
    accessorKey: "totalTTC",
    Footer: ({ table }) => {
        const rows = table.getFilteredRowModel().rows
        const total = rows.reduce((acc, r) => acc + Number(r.original.totalTTC ?? 0), 0)
        const avg = rows.length > 0 ? total / rows.length : 0
        return (
            <div>
                <strong>{total.toFixed(2)} €</strong>
                <br />
                <small>Moy : {avg.toFixed(2)} € ({rows.length} lignes)</small>
            </div>
        )
    },
}
```

> Utiliser `getFilteredRowModel()` plutôt que la prop `data` : si
> l'utilisateur filtre, le total reflète **les lignes visibles**.

---

## 13. Persistance de l'état (filtres, tri, colonnes)

Mémoriser dans `localStorage` les préférences utilisateur (filtres, tri,
visibilité de colonnes) pour qu'elles soient rappelées au prochain
chargement :

```jsx
const STORAGE_KEY = "bo-orders-table-state"

const initialState = useMemo(() => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    } catch {
        return {}
    }
}, [])

const [columnFilters, setColumnFilters] = useState(initialState.columnFilters ?? [])
const [sorting,        setSorting]      = useState(initialState.sorting ?? [])
const [columnVisibility, setColumnVisibility] = useState(initialState.columnVisibility ?? {})

useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        columnFilters, sorting, columnVisibility,
    }))
}, [columnFilters, sorting, columnVisibility])

const table = useMaterialReactTable({
    columns, data,
    state: { columnFilters, sorting, columnVisibility },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange:       setSorting,
    onColumnVisibilityChange: setColumnVisibility,
})
```

> ⚠️ Choisir un `STORAGE_KEY` distinct par table, sinon les états se
> contaminent.

---

## 14. Densité réglable (compact / confortable)

```jsx
const table = useMaterialReactTable({
    columns, data,
    enableDensityToggle: true,
    initialState: { density: "compact" },
})
```

Un bouton apparaît dans la toolbar pour passer en `comfortable` / `spacious`.
Pertinent pour [BOStock.jsx](../src/pages/BOStock.jsx) qui affiche beaucoup
de lignes.

---

## 15. Export intégré (CSV / PDF par bouton MRT)

Plutôt que les boutons custom de [csv-export.md](./csv-export.md) et
[pdf-export.md](./pdf-export.md), MRT propose un `MRT_ExportButton` natif.
**Avantages** : intégré à la toolbar, supporte la sélection.
**Inconvénients** : moins de contrôle sur le format que les helpers maison.

À évaluer en v2, lorsque les besoins de manipulation de données avant export
(préfixe `ps_`, etc.) seront stables.

---

## 16. Recherche full-text globale custom

Par défaut MRT cherche sur toutes les colonnes string. Pour normaliser
(insensible aux accents) :

```jsx
import { useMaterialReactTable } from "material-react-table"

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

const table = useMaterialReactTable({
    columns, data,
    enableGlobalFilter: true,
    globalFilterFn: (row, columnId, filterValue) => {
        const haystack = norm(row.getValue(columnId))
        const needle = norm(filterValue)
        return haystack.includes(needle)
    },
})
```

Évite que « francois » échoue à matcher « François » dans le nom client.

---

## 17. Internationalisation (i18n)

Les libellés MRT (« Search… », « Filter », « No records to display ») sont
en anglais. Pour les passer en FR :

```jsx
const table = useMaterialReactTable({
    columns, data,
    localization: {
        actions: "Actions",
        noRecordsToDisplay: "Aucune ligne à afficher",
        showHideColumns: "Afficher / masquer les colonnes",
        search: "Rechercher",
        filterByColumn: "Filtrer la colonne",
        // ... voir la liste complète dans la lib
    },
})
```

À factoriser dans un fichier `src/components/mrtLocale.js` partagé entre
toutes les tables.

---

## 18. Mise en place suggérée — ordre de priorité

| Priorité | Recette | Pourquoi |
|---|---|---|
| 🟢 Quick win | §1.1 / §1.2 / §1.3 — coloration conditionnelle (stock faible, commandes annulées). | Forte valeur visuelle, ~10 lignes de code. |
| 🟢 Quick win | §17 — i18n FR. | Cohérence UX immédiate. |
| 🟡 Moyen | §3 — filtres par colonne (date-range, select état). | Remplace les filtres page-level dispersés. |
| 🟡 Moyen | §6 — menu d'actions (à coupler avec PDF). | Désencombre [BOOrderRow](../src/components/BOOrderRow.jsx). |
| 🟡 Moyen | §9 — détail panel commandes. | Évite une page « détail commande » séparée. |
| 🔴 Plus lourd | §5 — regroupement / agrégation native. | Refonte de la logique `OrderCategoryMetrics`. |
| 🔴 Plus lourd | §13 — persistance d'état. | Touche toutes les pages, à standardiser. |

---

## 19. Anti-patrons à éviter

- **Recalculer les couleurs à chaque rendu** dans `Cell:` au lieu de
  `muiTableBodyCellProps` : `Cell` rerender potentiellement à chaque scroll,
  `muiTableBodyCellProps` est mémoïsé par MRT.
- **Mettre les seuils en dur** dans 10 colonnes. Centraliser :
  ```js
  // src/styles/datatable-thresholds.js
  export const STOCK_THRESHOLDS = { critical: 0, low: 10 }
  export const STOCK_COLORS = {
      critical: { bg: "#fee2e2", fg: "#991b1b" },
      low:      { bg: "#fef3c7", fg: "#92400e" },
      ok:       { bg: "#dcfce7", fg: "#166534" },
  }
  ```
- **Coupler la coloration aux états BO/FO différents**. Si plus tard le BO
  et le FO partagent une table (ex. liste commandes), facteur la
  configuration de couleurs dans un module pur (pas dans le composant).
- **Faire du `setState` dans `Cell:`** — provoque un rerender en boucle.
  Toujours passer par un handler externe (`onClick`, `onChange`) déclaré sur
  la page.

---

## 20. Voir aussi

- API détaillée : [material-react-table.md](./material-react-table.md)
- Export CSV (helpers déjà documentés) : [csv-export.md](./csv-export.md)
- Export PDF : [pdf-export.md](./pdf-export.md)
- Valeurs métier hardcodées (états, raisons stock) : [hardcoded-values.md](./hardcoded-values.md)
