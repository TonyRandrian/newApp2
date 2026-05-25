export const extractIdsFromXml = (xml) => {
    if (!xml || typeof xml !== "string") {
        return [];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    const ids = Array.from(doc.querySelectorAll("id"))
        .map((node) => node.textContent?.trim())
        .filter((id) => id && Number.isFinite(Number(id)));

    if (ids.length > 0) {
        return ids;
    }

    return Array.from(doc.querySelectorAll("customer, address, order, product, category, carrier, cart, combination, tax, tax_rule, tax_rules_group, stock_available, stock_mvt, order_detail, order_history, order_payment, order_state, product_option, product_option_value"))
        .map((node) => node.getAttribute("id")?.trim())
        .filter((id) => id && Number.isFinite(Number(id)));
};

/**
 * Extrait le premier ID d'une réponse XML
 * @param {string} xmlString - Réponse XML
 * @returns {string|null} ID trouvé ou null
 */
export const extractIdFromXml = (xmlString) => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'application/xml');

        // Chercher n'importe quel élément avec un ID
        const elements = doc.querySelectorAll('[id]');
        if (elements.length > 0) {
            return elements[0].getAttribute('id');
        }

        // Fallback: chercher un élément <id>
        const idElement = doc.querySelector('id');
        if (idElement) return idElement.textContent?.trim();

        return null;
    } catch (error) {
        console.error('Erreur lors du parsing XML:', error);
        return null;
    }
};

export const getPrimitiveValue = (value) => {
    if (value && typeof value === 'object') {
        if (value['#text'] !== undefined) return value['#text']
        if (value.value !== undefined) return value.value
    }
    return value
}

export const getOrderStateName = (orderState) => {
    const name = orderState?.name

    if (typeof name === 'string') {
        return name
    }

    if (Array.isArray(name?.language)) {
        const preferredLanguage = name.language.find(language => String(language?.['@_id']) === '1') || name.language[0]
        return getPrimitiveValue(preferredLanguage)
    }

    if (name?.language) {
        return getPrimitiveValue(name.language)
    }

    return getPrimitiveValue(name)
}

export const getExistingOrderStateId = (stateName, orderStates) => {
    const normalizeStatusLabel = (value) => (value || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')

    const normalizedWanted = normalizeStatusLabel(stateName)
    const states = Array.isArray(orderStates) ? orderStates : []

    const exactMatch = states.find((state) => normalizeStatusLabel(getOrderStateName(state)) === normalizedWanted)
    if (exactMatch?.id) {
        return Number.parseInt(exactMatch.id, 10) || null
    }

    const fallbackMatch = states.find((state) => {
        const normalizedState = normalizeStatusLabel(getOrderStateName(state))
        return normalizedState.includes(normalizedWanted) || normalizedWanted.includes(normalizedState)
    })

    return fallbackMatch?.id ? (Number.parseInt(fallbackMatch.id, 10) || null) : null
}

// Extrait la date au format YYYY-MM-DD à partir de plusieurs formats possibles :
//  - "YYYY-MM-DD HH:MM:SS" (Prestashop)  -> slice direct
//  - "YYYY-MM-DDTHH:MM:SS..." (ISO)      -> slice direct
//  - Date object ou autre string parsable (ex. "Thu May 07 2024 ...") -> reformatage
export const toDayKey = (dateAdd) => {
    if (!dateAdd) return null

    const str = String(dateAdd)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.slice(0, 10)
    }

    const d = dateAdd instanceof Date ? dateAdd : new Date(dateAdd)
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null

    const pad = (n) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}