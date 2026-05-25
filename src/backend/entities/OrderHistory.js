import api from "../utils/api"
import { toJSON, toJSONList, toXML } from "../xml/orderHistoryXML.js"
import { buildApiFilterQuery, toDate, formatDateTime } from "../utils/utils"

class OrderHistory {
    endpoint = "order_histories"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? 0
        this.orderStateId = data.orderStateId ?? 0
        this.orderId = data.orderId ?? 0
        this.employeeId = data.employeeId ?? 0
        this.dateAdd = formatDateTime(toDate(data.dateAdd) ?? data.dateAdd)

        if (validate) {
            const missing = []

            if (this.orderId == null) {
                missing.push("orderId")
            }

            if (this.orderStateId == null) {
                missing.push("orderStateId")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate = true) {
        return new OrderHistory(toXML(JsonData), validate)
    }

    static fromData(data) {
        const obj = Object.create(OrderHistory.prototype)
        Object.assign(obj, data)
        obj.endpoint = "order_histories"
        return obj
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        const created = new OrderHistory(xml)
        if (this.dateAdd && created.id) {
            const reloaded = await created.getById(created.id)
            reloaded.dateAdd = this.dateAdd
            try {
                return await reloaded.update()
            } catch (error) {
                console.warn("Failed to update order history date after insert:", error)
                return created
            }
        }
        return created
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new OrderHistory(xml)
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
        // Map camelCase field names to PrestaShop snake_case names
        const fieldMap = { orderId: 'id_order', orderStateId: 'id_order_state', employeeId: 'id_employee' }
        const apiFieldName = fieldMap[fieldName] || fieldName
        const filter = buildApiFilterQuery(apiFieldName, value)

        if (!filter) {
            return []
        }

        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orderHistories = toJSONList(xml)

        return orderHistories.map((orderHistoryData) => OrderHistory.fromData(orderHistoryData))
    }

    async getByNotApi(fieldName, value = this[fieldName]) {
        const fieldMap = { orderId: 'id_order', orderStateId: 'id_order_state', employeeId: 'id_employee' }
        const apiFieldName = fieldMap[fieldName] || fieldName
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v).trim()).filter((s) => s !== "")

        if (normalized.length === 0) return []

        const filter = `&filter[${apiFieldName}]=![${normalized.join("|")}]`
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orderHistories = toJSONList(xml)
        return orderHistories.map((orderHistoryData) => OrderHistory.fromData(orderHistoryData))
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update an order history without an ID")
        }
        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new OrderHistory(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete an order history without an ID")
        }
        await api.delete(`${this.endpoint}/${this.id}`)
    }

    async getAll(excludeIds = []) {
        const excluded = new Set()

        for (const id of excludeIds ?? []) {
            excluded.add(Number(id))
        }

        const xml = await api.get(`${this.endpoint}?display=full`)
        const orderHistories = toJSONList(xml)

        return orderHistories
            .filter((orderHistoryData) => !excluded.has(Number(orderHistoryData.id)))
            .map((orderHistoryData) => OrderHistory.fromData(orderHistoryData))
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
        const orderHistories = toJSONList(xml)

        return orderHistories.map((orderHistoryData) => OrderHistory.fromData(orderHistoryData))
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
        const orderHistories = toJSONList(xml)
        return orderHistories.map((orderHistoryData) => OrderHistory.fromData(orderHistoryData))
    }

}

export default OrderHistory
