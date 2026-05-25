import api from "../utils/api"
import { toJSON, toJSONList, toXML } from "../xml/taxRuleXML"
import { buildApiFilterQuery } from "../utils/utils"

class TaxRule {
    endpoint = "tax_rules"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? null
        this.idTaxRulesGroup = data.idTaxRulesGroup ?? null
        this.idState = data.idState ?? null
        this.idCountry = data.idCountry ?? null
        this.zipcodeFrom = data.zipcodeFrom ?? ""
        this.zipcodeTo = data.zipcodeTo ?? ""
        this.idTax = data.idTax ?? null
        this.behavior = data.behavior ?? null
        this.description = data.description ?? ""

        if (validate) {
            const missing = [];

            if (this.idTaxRulesGroup == null) {
                missing.push("idTaxRulesGroup");
            }

            if (this.idCountry == null) {
                missing.push("idCountry");
            }

            if (this.idTax == null) {
                missing.push("idTax");
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`);
            }
        }
        
    }

    static fromJSON(JsonData, validate = true) {
        return new TaxRule(toXML(JsonData), validate)
    }

    static fromData(data) {
        const taxRule = Object.create(TaxRule.prototype)
        Object.assign(taxRule, data)
        taxRule.endpoint = TaxRule.prototype.endpoint ?? "tax_rules"
        return taxRule
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        return new TaxRule(xml)
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new TaxRule(xml)
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
        const taxRules = toJSONList(xml)

        return taxRules.map((data) => TaxRule.fromData(data))
    }

    async getByNotApi(fieldName, value = this[fieldName]) {
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v).trim()).filter((s) => s !== "")

        if (normalized.length === 0) return []

        const filter = `&filter[${fieldName}]=![${normalized.join("|")}]`
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const taxRules = toJSONList(xml)
        return taxRules.map((data) => TaxRule.fromData(data))
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update a tax rule without an ID")
        }

        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new TaxRule(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete a tax rule without an ID")
        }

        await api.delete(`${this.endpoint}/${this.id}`)
    }

    // filtre cote client
    async getAll(excludeIds = []) {
        const excluded = new Set((excludeIds ?? []).map((id) => Number(id)))
        const xml = await api.get(`${this.endpoint}?display=full`)
        const taxRules = toJSONList(xml)

        return taxRules
            .filter((a) => !excluded.has(Number(a.id)))
            .map((a) => TaxRule.fromData(a))
    }

    // filtre cote API prestashop
    async getAllFiltered(excludeIds = []) {
        const ids = (excludeIds ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
        const filter = ids.length > 0 ? `&filter[id]=![${ids.join("|")}]` : ""
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const taxRules = toJSONList(xml)

        return taxRules.map((a) => TaxRule.fromData(a))
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
        const taxRules = toJSONList(xml)
        return taxRules.map((a) => TaxRule.fromData(a))
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
        const taxRules = toJSONList(xml)
        return taxRules.map((a) => TaxRule.fromData(a))
    }

    async getByGroupId(groupId) {
        const xml = await api.get(`${this.endpoint}?filter[id_tax_rules_group]=${groupId}&display=full`);
        return new TaxRule(xml);
    }
}

export default TaxRule;