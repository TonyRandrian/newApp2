import api from "../utils/api"
import { toJSON, toJSONList, toXML } from "../xml/combinationXML"

class Combination {
    endpoint = "combinations"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? null
        this.productId = data.productId ?? null
        this.ean13 = data.ean13 ?? ""
        this.isbn = data.isbn ?? ""
        this.upc = data.upc ?? ""
        this.mpn = data.mpn ?? ""
        this.reference = data.reference ?? ""
        this.supplierReference = data.supplierReference ?? ""
        this.location = data.location ?? ""
        this.wholesalePrice = data.wholesalePrice ?? 0
        this.priceImpact = data.priceImpact ?? 0
        this.ecotax = data.ecotax ?? 0
        this.weight = data.weight ?? 0
        this.unitPriceImpact = data.unitPriceImpact ?? 0
        this.minimalQuantity = data.minimalQuantity ?? 1
        this.lowStockThreshold = data.lowStockThreshold ?? 0
        this.lowStockAlert = data.lowStockAlert ?? 0
        this.defaultOn = data.defaultOn ?? 0
        this.availableDate = data.availableDate ?? "0000-00-00"
        this.availableNow = data.availableNow ?? ""
        this.availableLater = data.availableLater ?? ""
        this.optionValueIds = data.optionValueIds ?? []
        this.imageIds = data.imageIds ?? []

        if (validate) {
            const missing = []

            if (!this.productId) {
                missing.push("productId")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate = true) {
        return new Combination(toXML(JsonData), validate)
    }

    static fromData(data) {
        const combination = Object.create(Combination.prototype)
        Object.assign(combination, data)
        combination.endpoint = Combination.prototype.endpoint ?? "combinations"
        return combination
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        return new Combination(xml)
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new Combination(xml)
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update a combination without an ID")
        }

        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new Combination(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete a combination without an ID")
        }

        await api.delete(`${this.endpoint}/${this.id}`)
    }

    async getByProductId(productId) {
        const xml = await api.get(`${this.endpoint}?filter[id_product]=${productId}&display=full`)
        const combinations = toJSONList(xml)
        return combinations.map((data) => Combination.fromData(data))
    }
    
    async getAll() {
        const xml = await api.get(`${this.endpoint}?display=full`)
        const combos = toJSONList(xml)

        return combos.map((c) => Combination.fromData(c))
    }

    async getExcl(excludeIds = []) {
        const excluded = new Set((excludeIds ?? []).map((id) => Number(id)))
        const all = await this.getAll()
        return all.filter((c) => !excluded.has(Number(c.id)))
    }

    async getIncl(includeIds = []) {
        const included = new Set((includeIds ?? []).map((id) => Number(id)))
        const all = await this.getAll()
        return all.filter((c) => included.has(Number(c.id)))
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
        const combos = toJSONList(xml)
        return combos.map((c) => Combination.fromData(c))
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
        const combos = toJSONList(xml)
        return combos.map((c) => Combination.fromData(c))
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

}

export default Combination
