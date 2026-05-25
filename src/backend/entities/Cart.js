import api from "../utils/api"
import { toJSON, toJSONList, toXML } from "../xml/cartXML"
import { buildApiFilterQuery } from "../utils/utils"

class Cart {
	endpoint = "carts"

	constructor(xml, validate = true) {
		const data = typeof xml === "string" ? (toJSON(xml) || {}) : (xml || {})

		this.id = data.id ?? null
		this.customerId = data.customerId ?? null
		this.idGuest = data.idGuest ?? null
		this.addressDeliveryId = data.addressDeliveryId ?? null
		this.addressInvoiceId = data.addressInvoiceId ?? null
		this.currencyId = data.currencyId ?? null
		this.langId = data.langId ?? null
		this.carrierId = data.carrierId ?? null
		this.shopId = data.shopId ?? null
		this.shopGroupId = data.shopGroupId ?? null
		this.secureKey = data.secureKey ?? ""
		this.recyclable = data.recyclable ?? 0
		this.gift = data.gift ?? 0
		this.giftMessage = data.giftMessage ?? ""
		this.mobileTheme = data.mobileTheme ?? 0
		this.deliveryOption = data.deliveryOption ?? ""
		this.allowSeperatedPackage = data.allowSeperatedPackage ?? 0
		this.dateAdd = data.dateAdd ?? null
		this.dateUpd = data.dateUpd ?? null
		this.cartRows = data.cartRows ?? []

		if (validate) {
			const missing = []

			if (this.customerId == null) {
				missing.push("customerId")
			}

			if (this.addressDeliveryId == null) {
				missing.push("addressDeliveryId")
			}

			if (this.addressInvoiceId == null) {
				missing.push("addressInvoiceId")
			}

			if (this.currencyId == null) {
				missing.push("currencyId")
			}

			if (this.langId == null) {
				missing.push("langId")
			}

			if (this.carrierId == null) {
				missing.push("carrierId")
			}

			if (missing.length > 0) {
				throw new Error(`Missing required fields: ${missing.join(", ")}`)
			}
		}
	}

	static fromJSON(JsonData, validate) {
		return new Cart(toXML(JsonData, validate))
	}

	static fromData(data) {
		const obj = Object.create(Cart.prototype)
		Object.assign(obj, data)
		obj.endpoint = Cart.prototype.endpoint ?? "carts"
		return obj
	}

	async save() {
		const xml = await api.post(this.endpoint, toXML(this))
		const created = new Cart(xml)
		if (this.dateAdd && created.id) {
			const reloaded = await created.getById(created.id)
			reloaded.dateAdd = this.dateAdd
			reloaded.cartRows = []
			try {
				return await reloaded.update()
			} catch (error) {
				console.warn("Failed to update cart date after insert:", error)
				return created
			}
		}
		return created
	}

	async getById(id) {
		const xml = await api.get(`${this.endpoint}/${id}`)
		return new Cart(xml)
	}

	async update() {
		if (!this.id) {
			throw new Error("Cannot update a cart without an ID")
		}

		const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
		return new Cart(xml)
	}

	async patch() {
		if (!this.id) {
			throw new Error("Cannot patch a cart without an ID")
		}

		const xml = await api.patch(`${this.endpoint}/${this.id}`, toXML(this))
		return new Cart(xml)
	}

	async delete() {
		if (!this.id) {
			throw new Error("Cannot delete a cart without an ID")
		}

		await api.delete(`${this.endpoint}/${this.id}`)
	}

	async getAll() {
		const xml = await api.get(`${this.endpoint}?display=full`)
		const carts = toJSONList(xml)

		return carts.map((c) => Cart.fromData(c))
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
		const carts = toJSONList(xml)
		return carts.map((c) => Cart.fromData(c))
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
		const carts = toJSONList(xml)
		return carts.map((c) => Cart.fromData(c))
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

	async getByApi(fieldName, value = this[fieldName]) {
		const filter = buildApiFilterQuery(fieldName, value)

		if (!filter) {
			return []
		}

		const xml = await api.get(`${this.endpoint}?display=full${filter}`)
		const carts = toJSONList(xml)

		return carts.map((c) => Cart.fromData(c))
	}

	async getByNot(fieldName, value = this[fieldName]) {
        // client-side inverse filter: fetch all and exclude matching items
        if (value === undefined || value === null || value === "") return await this.getAll()
        const all = await this.getAll()
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v))

        return all.filter((item) => {
            const v = item[fieldName]
            // if the item has no such field, keep it (it's not matching)
            if (v === undefined || v === null) return true
            if (Array.isArray(v)) return !v.map(String).some((iv) => normalized.includes(iv))
            return !normalized.includes(String(v))
        })
    }
}


export default Cart
