import api from "../utils/api"
import { toJSON, toJSONList, toXML } from "../xml/orderDetailXML.js"
import { buildApiFilterQuery, toDate, formatDateTime } from "../utils/utils"

class OrderDetail {
    endpoint = "order_details"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? 0
        this.orderId = data.orderId ?? 0
        this.productId = data.productId ?? 0
        this.productAttributeId = data.productAttributeId ?? 0
        this.productQuantityReinjected = data.productQuantityReinjected ?? 0
        this.groupReduction = data.groupReduction ?? 0
        this.discountQuantityApplied = data.discountQuantityApplied ?? 0
        this.downloadHash = data.downloadHash ?? ""
        this.downloadDeadline = formatDateTime(toDate(data.downloadDeadline) ?? data.downloadDeadline)
        this.orderInvoiceId = data.orderInvoiceId ?? 0
        this.warehouseId = data.warehouseId ?? 0
        this.shopId = data.shopId ?? 0
        this.customizationId = data.customizationId ?? 0
        this.productName = data.productName ?? ""
        this.productQuantity = data.productQuantity ?? 0
        this.productQuantityInStock = data.productQuantityInStock ?? 0
        this.productQuantityReturn = data.productQuantityReturn ?? 0
        this.productQuantityRefunded = data.productQuantityRefunded ?? 0
        this.productPrice = data.productPrice ?? 0
        this.reductionPercent = data.reductionPercent ?? 0
        this.reductionAmount = data.reductionAmount ?? 0
        this.reductionAmountTaxIncl = data.reductionAmountTaxIncl ?? 0
        this.reductionAmountTaxExcl = data.reductionAmountTaxExcl ?? 0
        this.productQuantityDiscount = data.productQuantityDiscount ?? 0
        this.productEan13 = data.productEan13 ?? ""
        this.productIsbn = data.productIsbn ?? ""
        this.productUpc = data.productUpc ?? ""
        this.productMpn = data.productMpn ?? ""
        this.productReference = data.productReference ?? ""
        this.productSupplierReference = data.productSupplierReference ?? ""
        this.productWeight = data.productWeight ?? 0
        this.taxComputationMethod = data.taxComputationMethod ?? ""
        this.taxRulesGroupId = data.taxRulesGroupId ?? null
        this.ecotax = data.ecotax ?? 0
        this.ecotaxTaxRate = data.ecotaxTaxRate ?? 0
        this.downloadNb = data.downloadNb ?? 0
        this.unitPriceTaxIncl = data.unitPriceTaxIncl ?? 0
        this.unitPriceTaxExcl = data.unitPriceTaxExcl ?? 0
        this.totalPriceTaxIncl = data.totalPriceTaxIncl ?? 0
        this.totalPriceTaxExcl = data.totalPriceTaxExcl ?? 0
        this.totalShippingPriceTaxExcl = data.totalShippingPriceTaxExcl ?? 0
        this.totalShippingPriceTaxIncl = data.totalShippingPriceTaxIncl ?? 0
        this.purchaseSupplierPrice = data.purchaseSupplierPrice ?? 0
        this.originalProductPrice = data.originalProductPrice ?? 0
        this.originalWholesalePrice = data.originalWholesalePrice ?? 0
        this.totalRefundedTaxExcl = data.totalRefundedTaxExcl ?? 0
        this.totalRefundedTaxIncl = data.totalRefundedTaxIncl ?? 0

        if (validate) {
            const missing = []

            if (this.orderId == null) {
                missing.push("orderId")
            }

            if (this.productId == null) {
                missing.push("productId")
            }

            if (this.productQuantity == null) {
                missing.push("productQuantity")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate = true) {
        return new OrderDetail(toXML(JsonData), validate)
    }

    static fromData(data) {
        const obj = Object.create(OrderDetail.prototype)
        Object.assign(obj, data)
        obj.endpoint = "order_details"
        return obj
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        return new OrderDetail(xml)
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new OrderDetail(xml)
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
        const orderDetails = toJSONList(xml)

        return orderDetails.map((orderDetailData) => OrderDetail.fromData(orderDetailData))
    }

    async getByNotApi(fieldName, value = this[fieldName]) {
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v).trim()).filter((s) => s !== "")

        if (normalized.length === 0) return []

        const filter = `&filter[${fieldName}]=![${normalized.join("|")}]`
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orderDetails = toJSONList(xml)
        return orderDetails.map((orderDetailData) => OrderDetail.fromData(orderDetailData))
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update an order detail without an ID")
        }

        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new OrderDetail(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete an order detail without an ID")
        }

        await api.delete(`${this.endpoint}/${this.id}`)
    }

    async getAll(excludeIds = []) {
        const excluded = new Set()

        for (const id of excludeIds ?? []) {
            excluded.add(Number(id))
        }

        const xml = await api.get(`${this.endpoint}?display=full`)
        const orderDetails = toJSONList(xml)

        return orderDetails
            .filter((orderDetailData) => !excluded.has(Number(orderDetailData.id)))
            .map((orderDetailData) => OrderDetail.fromData(orderDetailData))
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
        const orderDetails = toJSONList(xml)
        return orderDetails.map((orderDetailData) => OrderDetail.fromData(orderDetailData))
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
        const orderDetails = toJSONList(xml)
        return orderDetails.map((orderDetailData) => OrderDetail.fromData(orderDetailData))
    }

}

export default OrderDetail
