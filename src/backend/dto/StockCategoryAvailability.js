import {normalizeNumber} from "../utils/utils.js";

export default class StockCategoryAvailability {
    /**
     * Construit une ligne de synthèse de stock pour une catégorie.
     * Les quantités sont déjà agrégées pour être affichées directement dans le tableau BO.
     * @param {object|null} category
     * @param {number} physicalQuantity
     * @param {number} reservedQuantity
     * @param {number} availableQuantity
     */
    constructor(category = null, physicalQuantity = 0, reservedQuantity = 0, availableQuantity = 0) {
        this.category = category
        this.physicalQuantity = physicalQuantity
        this.reservedQuantity = reservedQuantity
        this.availableQuantity = availableQuantity
    }

    /**
     * Regroupe les disponibilités produit par catégorie.
     * La méthode additionne les quantités physiques, réservées et disponibles sur chaque catégorie.
     * @param {Array<object>} list
     * @returns {Array<StockCategoryAvailability>}
     */
    static groupByCategory(list = []) {
        if (!Array.isArray(list) || list.length === 0) return []

        const byCategory = new Map()

        for (const item of list) {
            const category = item?.category ?? null
            const key = String(category?.id ?? category?.slug ?? category?.name ?? "unknown")

            if (!byCategory.has(key)) {
                byCategory.set(key, {
                    category,
                    physicalQuantity: 0,
                    reservedQuantity: 0,
                    availableQuantity: 0,
                })
            }

            const current = byCategory.get(key)
            current.physicalQuantity = normalizeNumber(current.physicalQuantity) + normalizeNumber(item?.physicalQuantity)
            current.reservedQuantity = normalizeNumber(current.reservedQuantity) + normalizeNumber(item?.reservedQuantity)
            current.availableQuantity = normalizeNumber(current.availableQuantity) + normalizeNumber(item?.availableQuantity)
        }

        const result = []
        for (const item of byCategory.values()) {
            result.push(
                new StockCategoryAvailability(
                    item?.category ?? null,
                    normalizeNumber(item?.physicalQuantity),
                    normalizeNumber(item?.reservedQuantity),
                    normalizeNumber(item?.availableQuantity)
                )
            )
        }

        return result
    }
}
