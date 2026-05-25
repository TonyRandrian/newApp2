import api from "../utils/api"
import { toJSON, toJSONList, toXML } from "../xml/productOptionXML"

class ProductOption {
	endpoint = "product_options"

	constructor(xml, validate = true) {
		const data = toJSON(xml) || {}

		this.id = data.id ?? null
		this.isColorGroup = data.isColorGroup ?? null
		this.groupType = data.groupType ?? ""
		this.position = data.position ?? null
		this.name = data.name ?? []
		this.publicName = data.publicName ?? []
		this.associations = data.associations ?? {
			productOptionValues: [],
		}

		if (validate) {
			const missing = []
			const hasName =
				Array.isArray(this.name) &&
				this.name.some((lang) => (lang?.value ?? "").trim() !== "")
			const hasPublicName =
				Array.isArray(this.publicName) &&
				this.publicName.some((lang) => (lang?.value ?? "").trim() !== "")

			if (!this.groupType) {
				missing.push("groupType")
			}

			if (!hasName) {
				missing.push("name")
			}

			if (!hasPublicName) {
				missing.push("publicName")
			}

			if (missing.length > 0) {
				throw new Error(`Missing required fields: ${missing.join(", ")}`)
			}
		}
	}

	static fromJSON(JsonData, validate = true) {
		return new ProductOption(toXML(JsonData), validate)
	}

	static fromData(data) {
		const option = Object.create(ProductOption.prototype)
		Object.assign(option, data)
		option.endpoint = ProductOption.prototype.endpoint ?? "product_options"
		return option
	}

	async save() {
		const xml = await api.post(this.endpoint, toXML(this))
		return new ProductOption(xml)
	}

	async getById(id) {
		const xml = await api.get(`${this.endpoint}/${id}`)
		return new ProductOption(xml)
	}

	async update() {
		if (!this.id) {
			throw new Error("Cannot update a product option without an ID")
		}

		const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
		return new ProductOption(xml)
	}

	async delete() {
		if (!this.id) {
			throw new Error("Cannot delete a product option without an ID")
		}

		await api.delete(`${this.endpoint}/${this.id}`)
	}

	async getAll() {
		const xml = await api.get(`${this.endpoint}?display=full`)
		const options = toJSONList(xml)
		return options.map((optionData) => new ProductOption(toXML(optionData)))
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

export default ProductOption
