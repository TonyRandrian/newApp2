import api from "../utils/api"
import { toJSON, toJSONList, toXML } from "../xml/orderPaymentXML.js"
import { buildApiFilterQuery, toDate, formatDateTime } from "../utils/utils"

class OrderPayment {
    endpoint = "order_payments"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? 0
        this.orderReference = data.orderReference ?? ""
        this.currencyId = data.currencyId ?? 0
        this.amount = data.amount ?? 0
        this.paymentMethod = data.paymentMethod ?? ""
        this.conversionRate = data.conversionRate ?? 1
        this.transactionId = data.transactionId ?? ""
        this.cardNumber = data.cardNumber ?? ""
        this.cardBrand = data.cardBrand ?? ""
        this.cardExpiration = data.cardExpiration ?? ""
        this.cardHolder = data.cardHolder ?? ""
        this.dateAdd = formatDateTime(toDate(data.dateAdd) ?? data.dateAdd)
        this.employeeId = data.employeeId ?? 0

        if (validate) {
            const missing = []

            if (!this.orderReference) {
                missing.push("orderReference")
            }

            if (this.currencyId == null) {
                missing.push("currencyId")
            }

            if (this.amount == null) {
                missing.push("amount")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate = true) {
        return new OrderPayment(toXML(JsonData), validate)
    }

    static fromData(data) {
        const obj = Object.create(OrderPayment.prototype)
        Object.assign(obj, data)
        obj.endpoint = "order_payments"
        return obj
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        const created = new OrderPayment(xml)
        if (this.dateAdd && created.id) {
            const reloaded = await created.getById(created.id)
            reloaded.dateAdd = this.dateAdd
            try {
                return await reloaded.update()
            } catch (error) {
                console.warn("Failed to update order payment date after insert:", error)
                return created
            }
        }
        return created
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new OrderPayment(xml)
    }

    async getBy(fieldName, value = this[fieldName]) {
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
        if (value === undefined || value === null || value === "") return await this.getAll()
        const all = await this.getAll()
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v))

        return all.filter((item) => {
            const v = item[fieldName]
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
        const orderPayments = toJSONList(xml)

        return orderPayments.map((orderPaymentData) => OrderPayment.fromData(orderPaymentData))
    }

    async getByNotApi(fieldName, value = this[fieldName]) {
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v).trim()).filter((s) => s !== "")

        if (normalized.length === 0) return []

        const filter = `&filter[${fieldName}]=![${normalized.join("|")}]`
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orderPayments = toJSONList(xml)
        return orderPayments.map((orderPaymentData) => OrderPayment.fromData(orderPaymentData))
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update an order payment without an ID")
        }
        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new OrderPayment(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete an order payment without an ID")
        }
        await api.delete(`${this.endpoint}/${this.id}`)
    }

    async getAll(excludeIds = []) {
        const excluded = new Set()
        for (const id of excludeIds ?? []) {
            excluded.add(Number(id))
        }
        const xml = await api.get(`${this.endpoint}?display=full`)
        const orderPayments = toJSONList(xml)
        return orderPayments
            .filter((orderPaymentData) => !excluded.has(Number(orderPaymentData.id)))
            .map((orderPaymentData) => OrderPayment.fromData(orderPaymentData))
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
        const orderPayments = toJSONList(xml)
        return orderPayments.map((orderPaymentData) => OrderPayment.fromData(orderPaymentData))
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
        const orderPayments = toJSONList(xml)

        return orderPayments.map((orderPaymentData) => OrderPayment.fromData(orderPaymentData))
    }

}

export default OrderPayment
