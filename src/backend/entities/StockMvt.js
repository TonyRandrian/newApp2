import api from "../utils/api"
import {toJSON, toJSONList, toXML} from "../xml/stockMvtXML"
import {buildApiFilterQuery, toDate} from "../utils/utils"
import StockAvailable from "./StockAvailable.js";

class StockMvt {
    endpoint = "stock_movements"

    static stockEntryReasonIds = [1, 10]
    static stockEntrySign = 1
    static stockExitReasonIds = [2, 3]
    static stockExitSign = -1

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? null
        this.idProduct = data.idProduct ?? null
        this.idProductAttribute = data.idProductAttribute ?? null
        this.idWarehouse = data.idWarehouse ?? null
        this.idCurrency = data.idCurrency ?? null
        this.managementType = data.managementType ?? ""
        this.idEmployee = data.idEmployee ?? 1
        this.idStock = data.idStock ?? 0
        this.idStockMvtReason = data.idStockMvtReason ?? null
        this.idOrder = data.idOrder ?? 0
        this.idSupplyOrder = data.idSupplyOrder ?? 0
        this.productName = data.productName ?? ""
        this.ean13 = data.ean13 ?? ""
        this.upc = data.upc ?? ""
        this.reference = data.reference ?? ""
        this.mpn = data.mpn ?? ""
        this.physicalQuantity = data.physicalQuantity ?? null
        this.sign = data.sign ?? 1
        this.lastWa = data.lastWa ?? null
        this.currentWa = data.currentWa ?? null
        this.priceTe = data.priceTe ?? 0
        this.dateAdd = data.dateAdd ?? ""

        if (validate) {
            const requiredFields = [
                ["idEmployee", this.idEmployee],
                ["idStock", this.idStock],
                ["idStockMvtReason", this.idStockMvtReason],
                ["physicalQuantity", this.physicalQuantity],
                ["dateAdd", this.dateAdd],
            ]
            const missing = requiredFields
                .filter(([, value]) => value == null || value === "")
                .map(([fieldName]) => fieldName)

            if (missing.length > 0) {
                console.error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate) {
        return new StockMvt(toXML(JsonData, validate))
    }

    static fromData(data) {
        const obj = Object.create(StockMvt.prototype)
        Object.assign(obj, data)
        obj.endpoint = StockMvt.prototype.endpoint ?? "stock_movements"
        return obj
    }

    async save() {
        const sa = new StockAvailable({}, false);
        const stockAvailables = await sa.getAllByProductAndAttribute(this.idProduct, this.idProductAttribute);

        this.idStock = stockAvailables[0].id;

        const xml = await api.post(this.endpoint, toXML(this))
        const created = new StockMvt(xml)

        if (this.dateAdd && created.id) {
            const reloaded = await created.getById(created.id)
            reloaded.dateAdd = this.dateAdd
            try {
                return await reloaded.update()
            } catch (error) {
                console.warn("Failed to update stock movement date after insert:", error)
                return created
            }
        }

        return created
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new StockMvt(xml)
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
        const stockMvts = toJSONList(xml)

        return stockMvts.map((data) => StockMvt.fromData(data))
    }

    async getByNotApi(fieldName, value = this[fieldName]) {
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v).trim()).filter((s) => s !== "")

        if (normalized.length === 0) return []

        const filter = `&filter[${fieldName}]=![${normalized.join("|")}]`
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const stockMvts = toJSONList(xml)
        return stockMvts.map((data) => StockMvt.fromData(data))
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update a stock movement without an ID")
        }

        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new StockMvt(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete a stock movement without an ID")
        }

        await api.delete(`${this.endpoint}/${this.id}`)
    }

    // filtre cote client
    async getAll(excludeIds = []) {
        const excluded = new Set(Array.from(excludeIds ?? [], Number))
        const xml = await api.get(`${this.endpoint}?display=full`)
        const stockMvts = toJSONList(xml)

        return stockMvts
            .filter((a) => !excluded.has(Number(a.id)))
            .map((a) => StockMvt.fromData(a))
    }

    // filtre cote API prestashop
    async getAllFiltered(excludeIds = []) {
        const ids = Array.from(excludeIds ?? [], Number).filter((id) => Number.isFinite(id))
        const filter = ids.length > 0 ? `&filter[id]=![${ids.join("|")}]` : ""
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const stockMvts = toJSONList(xml)

        return stockMvts.map((a) => StockMvt.fromData(a))
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
        const stockMvts = toJSONList(xml)
        return stockMvts.map((a) => StockMvt.fromData(a))
    }

    async getAllByProductAndAttribute(idProduct, idProductAttribute = 0) {
        const productId = Number.parseInt(idProduct, 10)
        const productAttributeId = Number.parseInt(idProductAttribute, 10) || 0

        if (!Number.isFinite(productId) || productId <= 0) {
            throw new Error("ID produit invalide")
        }

        const sa = new StockAvailable({}, false)
        const stockAvailables = await sa.getAllByProductAndAttribute(productId, productAttributeId)

        if (!stockAvailables || stockAvailables.length === 0) {
            return []
        }

        const stockIds = stockAvailables
            .map((s) => Number(s.id))
            .filter((id) => Number.isFinite(id) && id > 0)

        if (stockIds.length === 0) {
            return []
        }

        const xml = await api.get(
            `${this.endpoint}?filter[id_stock]=[${stockIds.join("|")}]&display=full`,
        )
        const stockMvts = toJSONList(xml)

        return stockMvts
            .filter((item) => stockIds.includes(Number(item?.idStock)))
            .map((item) => StockMvt.fromData(item))
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
        const stockMvts = toJSONList(xml)
        return stockMvts.map((a) => StockMvt.fromData(a))
    }

    /**
     * Filters stock movements by date range (inclusive) using dateAdd.
     * @param {Array<object>} list
     * @param {string|Date} dateMin
     * @param {string|Date} dateMax
     * @returns {Array<object>}
     */
    static filterByDateRange(list = [], dateMin, dateMax) {
        if (!Array.isArray(list) || list.length === 0) return []
        if (!dateMin && !dateMax) return list

        const minDate = toDate(dateMin ?? "")
        const maxDate = toDate(dateMax ?? "")

        return list.filter((mvt) => {
            const movementDate = toDate(mvt?.dateAdd ?? "")
            if (!(movementDate instanceof Date) || Number.isNaN(movementDate.getTime())) {
                return false
            }

            if (minDate instanceof Date && !Number.isNaN(minDate.getTime())) {
                const minBound = new Date(minDate)
                minBound.setHours(0, 0, 0, 0)
                if (movementDate < minBound) return false
            }

            if (maxDate instanceof Date && !Number.isNaN(maxDate.getTime())) {
                const maxBound = new Date(maxDate)
                maxBound.setHours(23, 59, 59, 999)
                if (movementDate > maxBound) return false
            }

            return true
        })
    }
}

export default StockMvt;