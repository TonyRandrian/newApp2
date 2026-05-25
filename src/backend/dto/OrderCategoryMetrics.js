import { normalizeNumber, buildProductCombinationKey } from "../utils/utils.js";

export default class OrderCategoryMetrics {
    /**
     * Construit une synthèse par catégorie avec quantités, ventes, achats et bénéfice.
     * Le DTO reste volontairement simple pour être directement exploitable dans les tableaux BO.
     * @param {number} quantity - total quantity
     * @param {number} totalVente - total sales (tax excl.)
     * @param {number} totalAchat - total purchase cost
     * @param {number} benefice - profit
     * @param {object|null} category - category object
     */
    constructor(quantity = 0, totalVente = 0, totalAchat = 0, benefice = 0, category = null) {
        this.quantity = quantity
        this.totalVente = totalVente
        this.totalAchat = totalAchat
        this.benefice = benefice
        this.category = category
    }

    /**
     * Regroupe les lignes par produit et déclinaison, puis agrège les totaux par catégorie.
     * La méthode refait les calculs à partir des lignes détaillées pour rester indépendante des vues de synthèse.
     * @param {Array<object>} lines
     * @returns {Array<OrderCategoryMetrics>}
     */
    static groupByCategoryFromProductLines(lines = []) {
        if (!Array.isArray(lines) || lines.length === 0) return []

        const byProduct = new Map()

        for (const line of lines) {
            const detail = line?.orderDetail ?? null
            const productId = Number(detail?.productId)
            const combinationId = Number(detail?.productAttributeId ?? 0)
            const key = buildProductCombinationKey(productId, combinationId)
            const quantity = normalizeNumber(detail?.productQuantity)

            if (!byProduct.has(key)) {
                const unitSalePrice = normalizeNumber(detail?.unitPriceTaxExcl)
                const basePurchasePrice = normalizeNumber(
                    line?.productDto?.product?.wholesalePrice ??
                    detail?.originalWholesalePrice ??
                    detail?.purchaseSupplierPrice ??
                    null
                )
                const declinaisonImpact = line?.productDto?.getCombinationPriceImpact?.(detail?.productAttributeId) ?? 0
                const unitPurchasePrice = basePurchasePrice + declinaisonImpact

                byProduct.set(key, {
                    quantity,
                    unitSalePrice,
                    unitPurchasePrice,
                    category: line?.productDto?.category ?? null,
                })
                continue
            }

            const current = byProduct.get(key)
            current.quantity = normalizeNumber(current?.quantity) + quantity
        }

        const byCategory = new Map()

        for (const item of byProduct.values()) {
            const quantity = normalizeNumber(item?.quantity)
            const totalVente = quantity * normalizeNumber(item?.unitSalePrice)
            const totalAchat = quantity * normalizeNumber(item?.unitPurchasePrice)
            const benefice = totalVente - totalAchat
            const category = item?.category ?? null
            const categoryKey = String(category?.id ?? category?.slug ?? category?.name ?? "unknown")

            if (!byCategory.has(categoryKey)) {
                byCategory.set(categoryKey, {
                    quantity,
                    totalVente,
                    totalAchat,
                    benefice,
                    category,
                })
                continue
            }

            const current = byCategory.get(categoryKey)
            current.quantity = normalizeNumber(current?.quantity) + quantity
            current.totalVente = normalizeNumber(current?.totalVente) + totalVente
            current.totalAchat = normalizeNumber(current?.totalAchat) + totalAchat
            current.benefice = normalizeNumber(current?.benefice) + benefice
        }

        const result = []

        for (const item of byCategory.values()) {
            const quantity = normalizeNumber(item?.quantity)
            const totalVente = normalizeNumber(item?.totalVente)
            const totalAchat = normalizeNumber(item?.totalAchat)
            const benefice = normalizeNumber(item?.benefice)
            result.push(
                new OrderCategoryMetrics(
                    quantity,
                    totalVente,
                    totalAchat,
                    benefice,
                    item?.category ?? null
                )
            )
        }

        return result
    }

    /**
     * Regroupe les lignes par catégorie à partir des totaux déjà calculés.
     * Cette version est plus rapide quand les métriques unitaires existent déjà.
     * @param {Array<object>} lines
     * @returns {Array<OrderCategoryMetrics>}
     */
    static groupByCategoryFromTotals(lines = []) {
        if (!Array.isArray(lines) || lines.length === 0) return []

        const byCategory = new Map()

        for (const line of lines) {
            const category = line?.productDto?.category ?? null
            const categoryKey = String(category?.id ?? category?.slug ?? category?.name ?? "unknown")

            if (!byCategory.has(categoryKey)) {
                byCategory.set(categoryKey, {
                    category,
                    totalVente: 0,
                    totalAchat: 0,
                    benefice: 0,
                    quantity: 0,
                })
            }

            const current = byCategory.get(categoryKey)
            current.totalVente = normalizeNumber(current.totalVente) + normalizeNumber(line?.totalVente)
            current.totalAchat = normalizeNumber(current.totalAchat) + normalizeNumber(line?.totalAchat)
            current.benefice = normalizeNumber(current.benefice) + normalizeNumber(line?.benefice)
            current.quantity = normalizeNumber(current.quantity) + normalizeNumber(line?.orderDetail?.productQuantity)
        }

        const result = []
        for (const item of byCategory.values()) {
            result.push(
                new OrderCategoryMetrics(
                    normalizeNumber(item?.quantity),
                    normalizeNumber(item?.totalVente),
                    normalizeNumber(item?.totalAchat),
                    normalizeNumber(item?.benefice),
                    item?.category ?? null
                )
            )
        }

        return result
    }
}
