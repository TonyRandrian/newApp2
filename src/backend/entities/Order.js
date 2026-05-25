import api from "../utils/api"
import {toJSON, toJSONList, toXML} from "../xml/orderXML.js"
import { buildApiFilterQuery, toDate, formatDateTime, isDateInRange } from "../utils/utils"
import OrderHistory from "./OrderHistory.js"
import OrderPayment from "./OrderPayment.js"

class Order {
    endpoint = "orders"

    static reservedStateIds = [11]
    static deliveredStateIds = [5]

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? 0
        this.addressDeliveryId = data.addressDeliveryId ?? 0
        this.addressInvoiceId = data.addressInvoiceId ?? 0
        this.cartId = data.cartId ?? 0
        this.currencyId = data.currencyId ?? 0
        this.langId = data.langId ?? 0
        this.customerId = data.customerId ?? 0
        this.carrierId = data.carrierId ?? 0
        this.currentState = data.currentState ?? 0
        this.module = data.module ?? ""
        this.invoiceNumber = data.invoiceNumber ?? ""
        this.deliveryNumber = data.deliveryNumber ?? ""
        this.valid = data.valid ?? ""
        this.invoiceDate = formatDateTime(toDate(data.invoiceDate) ?? data.invoiceDate)
        this.deliveryDate = formatDateTime(toDate(data.deliveryDate) ?? data.deliveryDate)
        this.dateAdd = formatDateTime(toDate(data.dateAdd) ?? data.dateAdd)
        this.dateUpd = formatDateTime(toDate(data.dateUpd) ?? data.dateUpd)
        this.shippingNumber = data.shippingNumber ?? ""
        this.note = data.note ?? ""
        this.shopGroupId = data.shopGroupId ?? 1
        this.shopId = data.shopId ?? 1
        this.secureKey = data.secureKey ?? ""
        this.payment = data.payment ?? ""
        this.recyclable = data.recyclable ?? 0
        this.gift = data.gift ?? 0
        this.giftMessage = data.giftMessage ?? ""
        this.mobileTheme = data.mobileTheme ?? 0
        this.totalDiscounts = data.totalDiscounts ?? 0
        this.totalDiscountsTaxIncl = data.totalDiscountsTaxIncl ?? 0
        this.totalDiscountsTaxExcl = data.totalDiscountsTaxExcl ?? 0
        this.totalPaid = data.totalPaid ?? 0
        this.totalPaidTaxIncl = data.totalPaidTaxIncl ?? 0
        this.totalPaidTaxExcl = data.totalPaidTaxExcl ?? 0
        this.totalPaidReal = data.totalPaidReal ?? 0
        this.totalProducts = data.totalProducts ?? 0
        this.totalProductsWt = data.totalProductsWt ?? 0
        this.totalShipping = data.totalShipping ?? 0
        this.totalShippingTaxIncl = data.totalShippingTaxIncl ?? 0
        this.totalShippingTaxExcl = data.totalShippingTaxExcl ?? 0
        this.carrierTaxRate = data.carrierTaxRate ?? 0
        this.totalWrapping = data.totalWrapping ?? 0
        this.totalWrappingTaxIncl = data.totalWrappingTaxIncl ?? 0
        this.totalWrappingTaxExcl = data.totalWrappingTaxExcl ?? 0
        this.roundMode = data.roundMode ?? ""
        this.roundType = data.roundType ?? ""
        this.conversionRate = data.conversionRate ?? 1
        this.reference = data.reference ?? ""
        this.orderRows = data.orderRows ?? []

        if (validate) {
            const missing = []

            if (this.customerId == null) {
                missing.push("customerId")
            }

            if (this.cartId == null) {
                missing.push("cartId")
            }

            if (this.currencyId == null) {
                missing.push("currencyId")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate = true) {
        return new Order(toXML(JsonData), validate)
    }

    static fromData(data) {
        const obj = Object.create(Order.prototype)
        Object.assign(obj, data)
        obj.endpoint = "orders"
        return obj
    }

    /**
     * Filters orders by a date range (inclusive) using their dateAdd field.
     * @param {Array<object>} orders
     * @param {string|Date} dateMin
     * @param {string|Date} dateMax
     * @returns {Array<object>}
     */
    static filterByDateRange(orders = [], dateMin, dateMax) {
        if (!Array.isArray(orders) || orders.length === 0) return []
        if (!dateMin && !dateMax) return orders

        const minDate = toDate(dateMin ?? "")
        const maxDate = toDate(dateMax ?? "")

        return orders.filter((order) =>
            isDateInRange(toDate(order?.dateAdd ?? ""), minDate, maxDate)
        )
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        const created = new Order(xml)

        if (this.dateAdd && created.id) {
            const reloaded = await created.getById(created.id)
            Object.assign(reloaded, this, {
                id: created.id,
                reference: created.reference || this.reference,
                dateAdd: this.dateAdd,
                orderRows: [],
            })
            try {
                await reloaded.update()
            } catch (error) {
                console.warn("Failed to update order date after insert:", error)
            }

            try {
                const orderHistory = new OrderHistory('', false)
                const histories = await orderHistory.getByApi('orderId', created.id)
                for (const history of histories) {
                    history.dateAdd = this.dateAdd
                    try {
                        await history.update()
                    } catch (err) {
                        console.warn(`Failed to update order history ${history.id} date:`, err)
                    }
                }
            } catch (error) {
                console.warn("Failed to sync OrderHistory dates:", error)
            }

            try {
                const orderPayment = new OrderPayment('', false)
                const payments = await orderPayment.getByApi('orderReference', created.reference || '')
                for (const payment of payments) {
                    payment.dateAdd = this.dateAdd
                    try {
                        await payment.update()
                    } catch (err) {
                        console.warn(`Failed to update order payment ${payment.id} date:`, err)
                    }
                }
            } catch (error) {
                console.warn("Failed to sync OrderPayment dates:", error)
            }
        }

        return created
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new Order(xml)
    }

    async getBy(fieldName, value = this[fieldName]) {
        // client-side filter: fetch all and filter locally
        if (value === undefined || value === null || value === "") return []
        const all = await this.getAll()
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v))
        return all.filter((item) => {
            const v = item[fieldName]
            if (v === undefined || v === null) return false
            if (Array.isArray(v)) return v.map(String).some((iv) => normalized.includes(iv))
            return normalized.includes(String(v))
        })
    }

    async getByNot(fieldName, value = this[fieldName]) {
        // client-side inverse filter: fetch all and exclude matching items
        if (value === undefined || value === null || value === "") return await this.getAll()
        const all = await this.getAll()
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v))

        return all.filter((item) => {
            const v = item[fieldName]
            // if the item has no such field, keep it (it's not matching)
            if (v === undefined || v === null) return true
            if (Array.isArray(v)) return !v.map(String).some((iv) => normalized.includes(iv))
            return !normalized.includes(String(v))
        })
    }

    async getByApi(fieldName, value = this[fieldName]) {
        const filter = buildApiFilterQuery(fieldName, value)

        if (!filter) {
            return []
        }

        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orders = toJSONList(xml)

        return orders.map((orderData) => Order.fromData(orderData))
    }

    // API-side inverse filter: request items where fieldName is NOT in value
    async getByNotApi(fieldName, value = this[fieldName]) {
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v).trim()).filter((s) => s !== "")

        if (normalized.length === 0) return []

        const filter = `&filter[${fieldName}]=![${normalized.join("|")}]`
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orders = toJSONList(xml)
        return orders.map((orderData) => Order.fromData(orderData))
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update an order without an ID")
        }

        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new Order(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete an order without an ID")
        }

        await api.delete(`${this.endpoint}/${this.id}`)
    }

    async getAll() {
        const xml = await api.get(`${this.endpoint}?display=full`)
        const orders = toJSONList(xml)

        return orders.map((orderData) => Order.fromData(orderData))
    }

    async getExcl(excludeIds = []) {
        const excluded = new Set()
        for (const id of excludeIds ?? []) {
            excluded.add(Number(id))
        }
        const all = await this.getAll()
        return all.filter((o) => !excluded.has(Number(o.id)))
    }

    async getIncl(includeIds = []) {
        const included = new Set()
        for (const id of includeIds ?? []) {
            included.add(Number(id))
        }
        const all = await this.getAll()
        return all.filter((o) => included.has(Number(o.id)))
    }

    async getExclApi(excludeIds = []) {
        const ids = []
        for (const id of excludeIds ?? []) {
            const numericId = Number(id)

            if (Number.isFinite(numericId)) {
                ids.push(numericId)
            }
        }
        const filter = ids.length > 0 ? `&filter[id]=![${ids.join("|")}]` : ""
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orders = toJSONList(xml)
        return orders.map((orderData) => Order.fromData(orderData))
    }

    async getInclApi(includeIds = []) {
        const ids = []
        for (const id of includeIds ?? []) {
            const numericId = Number(id)

            if (Number.isFinite(numericId)) {
                ids.push(numericId)
            }
        }
        const filter = ids.length > 0 ? `&filter[id]=[${ids.join("|")}]` : ""
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orders = toJSONList(xml)
        return orders.map((orderData) => Order.fromData(orderData))
    }

}

export default Order
