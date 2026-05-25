# Material React Table — Guide d'utilisation

Documentation complète pour utiliser [`material-react-table`](https://www.material-react-table.com/) (v3.2.1) dans ce projet, et pour migrer depuis `react-data-table-component`.

> **Material React Table (MRT)** est un wrapper React sur [TanStack Table v8](https://tanstack.com/table) qui utilise les composants Material UI (MUI) pour le rendu. Comparé à `react-data-table-component`, il offre nativement : tri multi-colonnes, filtres par colonne, regroupement, virtualisation, édition de cellules, drag & drop, sélection avancée, pinning, etc.

---

## 1. Installation

Les dépendances sont déjà installées :

```json
"@emotion/react": "^11.14.0",
"@emotion/styled": "^11.14.1",
"@mui/icons-material": "^9.0.1",
"@mui/material": "^9.0.1",
"@mui/x-date-pickers": "^9.3.0",
"material-react-table": "^3.2.1"
```

> MRT v3 requiert `@mui/material` ≥ 6, `@emotion/react` et `@emotion/styled` (peer deps).
> `@mui/icons-material` est requis pour les icônes par défaut.
> `@mui/x-date-pickers` n'est nécessaire que pour les filtres de type date.

---

## 2. Configuration globale (ThemeProvider)

Pour bénéficier d'un thème cohérent, envelopper l'application avec un `ThemeProvider` MUI dans [src/main.jsx](src/main.jsx) :

```jsx
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const theme = createTheme({
    palette: { mode: "light" },
});

<ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
</ThemeProvider>
```

Pour les filtres date, ajouter aussi un `LocalizationProvider` :

```jsx
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

<LocalizationProvider dateAdapter={AdapterDateFns}>
    <App />
</LocalizationProvider>
```

---

## 3. Exemple minimal

```jsx
import { useMemo } from "react";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";

function MyTable() {
    const columns = useMemo(
        () => [
            { accessorKey: "id", header: "ID", size: 80 },
            { accessorKey: "name", header: "Nom" },
            { accessorKey: "price", header: "Prix" },
        ],
        []
    );

    const data = [
        { id: 1, name: "Produit A", price: 10 },
        { id: 2, name: "Produit B", price: 25 },
    ];

    const table = useMaterialReactTable({ columns, data });

    return <MaterialReactTable table={table} />;
}

export default MyTable;
```

> **Recommandation :** utiliser le hook `useMaterialReactTable(options)` puis passer la `table` au composant. C'est plus performant que `<MaterialReactTable {...options} />` car cela évite de recréer l'instance à chaque rendu.

---

## 4. Définition des colonnes

Chaque colonne est un objet typé `MRT_ColumnDef`. Les propriétés les plus utiles :

| Propriété              | Type                                  | Description                                                       |
|------------------------|---------------------------------------|-------------------------------------------------------------------|
| `accessorKey`          | `string`                              | Clé du champ dans la donnée (ex: `"name"`, `"user.email"` avec `.`) |
| `accessorFn`           | `(row) => any`                        | Alternative à `accessorKey` pour valeurs calculées                |
| `id`                   | `string`                              | Identifiant unique (obligatoire si `accessorFn` sans `accessorKey`) |
| `header`               | `string \| ReactNode`                 | Titre de la colonne                                               |
| `Header`               | `({ column }) => ReactNode`           | Rendu personnalisé du header                                      |
| `Cell`                 | `({ cell, row, renderedCellValue }) => ReactNode` | Rendu personnalisé de la cellule                      |
| `Footer`               | `({ column, table }) => ReactNode`    | Rendu d'un pied de colonne                                        |
| `size`                 | `number`                              | Largeur (en px)                                                   |
| `minSize` / `maxSize`  | `number`                              | Bornes de largeur                                                 |
| `enableSorting`        | `boolean`                             | Active/désactive le tri (par défaut : `true`)                     |
| `enableColumnFilter`   | `boolean`                             | Active/désactive le filtre                                        |
| `filterVariant`        | `"text" \| "select" \| "multi-select" \| "range" \| "range-slider" \| "checkbox" \| "date" \| "date-range" \| "autocomplete"` | Type de filtre |
| `filterFn`             | `string \| function`                  | Fonction de filtrage                                              |
| `enableEditing`        | `boolean`                             | Permet l'édition de la cellule                                    |
| `enableHiding`         | `boolean`                             | Permet de cacher la colonne                                       |
| `enablePinning`        | `boolean`                             | Permet d'épingler la colonne                                      |
| `enableColumnDragging` | `boolean`                             | Permet le drag & drop d'ordre                                     |
| `muiTableHeadCellProps`| `object \| (({column}) => object)`    | Props/style MUI du header                                         |
| `muiTableBodyCellProps`| `object \| (({cell, row}) => object)` | Props/style MUI des cellules                                      |

### Cellule personnalisée

```jsx
const columns = useMemo(() => [
    {
        accessorKey: "stock",
        header: "Stock",
        Cell: ({ cell, row }) => {
            const value = cell.getValue();
            return (
                <span style={{ color: value > 0 ? "green" : "red" }}>
                    {value > 0 ? `${value} dispo.` : "Rupture"}
                </span>
            );
        },
    },
    {
        accessorKey: "price",
        header: "Prix",
        Cell: ({ cell }) => `${cell.getValue().toFixed(2)} €`,
        muiTableBodyCellProps: { align: "right" },
    },
], []);
```

### Accéder à un champ imbriqué

```jsx
{ accessorKey: "user.email", header: "Email" } // ou
{ accessorFn: row => row.user?.email, id: "userEmail", header: "Email" }
```

### Colonne « Total »

Deux cas distincts selon ce qu'on veut afficher.

#### a) Total par ligne (colonne calculée)

Pour afficher le total d'une ligne (ex. `quantité × prixUnitaire`), utiliser `accessorFn` avec un `id` :

```jsx
const columns = useMemo(() => [
    { accessorKey: "name", header: "Produit" },
    { accessorKey: "quantity", header: "Quantité" },
    { accessorKey: "unitPrice", header: "Prix unitaire" },
    {
        id: "total",
        header: "Total",
        accessorFn: row => row.quantity * row.unitPrice,
        Cell: ({ cell }) => `${cell.getValue().toFixed(2)} €`,
        muiTableBodyCellProps: { align: "right" },
    },
], []);
```

> La valeur étant calculée, le tri et les filtres (`range`, `range-slider`) fonctionnent nativement sur la colonne.

#### b) Total en pied de colonne (somme d'une colonne)

Pour afficher la somme d'une colonne dans un pied de tableau, utiliser la prop `Footer` de la colonne et activer le pied via l'instance MUI (le pied est rendu automatiquement dès qu'au moins une colonne définit `Footer` ou `footer`) :

```jsx
const columns = useMemo(() => [
    { accessorKey: "name", header: "Produit" },
    {
        accessorKey: "quantity",
        header: "Quantité",
        Footer: ({ table }) => {
            const total = table
                .getFilteredRowModel()
                .rows.reduce((sum, row) => sum + (row.original.quantity ?? 0), 0);
            return <strong>Total : {total}</strong>;
        },
    },
    {
        accessorKey: "amount",
        header: "Montant",
        Cell: ({ cell }) => `${cell.getValue().toFixed(2)} €`,
        Footer: ({ table }) => {
            const total = table
                .getFilteredRowModel()
                .rows.reduce((sum, row) => sum + (row.original.amount ?? 0), 0);
            return <strong>{total.toFixed(2)} €</strong>;
        },
        muiTableBodyCellProps: { align: "right" },
        muiTableFooterCellProps: { align: "right" },
    },
], []);
```

> **Choix du modèle de lignes** :
> - `table.getFilteredRowModel()` — total sur les lignes filtrées (toutes pages confondues). **Recommandé.**
> - `table.getRowModel()` — total sur la page courante uniquement.
> - `table.getPrePaginationRowModel()` — équivalent à `getFilteredRowModel()` quand la pagination est active.
>
> Pour un total **toujours sur toutes les données** (ignore filtres et pagination), calculer directement sur `data` avec `useMemo` et passer la valeur via closure.

#### c) Pied fixe (sticky footer)

Pour garder le pied visible en bas du conteneur scrollable :

```jsx
useMaterialReactTable({
    columns,
    data,
    enableStickyFooter: true,
    muiTableContainerProps: { sx: { maxHeight: 500 } },
});
```

---

## 5. Tri

Activé par défaut sur toutes les colonnes. Options utiles :

```jsx
useMaterialReactTable({
    columns,
    data,
    enableSorting: true,           // global
    enableMultiSort: true,         // tri sur plusieurs colonnes (shift+clic)
    initialState: {
        sorting: [{ id: "name", desc: false }],
    },
});
```

### Tri côté serveur

```jsx
const [sorting, setSorting] = useState([]);

useMaterialReactTable({
    columns,
    data,
    manualSorting: true,
    onSortingChange: setSorting,
    state: { sorting },
});

useEffect(() => {
    // refetch avec sorting[0].id et sorting[0].desc
}, [sorting]);
```

---

## 6. Filtres

Trois niveaux de filtres sont disponibles :

- **Recherche globale** (`enableGlobalFilter`) — barre de recherche unique.
- **Filtres par colonne** (`enableColumnFilters`) — input sous chaque header.
- **Filtres facettés** — basés sur les valeurs uniques d'une colonne.

```jsx
useMaterialReactTable({
    columns,
    data,
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableFacetedValues: true,
    initialState: { showGlobalFilter: true, showColumnFilters: false },
});
```

### Variantes de filtre par colonne

```jsx
{ accessorKey: "category", header: "Catégorie", filterVariant: "select" }
{ accessorKey: "tags", header: "Tags", filterVariant: "multi-select" }
{ accessorKey: "price", header: "Prix", filterVariant: "range-slider" }
{ accessorKey: "createdAt", header: "Date", filterVariant: "date-range" }
{ accessorKey: "active", header: "Actif", filterVariant: "checkbox" }
```

### Filtres côté serveur

```jsx
const [globalFilter, setGlobalFilter] = useState("");
const [columnFilters, setColumnFilters] = useState([]);

useMaterialReactTable({
    columns,
    data,
    manualFiltering: true,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    state: { globalFilter, columnFilters },
});
```

---

## 7. Pagination

```jsx
useMaterialReactTable({
    columns,
    data,
    enablePagination: true,
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    muiPaginationProps: {
        rowsPerPageOptions: [5, 10, 25, 50, 100],
        showFirstButton: true,
        showLastButton: true,
    },
});
```

### Pagination côté serveur

```jsx
const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
const [rowCount, setRowCount] = useState(0);
const [data, setData] = useState([]);
const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
    setIsLoading(true);
    fetch(`/api/products?page=${pagination.pageIndex}&size=${pagination.pageSize}`)
        .then(r => r.json())
        .then(json => {
            setData(json.items);
            setRowCount(json.total);
            setIsLoading(false);
        });
}, [pagination]);

useMaterialReactTable({
    columns,
    data,
    manualPagination: true,
    rowCount,
    onPaginationChange: setPagination,
    state: { pagination, isLoading },
});
```

---

## 8. Sélection de lignes

```jsx
const [rowSelection, setRowSelection] = useState({});

const table = useMaterialReactTable({
    columns,
    data,
    enableRowSelection: true,                 // ou (row) => !row.original.locked
    enableMultiRowSelection: true,
    getRowId: row => row.id,                  // recommandé pour la persistance
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
});

// Récupérer les lignes sélectionnées
const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);
```

---

## 9. Lignes développables (Expandable / Detail Panel)

Deux façons de déplier une ligne :

### 9.1. Detail Panel (équivalent direct de RDC `expandableRowsComponent`)

```jsx
useMaterialReactTable({
    columns,
    data,
    renderDetailPanel: ({ row }) => (
        <div style={{ padding: 16 }}>
            <p>Description : {row.original.description}</p>
            <p>Fournisseur : {row.original.supplier}</p>
        </div>
    ),
});
```

> **Différence-clé avec `react-data-table-component` :** ici, la donnée est dans `row.original`, pas dans `data`. Le callback `renderDetailPanel` reçoit `{ row, table }`.

### 9.2. Sub-rows (hiérarchie native)

Si les données ont des enfants, MRT peut les afficher comme un arbre :

```jsx
useMaterialReactTable({
    columns,
    data,                              // chaque row peut avoir un champ `subRows`
    enableExpanding: true,
    getSubRows: row => row.children,
});
```

### 9.3. Contrôler l'état d'expansion

```jsx
const [expanded, setExpanded] = useState({});

useMaterialReactTable({
    columns,
    data,
    renderDetailPanel: ({ row }) => <div>...</div>,
    onExpandedChange: setExpanded,
    state: { expanded },
});
```

---

## 10. Édition de cellules

Trois modes : `"modal"`, `"row"`, `"cell"`, `"table"`.

```jsx
useMaterialReactTable({
    columns,
    data,
    enableEditing: true,
    editDisplayMode: "row",            // édition de toute la ligne
    onEditingRowSave: async ({ row, values, table }) => {
        await api.updateProduct(row.original.id, values);
        table.setEditingRow(null);
    },
    onEditingRowCancel: () => {},
});
```

Désactiver l'édition sur certaines colonnes : `enableEditing: false` au niveau de la colonne.

---

## 11. États (loading, vide, erreur)

```jsx
useMaterialReactTable({
    columns,
    data,
    state: {
        isLoading,
        showProgressBars: isFetching,
        showAlertBanner: isError,
    },
    muiToolbarAlertBannerProps: isError
        ? { color: "error", children: "Erreur de chargement" }
        : undefined,
    renderEmptyRowsFallback: () => (
        <div style={{ padding: 16, textAlign: "center" }}>
            Aucun produit trouvé.
        </div>
    ),
});
```

---

## 12. Actions par ligne

```jsx
import { Box, IconButton, Tooltip } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

useMaterialReactTable({
    columns,
    data,
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
        <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Éditer">
                <IconButton onClick={() => handleEdit(row.original)}>
                    <Edit />
                </IconButton>
            </Tooltip>
            <Tooltip title="Supprimer">
                <IconButton color="error" onClick={() => handleDelete(row.original.id)}>
                    <Delete />
                </IconButton>
            </Tooltip>
        </Box>
    ),
});
```

---

## 13. Toolbar personnalisée

```jsx
import { Button } from "@mui/material";

useMaterialReactTable({
    columns,
    data,
    renderTopToolbarCustomActions: ({ table }) => (
        <Button variant="contained" onClick={() => handleCreate()}>
            + Nouveau produit
        </Button>
    ),
    renderBottomToolbarCustomActions: () => <span>Mise à jour : 14:32</span>,
});
```

---

## 14. Export CSV

MRT ne fournit pas d'export natif. Utiliser `papaparse` (déjà installé) :

```jsx
import Papa from "papaparse";
import { Button } from "@mui/material";

const handleExport = (rows) => {
    const csv = Papa.unparse(rows.map(r => r.original));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "export.csv";
    link.click();
};

useMaterialReactTable({
    columns,
    data,
    renderTopToolbarCustomActions: ({ table }) => (
        <Button onClick={() => handleExport(table.getPrePaginationRowModel().rows)}>
            Exporter CSV
        </Button>
    ),
});
```

---

## 15. Style et thème

### Props MUI directes

```jsx
useMaterialReactTable({
    columns,
    data,
    muiTablePaperProps: { elevation: 0, sx: { borderRadius: 2 } },
    muiTableContainerProps: { sx: { maxHeight: 600 } },
    muiTableHeadCellProps: { sx: { fontWeight: "bold", backgroundColor: "#f5f5f5" } },
    muiTableBodyRowProps: ({ row }) => ({
        sx: {
            backgroundColor: row.original.stock === 0 ? "#ffe5e5" : "inherit",
        },
    }),
    muiTableBodyCellProps: { sx: { fontSize: "0.9rem" } },
});
```

### `sx` ou `className` ?

`sx` n'est pas une balise HTML ni un mot imposé par Material React Table. C'est une prop MUI qui accepte un objet de styles JavaScript.

- Si tu veux styler rapidement un composant MUI ou une ligne MRT, `sx` est la solution la plus directe.
- Si tu préfères centraliser le style dans un fichier CSS, tu peux renvoyer une `className` depuis `muiTableBodyRowProps` et écrire la règle CSS à part.

Exemple 1 - couleur de ligne avec `sx` :

```jsx
useMaterialReactTable({
    columns,
    data,
    muiTableBodyRowProps: ({ row }) => ({
        sx: {
            backgroundColor: Number(row.original?.currentState) === 5 ? "#d4edda" : "inherit",
        },
    }),
});
```

Exemple 2 - couleur de cellule avec `sx` :

```jsx
{
    header: "Prix",
    accessorKey: "price",
    muiTableBodyCellProps: ({ cell }) => ({
        sx: {
            color: Number(cell.getValue() ?? 0) > 500 ? "#721c24" : "#155724",
            fontWeight: Number(cell.getValue() ?? 0) > 500 ? "bold" : "normal",
        },
    }),
}
```

Exemple 3 - couleur de ligne avec `className` :

```jsx
useMaterialReactTable({
    columns,
    data,
    muiTableBodyRowProps: ({ row }) => ({
        className: Number(row.original?.currentState) === 5 ? "row-delivered" : "row-default",
    }),
});
```

Exemple 4 - couleur de cellule avec `className` :

```jsx
{
    header: "Prix",
    accessorKey: "price",
    muiTableBodyCellProps: ({ cell }) => ({
        className: Number(cell.getValue() ?? 0) > 500 ? "redclass" : "greenclass",
    }),
}
```

Puis dans un fichier CSS :

```css
.row-delivered {
    background-color: #d4edda;
}

.row-default {
    background-color: white;
}

.redclass {
    background-color: #f8d7da;
    color: #721c24;
}

.greenclass {
    background-color: #d4edda;
    color: #155724;
}
```

### Mode dense / striped / hover

```jsx
useMaterialReactTable({
    columns,
    data,
    enableStickyHeader: true,
    muiTableProps: { sx: { tableLayout: "fixed" } },
    initialState: { density: "compact" },        // "comfortable" | "compact" | "spacious"
});
```

---

## 16. Fonctionnalités avancées (à activer au besoin)

| Prop                          | Effet                                                         |
|-------------------------------|---------------------------------------------------------------|
| `enableColumnOrdering`        | Réordonner les colonnes par drag & drop                       |
| `enableColumnPinning`         | Épingler des colonnes à gauche/droite                         |
| `enableColumnResizing`        | Redimensionner les colonnes                                   |
| `enableColumnDragging`        | Drag des en-têtes                                             |
| `enableGrouping`              | Regroupement par colonne                                      |
| `enableRowVirtualization`     | Virtualisation (pour > 1000 lignes)                           |
| `enableRowOrdering`           | Réordonner les lignes par drag & drop                         |
| `enableRowPinning`            | Épingler des lignes                                           |
| `enableFullScreenToggle`      | Bouton plein écran (activé par défaut)                        |
| `enableDensityToggle`         | Bouton densité (activé par défaut)                            |
| `enableHiding`                | Bouton de visibilité des colonnes (activé par défaut)         |
| `enableColumnFilterModes`     | Permet à l'utilisateur de changer l'opérateur de filtre       |

---

## 17. Migration depuis `react-data-table-component`

### 17.1. Tableau de correspondance

| `react-data-table-component`           | `material-react-table`                                  |
|----------------------------------------|---------------------------------------------------------|
| `columns: [{ name, selector }]`        | `columns: [{ accessorKey, header }]`                    |
| `selector: row => row.x`               | `accessorKey: "x"` ou `accessorFn: row => row.x`        |
| `cell: row => <...>`                   | `Cell: ({ row }) => <...>` (donnée dans `row.original`) |
| `sortable: true`                       | activé par défaut ; désactiver via `enableSorting: false` |
| `pagination`                           | `enablePagination` (par défaut `true`)                  |
| `paginationServer` / `paginationTotalRows` | `manualPagination` / `rowCount`                     |
| `onChangePage` / `onChangeRowsPerPage` | `onPaginationChange`                                    |
| `selectableRows`                       | `enableRowSelection`                                    |
| `onSelectedRowsChange`                 | `onRowSelectionChange` + `table.getSelectedRowModel()`  |
| `expandableRows` + `expandableRowsComponent` | `renderDetailPanel: ({ row }) => ...`             |
| `progressPending` / `progressComponent`| `state: { isLoading }`                                  |
| `noDataComponent`                      | `renderEmptyRowsFallback`                               |
| `conditionalRowStyles`                 | `muiTableBodyRowProps: ({ row }) => ({ sx: ... })`      |
| `customStyles`                         | `mui*Props` ciblés (ex: `muiTableHeadCellProps`)        |
| `onRowClicked`                         | `muiTableBodyRowProps: ({ row }) => ({ onClick: ... })` |
| `onSort` + `sortServer`                | `manualSorting` + `onSortingChange`                     |
| `striped`                              | non natif — `muiTableBodyRowProps` avec `:nth-of-type`  |
| `dense`                                | `initialState: { density: "compact" }`                  |
| `highlightOnHover`                     | activé par défaut                                       |

### 17.2. Pièges fréquents lors de la migration

- **`row` vs `row.original`** : dans MRT, la ligne brute est dans `row.original`. Oublier `.original` est l'erreur la plus fréquente.
- **`columns` doit être mémoïsé** avec `useMemo` (sinon TanStack Table reconstruit son état à chaque rendu).
- **`data` doit aussi être stable** : éviter `data={products.filter(...)}` directement dans le JSX ; passer par `useMemo`.
- **`getRowId`** : à fournir dès qu'on utilise la sélection ou l'expansion contrôlée, sinon MRT utilise l'index, ce qui pose problème après tri/filtrage.
- **MUI v9** : ce projet utilise `@mui/material` ^9.0.1. MRT v3 a été développé contre MUI v6/v7 — surveiller d'éventuels warnings (`Slot` renommés, etc.). Si un composant casse, fixer MUI à `^7.x`.
- **`material-react-table` n'est pas tree-shakable à 100 %** : le bundle ajoute ~100 ko gzip. Acceptable pour un back-office, à mesurer pour du public-facing.

### 17.3. Avant / après

**Avant — `react-data-table-component` :**

```jsx
const columns = [
    { name: "Produit", selector: row => row.name, sortable: true },
    { name: "Stock", selector: row => row.stock, sortable: true, right: true },
];

<DataTable
    columns={columns}
    data={products}
    pagination
    progressPending={loading}
    expandableRows
    expandableRowsComponent={({ data }) => <div>{data.description}</div>}
    conditionalRowStyles={[
        { when: row => row.stock === 0, style: { backgroundColor: "#ffe5e5" } },
    ]}
/>
```

**Après — `material-react-table` :**

```jsx
const columns = useMemo(() => [
    { accessorKey: "name", header: "Produit" },
    { accessorKey: "stock", header: "Stock", muiTableBodyCellProps: { align: "right" } },
], []);

const table = useMaterialReactTable({
    columns,
    data: products,
    state: { isLoading: loading },
    renderDetailPanel: ({ row }) => <div>{row.original.description}</div>,
    muiTableBodyRowProps: ({ row }) => ({
        sx: { backgroundColor: row.original.stock === 0 ? "#ffe5e5" : "inherit" },
    }),
});

return <MaterialReactTable table={table} />;
```

---

## 18. Exemple complet adapté au projet

Version migrée de [src/pages/BOStock.jsx](src/pages/BOStock.jsx) :

```jsx
import { useEffect, useMemo, useState } from "react";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { Box, Button, Chip, IconButton, Tooltip } from "@mui/material";
import { Edit, Delete, Refresh } from "@mui/icons-material";
import { fetchProductWithStock } from "../backend/services/ProductService.js";

function BOStock() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchProductWithStock();
        setProducts(data);
        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const columns = useMemo(() => [
        { accessorKey: "id", header: "ID", size: 80 },
        { accessorKey: "name", header: "Produit" },
        {
            accessorKey: "category",
            header: "Catégorie",
            filterVariant: "select",
        },
        {
            accessorKey: "stock",
            header: "Stock",
            filterVariant: "range",
            muiTableBodyCellProps: { align: "right" },
        },
        {
            accessorKey: "price",
            header: "Prix",
            filterVariant: "range-slider",
            Cell: ({ cell }) => `${cell.getValue().toFixed(2)} €`,
            muiTableBodyCellProps: { align: "right" },
        },
        {
            id: "status",
            header: "Statut",
            accessorFn: row => (row.stock > 0 ? "Disponible" : "Rupture"),
            Cell: ({ row }) => (
                <Chip
                    label={row.original.stock > 0 ? "Disponible" : "Rupture"}
                    color={row.original.stock > 0 ? "success" : "error"}
                    size="small"
                />
            ),
        },
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: products,
        getRowId: row => row.id,
        state: { isLoading },
        enableGlobalFilter: true,
        enableColumnFilters: true,
        enableFacetedValues: true,
        enableRowSelection: true,
        enableRowActions: true,
        positionActionsColumn: "last",
        initialState: {
            density: "compact",
            pagination: { pageSize: 10, pageIndex: 0 },
            showGlobalFilter: true,
        },
        muiTableBodyRowProps: ({ row }) => ({
            sx: {
                backgroundColor: row.original.stock === 0 ? "#ffe5e5" : "inherit",
            },
        }),
        renderDetailPanel: ({ row }) => (
            <Box sx={{ p: 2, bgcolor: "#fafafa" }}>
                <p>Référence : {row.original.sku}</p>
                <p>Seuil d'alerte : {row.original.threshold}</p>
            </Box>
        ),
        renderRowActions: ({ row }) => (
            <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title="Éditer">
                    <IconButton size="small"><Edit fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="Supprimer">
                    <IconButton size="small" color="error">
                        <Delete fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        ),
        renderTopToolbarCustomActions: () => (
            <Button startIcon={<Refresh />} onClick={loadData}>
                Rafraîchir
            </Button>
        ),
        renderEmptyRowsFallback: () => (
            <Box sx={{ p: 2, textAlign: "center" }}>Aucun produit trouvé.</Box>
        ),
    });

    return (
        <Box sx={{ p: 2 }}>
            <h2>Page de stock</h2>
            <MaterialReactTable table={table} />
        </Box>
    );
}

export default BOStock;
```

---

## 19. Ressources

- Documentation officielle : <https://www.material-react-table.com/>
- Exemples interactifs : <https://www.material-react-table.com/docs/examples>
- API complète : <https://www.material-react-table.com/docs/api>
- TanStack Table (moteur sous-jacent) : <https://tanstack.com/table/v8/docs>
- Repo GitHub : <https://github.com/KevinVandy/material-react-table>
