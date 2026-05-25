export const getText = (entityDoc, tag) => {
    const node = entityDoc.querySelector(tag)
    return node ? node.textContent.trim() : ""
}

export const toInt = (value) => {
    if (value === "") {
        return null
    }

    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
}

export const toFloat = (value) => {
    if (value === "") {
        return null
    }

    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
}

export const toBool = (value) => {
    if (value === "") {
        return null
    }

    return value === "1" || value.toLowerCase() === "true"
}

export const toDate = (value) => {
    if (value === "") {
        return null
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Vérifie qu'une date tombe dans une plage inclusive jour entier.
 * minDate est ramenée à 00:00:00 et maxDate à 23:59:59 pour couvrir la journée complète.
 * @param {Date} date
 * @param {Date|null} minDate
 * @param {Date|null} maxDate
 * @returns {boolean}
 */
export const isDateInRange = (date, minDate, maxDate) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return false
    }

    if (minDate instanceof Date && !Number.isNaN(minDate.getTime())) {
        const minBound = new Date(minDate)
        minBound.setHours(0, 0, 0, 0)
        if (date < minBound) return false
    }

    if (maxDate instanceof Date && !Number.isNaN(maxDate.getTime())) {
        const maxBound = new Date(maxDate)
        maxBound.setHours(23, 59, 59, 999)
        if (date > maxBound) return false
    }

    return true
}

export const getLanguageText = (entityDoc, tag, langId = "1") => {
    if (!entityDoc) return ""
    const langSelector = `${tag} > language[id="${langId}"]`
    const nodeById = entityDoc.querySelector(langSelector)
    if (nodeById?.textContent) return nodeById.textContent.trim()

    const anyLang = entityDoc.querySelector(`${tag} language`)
    if (anyLang?.textContent) return anyLang.textContent.trim()

    const node = entityDoc.querySelector(tag)
    return node ? node.textContent.trim() : ""
}

export const buildApiFilterQuery = (columnName, value) => {
    let values = [value]

    if (Array.isArray(value)) {
        values = value
    } else if (value instanceof Set) {
        values = Array.from(value)
    }

    const normalizedValues = values
        .filter((item) => item !== null && item !== undefined && item !== "")
        .map((item) => String(item).trim())
        .filter((item) => item !== "")

    if (normalizedValues.length === 0) {
        return ""
    }

    return `&filter[${columnName}]=[${normalizedValues.join("|")}]`
}

/**
 * Construit une map indexée par identifiant numérique à partir d'une liste d'éléments.
 * Le sélecteur permet de choisir la valeur utilisée comme clé sans dupliquer la logique dans les DTO.
 * @param {Array<object>} items
 * @param {(item: object) => any} selector
 * @returns {Map<number, object>}
 */
export const buildMapById = (items = [], selector = (item) => item?.id) => {
    const map = new Map()

    for (const item of items ?? []) {
        const id = Number(selector(item))
        if (Number.isFinite(id)) {
            map.set(id, item)
        }
    }

    return map
}

/**
 * Construit une clé stable pour identifier un produit et sa déclinaison.
 * Cette clé est utilisée partout où l'on doit regrouper les données par variante.
 * @param {number|string} productId
 * @param {number|string} productAttributeId
 * @returns {string}
 */
export const buildProductCombinationKey = (productId, productAttributeId = 0) => {
    const normalizedProductId = Number(productId)
    const normalizedAttributeId = Number(productAttributeId ?? 0)
    return `${Number.isFinite(normalizedProductId) ? normalizedProductId : 0}|${Number.isFinite(normalizedAttributeId) ? normalizedAttributeId : 0}`
}

/**
 * Décompose une clé produit/déclinaison pour retrouver les identifiants numériques.
 * Cette fonction évite de re-parser la logique de clé dans plusieurs DTOs.
 * @param {string} key
 * @returns {{productId:number, productAttributeId:number}}
 */
export const splitProductCombinationKey = (key) => {
    const [productPart = "0", attributePart = "0"] = String(key ?? "0|0").split("|")
    return {
        productId: Number(productPart) || 0,
        productAttributeId: Number(attributePart) || 0,
    }
}

export const formatDate = (value) => {
    if (!value) {
        return ""
    }

    const pad = (n) => String(n).padStart(2, '0')
    const d = value instanceof Date ? value : new Date(value)
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ""
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const formatDateTime = (value) => {
    if (!value) {
        return ""
    }

    const pad = (n) => String(n).padStart(2, '0')
    const d = value instanceof Date ? value : new Date(value)
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ""
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const formatDateInput = (value) => {
    if (!value) {
        return ""
    }

    return formatDate(value)
}

export const ensureLocalDateTime = (value) => {
    const pad = (n) => String(n).padStart(2, '0')

    if (!value && value !== 0) return ""

    // Date object -> format directly
    if (value instanceof Date) {
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ` +
            `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
    }

    const s = String(value).trim()

    // YYYY-MM-DD -> combine with current local time
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const now = new Date()
        return `${s} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    }

    // YYYY-MM-DD HH:MM:SS -> accept as-is if valid
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
        return s
    }

    // try parse with Date (will use local timezone if possible)
    const parsed = new Date(s)
    if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ` +
            `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`
    }

    return ""
}

/**
 * Convertit un nombre au format français (avec virgule) en nombre décimal
 * Ex: "12,50" -> 12.50, "5,5%" -> 5.5
 * @param {any} value - Valeur à normaliser
 * @returns {number} Nombre décimal
 */
export const normalizeNumber = (value) => {
    if (!value) {
        return 0;
    }
    return Number.parseFloat(String(value).replace('%', '').replace(',', '.'));
};

/**
 * Arrondit un nombre décimal à un nombre de décimales donné
 * @param {number} value - Valeur à arrondir
 * @param {number} decimals - Nombre de décimales (défaut: 6)
 * @returns {number} Nombre arrondi
 */
export const roundDecimal = (value, decimals = 6) => {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
};

/**
 * Convertit un prix TTC en prix HT
 * @param {any} priceTTC - Prix TTC
 * @param {any} taxRate - Taux de TVA
 * @returns {number} Prix HT
 */
export const convertTTCtoHT = (priceTTC, taxRate) => {
	const rate = normalizeNumber(taxRate);
	const ttc = normalizeNumber(priceTTC);
	const ht = ttc / (1 + (rate / 100));
	return roundDecimal(ht);
};

/**
 * Convertit une date du format JJ/MM/AAAA en AAAA-MM-JJ
 * @param {string} dateStr - Date au format JJ/MM/AAAA
 * @returns {string|null} Date au format AAAA-MM-JJ ou null
 */
export const convertDateFormat = (dateStr) => {
	if (!dateStr) return null;
	const parts = String(dateStr).split('/');
	if (parts.length !== 3) return dateStr;
	const [day, month, year] = parts;
	return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const toSlug = (value) => {
    return String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

export const normalizeKey = (key) => {
    return key?.trim().toLowerCase().replace(/\s+/g, '') || ''
}

export const ensureMd5Like = (value) => {
    const lower = (value || '').toLowerCase()
    if (/^[a-f0-9]{32}$/.test(lower)) return lower
    return '0123456789abcdef0123456789abcdef'
}

export const normalizeStatusLabel = (value) => (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

export const validateOrderStatusStrict = (status) => {
    const VALID_ORDER_STATUSES = ['', 'paiement accepté', 'livré', 'annulé', 'dans le panier']
    const trimmed = (status || '').trim()
    if (!VALID_ORDER_STATUSES.includes(trimmed)) {
        throw new Error(`État non valide: "${trimmed}". États acceptés: "" (vide), "paiement accepté", "livré", "annulé"`)
    }
    return trimmed
}

export const getDisplayText = (value, fallback = "") => {
    if (typeof value === "string") return value
    if (Array.isArray(value) && value.length > 0) {
        const first = value[0]
        if (typeof first === "string") return first
        if (first && typeof first.value === "string") return first.value
    }
    if (value && typeof value === "object" && typeof value.value === "string") {
        return value.value
    }
    return fallback
}