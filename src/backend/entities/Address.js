import api from "../utils/api"
import { toJSON, toJSONList, toXML } from "../xml/addressXML"

class Address {
    endpoint = "addresses"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? null
        this.idCustomer = data.idCustomer ?? null
        this.idManufacturer = data.idManufacturer ?? null
        this.idSupplier = data.idSupplier ?? null
        this.idWarehouse = data.idWarehouse ?? null
        this.idCountry = data.idCountry ?? null
        this.idState = data.idState ?? null
        this.alias = data.alias ?? ""
        this.company = data.company ?? ""
        this.lastname = data.lastname ?? ""
        this.firstname = data.firstname ?? ""
        this.vatNumber = data.vatNumber ?? ""
        this.address1 = data.address1 ?? ""
        this.address2 = data.address2 ?? ""
        this.postcode = data.postcode ?? ""
        this.city = data.city ?? ""
        this.other = data.other ?? ""
        this.phone = data.phone ?? ""
        this.phoneMobile = data.phoneMobile ?? ""
        this.dni = data.dni ?? ""
        this.deleted = data.deleted ?? null
        this.dateAdd = data.dateAdd ?? null
        this.dateUpd = data.dateUpd ?? null

        if (validate) {
            const missing = []

            if (this.idCountry == null) {
                missing.push("idCountry")
            }

            if (!this.alias) {
                missing.push("alias")
            }

            if (!this.lastname) {
                missing.push("lastname")
            }

            if (!this.firstname) {
                missing.push("firstname")
            }

            if (!this.address1) {
                missing.push("address1")
            }

            if (!this.city) {
                missing.push("city")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate) {
        return new Address(toXML(JsonData, validate))
    }

    static fromData(data) {
        const obj = Object.create(Address.prototype)
        Object.assign(obj, data)
        obj.endpoint = Address.prototype.endpoint ?? "addresses"
        return obj
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        const created = new Address(xml)
        if (this.dateAdd && created.id) {
            const reloaded = await created.getById(created.id)
            reloaded.dateAdd = this.dateAdd
            try {
                return await reloaded.update()
            } catch (error) {
                console.warn("Failed to update address date after insert:", error)
                return created
            }
        }
        return created
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new Address(xml)
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update an address without an ID")
        }

        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new Address(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete an address without an ID")
        }

        await api.delete(`${this.endpoint}/${this.id}`)
    }

    async getAll(excludeIds = []) {
        const excluded = new Set((excludeIds ?? []).map((id) => Number(id)))
        const xml = await api.get(`${this.endpoint}?display=full`)
        const addresses = toJSONList(xml)

        return addresses
            .filter((a) => !excluded.has(Number(a.id)))
            .map((a) => Address.fromData(a))
    }

    async getAllFiltered(excludeIds = []) {
        const ids = (excludeIds ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
        const filter = ids.length > 0 ? `&filter[id]=![${ids.join("|")}]` : ""
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const addresses = toJSONList(xml)

        return addresses.map((a) => Address.fromData(a))
    }

    async getExcl(excludeIds = []) {
        const excluded = new Set((excludeIds ?? []).map((id) => Number(id)))
        const all = await this.getAll()
        return all.filter((a) => !excluded.has(Number(a.id)))
    }

    async getIncl(includeIds = []) {
        const included = new Set((includeIds ?? []).map((id) => Number(id)))
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
        const addresses = toJSONList(xml)
        return addresses.map((a) => Address.fromData(a))
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
        const addresses = toJSONList(xml)
        return addresses.map((a) => Address.fromData(a))
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

export default Address;