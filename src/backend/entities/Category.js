import api from "../utils/api"
import { toJSON, toJSONList, toXML } from "../xml/categoryXML"

class Category {
    endpoint = "categories"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? null
        this.parentId = data.parentId ?? 2
        this.levelDepth = data.levelDepth ?? null
        this.nbProductsRecursive = data.nbProductsRecursive ?? null
        this.active = data.active ?? 1
        this.idShopDefault = data.idShopDefault ?? 1
        this.isRootCategory = data.isRootCategory ?? 0
        this.position = data.position ?? 0
        this.dateAdd = data.dateAdd ?? null
        this.dateUpd = data.dateUpd ?? null
        this.name = data.name ?? ""
        this.slug = data.slug ?? ""
        this.description = data.description ?? ""
        this.metaTitle = data.metaTitle ?? ""
        this.metaDescription = data.metaDescription ?? ""
        this.metaKeywords = data.metaKeywords ?? ""

        if (validate) {
            const missing = []

            if (!this.name) {
                missing.push("name")
            }

            if (!this.slug) {
                missing.push("slug")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate) {
        return new Category(toXML(JsonData, validate))
    }

    static fromData(data) {
        const obj = Object.create(Category.prototype)
        Object.assign(obj, data)
        obj.endpoint = Category.prototype.endpoint ?? "categories"
        return obj
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        const created = new Category(xml)
        if (this.dateAdd && created.id) {
            const reloaded = await created.getById(created.id)
            reloaded.dateAdd = this.dateAdd
            try {
                return await reloaded.update()
            } catch (error) {
                console.warn("Failed to update category date after insert:", error)
                return created
            }
        }
        return created
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new Category(xml)
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update a category without an ID")
        }

        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new Category(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete a category without an ID")
        }

        await api.delete(`${this.endpoint}/${this.id}`)
    }

    async getAll() {
        const xml = await api.get(`${this.endpoint}?display=full`)
        const categories = toJSONList(xml)

        return categories.map((c) => Category.fromData(c))
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
        const categories = toJSONList(xml)
        return categories.map((c) => Category.fromData(c))
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
        const categories = toJSONList(xml)
        return categories.map((c) => Category.fromData(c))
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

export default Category
