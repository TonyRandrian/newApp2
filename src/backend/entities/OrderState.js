import api from "../utils/api"
import { toJSON, toJSONList, toXML } from "../xml/orderStateXML.js"
import { buildApiFilterQuery, toDate, formatDateTime } from "../utils/utils"

class OrderState {
    endpoint = "order_states"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? 0
        this.unremovable = data.unremovable ?? 0
        this.delivery = data.delivery ?? 0
        this.hidden = data.hidden ?? 0
        this.sendEmail = data.sendEmail ?? 0
        this.moduleName = data.moduleName ?? ""
        this.invoice = data.invoice ?? 0
        this.color = data.color ?? ""
        this.logable = data.logable ?? 0
        this.shipped = data.shipped ?? 0
        this.paid = data.paid ?? 0
        this.pdfDelivery = data.pdfDelivery ?? 0
        this.pdfInvoice = data.pdfInvoice ?? 0
        this.deleted = data.deleted ?? 0
        this.name = data.name ?? ""
        this.template = data.template ?? ""
        this.dateAdd = formatDateTime(toDate(data.dateAdd) ?? data.dateAdd)

        // no strict validation: order_state resource doesn't expose orderId/stateId
        // keep validate parameter for compatibility but do not enforce fields
    }

    static fromJSON(JsonData, validate = true) {
        return new OrderState(toXML(JsonData), validate)
    }

    static fromData(data) {
        const obj = Object.create(OrderState.prototype)
        Object.assign(obj, data)
        obj.endpoint = "order_states"
        return obj
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        return new OrderState(xml)
    }

    async getById(id, validate = false) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new OrderState(xml, validate)
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
        const orderStates = toJSONList(xml)

        return orderStates.map((orderStateData) => OrderState.fromData(orderStateData))
    }

    async getByNotApi(fieldName, value = this[fieldName]) {
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v).trim()).filter((s) => s !== "")

        if (normalized.length === 0) return []

        const filter = `&filter[${fieldName}]=![${normalized.join("|")}]`
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orderStates = toJSONList(xml)
        return orderStates.map((orderStateData) => OrderState.fromData(orderStateData))
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update an order state without an ID")
        }
        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new OrderState(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete an order state without an ID")
        }
        await api.delete(`${this.endpoint}/${this.id}`)
    }

    async getAll(excludeIds = []) {
        const excluded = new Set()
        for (const id of excludeIds ?? []) {
            excluded.add(Number(id))
        }
        const xml = await api.get(`${this.endpoint}?display=full`)
        const orderStates = toJSONList(xml)

        return orderStates
            .filter((orderStateData) => !excluded.has(Number(orderStateData.id)))
            .map((orderStateData) => OrderState.fromData(orderStateData))
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
        const orderStates = toJSONList(xml)
        return orderStates.map((orderStateData) => OrderState.fromData(orderStateData))
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
        const orderStates = toJSONList(xml)
        return orderStates.map((orderStateData) => OrderState.fromData(orderStateData))
    }

}

export default OrderState
