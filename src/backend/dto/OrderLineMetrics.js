import {normalizeNumber, toDate, buildMapById, buildProductCombinationKey, splitProductCombinationKey} from "../utils/utils.js";
import OrderDetail from "../entities/OrderDetail.js";
import StockMvt from "../entities/StockMvt.js";

export default class OrderLineMetrics {
    /**
     * Construit une ligne métrique complète pour une commande ou une synthèse stock.
     * L'objet conserve les références utiles pour afficher le détail et recalculer les totaux si besoin.
     * @param {object} orderDetail - raw order detail record
     * @param {object|null} productDto - product DTO (with category/combination data)
     * @param {number} totalVente - total sales (tax excl.) for this line
     * @param {number} totalAchat - total purchase cost for this line
     * @param {number} benefice - profit for this line
     * @param {string} categorieLibelle - category label for the product
     * @param {object|null} order - parent order record
     * @param {Array<object>|null} stockMovements - stock movements for this product/combination
     * @param {object|null} stockAvailable - matching stock available record
     */
    constructor(
        orderDetail,
        productDto = null,
        totalVente = 0,
        totalAchat = 0,
        benefice = 0,
        categorieLibelle = "",
        order = null,
        stockMovements = null,
        stockAvailable = null
    ) {
        this.orderDetail = orderDetail
        this.productDto = productDto
        this.order = order
        this.totalVente = totalVente
        this.totalAchat = totalAchat
        this.benefice = benefice
        this.categorieLibelle = categorieLibelle
        this.stockMovements = stockMovements
        this.stockAvailable = stockAvailable
    }

    /**
     * Construit une ligne métrique à partir d'un détail de commande unique.
     * La méthode s'appuie sur le produit déjà chargé pour calculer ventes, achats et bénéfice.
     * @param {object} orderDetail
     * @param {object|null} order
     * @param {Map<number, object>} productsDtoById
     * @returns {OrderLineMetrics}
     */
    static createFromOrderDetail(orderDetail, order, productsDtoById) {
        const productId = Number(orderDetail?.productId)
        const productDto = productsDtoById.get(productId) ?? null
        if (!order) return null

        const quantity = normalizeNumber(orderDetail?.productQuantity)
        const basePurchasePrice = normalizeNumber(
            productDto?.product?.wholesalePrice ?? null
                //?? orderDetail?.originalWholesalePrice
                //?? orderDetail?.purchaseSupplierPrice
        )

        if (basePurchasePrice === null) console.error("basePurchasePrice is missing fro detail: "+orderDetail.orderId+" for orderDetail :"+orderDetail.id+" for productId : "+productId)

        const declinaisonImpact = productDto?.getCombinationPriceImpact?.(orderDetail?.productAttributeId) ?? 0

        const unitPurchasePrice = basePurchasePrice + declinaisonImpact
        const totalAchat = quantity * unitPurchasePrice
        const totalVenteHt = normalizeNumber(orderDetail?.unitPriceTaxExcl) * quantity
        const benefice = totalVenteHt - totalAchat
        const categorieLibelle = productDto?.getCategoryDisplayName?.() ?? ""

        return new OrderLineMetrics(orderDetail, productDto, totalVenteHt, totalAchat, benefice, categorieLibelle, order)
    }

    /**
     * Construit une liste de lignes métriques à partir des groupes commande + détails.
     * Cette version conserve les lignes unitaires, utile pour les vues de contrôle.
     * @param {Array<object>} orderGroups
     * @param {Array<object>} productsWithCombinations
     * @returns {Array<OrderLineMetrics>}
     */
    static listFromOrderGroups(orderGroups = [], productsWithCombinations = []) {
        if (!Array.isArray(orderGroups) || orderGroups.length === 0) return []

        const productsDtoById = buildMapById(productsWithCombinations, (dto) => dto?.product?.id)

        const result = []

        for (const group of orderGroups ?? []) {
            const order = group?.order ?? null
            for (const orderDetail of group?.orderDetails ?? []) {
                const metric = OrderLineMetrics.createFromOrderDetail(orderDetail, order, productsDtoById)
                if (metric) result.push(metric)
            }
        }

        return result
    }

    /**
     * Construit des lignes métriques par produit/déclinaison en utilisant les mouvements de stock d'entrée.
     * La boucle principale part des produits pour conserver les références sans commande.
     * @param {Array<object>} orderGroups
     * @param {Array<object>} productsWithCombinations
     * @param {Array<object>} stockMovements
     * @param {Array<object>} stockAvailables
     * @returns {Array<OrderLineMetrics>}
     */
    static listFromProductsWithStockMovements(
        orderGroups = [],
        productsWithCombinations = [],
        stockMovements = [],
        stockAvailables = []
    ) {
        if (!Array.isArray(orderGroups) || orderGroups.length === 0) return []

        const productsDtoById = buildMapById(productsWithCombinations, (dto) => dto?.product?.id)

        const stockAvailablesById = buildMapById(stockAvailables)
        const stockAvailablesByKey = new Map()
        for (const stockAvailable of stockAvailables ?? []) {
            const productId = Number(stockAvailable?.idProduct)
            if (!Number.isFinite(productId)) continue
            const key = buildProductCombinationKey(productId, stockAvailable?.idProductAttribute ?? 0)
            stockAvailablesByKey.set(key, stockAvailable)
        }

        //const entryReasonIds = new Set(StockMvt.stockEntryReasonIds ?? [])
        const entrySign = StockMvt.stockEntrySign;
        const entryMovementsByKey = new Map()
        const entryQtyByKey = new Map()

        for (const mvt of stockMovements ?? []) {
            //const reasonId = Number(mvt?.idStockMvtReason)
            //if (!entryReasonIds.has(reasonId)) continue
            if (Number(mvt?.sign) !== entrySign) continue

            let productId = Number(mvt?.idProduct)
            let attributeId = Number(mvt?.idProductAttribute ?? 0)

            const stockId = Number(mvt?.idStock)
            const stockAvailable = Number.isFinite(stockId)
                ? stockAvailablesById.get(stockId) ?? null
                : null

            if (!Number.isFinite(productId) || productId <= 0) {
                productId = Number(stockAvailable?.idProduct)
                attributeId = Number(stockAvailable?.idProductAttribute ?? 0)
            }

            if (!Number.isFinite(attributeId) || attributeId < 0) {
                attributeId = 0
            }

            if (!Number.isFinite(productId) || productId <= 0) continue

            const key = buildProductCombinationKey(productId, attributeId)
            const list = entryMovementsByKey.get(key) ?? []
            list.push({
                movement: mvt,
                stockAvailable: stockAvailable ?? null,
            })
            entryMovementsByKey.set(key, list)

            const prevQty = normalizeNumber(entryQtyByKey.get(key))
            entryQtyByKey.set(key, prevQty + normalizeNumber(mvt?.physicalQuantity))
        }

        const orderTotalsByKey = new Map()

        for (const group of orderGroups ?? []) {
            const order = group?.order ?? null
            if (!order) continue

            for (const orderDetail of group?.orderDetails ?? []) {
                const productId = Number(orderDetail?.productId)
                const attributeId = Number(orderDetail?.productAttributeId ?? 0)
                if (!Number.isFinite(productId)) continue

                const key = buildProductCombinationKey(productId, attributeId)
                if (!orderTotalsByKey.has(key)) {
                    orderTotalsByKey.set(key, {
                        orderDetail,
                        quantity: 0,
                        totalVente: 0,
                    })
                }

                const current = orderTotalsByKey.get(key)
                const quantity = normalizeNumber(orderDetail?.productQuantity)
                current.quantity = normalizeNumber(current.quantity) + quantity
                current.totalVente = normalizeNumber(current.totalVente) + (normalizeNumber(orderDetail?.unitPriceTaxExcl) * quantity)
                orderTotalsByKey.set(key, current)
            }
        }

        const result = []

        for (const productDto of productsWithCombinations ?? []) {
            const productId = Number(productDto?.product?.id)
            if (!Number.isFinite(productId)) continue

            const declinaisons = productDto?.declinaisons?.values ?? productDto?.declinaisons?.value ?? []
            const hasDeclinaisons = Array.isArray(declinaisons) && declinaisons.length > 0
            const attributeIds = new Set(hasDeclinaisons ? [] : [0])

            if (Array.isArray(declinaisons)) {
                for (const declinaison of declinaisons) {
                    const attributeId = Number(declinaison?.declinaisonId)
                    if (Number.isFinite(attributeId)) {
                        attributeIds.add(attributeId)
                    }
                }
            }

            for (const key of orderTotalsByKey.keys()) {
                const { productId: keyProductId, productAttributeId } = splitProductCombinationKey(key)
                if (keyProductId === productId) {
                    const attrId = productAttributeId
                    if (!(hasDeclinaisons && attrId === 0)) {
                        attributeIds.add(attrId)
                    }
                }
            }

            for (const key of entryMovementsByKey.keys()) {
                const { productId: keyProductId, productAttributeId } = splitProductCombinationKey(key)
                if (keyProductId === productId) {
                    const attrId = productAttributeId
                    if (!(hasDeclinaisons && attrId === 0)) {
                        attributeIds.add(attrId)
                    }
                }
            }

            for (const key of stockAvailablesByKey.keys()) {
                const { productId: keyProductId, productAttributeId } = splitProductCombinationKey(key)
                if (keyProductId === productId) {
                    const attrId = productAttributeId
                    if (!(hasDeclinaisons && attrId === 0)) {
                        attributeIds.add(attrId)
                    }
                }
            }

            for (const attributeId of attributeIds) {
                if (hasDeclinaisons && Number(attributeId) === 0) continue

                const key = buildProductCombinationKey(productId, attributeId)
                const totals = orderTotalsByKey.get(key) ?? { orderDetail: null, quantity: 0, totalVente: 0 }
                const entryMovements = entryMovementsByKey.get(key) ?? []
                const totalEntryQty = normalizeNumber(entryQtyByKey.get(key))

                const basePurchasePrice = normalizeNumber(
                    productDto?.product?.wholesalePrice ??
                    totals?.orderDetail?.originalWholesalePrice ??
                    totals?.orderDetail?.purchaseSupplierPrice ??
                    null
                )
                const declinaisonImpact = productDto?.getCombinationPriceImpact?.(attributeId) ?? 0
                const unitPurchasePrice = basePurchasePrice + declinaisonImpact
                const totalAchat = totalEntryQty * unitPurchasePrice
                const benefice = normalizeNumber(totals?.totalVente) - totalAchat
                const categorieLibelle = productDto?.getCategoryDisplayName?.() ?? ""
                const stockAvailable = entryMovements.find((movementItem) => movementItem?.stockAvailable)?.stockAvailable
                    ?? stockAvailablesByKey.get(key)
                    ?? null

                const mergedDetail = totals?.orderDetail
                    ? OrderDetail.fromData({
                        ...totals.orderDetail,
                        productQuantity: normalizeNumber(totals?.quantity),
                        productAttributeId: Number.isFinite(attributeId) ? attributeId : 0,
                        unitPriceTaxExcl: normalizeNumber(totals?.quantity) > 0
                            ? (normalizeNumber(totals?.totalVente) / normalizeNumber(totals?.quantity))
                            : normalizeNumber(totals?.orderDetail?.unitPriceTaxExcl),
                    })
                    : OrderDetail.fromData({
                        productId,
                        productAttributeId: Number.isFinite(attributeId) ? attributeId : 0,
                        productQuantity: normalizeNumber(totals?.quantity),
                        unitPriceTaxExcl: 0,
                    })

                result.push(
                    new OrderLineMetrics(
                        mergedDetail,
                        productDto ?? null,
                        normalizeNumber(totals?.totalVente),
                        totalAchat,
                        benefice,
                        categorieLibelle,
                        null,
                        entryMovements,
                        stockAvailable
                    )
                )
            }
        }

        return result
    }

    /**
     * Indique si la ligne appartient à une plage de dates donnée.
     * Le contrôle s'applique à la date de création de la commande parente.
     * @param {string|Date} dateMin
     * @param {string|Date} dateMax
     * @returns {boolean}
     */
    isWithinOrderDateRange(dateMin, dateMax) {
        const orderDate = toDate(this.order?.dateAdd ?? "")
        if (!(orderDate instanceof Date) || Number.isNaN(orderDate.getTime())) {
            return false
        }

        const minDate = toDate(dateMin ?? "")
        const maxDate = toDate(dateMax ?? "")

        if (minDate instanceof Date && !Number.isNaN(minDate.getTime())) {
            minDate.setHours(0, 0, 0, 0)
            if (orderDate < minDate) return false
        }

        if (maxDate instanceof Date && !Number.isNaN(maxDate.getTime())) {
            maxDate.setHours(23, 59, 59, 999)
            if (orderDate > maxDate) return false
        }

        return true
    }

    /**
     * Filtre une liste de lignes métriques selon la date de commande.
     * La méthode réutilise le contrôle déjà porté par chaque ligne métrique.
     * @param {Array<OrderLineMetrics>} list
     * @param {string|Date} dateMin
     * @param {string|Date} dateMax
     * @returns {Array<OrderLineMetrics>}
     */
    static filterByDateRange(list, dateMin, dateMax) {
        if (!Array.isArray(list) || list.length === 0) return []
        if (!dateMin && !dateMax) return list
        return list.filter((dto) => dto?.isWithinOrderDateRange?.(dateMin, dateMax))
    }

    /**
     * Regroupe les lignes par produit et déclinaison avant de recalculer les totaux.
     * Cette version est utile quand on veut condenser les lignes unitaires en vue synthétique.
     * @param {Array<OrderLineMetrics>} list
     * @returns {Array<OrderLineMetrics>}
     */
    static groupByProductAndCombinationLines(list = []) {
        if (!Array.isArray(list) || list.length === 0) return []

        const grouped = new Map()

        for (const line of list) {
            const detail = line?.orderDetail ?? null
            const productId = Number(detail?.productId)
            const combinationId = Number(detail?.productAttributeId ?? 0)
            const key = buildProductCombinationKey(productId, combinationId)

            const quantity = normalizeNumber(detail?.productQuantity)

            if (!grouped.has(key)) {
                grouped.set(
                    key,
                    {
                        detail: detail ?? null,
                        productDto: line?.productDto ?? null,
                        categorieLibelle: line?.categorieLibelle ?? "",
                        order: line?.order ?? null,
                        quantity,
                    }
                )
                continue
            }

            const current = grouped.get(key)
            current.quantity = normalizeNumber(current?.quantity) + quantity
        }

        const result = []

        for (const item of grouped.values()) {
            const baseDetail = item.detail ?? null
            const mergedDetail = baseDetail
                ? OrderDetail.fromData({
                    ...baseDetail,
                    productQuantity: normalizeNumber(item?.quantity),
                })
                : null

            const unitSalePrice = normalizeNumber(mergedDetail?.unitPriceTaxExcl)
            const basePurchasePrice = normalizeNumber(
                item?.productDto?.product?.wholesalePrice ??
                mergedDetail?.originalWholesalePrice ??
                mergedDetail?.purchaseSupplierPrice ??
                null
            )
            const declinaisonImpact = item?.productDto?.getCombinationPriceImpact?.(mergedDetail?.productAttributeId) ?? 0
            const unitPurchasePrice = basePurchasePrice + declinaisonImpact
            const totalAchat = normalizeNumber(item?.quantity) * unitPurchasePrice
            const totalVente = normalizeNumber(item?.quantity) * unitSalePrice
            const benefice = totalVente - totalAchat

            result.push(
                new OrderLineMetrics(
                    mergedDetail,
                    item?.productDto ?? null,
                    totalVente,
                    totalAchat,
                    benefice,
                    item?.categorieLibelle ?? "",
                    item?.order ?? null
                )
            )
        }

        return result
    }
}
