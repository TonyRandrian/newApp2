# react-data-table-component — Guide d'utilisation

Documentation complète pour utiliser [`react-data-table-component`](https://react-data-table-component.netlify.app/) (v8.2.0) dans ce projet.

---

## 1. Installation

La librairie est déjà installée :

```bash
npm install react-data-table-component
```

> **Note :** ce package n'a pas de dépendance CSS obligatoire. Aucune feuille de style additionnelle à importer.
> Optionnel : pour utiliser `styled-components` comme thème custom, installer aussi `styled-components`.

---

## 2. Import de base

```jsx
import DataTable from "react-data-table-component";
```

---

## 3. Exemple minimal

```jsx
import DataTable from "react-data-table-component";

const columns = [
    { name: "ID", selector: row => row.id, sortable: true },
    { name: "Nom", selector: row => row.name, sortable: true },
    { name: "Prix", selector: row => row.price, sortable: true, right: true },
];

const data = [
    { id: 1, name: "Produit A", price: 10 },
    { id: 2, name: "Produit B", price: 25 },
];

function MyTable() {
    return <DataTable columns={columns} data={data} />;
}

export default MyTable;
```

---

## 4. Structure des colonnes (`columns`)

Chaque colonne est un objet. Les propriétés les plus utiles :

| Propriété         | Type                 | Description                                                  |
|-------------------|----------------------|--------------------------------------------------------------|
| `name`            | `string \| ReactNode`| Titre affiché dans le header                                 |
| `selector`        | `(row) => value`     | Fonction qui retourne la valeur à afficher                   |
| `cell`            | `(row) => ReactNode` | Rendu personnalisé (prioritaire sur `selector`)              |
| `sortable`        | `boolean`            | Active le tri sur la colonne                                 |
| `sortFunction`    | `(a, b) => number`   | Fonction de tri personnalisée                                |
| `right`           | `boolean`            | Aligne à droite (utile pour nombres / prix)                  |
| `center`          | `boolean`            | Centre le contenu                                            |
| `width`           | `string`             | Largeur fixe ex: `"120px"`                                   |
| `minWidth`        | `string`             | Largeur minimale                                             |
| `maxWidth`        | `string`             | Largeur maximale                                             |
| `wrap`            | `boolean`            | Autorise le retour à la ligne                                |
| `compact`         | `boolean`            | Réduit le padding                                            |
| `hide`            | `string \| number`   | Cache la colonne en dessous d'un breakpoint (`"sm"`, `"md"`, `"lg"`, ou un nombre de px) |
| `omit`            | `boolean`            | Exclut totalement la colonne                                 |
| `ignoreRowClick`  | `boolean`            | Empêche le déclenchement de `onRowClicked` sur cette cellule |

### Exemple de cellule personnalisée

```jsx
const columns = [
    { name: "Nom", selector: row => row.name },
    {
        name: "Statut",
        cell: row => (
            <span style={{ color: row.inStock ? "green" : "red" }}>
                {row.inStock ? "En stock" : "Rupture"}
            </span>
        ),
    },
    {
        name: "Actions",
        cell: row => (
            <>
                <button onClick={() => handleEdit(row)}>Éditer</button>
                <button onClick={() => handleDelete(row.id)}>Supprimer</button>
            </>
        ),
        ignoreRowClick: true,
    },
];
```

---

## 5. Pagination

```jsx
<DataTable
    columns={columns}
    data={data}
    pagination
    paginationPerPage={10}
    paginationRowsPerPageOptions={[5, 10, 25, 50, 100]}
    paginationComponentOptions={{
        rowsPerPageText: "Lignes par page :",
        rangeSeparatorText: "sur",
        selectAllRowsItem: true,
        selectAllRowsItemText: "Tous",
    }}
/>
```

### Pagination côté serveur

```jsx
const [data, setData] = useState([]);
const [totalRows, setTotalRows] = useState(0);
const [perPage, setPerPage] = useState(10);
const [loading, setLoading] = useState(false);

const fetchPage = async (page, size = perPage) => {
    setLoading(true);
    const res = await fetch(`/api/products?page=${page}&size=${size}`);
    const json = await res.json();
    setData(json.items);
    setTotalRows(json.total);
    setLoading(false);
};

useEffect(() => { fetchPage(1); }, []);

<DataTable
    columns={columns}
    data={data}
    progressPending={loading}
    pagination
    paginationServer
    paginationTotalRows={totalRows}
    onChangePage={page => fetchPage(page)}
    onChangeRowsPerPage={(newPerPage, page) => {
        setPerPage(newPerPage);
        fetchPage(page, newPerPage);
    }}
/>
```

---

## 6. Tri

- `sortable: true` sur la colonne suffit pour un tri côté client.
- Pour un tri côté serveur :

```jsx
<DataTable
    columns={columns}
    data={data}
    sortServer
    onSort={(column, sortDirection) => {
        // ex: refetch avec column.selector / sortDirection ("asc" | "desc")
    }}
/>
```

---

## 7. Sélection de lignes

```jsx
<DataTable
    columns={columns}
    data={data}
    selectableRows
    onSelectedRowsChange={({ allSelected, selectedCount, selectedRows }) => {
        console.log(selectedRows);
    }}
    selectableRowsHighlight
    clearSelectedRows={toggleCleared}
/>
```

Désactiver la sélection sur certaines lignes :

```jsx
<DataTable
    selectableRows
    selectableRowDisabled={row => row.locked}
/>
```

---

## 8. Lignes développables (Expandable rows)

Les **lignes développables** permettent d'afficher un contenu détaillé sous une ligne du tableau quand l'utilisateur clique sur une flèche (ou sur la ligne elle-même). C'est utile pour afficher des informations secondaires sans surcharger le tableau principal : détails d'une commande, historique d'un produit, sous-tableau, formulaire d'édition inline, etc.

### 8.1. Principe

- On active la fonctionnalité avec la prop `expandableRows`.
- On fournit un **composant React** via `expandableRowsComponent`. Ce composant reçoit automatiquement la **ligne complète** dans une prop nommée `data`.
- Une flèche apparaît dans une colonne dédiée à gauche de chaque ligne ; un clic dessus déplie/replie le contenu.

```jsx
import DataTable from "react-data-table-component";

// Composant affiché quand la ligne est dépliée.
// IMPORTANT : la prop reçue s'appelle obligatoirement `data`.
const ExpandedComponent = ({ data }) => (
    <div style={{ padding: "12px", backgroundColor: "#fafafa" }}>
        <p><strong>Description :</strong> {data.description}</p>
        <p><strong>Fournisseur :</strong> {data.supplier}</p>
        <p><strong>Dernière mise à jour :</strong> {data.updatedAt}</p>
    </div>
);

<DataTable
    columns={columns}
    data={data}
    expandableRows
    expandableRowsComponent={ExpandedComponent}
/>
```

### 8.2. Passer des props supplémentaires au composant développé

Le composant développé ne reçoit que `data` par défaut. Pour lui transmettre d'autres props (callbacks, contexte, etc.), on utilise `expandableRowsComponentProps` :

```jsx
const ExpandedComponent = ({ data, onEdit, currency }) => (
    <div>
        <p>Prix : {data.price} {currency}</p>
        <button onClick={() => onEdit(data.id)}>Éditer ce produit</button>
    </div>
);

<DataTable
    columns={columns}
    data={data}
    expandableRows
    expandableRowsComponent={ExpandedComponent}
    expandableRowsComponentProps={{
        onEdit: id => console.log("edit", id),
        currency: "€",
    }}
/>
```

### 8.3. Options de comportement

| Prop                                    | Type / défaut         | Description                                                                 |
|-----------------------------------------|-----------------------|-----------------------------------------------------------------------------|
| `expandableRows`                        | `boolean` / `false`   | Active la fonctionnalité.                                                   |
| `expandableRowsComponent`               | `Component`           | Composant rendu quand une ligne est dépliée. Reçoit `data` en prop.         |
| `expandableRowsComponentProps`          | `object` / `{}`       | Props additionnelles transmises au composant développé.                     |
| `expandOnRowClicked`                    | `boolean` / `false`   | Déplie aussi en cliquant n'importe où sur la ligne (pas seulement la flèche). |
| `expandOnRowDoubleClicked`              | `boolean` / `false`   | Idem mais sur double-clic.                                                  |
| `expandableRowsHideExpander`            | `boolean` / `false`   | Cache la colonne de flèche (à coupler avec `expandOnRowClicked`).           |
| `expandableRowDisabled`                 | `(row) => boolean`    | Désactive l'expansion sur certaines lignes.                                 |
| `expandableRowExpanded`                 | `(row) => boolean`    | Détermine, à partir de la donnée, si une ligne doit être dépliée au rendu.  |
| `expandableInheritConditionalStyles`    | `boolean` / `false`   | Le contenu développé hérite des `conditionalRowStyles` de la ligne parente. |
| `onRowExpandToggled`                    | `(expanded, row) => void` | Callback appelé à chaque ouverture/fermeture.                            |

### 8.4. Désactiver l'expansion pour certaines lignes

```jsx
<DataTable
    columns={columns}
    data={data}
    expandableRows
    expandableRowsComponent={ExpandedComponent}
    expandableRowDisabled={row => row.archived}
/>
```

### 8.5. Pré-déplier certaines lignes au rendu

Utile pour réafficher l'état déplié après un re-render, ou par défaut sur les lignes "importantes".

```jsx
<DataTable
    columns={columns}
    data={data}
    expandableRows
    expandableRowsComponent={ExpandedComponent}
    expandableRowExpanded={row => row.stock === 0}
/>
```

### 8.6. Contrôler l'état d'expansion depuis le parent

Si l'on souhaite gérer soi-même les lignes ouvertes (par ex. n'autoriser qu'une seule ligne dépliée à la fois), on combine `expandableRowExpanded` avec un state local :

```jsx
const [openId, setOpenId] = useState(null);

<DataTable
    columns={columns}
    data={data}
    expandableRows
    expandableRowsComponent={ExpandedComponent}
    expandableRowExpanded={row => row.id === openId}
    onRowExpandToggled={(expanded, row) => {
        setOpenId(expanded ? row.id : null);
    }}
/>
```

### 8.7. Cacher la flèche et déplier au clic sur la ligne entière

```jsx
<DataTable
    columns={columns}
    data={data}
    expandableRows
    expandableRowsComponent={ExpandedComponent}
    expandableRowsHideExpander
    expandOnRowClicked
    pointerOnHover
    highlightOnHover
/>
```

### 8.8. Personnaliser les icônes de la flèche

```jsx
<DataTable
    columns={columns}
    data={data}
    expandableRows
    expandableRowsComponent={ExpandedComponent}
    expandableIcon={{
        collapsed: <span>▶</span>,
        expanded: <span>▼</span>,
    }}
/>
```

### 8.9. Exemple complet : détail d'un produit en stock

```jsx
const ProductDetail = ({ data, onReorder }) => (
    <div style={{ padding: "16px", background: "#f7f7f7" }}>
        <h4>Détails — {data.name}</h4>
        <ul>
            <li>Référence : {data.sku}</li>
            <li>Catégorie : {data.category}</li>
            <li>Stock actuel : {data.stock}</li>
            <li>Seuil d'alerte : {data.threshold}</li>
        </ul>
        {data.stock < data.threshold && (
            <button onClick={() => onReorder(data.id)}>
                Réapprovisionner
            </button>
        )}
    </div>
);

<DataTable
    columns={columns}
    data={products}
    expandableRows
    expandableRowsComponent={ProductDetail}
    expandableRowsComponentProps={{
        onReorder: id => console.log("commande déclenchée pour", id),
    }}
    expandableRowDisabled={row => row.archived}
    onRowExpandToggled={(expanded, row) =>
        console.log(expanded ? "ouvert" : "fermé", row.id)
    }
/>
```

### 8.10. Pièges fréquents

- La prop reçue par le composant développé s'appelle **toujours `data`** (pas `row`). Renommer dans la signature : `({ data }) => ...`.
- `expandableRowsComponent` attend un **composant**, pas un élément JSX. Écrire `expandableRowsComponent={ExpandedComponent}` et non `expandableRowsComponent={<ExpandedComponent />}`.
- Si l'on combine `expandOnRowClicked` avec des boutons dans les colonnes, ajouter `ignoreRowClick: true` sur la colonne d'actions pour éviter qu'un clic sur le bouton ne déplie aussi la ligne.
- `expandableRowExpanded` est rappelé à chaque rendu : il doit donc dépendre d'une source de vérité stable (champ de la donnée ou state externe), sinon l'état d'expansion peut se réinitialiser.

---

## 9. État de chargement

```jsx
<DataTable
    columns={columns}
    data={data}
    progressPending={loading}
    progressComponent={<div>Chargement...</div>}
/>
```

---

## 10. Message si aucune donnée

```jsx
<DataTable
    columns={columns}
    data={data}
    noDataComponent={<div>Aucun produit trouvé.</div>}
/>
```

---

## 11. Recherche / filtrage

`react-data-table-component` n'inclut pas de barre de recherche : on filtre `data` avant de la passer.

```jsx
const [search, setSearch] = useState("");

const filtered = useMemo(
    () => data.filter(d => d.name.toLowerCase().includes(search.toLowerCase())),
    [data, search]
);

<input
    type="text"
    placeholder="Rechercher..."
    value={search}
    onChange={e => setSearch(e.target.value)}
/>
<DataTable columns={columns} data={filtered} />
```

---

## 12. Événements utiles

| Prop                       | Signature                                      |
|----------------------------|------------------------------------------------|
| `onRowClicked`             | `(row, event) => void`                         |
| `onRowDoubleClicked`       | `(row, event) => void`                         |
| `onRowMouseEnter`          | `(row, event) => void`                         |
| `onSelectedRowsChange`     | `({ selectedRows, selectedCount, allSelected }) => void` |
| `onSort`                   | `(column, sortDirection, sortedRows) => void`  |
| `onChangePage`             | `(page, totalRows) => void`                    |
| `onChangeRowsPerPage`      | `(newPerPage, page) => void`                   |

---

## 13. Style et thème

### Mise en forme rapide via `customStyles`

```jsx
const customStyles = {
    headCells: {
        style: { fontWeight: "bold", fontSize: "14px", backgroundColor: "#f5f5f5" },
    },
    rows: {
        style: { minHeight: "48px" },
        highlightOnHoverStyle: { backgroundColor: "#eef" },
    },
    cells: {
        style: { paddingLeft: "8px", paddingRight: "8px" },
    },
};

<DataTable
    columns={columns}
    data={data}
    customStyles={customStyles}
    highlightOnHover
    striped
    dense
/>
```

### Thèmes intégrés

```jsx
import { createTheme } from "react-data-table-component";

createTheme("solarized", {
    text: { primary: "#268bd2", secondary: "#2aa198" },
    background: { default: "#002b36" },
    context: { background: "#cb4b16", text: "#FFFFFF" },
    divider: { default: "#073642" },
});

<DataTable theme="solarized" columns={columns} data={data} />
```

Thèmes prédéfinis disponibles : `"default"`, `"dark"`.

### Mise en forme conditionnelle

```jsx
const conditionalRowStyles = [
    {
        when: row => row.stock === 0,
        style: { backgroundColor: "#ffe5e5", color: "#c00" },
    },
    {
        when: row => row.stock < 5 && row.stock > 0,
        style: { backgroundColor: "#fff7e0" },
    },
];

<DataTable
    columns={columns}
    data={data}
    conditionalRowStyles={conditionalRowStyles}
/>
```

---

## 14. Props clés (récapitulatif)

| Prop                          | Type             | Description                              |
|-------------------------------|------------------|------------------------------------------|
| `columns`                     | `array`          | Définition des colonnes (requis)         |
| `data`                        | `array`          | Données (requis)                         |
| `title`                       | `string \| node` | Titre au-dessus du tableau               |
| `keyField`                    | `string`         | Champ unique par ligne (défaut: `"id"`)  |
| `pagination`                  | `boolean`        | Active la pagination                     |
| `paginationServer`            | `boolean`        | Pagination côté serveur                  |
| `selectableRows`              | `boolean`        | Cases à cocher                           |
| `expandableRows`              | `boolean`        | Lignes expandables                       |
| `striped`                     | `boolean`        | Lignes zébrées                           |
| `highlightOnHover`            | `boolean`        | Surlignage au survol                     |
| `pointerOnHover`              | `boolean`        | Curseur pointer au survol                |
| `dense`                       | `boolean`        | Mode compact                             |
| `responsive`                  | `boolean`        | Scroll horizontal (défaut: true)         |
| `fixedHeader`                 | `boolean`        | Header fixe                              |
| `fixedHeaderScrollHeight`     | `string`         | ex: `"400px"`                            |
| `progressPending`             | `boolean`        | Affiche l'état de chargement             |
| `noDataComponent`             | `node`           | Composant affiché si data vide           |
| `theme`                       | `string`         | `"default"`, `"dark"`, ou thème custom   |
| `customStyles`                | `object`         | Surcharges fines des styles              |
| `conditionalRowStyles`        | `array`          | Styles conditionnels par ligne           |

---

## 15. Exemple complet adapté au projet

Exemple type pour [src/pages/BOStock.jsx](src/pages/BOStock.jsx) :

```jsx
import { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { fetchProductWithStock } from "../backend/services/ProductService.js";

const columns = [
    { name: "ID", selector: row => row.id, sortable: true, width: "80px" },
    { name: "Produit", selector: row => row.name, sortable: true, wrap: true },
    { name: "Stock", selector: row => row.stock, sortable: true, right: true },
    {
        name: "Prix",
        selector: row => row.price,
        sortable: true,
        right: true,
        cell: row => `${row.price.toFixed(2)} €`,
    },
    {
        name: "Statut",
        cell: row => (
            <span style={{ color: row.stock > 0 ? "green" : "red" }}>
                {row.stock > 0 ? "Disponible" : "Rupture"}
            </span>
        ),
    },
];

const conditionalRowStyles = [
    { when: row => row.stock === 0, style: { backgroundColor: "#ffe5e5" } },
];

function BOStock() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        (async () => {
            const data = await fetchProductWithStock();
            setProducts(data);
            setLoading(false);
        })();
    }, []);

    const filtered = useMemo(
        () => products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
        [products, search]
    );

    return (
        <div>
            <h2>Page de stock</h2>
            <input
                type="text"
                placeholder="Rechercher un produit..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
            <DataTable
                columns={columns}
                data={filtered}
                progressPending={loading}
                pagination
                paginationPerPage={10}
                paginationRowsPerPageOptions={[10, 25, 50, 100]}
                paginationComponentOptions={{
                    rowsPerPageText: "Lignes par page :",
                    rangeSeparatorText: "sur",
                }}
                highlightOnHover
                striped
                dense
                conditionalRowStyles={conditionalRowStyles}
                noDataComponent={<div>Aucun produit trouvé.</div>}
            />
        </div>
    );
}

export default BOStock;
```

---

## 16. Ressources

- Site officiel : <https://react-data-table-component.netlify.app/>
- Storybook : <https://react-data-table-component.netlify.app/?path=/docs/getting-started-intro--page>
- Repo GitHub : <https://github.com/jbetancur/react-data-table-component>
