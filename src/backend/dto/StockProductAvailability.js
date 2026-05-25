import {normalizeNumber, buildMapById, buildProductCombinationKey, splitProductCombinationKey} from "../utils/utils.js";
import StockMvt from "../entities/StockMvt.js";
import Order from "../entities/Order.js";

export default class StockProductAvailability {
    /**
     * Construit une vue de disponibilité pour un produit ou une déclinaison.
     * L'objet conserve à la fois les quantités et les références métier utiles au tableau BO.
     * @param {number} physicalQuantity
     * @param {number} reservedQuantity
     * @param {number} availableQuantity
     * @param {object|null} product
     * @param {object|null} declinaison
     * @param category
     * @param {object|null} stockAvailable
     * @param {Array<object>} stockMovements
     * @param {Array<object>} orderDetails
     */
    constructor(
        physicalQuantity = 0,
        reservedQuantity = 0,
        availableQuantity = 0,
        product = null,
        declinaison = null,
        category = null,
        stockAvailable = null,
        stockMovements = [],
        orderDetails = []
    ) {
        this.physicalQuantity = physicalQuantity
        this.reservedQuantity = reservedQuantity
        this.availableQuantity = availableQuantity
        this.product = product
        this.declinaison = declinaison
        this.category = category
        this.stockAvailable = stockAvailable
        this.stockMovements = stockMovements
        this.orderDetails = orderDetails
    }

    /**
     * Construit les disponibilités produit à partir des mouvements de stock et des commandes.
     * La boucle principale part des produits déjà chargés pour conserver les références sans commande.
     * @param {Array<object>} stockMovements
     * @param {Array<object>} orderGroups
     * @param {Array<object>} productsWithCombinations
     * @param {Array<object>} stockAvailables
     * @returns {Array<StockProductAvailability>}
     */
    static listFromProductsAndStockData(
        stockMovements = [],
        orderGroups = [],
        productsWithCombinations = [],
        stockAvailables = []
    ) {
        if (!Array.isArray(productsWithCombinations) || productsWithCombinations.length === 0) return []

        //const entryReasonIds = new Set(StockMvt.stockEntryReasonIds ?? [])
        //const exitReasonIds = new Set(StockMvt.stockExitReasonIds ?? [])
        const entrySign = StockMvt.stockEntrySign;
        const exitSign = StockMvt.stockExitSign;
        const reservedStateIds = new Set(Order.reservedStateIds ?? [])

        const stockAvailablesById = buildMapById(stockAvailables)
        const stockAvailablesByKey = new Map()
        for (const stockAvailable of stockAvailables ?? []) {
            const productId = Number(stockAvailable?.idProduct)
            if (!Number.isFinite(productId)) continue
            const key = buildProductCombinationKey(productId, stockAvailable?.idProductAttribute ?? 0)
            stockAvailablesByKey.set(key, stockAvailable)
        }

        const allMovementsByKey = new Map()
        const entryQtyByKey = new Map()

        for (const mvt of stockMovements ?? []) {
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
            const list = allMovementsByKey.get(key) ?? []
            list.push({
                movement: mvt,
                stockAvailable: stockAvailable ?? null,
            })
            allMovementsByKey.set(key, list)

            const reasonId = Number(mvt?.idStockMvtReason)
            if (Number(mvt?.sign) === entrySign) {
                const prev = normalizeNumber(entryQtyByKey.get(key))
                entryQtyByKey.set(key, prev + normalizeNumber(mvt?.physicalQuantity))
            }
            if (Number(mvt?.sign) === exitSign) {
                const prev = normalizeNumber(entryQtyByKey.get(key))
                entryQtyByKey.set(key, prev - normalizeNumber(mvt?.physicalQuantity))
            }
        }

        const reservedQtyByKey = new Map()
        const orderDetailsByKey = new Map()

        for (const group of orderGroups ?? []) {
            const order = group?.order ?? null
            const orderStateId = Number(order?.currentState)
            if (!reservedStateIds.has(orderStateId)) continue

            for (const detail of group?.orderDetails ?? []) {
                const productId = Number(detail?.productId)
                const attributeId = Number(detail?.productAttributeId ?? 0)
                if (!Number.isFinite(productId)) continue

                const key = buildProductCombinationKey(productId, attributeId)
                const detailList = orderDetailsByKey.get(key) ?? []
                detailList.push(detail)
                orderDetailsByKey.set(key, detailList)

                const prev = normalizeNumber(reservedQtyByKey.get(key))
                reservedQtyByKey.set(key, prev + normalizeNumber(detail?.productQuantity))
            }
        }

        const result = []

        for (const dto of productsWithCombinations ?? []) {
            const product = dto?.product ?? null
            const category = dto?.category ?? null
            const productId = Number(product?.id)
            if (!Number.isFinite(productId)) continue

            const declinaisons = dto?.declinaisons?.values ?? dto?.declinaisons?.value ?? []
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

            for (const key of allMovementsByKey.keys()) {
                const {productId: keyProductId, productAttributeId} = splitProductCombinationKey(key)
                if (keyProductId === productId) {
                    const attrId = productAttributeId
                    if (!(hasDeclinaisons && attrId === 0)) {
                        attributeIds.add(attrId)
                    }
                }
            }

            for (const key of orderDetailsByKey.keys()) {
                const {productId: keyProductId, productAttributeId} = splitProductCombinationKey(key)
                if (keyProductId === productId) {
                    const attrId = productAttributeId
                    if (!(hasDeclinaisons && attrId === 0)) {
                        attributeIds.add(attrId)
                    }
                }
            }

            for (const key of stockAvailablesByKey.keys()) {
                const {productId: keyProductId, productAttributeId} = splitProductCombinationKey(key)
                if (keyProductId === productId) {
                    const attrId = productAttributeId
                    if (!(hasDeclinaisons && attrId === 0)) {
                        attributeIds.add(attrId)
                    }
                }
            }

            for (const attributeId of attributeIds) {
                if (hasDeclinaisons && Number(attributeId) === 0) {
                    continue
                }
                const key = buildProductCombinationKey(productId, attributeId)
                const physicalQuantity = normalizeNumber(entryQtyByKey.get(key))
                const reservedQuantity = normalizeNumber(reservedQtyByKey.get(key))
                const availableQuantity = physicalQuantity - reservedQuantity
                const stockMovementsForKey = allMovementsByKey.get(key) ?? []
                const orderDetailsForKey = orderDetailsByKey.get(key) ?? []

                const stockAvailable = stockMovementsForKey.find((item) => item?.stockAvailable)?.stockAvailable
                    ?? stockAvailablesByKey.get(key)
                    ?? null

                const declinaison = Array.isArray(declinaisons)
                    ? declinaisons.find((d) => Number(d?.declinaisonId) === Number(attributeId)) ?? null
                    : null

                result.push(
                    new StockProductAvailability(
                        physicalQuantity,
                        reservedQuantity,
                        availableQuantity,
                        product,
                        declinaison,
                        category,
                        stockAvailable,
                        stockMovementsForKey,
                        orderDetailsForKey,
                    )
                )
            }
        }

        return result
    }
}
