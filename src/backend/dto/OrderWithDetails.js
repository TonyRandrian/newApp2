import { toDate, buildMapById, isDateInRange } from "../utils/utils.js";

export default class OrderWithDetails {
    /**
     * Construit un groupe commande + détails.
     * Le DTO sert de point d'entrée commun pour les traitements qui ont besoin des deux objets ensemble.
     * @param {object} order
     * @param {Array<object>} orderDetails
     */
    constructor(order = null, orderDetails = []) {
        this.order = order
        this.orderDetails = orderDetails
    }

    /**
     * Regroupe les commandes avec leurs lignes de commande déjà chargées.
     * La fonction conserve uniquement les commandes qui possèdent au moins un détail.
     * @param {Array<object>} orders
     * @param {Array<object>} orderDetails
     * @returns {Array<OrderWithDetails>}
     */
    static groupOrdersWithDetails(orders = [], orderDetails = []) {
        if (!Array.isArray(orders) || orders.length === 0) return []

        // Étape 1: indexer les détails par identifiant de commande.
        const detailsByOrderId = new Map()
        for (const detail of orderDetails ?? []) {
            const orderId = Number(detail?.orderId)
            if (!Number.isFinite(orderId)) continue
            if (!detailsByOrderId.has(orderId)) {
                detailsByOrderId.set(orderId, [])
            }
            detailsByOrderId.get(orderId).push(detail)
        }

        // Étape 2: reconstruire une liste de couples commande + détails.
        const result = []
        for (const order of orders ?? []) {
            const orderId = Number(order?.id)
            if (!Number.isFinite(orderId)) continue
            const details = detailsByOrderId.get(orderId) ?? []
            if (details.length === 0) continue
            result.push(new OrderWithDetails(order, details))
        }

        return result
    }

    /**
     * Filtre les groupes commande + détails sur une plage de dates inclusive.
     * Le filtrage s'applique sur la date de la commande parente.
     * @param {Array<OrderWithDetails>} list
     * @param {string|Date} dateMin
     * @param {string|Date} dateMax
     * @returns {Array<OrderWithDetails>}
     */
    static filterGroupsByDate(list = [], dateMin, dateMax) {
        if (!Array.isArray(list) || list.length === 0) return []
        if (!dateMin && !dateMax) return list

        const minDate = toDate(dateMin ?? "")
        const maxDate = toDate(dateMax ?? "")

        return list.filter((item) =>
            isDateInRange(toDate(item?.order?.dateAdd ?? ""), minDate, maxDate)
        )
    }
}
