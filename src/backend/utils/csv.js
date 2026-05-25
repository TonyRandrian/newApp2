import Papa from "papaparse";

/**
 * Parse un contenu CSV en tableau d'objets (entête en clés).
 *
 * Les en-têtes sont mis en minuscules (mais accents conservés) pour que la
 * lecture des valeurs soit cohérente avec checkCSVHeader (insensible à la
 * casse, sensible aux accents) : un CSV "NOM" est lu via row["nom"].
 *
 * @param {string} text - Contenu CSV brut
 * @returns {Array<Object>} Tableau d'objets avec colonnes normalisées
 * @throws {Error} Si erreur de parsing CSV (colonnes mal formées, etc.)
 */
export function parseCSV(text) {
    const {data, errors} = Papa.parse(text.trim(), {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (h) => h.trim().toLowerCase(),
    });

    if (errors.length) {
        const msg = errors.map((e) => `ligne ${e.row} : ${e.message}`).join(", ");
        throw new Error(`Erreur(s) de parsing CSV -> ${msg}`);
    }

    return data;
}

/**
 * Extrait la première ligne (en-têtes) d'un CSV.
 *
 * @param {string} text - Contenu CSV brut
 * @returns {Array<string>} En-têtes des colonnes
 */
export function getCSVHeader(text) {
    const lignes = text.trim().split('\n')

    return lignes[0].split(',').map(e => e.trim());
}

/**
 * Valide les en-têtes du CSV.
 *
 * Comparaison insensible à la casse mais SENSIBLE aux accents :
 * - "specificite" ≠ "specificité" (accents)
 * - "NOM" == "nom" ✓ (casse)
 *
 * @param {string} text - Contenu CSV brut
 * @param {Array<string>} realHeader - En-têtes attendus
 * @param {boolean} ignoreCase - Ignorer la casse (défaut: true)
 * @throws {Error} Si en-têtes manquants ou supplémentaires
 */
export function checkCSVHeader(text, realHeader, ignoreCase = true) {
    const header = getCSVHeader(text);

    // toLowerCase() neutralise la casse sans toucher aux accents.
    const norm = (c) =>
        ignoreCase ? String(c).trim().toLowerCase() : String(c).trim();

    const expected = realHeader.map(norm);
    const got = header.map(norm);

    // Colonne en trop ou mal orthographiée (accent compris).
    for (let i = 0; i < got.length; i++) {
        if (!expected.includes(got[i])) {
            throw new Error(
                `Erreur: la colonne "${header[i].trim()}" ne correspond à aucune colonne attendue (attendu: ${realHeader.join(", ")})`
            );
        }
    }

    // Colonne obligatoire absente.
    for (let i = 0; i < expected.length; i++) {
        if (!got.includes(expected[i])) {
            throw new Error(
                `Erreur: la colonne obligatoire "${realHeader[i]}" est absente du CSV`
            );
        }
    }
}

/**
 * Valide que les colonnes nuériques dans une ligne CSV ne sont pas négatives.
 *
 * @param {Object} row - Ligne du CSV (objet clé-valeur)
 * @param {Array<string>} numberColumn - Noms des colonnes à vérifier
 * @throws {Error} Si une colonne contient une valeur négative
 */
export function checkNegativeInRow(row, numberColumn) {
    for (const column of numberColumn) {
        const raw = String(row[column] ?? "").trim();
        const value = parseFloat(raw.replace(",", "."));

        /*if (Number.isNaN(value)) {
            throw new Error(
                `La colonne ${column} doit contenir un nombre (reçu "${raw}")`
            );
        }*/
        if (value < 0) {
            throw new Error(
                `La colonne ${column} doit être un montant positif (reçu ${raw})`
            );
        }
    }
}

/**
 * Valide qu'une colonne de taux de TVA n'est pas négative.
 *
 * @param {Object} row - Ligne du CSV
 * @param {string} taxeColumnName - Nom de la colonne de TVA
 * @throws {Error} Si la TVA est négative
 */
export function checkNegativeTaxe(row, taxeColumnName) {
    const raw = String(row[taxeColumnName] ?? "").trim();
    const value = parseFloat(raw.replace(",", "."));

    /*if (Number.isNaN(value)) {
        throw new Error(
            `La colonne ${taxeColumnName} doit contenir un nombre (reçu "${raw}")`
        );
    }*/
    if (value < 0) {
        throw new Error(
            `La colonne ${taxeColumnName} doit être positive (reçu ${raw})`
        );
    }
}

/**
 * Parse the 'achat' field used in file 3 imports. Returns consolidated items.
 */
export function parseAchatField(achatField) {
    try {
        if (!achatField) return []

        const cleaned = achatField
            .replace(/^\[/, '').replace(/\]$/, '')
            .replace(/^\(/, '').replace(/\)$/, '')
            .replace(/""/g, '"')

        const items = cleaned.split('),(')

        const parsedItems = items.map(item => {
            item = item.replace(/^\(/, '').replace(/\)$/, '').trim()
            const parts = []
            let current = ''
            let inQuotes = false
            for (let i = 0; i < item.length; i++) {
                const char = item[i]
                if (char === '"') {
                    inQuotes = !inQuotes
                } else if (char === ';' && !inQuotes) {
                    parts.push(current.replace(/"/g, '').trim())
                    current = ''
                    continue
                }
                current += char
            }
            if (current) parts.push(current.replace(/"/g, '').trim())

            const quantityValue = Number.parseInt(parts[1], 10)

            return {
                reference: parts[0] || '',
                quantity: Number.isNaN(quantityValue) ? 1 : quantityValue,
                variante: parts[2] || ''
            }
        }).filter(i => i.reference)

        const consolidated = new Map()
        const normalizeKey = (k) => k?.trim().toLowerCase().replace(/\s+/g, '') || ''
        for (const item of parsedItems) {
            const normalizedVariante = normalizeKey(item.variante)
            const key = `${item.reference}|${normalizedVariante}`
            if (consolidated.has(key)) {
                const existing = consolidated.get(key)
                existing.quantity += item.quantity
            } else {
                consolidated.set(key, { reference: item.reference, quantity: item.quantity, variante: normalizedVariante })
            }
        }

        return Array.from(consolidated.values())
    } catch {
        return []
    }
}

/**
 * Parse un pourcentage au format français en nombre décimal.
 * Exemples: "11,65%" -> 11.65, "5,5%" -> 5.5
 *
 * @param {any} str - Chaîne de pourcentage
 * @returns {number} Pourcentage en nombre décimal
 */
export function parsePct(str) {
    return parseFloat(String(str).replace(",", ".").replace("%", "").trim());
}

/**
 * Parse un montant au format français en nombre décimal.
 * Exemples: "12,5" -> 12.5, "100,99" -> 100.99
 *
 * @param {any} str - Chaîne de montant
 * @returns {number} Montant en nombre décimal
 */
export function parsePrice(str) {
    return parseFloat(String(str).replace(",", ".").trim());
}

export function toSlug(name) {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}

export function verifyValidDate(dateString) {
    const raw = String(dateString ?? "").trim();

    // Format strict JJ/MM/AAAA
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        throw new Error(
            `Date "${raw}" invalide: le format attendu est JJ/MM/AAAA`
        );
    }

    const [day, month, year] = raw.split("/").map(Number);

    // Mois hors plage
    if (month < 1 || month > 12) {
        throw new Error(
            `Date "${raw}" invalide: le mois doit être compris entre 01 et 12 (reçu ${String(month).padStart(2, "0")})`
        );
    }

    // Jour hors plage pour ce mois/année (gère les années bissextiles)
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
        throw new Error(
            `Date "${raw}" invalide: le jour doit être compris entre 01 et ${daysInMonth} pour ${String(month).padStart(2, "0")}/${year} (reçu ${String(day).padStart(2, "0")})`
        );
    }
}

// Normalise n'importe quelle date vers le format YYYY-MM-DD.
export function formatAvailableDate(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "0000-00-00";

    const normalized = raw.replace(/\//g, "-");
    /*const ymd = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) {
        const [, year, m, d] = ymd;
        return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }*/

    const dmy = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmy) {
        const [, d, m, year] = dmy;
        return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    return "0000-00-00";
}
