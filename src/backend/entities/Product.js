import api from "../utils/api"
import {toJSON, toJSONList, toXML} from "../xml/productXML"
import ProductOptionValue from "./ProductOptionValue"
import TaxRule from "./TaxRule"
import Tax from "./Tax"
import Combination from "./Combination"
import StockAvailable from "./StockAvailable"
import Category from "./Category"
import {buildApiFilterQuery} from "../utils/utils.js";
import Order from "./Order.js";

const buildImageUrl = (productId, imageId) => {
    const baseUrl = import.meta.env.VITE_PRESTASHOP_BACKEND_URL || ""
    const apiKey = import.meta.env.VITE_PRESTASHOP_API_KEY
    const url = `${baseUrl}api/images/products/${productId}/${imageId}`
    return apiKey ? `${url}?ws_key=${apiKey}` : url
}

class Product {
    endpoint = "products"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.id = data.id ?? null
        this.idManufacturer = data.idManufacturer ?? 0
        this.idSupplier = data.idSupplier ?? 0
        this.idCategoryDefault = data.idCategoryDefault ?? null
        this.isNew = data.isNew ?? 0
        this.cacheDefaultAttribute = data.cacheDefaultAttribute ?? 0
        this.idDefaultImage = data.idDefaultImage ?? null
        this.idDefaultCombination = data.idDefaultCombination ?? null
        this.idTaxRulesGroup = data.idTaxRulesGroup ?? 1
        this.positionInCategory = data.positionInCategory ?? 0
        this.manufacturerName = data.manufacturerName ?? ""
        this.quantity = data.quantity ?? 0
        this.type = data.type ?? "simple"
        this.idShopDefault = data.idShopDefault ?? 1
        this.reference = data.reference ?? ""
        this.supplierReference = data.supplierReference ?? ""
        this.location = data.location ?? ""
        this.width = data.width ?? 0
        this.height = data.height ?? 0
        this.depth = data.depth ?? 0
        this.weight = data.weight ?? 0
        this.quantityDiscount = data.quantityDiscount ?? 0
        this.ean13 = data.ean13 ?? ""
        this.isbn = data.isbn ?? ""
        this.upc = data.upc ?? ""
        this.mpn = data.mpn ?? ""
        this.cacheIsPack = data.cacheIsPack ?? 0
        this.cacheHasAttachments = data.cacheHasAttachments ?? 0
        this.isVirtual = data.isVirtual ?? 0
        this.state = data.state ?? 1
        this.additionalDeliveryTimes = data.additionalDeliveryTimes ?? 0
        this.deliveryInStock = data.deliveryInStock ?? []
        this.deliveryOutStock = data.deliveryOutStock ?? []
        this.productType = data.productType ?? "standard"
        this.onSale = data.onSale ?? 0
        this.onlineOnly = data.onlineOnly ?? 0
        this.ecotax = data.ecotax ?? 0
        this.minimalQuantity = data.minimalQuantity ?? 1
        this.lowStockThreshold = data.lowStockThreshold ?? null
        this.lowStockAlert = data.lowStockAlert ?? 0
        this.price = data.price ?? null
        this.wholesalePrice = data.wholesalePrice ?? 0
        this.unity = data.unity ?? ""
        this.unitPrice = data.unitPrice ?? 0
        this.unitPriceRatio = data.unitPriceRatio ?? 0
        this.additionalShippingCost = data.additionalShippingCost ?? 0
        this.customizable = data.customizable ?? 0
        this.textFields = data.textFields ?? 0
        this.uploadableFiles = data.uploadableFiles ?? 0
        this.active = data.active ?? 1
        this.redirectType = data.redirectType ?? "404"
        this.idTypeRedirected = data.idTypeRedirected ?? 0
        this.availableForOrder = data.availableForOrder ?? 1
        this.availableDate = data.availableDate ?? null
        this.showCondition = data.showCondition ?? 0
        this.condition = data.condition ?? "new"
        this.showPrice = data.showPrice ?? 1
        this.indexed = data.indexed ?? 1
        this.visibility = data.visibility ?? "both"
        this.advancedStockManagement = data.advancedStockManagement ?? 0
        this.dateAdd = data.dateAdd ?? null
        this.dateUpd = data.dateUpd ?? null
        this.packStockType = data.packStockType ?? 3
        this.metaDescription = data.metaDescription ?? []
        this.metaKeywords = data.metaKeywords ?? []
        this.metaTitle = data.metaTitle ?? []
        this.linkRewrite = data.linkRewrite ?? []
        this.name = data.name ?? []
        this.description = data.description ?? []
        this.descriptionShort = data.descriptionShort ?? []
        this.availableNow = data.availableNow ?? []
        this.availableLater = data.availableLater ?? []
        this.associations = data.associations ?? {
            categories: [],
            images: [],
            combinations: [],
            productOptionValues: [],
            productFeatures: [],
            tags: [],
            stockAvailables: [],
            attachments: [],
            accessories: [],
            productBundle: [],
        }

        if (validate) {
            const missing = []

            if (this.price == null) {
                missing.push("price")
            }

            if (this.idCategoryDefault == null) {
                missing.push("idCategoryDefault")
            }

            const hasName = Array.isArray(this.name) && this.name.some((lang) => lang?.value)
            if (!hasName) {
                missing.push("name")
            }

            const hasLinkRewrite =
                Array.isArray(this.linkRewrite) && this.linkRewrite.some((lang) => lang?.value)
            if (!hasLinkRewrite) {
                missing.push("linkRewrite")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate = true) {
        return new Product(toXML(JsonData), validate)
    }

    static pickLang(field, langId = 1) {
        if (!Array.isArray(field)) return ""
        const match = field.find((l) => l?.id === langId)
        return match?.value ?? field[0]?.value ?? ""
    }

    static fromData(data) {
        const product = Object.create(Product.prototype)
        Object.assign(product, data)
        product.endpoint = Product.prototype.endpoint ?? "products"
        return product
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        const created = new Product(xml)
        if (this.dateAdd && created.id) {
            const reloaded = await created.getById(created.id)
            reloaded.dateAdd = this.dateAdd
            try {
                return await reloaded.update()
            } catch (error) {
                console.warn("Failed to update product date after insert:", error)
                return created
            }
        }
        return created
    }

    async getById(id) {
        const xml = await api.get(`${this.endpoint}/${id}`)
        return new Product(xml)
    }

    async update() {
        if (!this.id) {
            throw new Error("Cannot update a product without an ID")
        }

        const xml = await api.put(`${this.endpoint}/${this.id}`, toXML(this))
        return new Product(xml)
    }

    async delete() {
        if (!this.id) {
            throw new Error("Cannot delete a product without an ID")
        }

        await api.delete(`${this.endpoint}/${this.id}`)
    }

    async getAll() {
        const xml = await api.get(`${this.endpoint}?display=full`)
        const products = toJSONList(xml)
        return products.map((productData) => Product.fromData(productData))
    }

    async getByCategory(categoryId) {
        const xml = await api.get(`${this.endpoint}?filter[id_category_default]=[${categoryId}]&display=full`)
        const products = toJSONList(xml)
        return products.map((productData) => Product.fromData(productData))
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

    async getExcl(excludeIds = []) {
        const excluded = new Set((excludeIds ?? []).map((id) => Number(id)))
        const all = await this.getAll()
        return all.filter((p) => !excluded.has(Number(p.id)))
    }

    async getIncl(includeIds = []) {
        const included = new Set((includeIds ?? []).map((id) => Number(id)))
        const all = await this.getAll()
        return all.filter((p) => included.has(Number(p.id)))
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
        const products = toJSONList(xml)
        return products.map((p) => Product.fromData(p))
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
        const products = toJSONList(xml)
        return products.map((p) => Product.fromData(p))
    }

    // filtre côté API prestashop
    async getAllFiltered(excludeIds = []) {
        const ids = (excludeIds ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
        const filter = ids.length > 0 ? `&filter[id]=![${ids.join("|")}]` : ""
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const products = toJSONList(xml)

        return products.map((productData) => Product.fromData(productData))
    }

    async getTax() {
        if (this.idTaxRulesGroup) {
            const taxRuleApi = new TaxRule({}, false);
            const taxRule = await taxRuleApi.getByGroupId(this.idTaxRulesGroup);
            const taxAPI = new Tax({}, false);
            const tax = await taxAPI.getById(taxRule.idTax)
            return tax.rate;
        }
        return 0;
    }

    async getTtcPrice() {
        const taxRate = await this.getTax();
        const price = Number(this.price);
        if (!Number.isFinite(price)) {
            return NaN;
        }
        const safeRate = Number.isFinite(Number(taxRate)) ? Number(taxRate) : 0;
        return price * (1 + safeRate / 100);
    }

    async getDeclinaisonPrice(idProductOptionValue) {
        const combinationAPI = new Combination({}, false);
        const combinations = await combinationAPI.getByProductId(this.id);
        const targetId = String(idProductOptionValue);
        for (const combination of combinations) {
            if (combination.optionValueIds.map(String).includes(targetId)) {
                const impactPrice = Number(combination.priceImpact ?? 0);
                const combinationId = combination.id;
                return {impactPrice: Number.isFinite(impactPrice) ? impactPrice : 0, combinationId: combinationId};
            }
        }
        return 0;
    }

    async getDeclinaisonDetails(attributeId) {
        const attribute = Number(attributeId || 0)
        if (!attribute) {
            return {declinaison: "", priceTtc: await this.getTtcPrice(), imageUrl: ""}
        }

        const combination = await this.getCombinationById(attribute)
        if (!combination) {
            return {declinaison: "", priceTtc: await this.getTtcPrice(), imageUrl: ""}
        }

        const priceTtc = await this.getCombinationTtcPrice(combination)
        const declinaison = await this.getCombinationLabel(combination)
        const imageUrl = this.getCombinationImageUrl(combination)

        return {declinaison, priceTtc, imageUrl}
    }

    async getCombinationById(attributeId) {
        const combinationApi = new Combination({}, false)
        return await combinationApi.getById(attributeId)
    }

    async getCombinationTtcPrice(combination) {
        const basePrice = Number(this.price) || 0
        const impact = Number(combination?.priceImpact) || 0
        const taxRate = await this.getTax()
        const safeRate = Number.isFinite(Number(taxRate)) ? Number(taxRate) : 0
        return (basePrice + impact) * (1 + safeRate / 100)
    }

    async getCombinationLabel(combination) {
        const labels = []
        const valueApi = new ProductOptionValue({}, false)
        const optionValueIds = combination?.optionValueIds ?? []
        for (const valueId of optionValueIds) {
            const value = await valueApi.getById(valueId)
            const option = await value.getProductOption()

            const optionName = Product.pickLang(option?.name)
            const valueName = Product.pickLang(value?.name)
            labels.push({
                option: {
                    id: option?.id ?? null,
                    name: optionName,
                },
                value: {
                    id: value?.id ?? null,
                    name: valueName,
                },
            })
        }

        return labels
    }

    getCombinationImageUrl(combination) {
        let imageUrl = ""
        const imageIds = combination?.imageIds ?? []
        if (imageIds.length > 0) {
            const firstId = Number(imageIds[0])
            if (Number.isFinite(firstId)) {
                imageUrl = buildImageUrl(this.id, firstId)
            }
        }
        return imageUrl
    }

    async getDeclinaisons() {
        const combinationApi = new Combination({}, false)
        const combinations = await combinationApi.getByProductId(this.id)
        if (!combinations.length) {
            return null
        }

        const values = []
        for (const combination of combinations) {
            const labels = await this.getCombinationLabel(combination)
            const label = labels
                .map((entry) => `${entry.option.name}: ${entry.value.name}`)
                .filter(Boolean)
                .join(" / ")

            values.push({
                id: combination.id,
                declinaisonId: combination.id,
                label,
                priceImpact: Number(combination.priceImpact) || 0,
            })
        }

        return {values}
    }

    async getQuantity() {
        const entries = this.associations?.stockAvailables ?? []
        if (entries.length === 0) {
            return this.quantity ?? 0
        }

        // le stock total est sauvegardé dasn stockAvailable where idProductAttribute = 0
        // prendre l'id du stock_avaible correspondant puis récupérer via API
        const stockApi = new StockAvailable({}, false)
        const aggregate = entries.find((entry) => Number(entry.idProductAttribute) === 0)

        if (aggregate) {
            const stock = await stockApi.getById(aggregate.id)
            return Number(stock.quantity) || 0
        }

        // sinon calculer en utilisant la somme de toutes les déclinaisons
        let total = 0
        for (const entry of entries) {
            const stock = await stockApi.getById(entry.id)
            total += Number(stock.quantity) || 0
        }
        return total
    }

    async getImages() {
        if (!this.associations?.images?.length) {
            return []
        }

        const baseUrl = import.meta.env.VITE_PRESTASHOP_BACKEND_URL || ""
        const apiKey = import.meta.env.VITE_PRESTASHOP_API_KEY

        const imageIds = [];
        for (const id of this.associations.images) {
            const numberId = Number(id);

            if (Number.isFinite(numberId)) {
                imageIds.push(numberId);
            }
        }

        return imageIds.map((id) => {
            const url = `${baseUrl}api/images/products/${this.id}/${id}`
            return apiKey ? `${url}?ws_key=${apiKey}` : url
        })
    }

    getBadge() {
        const baseDate = new Date(this.availableDate)

        if (Number.isNaN(baseDate.getTime())) {
            return null
        }

        const badges = {
            hot: {
                label: "Hot",
                color: "#ff4000",
                days: 1,
            },
            new: {
                label: "New",
                color: "#dc8635",
                days: 7,
            },
        }

        const now = new Date()

        // Supprime l'heure
        baseDate.setHours(0, 0, 0, 0)
        now.setHours(0, 0, 0, 0)

        const diffTime = now - baseDate
        const diffDays = diffTime / (1000 * 60 * 60 * 24)

        for (const badge of Object.values(badges)) {
            if (diffDays <= badge.days) {
                return badge
            }
        }

        return null
    }

    async getCategory() {
        if (!this.idCategoryDefault) {
            return null
        }
        const categoryApi = new Category({}, false)
        return await categoryApi.getById(this.idCategoryDefault)
    }

    async getByApi(fieldName, value = this[fieldName]) {
        const filter = buildApiFilterQuery(fieldName, value)

        if (!filter) {
            return []
        }

        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orders = toJSONList(xml)

        return orders.map((orderData) => Order.fromData(orderData))
    }

    // API-side inverse filter: request items where fieldName is NOT in value
    async getByNotApi(fieldName, value = this[fieldName]) {
        const values = Array.isArray(value) ? value : value instanceof Set ? Array.from(value) : [value]
        const normalized = values.map((v) => String(v).trim()).filter((s) => s !== "")

        if (normalized.length === 0) return []

        const filter = `&filter[${fieldName}]=![${normalized.join("|")}]`
        const xml = await api.get(`${this.endpoint}?display=full${filter}`)
        const orders = toJSONList(xml)
        return orders.map((orderData) => Order.fromData(orderData))
    }
}

export default Product
