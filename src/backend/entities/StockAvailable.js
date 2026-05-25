import api from "../utils/api"
import {toJSON, toJSONList, toXML} from "../xml/stockAvailableXML"
import {buildApiFilterQuery} from "../utils/utils"

class StockAvailable {
    endpoint = "stock_availables"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? null
        this.idProduct = data.idProduct ?? null
        this.idProductAttribute = data.idProductAttribute ?? null
        this.idShop = data.idShop ?? null
        this.idShopGroup = data.idShopGroup ?? null
        this.quantity = data.quantity ?? null
        this.dependsOnStock = data.dependsOnStock ?? null
        this.outOfStock = data.outOfStock ?? null
        this.location = data.location ?? ""

        if (validate) {
            const missing = []

            if (this.idProduct == null) {
                missing.push("idProduct")
            }

            if (this.idProductAttribute == null) {
                missing.push("idProductAttribute")
            }

            if (this.quantity == null) {
                missing.push("quantity")
            }

            if (this.dependsOnStock == null) {
                missing.push("dependsOnStock")
            }

            if (this.outOfStock == null) {
                missing.push("outOfStock")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate) {
        return new StockAvailable(toXML(JsonData, validate))
    }

    static fromData(data) {
        const obj = Object.create(StockAvailable.prototype)
        Object.assign(obj, data)
        obj.endpoint = StockAvailable.prototype.endpoint ?? "stock_availables"
        return obj
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        return new StockAvailable(xml)
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new StockAvailable(xml)
    }

    async getByProductAndAttribute(idProduct, idProductAttribute = 0) {
        const productId = Number.parseInt(idProduct, 10)
        const productAttributeId = Number.parseInt(idProductAttribute, 10) || 0

        if (!Number.isFinite(productId) || productId <= 0) {
            throw new Error("ID produit invalide")
        }

        const xml = await api.get(
            `${this.endpoint}?filter[id_product]=[${productId}]&filter[id_product_attribute]=[${productAttributeId}]&display=full`,
        )
        const stockAvailables = toJSONList(xml)
        const match = stockAvailables.find(
            (item) => Number(item?.idProduct) === productId && Number(item?.idProductAttribute ?? 0) === productAttributeId,
        )

        return match ? StockAvailable.fromData(match) : null

    }

    async getAllByProductAndAttribute(idProduct, idProductAttribute = 0) {
        const productId = Number.parseInt(idProduct, 10)
        const productAttributeId = Number.parseInt(idProductAttribute, 10) || 0

        if (!Number.isFinite(productId) || productId <= 0) {
            throw new Error("ID produit invalide")
        }

        const xml = await api.get(
            `${this.endpoint}?filter[id_product]=[${productId}]&filter[id_product_attribute]=[${productAttributeId}]&display=full`,
        )
        const stockAvailables = toJSONList(xml)

        return stockAvailables
            .filter(
                (item) =>
                    Number(item?.idProduct) === productId &&
                    Number(item?.idProductAttribute ?? 0) === productAttributeId,
            )
            .map((item) => StockAvailable.fromData(item))
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
        const stockAvailables = toJSONList(xml)

        return stockAvailables.map((data) => StockAvailable.fromData(data))
    }

    async getByNotApi(fieldName, value = this[fieldName]) {
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v).trim()).filter((s) => s !== "")

        if (normalized.length === 0) return []

        const filter = `&filter[${fieldName}]=![${normalized.join("|")}]`
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const stockAvailables = toJSONList(xml)
        return stockAvailables.map((data) => StockAvailable.fromData(data))
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update a stock available without an ID")
        }

        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new StockAvailable(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete a stock available without an ID")
        }

        await api.delete(`${this.endpoint}/${this.id}`)
    }

    // filtre cote client
    async getAll(excludeIds = []) {
        const excluded = new Set(Array.from(excludeIds ?? [], Number))
        const xml = await api.get(`${this.endpoint}?display=full`)
        const stockAvailables = toJSONList(xml)

        return stockAvailables
            .filter((a) => !excluded.has(Number(a.id)))
            .map((a) => StockAvailable.fromData(a))
    }

    // filtre cote API prestashop
    async getAllFiltered(excludeIds = []) {
        const ids = Array.from(excludeIds ?? [], Number).filter((id) => Number.isFinite(id))
        const filter = ids.length > 0 ? `&filter[id]=![${ids.join("|")}]` : ""
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const stockAvailables = toJSONList(xml)

        return stockAvailables.map((a) => StockAvailable.fromData(a))
    }

    async getExcl(excludeIds = []) {
        const excluded = new Set(Array.from(excludeIds ?? [], Number))
        const all = await this.getAll()
        return all.filter((a) => !excluded.has(Number(a.id)))
    }

    async getIncl(includeIds = []) {
        const included = new Set(Array.from(includeIds ?? [], Number))
        const all = await this.getAll()
        return all.filter((a) => included.has(Number(a.id)))
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
        const stockAvailables = toJSONList(xml)
        return stockAvailables.map((a) => StockAvailable.fromData(a))
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
        const stockAvailables = toJSONList(xml)
        return stockAvailables.map((a) => StockAvailable.fromData(a))
    }
}

export default StockAvailable;