import api from "../utils/api"
import {toJSON, toJSONList, toXML} from "../xml/customerXML"
import { buildApiFilterQuery } from "../utils/utils"
import Address from "./Address"

class Customer {
    endpoint = "customers"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? null
        this.idDefaultGroup = data.idDefaultGroup ?? 3
        this.idLang = data.idLang ?? 1
        this.newsletterDateAdd = data.newsletterDateAdd ?? null
        this.ipRegistrationNewsletter = data.ipRegistrationNewsletter ?? ""
        this.lastPasswdGen = data.lastPasswdGen ?? null
        this.secureKey = data.secureKey ?? ""
        this.deleted = data.deleted ?? 0
        this.password = data.password ?? ""
        this.lastname = data.lastname ?? ""
        this.firstname = data.firstname ?? ""
        this.email = data.email ?? ""
        this.idGender = data.idGender ?? null
        this.birthday = data.birthday ?? null
        this.newsletter = data.newsletter ?? 0
        this.optin = data.optin ?? 0
        this.website = data.website ?? ""
        this.company = data.company ?? ""
        this.siret = data.siret ?? ""
        this.ape = data.ape ?? ""
        this.outstandingAllowAmount = data.outstandingAllowAmount ?? null
        this.showPublicPrices = data.showPublicPrices ?? 0
        this.idRisk = data.idRisk ?? 0
        this.maxPaymentDays = data.maxPaymentDays ?? 0
        this.active = data.active ?? 1
        this.note = data.note ?? ""
        this.isGuest = data.isGuest ?? 0
        this.idShop = data.idShop ?? 1
        this.idShopGroup = data.idShopGroup ?? 1
        this.dateAdd = data.dateAdd ?? null
        this.dateUpd = data.dateUpd ?? null
        this.resetPasswordToken = data.resetPasswordToken ?? ""
        this.resetPasswordValidity = data.resetPasswordValidity ?? null
        this.groupIds = data.groupIds ?? []

        if (validate) {
            const missing = []

            if (!this.password) {
                missing.push("password")
            }

            if (!this.lastname) {
                missing.push("lastname")
            }

            if (!this.firstname) {
                missing.push("firstname")
            }

            if (!this.email) {
                missing.push("email")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate) {
        return new Customer(toXML(JsonData ,validate))
    }

    static fromData(data) {
        const customer = Object.create(Customer.prototype)
        Object.assign(customer, data)
        customer.endpoint = Customer.prototype.endpoint ?? "customers"
        return customer
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        const created = new Customer(xml)

        if (this.dateAdd && created.id) {
            const reloaded = await created.getById(created.id)
            reloaded.dateAdd = this.dateAdd
            try {
                return await reloaded.update()
            } catch (error) {
                console.warn("Failed to update customer date after insert:", error)
                return created
            }
        }

        return created
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new Customer(xml)
    }

    async getByApi(fieldName, value = this[fieldName]) {
        const filter = buildApiFilterQuery(fieldName, value)

        if (!filter) {
            return []
        }

        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const customers = toJSONList(xml)

        return customers.map((customerData) => Customer.fromData(customerData))
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update a customer without an ID")
        }

        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new Customer(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete a customer without an ID")
        }

        await api.delete(`${this.endpoint}/${this.id}`)
    }

    // filtre côté client
    async getAll(excludeIds = []) {
        const excluded = new Set((excludeIds ?? []).map(Number))
        const xml = await api.get(`${this.endpoint}?display=full`)
        const customers = toJSONList(xml)

        return customers
            .filter((customerData) => !excluded.has(Number(customerData.id)))
            .map((customerData) => Customer.fromData(customerData))
    }

    // filtre côté API prestashop
    async getAllFiltered(excludeIds = []) {
        const ids = (excludeIds ?? []).map(Number).filter((id) => Number.isFinite(id))
        const filter = ids.length > 0 ? `&filter[id]=![${ids.join("|")}]` : ""
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const customers = toJSONList(xml)

        return customers.map((customerData) => Customer.fromData(customerData))
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

    async getByNotApi(fieldName, value = this[fieldName]) {
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v).trim()).filter((s) => s !== "")

        if (normalized.length === 0) return []

        const filter = `&filter[${fieldName}]=![${normalized.join("|")}]`
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const customers = toJSONList(xml)
        return customers.map((data) => Customer.fromData(data))
    }

    async getAddress() {
        const addressApi = new Address({}, false)
        const address = await addressApi.getBy("idCustomer", this.id)
        return address
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
        const Customers = toJSONList(xml)
        return Customers.map((CustomerData) => Customer.fromData(CustomerData))
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
        const Customers = toJSONList(xml)
        return Customers.map((CustomerData) => Customer.fromData(CustomerData))
    }
}

export default Customer
