# Export CSV des tableaux du Back-Office

Ce document décrit les **changements exacts à effectuer** pour ajouter un
bouton « Exporter en CSV » au-dessus des tableaux du BO — illustré sur les
deux tableaux du [BODashboard](../src/pages/BODashboard.jsx)
(« Commandes journalières » et « Paniers journaliers »), avec une approche
réutilisable pour les autres pages
([BOStatistic](../src/pages/BOStatistic.jsx),
[BOOrderList](../src/pages/BOOrderList.jsx),
[BOStock](../src/pages/BOStock.jsx),
nouvelle page [« Dépenses par client »](./customer-spending-page.md)).

Pas de nouvelle dépendance : **PapaParse** est déjà installé
(`papaparse@^5.5.3`, voir `package.json` et son utilisation dans
[src/backend/utils/csv.js](../src/backend/utils/csv.js)) et fournit
`Papa.unparse()` pour la sérialisation.

---

## 1. Vue d'ensemble

```
[Bouton "Exporter CSV"] ──▶ buildCsvRows(rows, columns)
                                       │
                                       ▼
                              Papa.unparse(...)
                                       │
                                       ▼
                          Blob("text/csv;charset=utf-8")
                                       │
                                       ▼
                       <a download="...csv"> auto-clic
                                       │
                                       ▼
                           URL.revokeObjectURL()
```

Trois principes :

1. **Logique centralisée** dans `src/backend/utils/csv.js` (côté frontend),
   pas une lib par page.
2. **Source de vérité = données filtrées** déjà calculées par chaque page
   (`dailyRows`, `cartDailyRows`, `orderCategoryMetrics`, etc.) — on
   exporte exactement ce que voit l'utilisateur, dans le même ordre.
3. **Formatage = celui de la table** : 2 décimales pour les montants, dates
   formatées comme à l'écran (`formatDateTime`, `formatAmount`).

---

## 2. Modifications à effectuer

### 2.1 [src/backend/utils/csv.js](../src/backend/utils/csv.js)

Ajouter en bas du fichier deux fonctions utilitaires.

#### a) `buildCsvContent(rows, columns)` — sérialisation

```js
/**
 * Sérialise un tableau de lignes en chaîne CSV via PapaParse.
 *
 * @param {Array<Object>} rows  Lignes telles qu'affichées dans la table.
 * @param {Array<{header:string, accessor:string|Function, format?:Function}>} columns
 *        - header   : libellé de colonne (1re ligne du CSV).
 *        - accessor : clé d'objet ou fonction (row) => valeur brute.
 *        - format   : optionnel, transforme la valeur (ex. arrondi 2 déc).
 * @returns {string} Contenu CSV (séparateur ",", UTF-8).
 */
export function buildCsvContent(rows = [], columns = []) {
    const headers = columns.map((c) => c.header)
    const data = rows.map((row) =>
        columns.map((c) => {
            const raw = typeof c.accessor === "function"
                ? c.accessor(row)
                : row?.[c.accessor]
            const value = c.format ? c.format(raw, row) : raw
            return value == null ? "" : value
        }),
    )
    return Papa.unparse({ fields: headers, data })
}
```

> `Papa.unparse` gère l'échappement des virgules, guillemets et sauts de
> ligne automatiquement. Pas besoin de l'écrire à la main.

#### b) `downloadCsv(filename, content)` — déclenchement du téléchargement

```js
/**
 * Déclenche le téléchargement d'un CSV dans le navigateur.
 * Préfixe d'un BOM UTF-8 pour qu'Excel reconnaisse l'encodage.
 *
 * @param {string} filename  Nom du fichier (sans extension forcée).
 * @param {string} content   Contenu CSV brut.
 */
export function downloadCsv(filename, content) {
    const BOM = "﻿"
    const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
}
```

#### c) `buildCsvFilename(prefix, { dateMin, dateMax })` — convention de nommage

```js
/**
 * Construit un nom de fichier daté: "<prefix>_<YYYYMMDD>[_<min>-<max>].csv"
 */
export function buildCsvFilename(prefix, { dateMin, dateMax } = {}) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const range = (dateMin || dateMax)
        ? `_${(dateMin || "debut")}_${(dateMax || "fin")}`
        : ""
    return `${prefix}_${today}${range}.csv`
}
```

### 2.2 Nouveau composant : `src/components/BOExportCsvButton.jsx`

Un bouton réutilisable, encapsule l'appel aux 3 utilitaires.

```jsx
/* eslint-disable react/prop-types */
import { buildCsvContent, downloadCsv, buildCsvFilename } from "../backend/utils/csv"

function BOExportCsvButton({ rows, columns, filenamePrefix, dateRange, disabled = false, label = "Exporter CSV" }) {
    const handleClick = () => {
        if (!rows || rows.length === 0) return
        const content = buildCsvContent(rows, columns)
        const filename = buildCsvFilename(filenamePrefix, dateRange)
        downloadCsv(filename, content)
    }

    return (
        <button
            type="button"
            className="bo-btn--ghost bo-btn--sm"
            onClick={handleClick}
            disabled={disabled || !rows?.length}
            title={!rows?.length ? "Aucune ligne à exporter" : undefined}
        >
            {label}
        </button>
    )
}

export default BOExportCsvButton
```

> Classes CSS calquées sur les boutons existants (`bo-btn--ghost bo-btn--sm`)
> — pas de nouveau style à ajouter.

### 2.3 [src/pages/BODashboard.jsx](../src/pages/BODashboard.jsx)

#### a) Imports

```jsx
import BOExportCsvButton from "../components/BOExportCsvButton.jsx"
```

#### b) Définition des colonnes d'export

Ces définitions vivent **dans la page**, pas dans le tableau, car elles
peuvent différer (ex. on veut exporter une colonne `Total HT brut`, pas
formaté). Ajouter avant le `return` :

```jsx
const dailyCsvColumns = useMemo(() => [
    { header: "Jour", accessor: "day" },
    { header: "Commandes", accessor: "ordersCount" },
    { header: "Total HT",  accessor: "totalHT",  format: (v) => Number(v ?? 0).toFixed(2) },
    { header: "Total TTC", accessor: "totalTTC", format: (v) => Number(v ?? 0).toFixed(2) },
], [])

const cartDailyCsvColumns = useMemo(() => [
    { header: "Jour", accessor: "day" },
    { header: "Paniers", accessor: "cartsCount" },
    { header: "Total HT",  accessor: "totalHT",  format: (v) => Number(v ?? 0).toFixed(2) },
    { header: "Total TTC", accessor: "totalTTC", format: (v) => Number(v ?? 0).toFixed(2) },
], [])

const dateRange = { dateMin, dateMax }
```

#### c) Bouton dans l'en-tête de chaque carte

Dans la `bo-card` « Commandes journalières »
([BODashboard.jsx:185-195](../src/pages/BODashboard.jsx#L185-L195)),
ajouter le bouton à droite du titre via `bo-card__head` :

```jsx
<div className="bo-card__head">
    <div className="bo-card__heading">
        <h3 className="bo-card__title">Commandes journalières</h3>
        <span className="bo-card__subtitle">Agrégation par jour</span>
    </div>
    <div className="bo-card__actions">
        <BOExportCsvButton
            rows={dailyRows}
            columns={dailyCsvColumns}
            filenamePrefix="dashboard_commandes_journalieres"
            dateRange={dateRange}
        />
    </div>
</div>
```

Idem pour la carte « Paniers journaliers » avec `cartDailyRows`,
`cartDailyCsvColumns` et préfixe `dashboard_paniers_journaliers`.

> Si `bo-card__actions` n'existe pas en CSS, ajouter une règle simple dans
> [src/styles](../src/styles) (`display:flex; gap:.5rem; align-items:center;`)
> ou utiliser un wrapper inline. Vérifier le rendu dans le navigateur.

#### d) Bouton "Exporter tout" (optionnel)

Pour exporter les **lignes brutes** (commandes, pas l'agrégation journalière) :

```jsx
const allOrdersCsvColumns = useMemo(() => [
    { header: "ID",          accessor: "id" },
    { header: "Référence",   accessor: "reference" },
    { header: "Date",        accessor: (row) => formatDateTime(row?.dateAdd) },
    { header: "Statut",      accessor: (row) => getOrderStateLabel(row?.orderState) },
    { header: "Total HT",    accessor: "totalPaidTaxExcl", format: (v) => Number(v ?? 0).toFixed(2) },
    { header: "Total TTC",   accessor: "totalPaidTaxIncl", format: (v) => Number(v ?? 0).toFixed(2) },
], [])

<BOExportCsvButton
    rows={filteredRows}
    columns={allOrdersCsvColumns}
    filenamePrefix="dashboard_commandes_detail"
    dateRange={dateRange}
/>
```

---

## 3. Manipulation des données avant export

La transformation se fait **par colonne**, dans le champ `format` (et/ou via
un `accessor` fonctionnel) — pas dans le helper `buildCsvContent` qui reste
générique. Cela permet à chaque page de décider précisément comment chaque
colonne sort, sans dupliquer la logique de sérialisation.

L'ordre d'exécution pour chaque cellule :

```
row  ──▶  accessor(row)  ──▶  format(value, row)  ──▶  cellule CSV
       (clé OU fonction)    (optionnel, transforme)
```

`format` reçoit deux arguments : la valeur extraite par `accessor`, **et** la
ligne complète (utile pour combiner plusieurs champs).

### 3.1 Ajouter un préfixe / suffixe

```jsx
// "42" → "ps_42"  (préfixer un identifiant)
{ header: "Référence",
  accessor: "id",
  format: (v) => `ps_${v}` }

// "tshirt-rouge" → "tshirt-rouge.csv-export"
{ header: "Slug exporté",
  accessor: "slug",
  format: (v) => `${v}.csv-export` }
```

### 3.2 Concaténer plusieurs colonnes

`format` reçoit la `row` complète en 2ᵉ argument :

```jsx
// "Jean" + "Dupont" → "Jean Dupont"
{ header: "Nom complet",
  accessor: "firstname",
  format: (firstname, row) => `${firstname} ${row.lastname}`.trim() }

// Plus propre : un accessor fonctionnel
{ header: "Nom complet",
  accessor: (row) => `${row.firstname} ${row.lastname}`.trim() }
```

Règle simple : si la valeur sort d'**un seul** champ, utiliser `accessor` en
clé + `format`. Si elle dépend de **plusieurs** champs, utiliser un
`accessor` fonctionnel.

### 3.3 Formater les nombres et montants

```jsx
// 12.3456 → "12,35"  (Excel-FR)
{ header: "Total TTC",
  accessor: "totalPaidTaxIncl",
  format: (v) => Number(v ?? 0).toFixed(2).replace(".", ",") }

// 12.34 → "12.34 €"  (avec unité)
{ header: "Montant",
  accessor: "amount",
  format: (v) => `${Number(v ?? 0).toFixed(2)} €` }

// 0.15 → "15,0%"  (pourcentage)
{ header: "TVA",
  accessor: "taxRate",
  format: (v) => `${(Number(v ?? 0) * 100).toFixed(1).replace(".", ",")}%` }
```

### 3.4 Formater les dates

```jsx
import { formatDateTime } from "../backend/utils/utils"

// "2026-05-18T14:30:00" → "18/05/2026 14:30"
{ header: "Date",
  accessor: "dateAdd",
  format: (v) => formatDateTime(v) || "" }

// Date courte sans heure
{ header: "Jour",
  accessor: "dateAdd",
  format: (v) => v ? new Date(v).toISOString().slice(0, 10) : "" }
```

### 3.5 Résoudre une valeur via un Map (jointure)

Pour traduire un ID en libellé, **construire le Map en dehors** du tableau de
colonnes pour éviter de reconstruire à chaque cellule :

```jsx
const stateLabelById = useMemo(
    () => new Map(orderStates.map((s) => [Number(s.id), getOrderStateLabel(s)])),
    [orderStates],
)

const csvColumns = useMemo(() => [
    { header: "État",
      accessor: "currentState",
      format: (v) => stateLabelById.get(Number(v)) ?? `#${v}` },
], [stateLabelById])
```

### 3.6 Conditionner la valeur

```jsx
// Booléen → "Oui"/"Non"
{ header: "Validée",
  accessor: "valid",
  format: (v) => Number(v) === 1 ? "Oui" : "Non" }

// Vide si non livrée
{ header: "Date de livraison",
  accessor: "deliveryDate",
  format: (v, row) => Number(row.currentState) === 5 ? formatDateTime(v) : "" }
```

### 3.7 Échapper la valeur ? Non — déjà géré

PapaParse échappe automatiquement guillemets, virgules et sauts de ligne.
**Ne pas** entourer manuellement de `"` ni remplacer `"` par `""` dans
`format` — vous casseriez le double-échappement.

```jsx
// ❌ NE PAS FAIRE
format: (v) => `"${String(v).replace(/"/g, '""')}"`

// ✅ Laisser la valeur brute, PapaParse s'occupe du reste
format: (v) => String(v)
```

### 3.8 Filtrer ou ré-ordonner les lignes avant l'export

Quand la manipulation porte sur **la collection** (et pas une cellule), faire
la transformation côté page **avant** de passer `rows` au bouton :

```jsx
const csvRows = useMemo(() => {
    return filteredRows
        .filter((row) => Number(row.totalPaidTaxIncl) > 0)   // exclure les 0 €
        .sort((a, b) => b.totalPaidTaxIncl - a.totalPaidTaxIncl)
        .map((row) => ({
            ...row,
            referenceWithPrefix: `ps_${row.reference}`,       // pré-calculé
        }))
}, [filteredRows])

<BOExportCsvButton rows={csvRows} columns={csvColumns} ... />
```

> Préférer pré-calculer dans un `useMemo` quand la transformation est lourde
> (jointures, lookups) — ça évite de refaire le travail à chaque cellule.

### 3.9 Anti-patrons à éviter

- **Modifier `rows` en place** dans `format` (`row.foo = bar`). Toujours
  retourner une nouvelle valeur ; `rows` reste la source affichée à l'écran.
- **Faire des appels async dans `format`**. La sérialisation est synchrone.
  Si vous avez besoin de données distantes, les charger en amont (dans
  `loadDashboardData` ou un `useEffect`) et les exposer via un Map.
- **Lire depuis le state React** dans `format` sans le déclarer en
  dépendance du `useMemo` qui construit `csvColumns` → cellules figées sur
  une ancienne valeur.

---

## 4. Application aux autres pages

Le même patron s'applique sans changement à :

### 3.1 [BOStatistic.jsx](../src/pages/BOStatistic.jsx)

Ajouter un bouton dans chacune des trois `bo-card` « Ventes par catégorie »,
« Ventes par catégorie (stock) » et « Disponibilité du stock ». Colonnes :

```jsx
const ventesCsvColumns = [
    { header: "Categorie", accessor: (r) => r?.category?.name || r?.category?.slug || "Aucune" },
    { header: "Qte",          accessor: "quantity",   format: (v) => Number(v ?? 0).toFixed(2) },
    { header: "Vente total",  accessor: "totalVente", format: (v) => Number(v ?? 0).toFixed(2) },
    { header: "Achat total",  accessor: "totalAchat", format: (v) => Number(v ?? 0).toFixed(2) },
    { header: "Benefice",     accessor: "benefice",   format: (v) => Number(v ?? 0).toFixed(2) },
]
```

### 3.2 [BOOrderList.jsx](../src/pages/BOOrderList.jsx)

Source : `orders` (déjà enrichi avec `customerName` / `orderStateName`).
Préfixe : `commandes`.

### 3.3 [BOStock.jsx](../src/pages/BOStock.jsx)

Source : les lignes du tableau (produit/déclinaison + stocks).
Préfixe : `stocks`.

### 3.4 Nouvelle page [« Dépenses par client »](./customer-spending-page.md)

Source : `rows` agrégées par `customerId`.
Préfixe : `depenses_par_client`.

Colonnes :

```jsx
const csvColumns = [
    { header: "Client",        accessor: "customerName" },
    { header: "Email",         accessor: "customerEmail" },
    { header: "Commandes",     accessor: "orderCount" },
    { header: "Total dépensé", accessor: "totalSpent", format: (v) => Number(v ?? 0).toFixed(2) },
]
```

---

## 5. Alternative : export natif de MaterialReactTable

Toutes les pages utilisent `material-react-table`, qui propose nativement un
bouton d'export via `MRT_ExportButton` + `mantine-react-table` ou via
`react-csv`. Cette piste a été **écartée** pour cette implémentation :

| Critère | Approche custom (retenue) | MRT natif |
|---|---|---|
| Dépendance | Aucune (PapaParse déjà là). | Ajoute `mrt-export` / `react-csv`. |
| Contrôle du formatage | Total — colonne par colonne. | Limité aux accessors de la table. |
| Données exportées | `rows` filtrées passées en prop. | Lignes visibles dans la table (peut inclure pagination). |
| BOM Excel | Oui. | Variable. |
| Nom de fichier daté | Helper dédié. | À reconfigurer page par page. |

Si à terme on veut **également** l'export de la sélection ou un format Excel
(`.xlsx`), regarder du côté de `mantine-react-table` + `xlsx` — mais pas
nécessaire pour ce ticket.

---

## 6. Format de sortie

- **Séparateur** : virgule (`,`). PapaParse l'utilise par défaut. Si le
  besoin Excel-FR exige `;`, passer `{ delimiter: ";" }` à `Papa.unparse`.
- **Encodage** : UTF-8 avec BOM (`﻿` en tête) pour qu'Excel ouvre les
  caractères accentués correctement.
- **Décimales** : point (`.`) — format anglo / standard CSV. Si Excel-FR
  doit interpréter en nombre, remplacer `format: (v) => Number(v).toFixed(2)`
  par `format: (v) => Number(v).toFixed(2).replace(".", ",")` côté colonne.
- **Dates** : exportées telles qu'affichées (`formatDateTime(row.dateAdd)`),
  pas en ISO brut.
- **Lignes vides** : exclues par PapaParse (pas de ligne `,,,` au milieu).

---

## 7. Tests manuels recommandés

| Scénario | Attendu |
|---|---|
| Tableau vide | Bouton désactivé, infobulle « Aucune ligne à exporter ». |
| 100 lignes, sans filtre de date | Fichier `dashboard_commandes_journalieres_20260525.csv` téléchargé, 100 lignes + 1 en-tête. |
| Avec filtre date 2026-01-01 → 2026-03-31 | Nom de fichier : `dashboard_commandes_journalieres_20260525_2026-01-01_2026-03-31.csv`. Lignes = celles affichées dans le tableau. |
| Caractères accentués dans `customerName` | Ouvert dans Excel, « François » s'affiche correctement (BOM UTF-8). |
| Valeur contenant une virgule (ex. note `"Bonjour, livraison"`) | PapaParse entoure de guillemets, pas de colonne fantôme. |
| Montant `null` | Cellule vide (pas `null` ou `NaN`). |
| Pagination | Le CSV exporte **toutes** les `rows` passées en prop, pas seulement la page courante. |

---

## 8. Améliorations possibles (hors v1)

- **Sélecteur de séparateur** dans l'UI (`,` vs `;`) si l'usage Excel-FR est
  fréquent.
- **Sélection multiple** : exporter uniquement les lignes cochées dans la
  `MaterialReactTable` (`table.getSelectedRowModel().rows`).
- **Format XLSX** via `xlsx` (SheetJS) — utile si on veut figer la
  largeur des colonnes ou ajouter une ligne « Total ».
- **Export côté serveur** : si les jeux dépassent quelques milliers de
  lignes, streamer le CSV depuis un endpoint custom plutôt que de charger
  tout en mémoire dans le navigateur.
- **Hook `useCsvExport(rows, columns, filenamePrefix)`** retournant
  `{ exportCsv, canExport }` — réduit la prop drilling si plusieurs boutons
  partagent les mêmes colonnes.
