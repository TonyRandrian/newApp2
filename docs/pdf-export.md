# Export PDF — fiches produit, factures, etc.

Ce document décrit les **changements exacts à effectuer** pour ajouter
l'export PDF dans le BO/FO, illustré sur deux cas concrets :

1. **Facture** d'une commande (BO ou FO), avec tableau de lignes, totaux,
   adresses, en-tête boutique.
2. **Fiche produit** ([FOProductPreview](../src/pages/FOProductPreview.jsx)) :
   nom, référence, image, prix HT/TTC, TVA, stock, déclinaisons.

Le patron est réutilisable pour : bons de livraison, bons de commande, ticket
de panier, rapports du [BODashboard](../src/pages/BODashboard.jsx),
relevés des dépenses par client, etc.

---

## 1. Choix de l'approche

Aucune lib PDF n'est encore installée (`package.json` : pas de `jspdf`,
`pdfmake`, `@react-pdf/renderer`, etc.). Trois pistes ont été comparées :

| Approche | Dépendances | Force | Faiblesse | Verdict |
|---|---|---|---|---|
| **A. Impression navigateur** (`window.print()` + CSS `@media print`) | 0 | Aucune lib, rendu HTML/CSS fidèle, l'utilisateur choisit « Enregistrer en PDF ». | Pas d'automatisation (boîte de dialogue), pas de PDF programmatique. | **Fallback v0** — utile partout. |
| **B. jsPDF + jspdf-autotable** | `jspdf` (~70 KB) + `jspdf-autotable` (~20 KB) | PDF généré côté client, contrôle total, tableaux natifs. | API impérative, dessine pas le HTML — il faut reconstruire la mise en page. | **Recommandé** pour facture, données tabulaires. |
| **C. html2canvas + jsPDF** | `html2canvas` (~200 KB) + `jspdf` | Capture le DOM tel quel, idéal pour la fiche produit. | PDF en image (pas de texte sélectionnable), polices floues si DPI bas. | Acceptable pour la fiche produit. |
| **D. @react-pdf/renderer** | `@react-pdf/renderer` (~500 KB) | Layout React déclaratif, polices nettes. | Grosse dépendance, courbe d'apprentissage. | Si on industrialise plusieurs templates. |

**Recommandation v1** :
- **Facture** → approche **B** (jsPDF + autotable) — texte sélectionnable,
  fichier léger, contrôle de la mise en page.
- **Fiche produit** → approche **C** (html2canvas + jsPDF) — capture la
  carte produit telle qu'à l'écran, suffisant pour un PDF « visuel ».
- **Approche A** disponible en parallèle sur toutes les pages (bouton
  « Imprimer ») — utile tant qu'on n'a pas modélisé le template B/C.

> Si à terme on veut un seul template officiel par document, basculer sur **D**
> (`@react-pdf/renderer`) et supprimer A/C.

---

## 2. Dépendances à ajouter

```bash
npm install jspdf jspdf-autotable html2canvas
```

À reporter dans `package.json` :

```json
"dependencies": {
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.0",
    "html2canvas": "^1.4.1",
    ...
}
```

> Toutes ces libs sont **client-only**, pas de polyfill côté Vite à prévoir.

---

## 3. Architecture

```
src/
├── backend/
│   └── utils/
│       └── pdf.js                 ← helpers génériques (download, BOM, etc.)
├── backend/
│   └── services/
│       ├── InvoicePdfService.js   ← logique métier : construire le PDF facture
│       └── ProductPdfService.js   ← logique métier : capture fiche produit
└── components/
    └── BOExportPdfButton.jsx      ← bouton réutilisable
```

Même principe qu'au CSV (voir [csv-export.md](./csv-export.md)) :
- **Helpers** = sérialisation + déclenchement du téléchargement.
- **Services** = un par type de document, contiennent le template.
- **Composant** = bouton paramétré par `onExport: () => Promise<Blob>`.

---

## 4. Helpers — `src/backend/utils/pdf.js`

Nouveau fichier.

### 4.1 `downloadPdf(filename, doc)` — téléchargement

```js
/**
 * Déclenche le téléchargement d'un jsPDF.
 *
 * @param {string} filename
 * @param {import("jspdf").jsPDF} doc
 */
export function downloadPdf(filename, doc) {
    const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
    doc.save(safeName)
}
```

> `jsPDF.save()` gère déjà le Blob + lien `<a download>` en interne. Pas
> besoin de réécrire ce qui a été fait dans `downloadCsv`.

### 4.2 `buildPdfFilename(prefix, idOrTag)` — convention de nommage

```js
export function buildPdfFilename(prefix, idOrTag) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const suffix = idOrTag ? `_${idOrTag}` : ""
    return `${prefix}${suffix}_${today}.pdf`
}
```

Exemples : `facture_12_20260525.pdf`, `produit_42_20260525.pdf`.

### 4.3 `captureNodeToImage(node, options)` — pour l'approche C

```js
import html2canvas from "html2canvas"

/**
 * Capture un nœud DOM en image PNG via html2canvas.
 *
 * @param {HTMLElement} node
 * @param {object} options - scale, backgroundColor, etc.
 * @returns {Promise<{dataUrl:string, width:number, height:number}>}
 */
export async function captureNodeToImage(node, { scale = 2, backgroundColor = "#ffffff" } = {}) {
    if (!node) throw new Error("captureNodeToImage: node manquant")
    const canvas = await html2canvas(node, { scale, backgroundColor, useCORS: true })
    return {
        dataUrl: canvas.toDataURL("image/png"),
        width: canvas.width,
        height: canvas.height,
    }
}
```

> `scale: 2` (équivalent ×retina) donne un PDF net sur écran et impression.
> `useCORS: true` permet d'inclure les images produit servies par PrestaShop
> sans avoir à les ré-encoder en base64.

---

## 5. Cas 1 — Facture (approche B : jsPDF + autotable)

### 5.1 Nouveau service : `src/backend/services/InvoicePdfService.js`

Construit un PDF à partir d'une `Order` et de ses `OrderDetail`. Pas de DOM
intermédiaire, le PDF est dessiné directement.

```js
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { buildPdfFilename, downloadPdf } from "../utils/pdf"
import { formatDateTime } from "../utils/utils"
import OrderDetail from "../entities/OrderDetail"
import Customer from "../entities/Customer"
import Address from "../entities/Address"

const SHOP = {
    name: "Ma Boutique",
    address: "12 rue de l'Exemple, 75001 Paris",
    siret: "123 456 789 00010",
    vat: "FR12345678901",
}

const fmt = (v, decimals = 2) => Number(v ?? 0).toFixed(decimals)

/**
 * Génère le PDF d'une facture pour la commande donnée.
 * @param {Order} order
 * @returns {Promise<void>} déclenche le téléchargement
 */
export async function exportInvoice(order) {
    // 1. Charger les dépendances (lignes, client, adresse)
    const orderDetails = await new OrderDetail({}, false).getBy("orderId", order.id)
    const customer     = await new Customer({}, false).getById(order.customerId)
    const address      = await new Address({}, false).getById(order.addressInvoiceId)

    // 2. Construire le doc
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const left = 14
    let cursor = 18

    // En-tête boutique
    doc.setFontSize(16).setFont("helvetica", "bold")
    doc.text(SHOP.name, left, cursor)
    doc.setFontSize(9).setFont("helvetica", "normal")
    cursor += 6
    doc.text(SHOP.address, left, cursor)
    cursor += 4
    doc.text(`SIRET ${SHOP.siret} — TVA ${SHOP.vat}`, left, cursor)

    // Bloc "Facture" à droite
    doc.setFontSize(20).setFont("helvetica", "bold")
    doc.text("FACTURE", 196, 22, { align: "right" })
    doc.setFontSize(10).setFont("helvetica", "normal")
    doc.text(`N° ${order.invoiceNumber || order.reference}`, 196, 30, { align: "right" })
    doc.text(`Date : ${formatDateTime(order.invoiceDate || order.dateAdd)}`, 196, 35, { align: "right" })

    // Bloc client
    cursor = 50
    doc.setFontSize(10).setFont("helvetica", "bold")
    doc.text("Facturer à :", left, cursor)
    doc.setFont("helvetica", "normal")
    cursor += 5
    doc.text(`${customer.firstname} ${customer.lastname}`, left, cursor); cursor += 4
    doc.text(address.address1 || "", left, cursor); cursor += 4
    if (address.address2) { doc.text(address.address2, left, cursor); cursor += 4 }
    doc.text(`${address.postcode || ""} ${address.city || ""}`, left, cursor); cursor += 4

    // Tableau des lignes
    autoTable(doc, {
        startY: cursor + 6,
        head: [["Référence", "Désignation", "Qté", "PU HT", "TVA", "Total TTC"]],
        body: orderDetails.map((line) => [
            line.productReference || "—",
            line.productName,
            String(line.productQuantity),
            fmt(line.unitPriceTaxExcl),
            `${fmt(line.taxRate, 1)}%`,
            fmt(line.totalPriceTaxIncl),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [40, 40, 40] },
        columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
        },
    })

    // Totaux
    const endY = doc.lastAutoTable.finalY + 8
    doc.setFontSize(10)
    doc.text(`Total HT : ${fmt(order.totalPaidTaxExcl)} €`,  196, endY,     { align: "right" })
    doc.text(`TVA :     ${fmt(order.totalPaidTaxIncl - order.totalPaidTaxExcl)} €`, 196, endY + 5, { align: "right" })
    doc.setFont("helvetica", "bold")
    doc.text(`Total TTC : ${fmt(order.totalPaidTaxIncl)} €`, 196, endY + 11, { align: "right" })

    // Pied de page
    doc.setFontSize(8).setFont("helvetica", "italic")
    doc.text("Merci de votre confiance.", left, 285)

    // 3. Téléchargement
    downloadPdf(buildPdfFilename("facture", order.id), doc)
}
```

### 5.2 Intégration UI

Dans [src/components/BOOrderRow.jsx](../src/components/BOOrderRow.jsx),
remplacer le bouton « Modifier » par un groupe d'actions :

```jsx
import { exportInvoice } from "../backend/services/InvoicePdfService"

// ... dans OrderActionCell, ajouter à côté du bouton Modifier :
<button
    type="button"
    className="bo-btn--ghost bo-btn--sm"
    onClick={async () => {
        try {
            await exportInvoice(row.original)
        } catch (err) {
            console.error("Export facture KO", err)
            alert("Impossible de générer la facture")
        }
    }}
>
    Facture PDF
</button>
```

Côté FO ([FOOrderList](../src/pages/FOOrderList.jsx)) : même bouton dans
[FOOrderRow.jsx](../src/components/FOOrderRow.jsx).

---

## 6. Cas 2 — Fiche produit (approche C : html2canvas + jsPDF)

Quand la mise en page de la page existe déjà, il est plus rapide de la
capturer que de la reconstruire à la main.

### 6.1 Nouveau service : `src/backend/services/ProductPdfService.js`

```js
import { jsPDF } from "jspdf"
import { buildPdfFilename, captureNodeToImage, downloadPdf } from "../utils/pdf"

/**
 * Génère le PDF de la fiche produit à partir d'un nœud DOM (la carte produit).
 * @param {HTMLElement} node    Le conteneur à capturer.
 * @param {string|number} productId
 */
export async function exportProductCard(node, productId) {
    const { dataUrl, width, height } = await captureNodeToImage(node, { scale: 2 })

    // A4 portrait = 210 × 297 mm. On cale en largeur, on calcule la hauteur.
    const pageWidth = 210
    const pageHeight = 297
    const margin = 12
    const imgWidth = pageWidth - margin * 2
    const ratio = height / width
    const imgHeight = imgWidth * ratio

    const doc = new jsPDF({ unit: "mm", format: "a4" })

    if (imgHeight <= pageHeight - margin * 2) {
        // Tient sur une page
        doc.addImage(dataUrl, "PNG", margin, margin, imgWidth, imgHeight)
    } else {
        // Sur plusieurs pages : on découpe verticalement
        const sliceHeightMm = pageHeight - margin * 2
        const slicePxRatio = height / imgHeight        // px par mm
        const slicePxHeight = sliceHeightMm * slicePxRatio

        let y = 0
        let page = 0
        while (y < height) {
            if (page > 0) doc.addPage()
            // jsPDF ne découpe pas nativement, on dessine l'image entière
            // décalée en y négatif et on clippe via clipRect.
            doc.saveGraphicsState()
            doc.rect(margin, margin, imgWidth, sliceHeightMm).clip()
            doc.discardPath()
            doc.addImage(
                dataUrl, "PNG",
                margin, margin - (y / slicePxRatio),
                imgWidth, imgHeight,
            )
            doc.restoreGraphicsState()
            y += slicePxHeight
            page += 1
        }
    }

    downloadPdf(buildPdfFilename("produit", productId), doc)
}
```

### 6.2 Intégration dans `FOProductPreview.jsx`

Ajouter une `ref` sur la carte produit + un bouton :

```jsx
import { useRef } from "react"
import { exportProductCard } from "../backend/services/ProductPdfService"

function FOProductPreview() {
    const cardRef = useRef(null)
    // ... reste inchangé

    const handleExportPdf = async () => {
        try {
            await exportProductCard(cardRef.current, id)
        } catch (err) {
            console.error("Export PDF KO", err)
            alert("Impossible de générer le PDF")
        }
    }

    return (
        <div className="fo-page">
            {/* ... header ... */}
            <div className="fo-product" ref={cardRef}>
                {/* contenu existant : image, prix, déclinaisons, etc. */}
            </div>

            <button
                type="button"
                className="fo-btn--ghost fo-btn--sm"
                onClick={handleExportPdf}
                disabled={!product}
            >
                Télécharger PDF
            </button>
        </div>
    )
}
```

> ⚠️ Le bouton **doit être hors** du nœud capturé (sinon il apparaît dans
> le PDF). C'est pour ça qu'on le place après `</div>` de `fo-product`.
>
> Si on veut masquer des éléments uniquement à l'export, ajouter une classe
> `.pdf-hide` puis dans `captureNodeToImage` passer
> `ignoreElements: (el) => el.classList?.contains("pdf-hide")`.

---

## 7. Composant réutilisable — `BOExportPdfButton.jsx`

Pour homogénéiser les boutons à travers le BO/FO :

```jsx
/* eslint-disable react/prop-types */
import { useState } from "react"

function BOExportPdfButton({ onExport, label = "Exporter PDF", disabled = false }) {
    const [busy, setBusy] = useState(false)

    const handleClick = async () => {
        if (busy || disabled) return
        setBusy(true)
        try {
            await onExport()
        } catch (err) {
            console.error("Export PDF KO", err)
            alert("Impossible de générer le PDF")
        } finally {
            setBusy(false)
        }
    }

    return (
        <button
            type="button"
            className="bo-btn--ghost bo-btn--sm"
            onClick={handleClick}
            disabled={disabled || busy}
        >
            {busy ? "Génération…" : label}
        </button>
    )
}

export default BOExportPdfButton
```

Usage :

```jsx
<BOExportPdfButton onExport={() => exportInvoice(order)} label="Facture PDF" />
<BOExportPdfButton onExport={() => exportProductCard(cardRef.current, id)} label="Fiche PDF" />
```

L'état `busy` empêche le double-clic et donne un retour visuel pendant la
génération (utile pour `html2canvas` qui peut prendre 1–2 s sur de gros DOM).

---

## 8. Manipulation des données avant export

Comme pour le CSV (voir [csv-export.md §3](./csv-export.md#3-manipulation-des-données-avant-export)),
la transformation se fait **avant** la construction du PDF. Quelques patrons
typiques :

### 8.1 Préfixer / formater une colonne (approche B)

Dans `InvoicePdfService.exportInvoice`, transformer dans le `.map(...)` qui
nourrit `autoTable` :

```js
body: orderDetails.map((line) => [
    `ps_${line.productReference || "0"}`,                  // préfixe
    line.productName.toUpperCase(),                         // majuscules
    String(line.productQuantity),
    fmt(line.unitPriceTaxExcl).replace(".", ","),           // décimale FR
    `${fmt(line.taxRate, 1)}%`,
    fmt(line.totalPriceTaxIncl),
]),
```

### 8.2 Filtrer / trier avant rendu

```js
const lines = orderDetails
    .filter((l) => Number(l.productQuantity) > 0)            // hors lignes vides
    .sort((a, b) => Number(b.totalPriceTaxIncl) - Number(a.totalPriceTaxIncl))
```

### 8.3 Calculer des totaux dérivés

```js
const totalTva = orderDetails.reduce(
    (acc, l) => acc + Number(l.totalPriceTaxIncl) - Number(l.totalPriceTaxExcl),
    0,
)
doc.text(`Total TVA : ${fmt(totalTva)} €`, 196, endY + 5, { align: "right" })
```

### 8.4 Injecter dynamiquement le logo

```js
// 1. Précharger l'image (data URL) côté React.
import logoUrl from "../../assets/logo.png"
// 2. Dans exportInvoice :
doc.addImage(logoUrl, "PNG", left, 10, 30, 12)
```

### 8.5 Anti-patrons

- **Charger les données dans le service PDF si la page les a déjà**.
  Préférer passer `order`, `orderDetails`, `customer` en arguments — évite
  les doubles requêtes API.
- **Capturer un DOM contenant des `<img>` cross-origin sans CORS**.
  `html2canvas` retournera un canvas vide ou un blanc. Vérifier que les
  images PrestaShop sont servies avec `Access-Control-Allow-Origin`, sinon
  pré-charger en base64 côté JS.
- **Mettre des animations CSS** dans le nœud capturé : le snapshot peut
  attraper une frame intermédiaire. Désactiver via `.pdf-hide` ou geler
  l'animation pendant la capture.

---

## 9. Fallback universel — impression navigateur

Pour les pages qui n'ont pas (encore) de template PDF, ajouter un bouton
« Imprimer » qui ouvre la boîte de dialogue d'impression du navigateur. Tous
les navigateurs modernes proposent « Enregistrer en PDF » dans cette boîte.

### 9.1 Bouton

```jsx
<button
    type="button"
    className="bo-btn--ghost bo-btn--sm"
    onClick={() => window.print()}
>
    Imprimer
</button>
```

### 9.2 Feuille de style `@media print`

Ajouter dans [src/styles](../src/styles) un fichier `print.css` (importé
dans `main.jsx` ou via la racine CSS) :

```css
@media print {
    /* Masquer la chrome BO */
    .bo-sidebar,
    .bo-page__head,
    .bo-card__head,
    .bo-btn--ghost,
    .bo-btn--primary {
        display: none !important;
    }

    /* Pleine largeur, fond blanc */
    .bo-main, .fo-page {
        margin: 0;
        padding: 0;
        background: white !important;
    }

    /* Forcer l'impression des couleurs (totaux en gras, etc.) */
    * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
}
```

### 9.3 Limites

- Pas de nom de fichier choisi (le navigateur génère « page.pdf »).
- Pas d'automatisation (clic utilisateur obligatoire).
- Mise en page dépendante du navigateur (Chrome ≠ Firefox sur les marges).

Pour un PDF « propre et signé », garder approche B/C.

---

## 10. Tests manuels recommandés

| Scénario | Attendu |
|---|---|
| Facture avec 1 ligne | PDF 1 page, totaux corrects, en-tête boutique présente. |
| Facture avec 50 lignes | `autoTable` paginé automatiquement (en-tête répétée). |
| Fiche produit sans image | PDF généré, espace vide à la place de l'image (pas d'erreur). |
| Fiche produit avec déclinaisons | Le `<select>` est rendu avec la valeur courante visible. |
| Bouton cliqué pendant une génération en cours | Désactivé (`busy = true`), pas de double export. |
| Image produit cross-origin sans CORS | Log d'erreur clair, PDF généré avec un blanc à la place. |
| Caractères accentués dans nom client | Affichés correctement (jsPDF supporte Latin-1 par défaut ; pour UTF-8 étendu utiliser une police custom — voir §11). |
| Impression navigateur (`window.print`) | La sidebar et les boutons disparaissent, le contenu principal occupe la page. |

---

## 11. Améliorations possibles (hors v1)

- **Polices personnalisées** : jsPDF embarque Helvetica par défaut. Pour le
  logo de marque, charger une police TTF via `doc.addFileToVFS()` +
  `doc.addFont()`.
- **Multi-pages auto pour les fiches produit** : le découpage manuel de
  §6.1 est rustique. Utiliser `doc.html(...)` (jsPDF 2.x intègre html2canvas)
  avec `autoPaging: "text"` pour une pagination propre.
- **Signature électronique / QR code** : ajouter un QR sur la facture
  pointant vers une URL de vérification (`qrcode` + `addImage`).
- **Génération côté serveur** : pour des factures officielles (NF525, signées),
  basculer sur un service serveur (Puppeteer, wkhtmltopdf, PrestaShop natif
  via `/api/order_invoices` + `?ws_pdf=1`).
- **Téléchargement groupé (ZIP)** : `jszip` est déjà installé. Utile pour
  exporter toutes les factures du mois d'un coup.
- **Template `@react-pdf/renderer`** : si le nombre de templates dépasse
  2–3, basculer sur l'approche D pour bénéficier du modèle déclaratif et
  d'une qualité typographique stable entre navigateurs.
