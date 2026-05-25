import {
	formatDate,
	formatDateTime,
	getText,
	toBool,
	toDate,
	toFloat,
	toInt,
} from "../utils/utils"

const normalizeLanguages = (value) => {
	if (!value) {
		return []
	}

	if (Array.isArray(value)) {
		return value
	}

	if (typeof value === "string") {
		return [{ id: 1, value }]
	}

	if (typeof value === "object") {
		if (Object.hasOwn(value, "id")) {
			return [{ id: value.id ?? 1, value: value.value ?? "" }]
		}

		return Object.entries(value).map(([id, text]) => ({
			id: Number.parseInt(id, 10),
			value: text ?? "",
		}))
	}

	return []
}

const buildLanguageTag = (tag, value) => {
	const languages = normalizeLanguages(value)

	if (languages.length === 0) {
		return `<${tag}></${tag}>`
	}

	return `<${tag}>${languages
		.map((lang) => {
			return `
			<language id="${lang.id}"><![CDATA[${lang.value ?? ""}]]></language>`
		})
		.join("")}
		</${tag}>`
}

const buildIdList = (tag, itemTag, ids) => {
	if (!ids || ids.length === 0) {
		return `<${tag}></${tag}>`
	}

	return `<${tag}>${ids
		.map((id) => {
			return `
				<${itemTag}>
					<id>${id}</id>
				</${itemTag}>`
		})
		.join("")}
			</${tag}>`
}

const buildStockAvailables = (items) => {
	if (!items || items.length === 0) {
		return "<stock_availables></stock_availables>"
	}

	return `<stock_availables>${items
		.map((item) => {
			return `
				<stock_available>
					<id>${item.id ?? ""}</id>
					<id_product_attribute>${item.idProductAttribute ?? ""}</id_product_attribute>
				</stock_available>`
		})
		.join("")}
			</stock_availables>`
}

const buildProductFeatures = (items) => {
	if (!items || items.length === 0) {
		return "<product_features></product_features>"
	}

	return `<product_features>${items
		.map((item) => {
			return `
				<product_feature>
					<id>${item.id ?? ""}</id>
					<id_feature_value>${item.idFeatureValue ?? ""}</id_feature_value>
				</product_feature>`
		})
		.join("")}
			</product_features>`
}

const buildProductBundle = (items) => {
	if (!items || items.length === 0) {
		return "<product_bundle></product_bundle>"
	}

	return `<product_bundle>${items
		.map((item) => {
			return `
				<product>
					<id>${item.id ?? ""}</id>
					<id_product_attribute>${item.idProductAttribute ?? ""}</id_product_attribute>
					<quantity>${item.quantity ?? ""}</quantity>
				</product>`
		})
		.join("")}
			</product_bundle>`
}

const getLanguages = (root, tag) => {
	const parent = root.querySelector(tag)

	if (!parent) {
		return []
	}

	return Array.from(parent.querySelectorAll("language")).map((lang) => ({
		id: toInt(lang.getAttribute("id")) ?? 1,
		value: lang.textContent.trim(),
	}))
}

const getIdList = (root, listTag, itemTag) => {
	const parent = root.querySelector(listTag)

	if (!parent) {
		return []
	}

	return Array.from(parent.querySelectorAll(itemTag))
		.map((item) => toInt(getText(item, "id")))
		.filter((value) => value != null)
}

const getStockAvailables = (root) => {
	const parent = root.querySelector("stock_availables")

	if (!parent) {
		return []
	}

	return Array.from(parent.querySelectorAll("stock_available")).map((item) => ({
		id: toInt(getText(item, "id")),
		idProductAttribute: toInt(getText(item, "id_product_attribute")),
	}))
}

const getProductFeatures = (root) => {
	const parent = root.querySelector("product_features")

	if (!parent) {
		return []
	}

	return Array.from(parent.querySelectorAll("product_feature")).map((item) => ({
		id: toInt(getText(item, "id")),
		idFeatureValue: toInt(getText(item, "id_feature_value")),
	}))
}

const getProductBundle = (root) => {
	const parent = root.querySelector("product_bundle")

	if (!parent) {
		return []
	}

	return Array.from(parent.querySelectorAll("product")).map((item) => ({
		id: toInt(getText(item, "id")),
		idProductAttribute: toInt(getText(item, "id_product_attribute")),
		quantity: toInt(getText(item, "quantity")),
	}))
}

export const toXML = (data) => {
	const associations = data?.associations ?? {}
	const manufacturerName = data?.manufacturerName?.trim?.() ?? String(data?.manufacturerName ?? '').trim()
	const manufacturerNameTag = manufacturerName ? `
		<manufacturer_name><![CDATA[${manufacturerName}]]></manufacturer_name>` : ''

	return `<?xml version="1.0" encoding="UTF-8"?>
    <prestashop>
      <product>
        <id>${data?.id ?? ""}</id>
        <id_manufacturer>${data?.idManufacturer ?? ""}</id_manufacturer>
        <id_supplier>${data?.idSupplier ?? ""}</id_supplier>
        <id_category_default>${data?.idCategoryDefault ?? ""}</id_category_default>
        <new>${data?.isNew ?? ""}</new>
        <cache_default_attribute>${data?.cacheDefaultAttribute ?? ""}</cache_default_attribute>
        <id_default_image>${data?.idDefaultImage ?? ""}</id_default_image>
        <id_default_combination>${data?.idDefaultCombination ?? ""}</id_default_combination>
        <id_tax_rules_group>${data?.idTaxRulesGroup ?? ""}</id_tax_rules_group>
		${manufacturerNameTag}
		    <type><![CDATA[${data?.type ?? ""}]]></type>
        <id_shop_default>${data?.idShopDefault ?? ""}</id_shop_default>
		    <reference><![CDATA[${data?.reference ?? ""}]]></reference>
		    <supplier_reference><![CDATA[${data?.supplierReference ?? ""}]]></supplier_reference>
		    <location><![CDATA[${data?.location ?? ""}]]></location>
        <width>${data?.width ?? ""}</width>
        <height>${data?.height ?? ""}</height>
        <depth>${data?.depth ?? ""}</depth>
        <weight>${data?.weight ?? ""}</weight>
        <quantity_discount>${data?.quantityDiscount ?? ""}</quantity_discount>
		    <ean13><![CDATA[${data?.ean13 ?? ""}]]></ean13>
		    <isbn><![CDATA[${data?.isbn ?? ""}]]></isbn>
		    <upc><![CDATA[${data?.upc ?? ""}]]></upc>
		    <mpn><![CDATA[${data?.mpn ?? ""}]]></mpn>
        <cache_is_pack>${data?.cacheIsPack ?? ""}</cache_is_pack>
        <cache_has_attachments>${data?.cacheHasAttachments ?? ""}</cache_has_attachments>
        <is_virtual>${data?.isVirtual ?? ""}</is_virtual>
        <state>${data?.state ?? ""}</state>
        <additional_delivery_times>${data?.additionalDeliveryTimes ?? ""}</additional_delivery_times>
        ${buildLanguageTag("delivery_in_stock", data?.deliveryInStock)}
        ${buildLanguageTag("delivery_out_stock", data?.deliveryOutStock)}
		    <product_type><![CDATA[${data?.productType ?? ""}]]></product_type>
        <on_sale>${data?.onSale ?? ""}</on_sale>
        <online_only>${data?.onlineOnly ?? ""}</online_only>
        <ecotax>${data?.ecotax ?? ""}</ecotax>
        <minimal_quantity>${data?.minimalQuantity ?? ""}</minimal_quantity>
        <low_stock_threshold>${data?.lowStockThreshold ?? ""}</low_stock_threshold>
        <low_stock_alert>${data?.lowStockAlert ?? ""}</low_stock_alert>
        <price>${data?.price ?? ""}</price>
        <wholesale_price>${data?.wholesalePrice ?? ""}</wholesale_price>
		    <unity><![CDATA[${data?.unity ?? ""}]]></unity>
        <unit_price>${data?.unitPrice ?? ""}</unit_price>
        <unit_price_ratio>${data?.unitPriceRatio ?? ""}</unit_price_ratio>
        <additional_shipping_cost>${data?.additionalShippingCost ?? ""}</additional_shipping_cost>
        <customizable>${data?.customizable ?? ""}</customizable>
        <text_fields>${data?.textFields ?? ""}</text_fields>
        <uploadable_files>${data?.uploadableFiles ?? ""}</uploadable_files>
        <active>${data?.active ?? ""}</active>
		    <redirect_type><![CDATA[${data?.redirectType ?? ""}]]></redirect_type>
        <id_type_redirected>${data?.idTypeRedirected ?? ""}</id_type_redirected>
        <available_for_order>${data?.availableForOrder ?? ""}</available_for_order>
        <available_date>${formatDate(data?.availableDate)}</available_date>
        <show_condition>${data?.showCondition ?? ""}</show_condition>
		    <condition><![CDATA[${data?.condition ?? ""}]]></condition>
        <show_price>${data?.showPrice ?? ""}</show_price>
        <indexed>${data?.indexed ?? ""}</indexed>
		    <visibility><![CDATA[${data?.visibility ?? ""}]]></visibility>
        <advanced_stock_management>${data?.advancedStockManagement ?? ""}</advanced_stock_management>
        <date_add>${formatDateTime(data?.dateAdd)}</date_add>
        <date_upd>${formatDateTime(data?.dateUpd)}</date_upd>
        <pack_stock_type>${data?.packStockType ?? ""}</pack_stock_type>
        ${buildLanguageTag("meta_description", data?.metaDescription)}
        ${buildLanguageTag("meta_keywords", data?.metaKeywords)}
        ${buildLanguageTag("meta_title", data?.metaTitle)}
        ${buildLanguageTag("link_rewrite", data?.linkRewrite)}
        ${buildLanguageTag("name", data?.name)}
        ${buildLanguageTag("description", data?.description)}
        ${buildLanguageTag("description_short", data?.descriptionShort)}
        ${buildLanguageTag("available_now", data?.availableNow)}
        ${buildLanguageTag("available_later", data?.availableLater)}
        <associations>
          ${buildIdList("categories", "category", associations.categories)}
          ${buildIdList("images", "image", associations.images)}
          ${buildIdList("combinations", "combination", associations.combinations)}
          ${buildIdList("product_option_values", "product_option_value", associations.productOptionValues)}
          ${buildProductFeatures(associations.productFeatures)}
          ${buildIdList("tags", "tag", associations.tags)}
          ${buildStockAvailables(associations.stockAvailables)}
          ${buildIdList("attachments", "attachment", associations.attachments)}
          ${buildIdList("accessories", "product", associations.accessories)}
          ${buildProductBundle(associations.productBundle)}
        </associations>
      </product>
    </prestashop>
  `
}

export const toJSON = (xml) => {
	if (!xml || typeof xml !== "string") {
		return null
	}

	const parser = new DOMParser()
	const doc = parser.parseFromString(xml, "application/xml")
	const product = doc.querySelector("product")

	if (!product) {
		return null
	}

	const associationsRoot = product.querySelector("associations")

	return {
		id: toInt(getText(product, "id")),
		idManufacturer: toInt(getText(product, "id_manufacturer")),
		idSupplier: toInt(getText(product, "id_supplier")),
		idCategoryDefault: toInt(getText(product, "id_category_default")),
		isNew: toBool(getText(product, "new")),
		cacheDefaultAttribute: toInt(getText(product, "cache_default_attribute")),
		idDefaultImage: toInt(getText(product, "id_default_image")),
		idDefaultCombination: toInt(getText(product, "id_default_combination")),
		idTaxRulesGroup: toInt(getText(product, "id_tax_rules_group")),
		positionInCategory: toInt(getText(product, "position_in_category")),
		manufacturerName: getText(product, "manufacturer_name"),
		quantity: toInt(getText(product, "quantity")),
		type: getText(product, "type"),
		idShopDefault: toInt(getText(product, "id_shop_default")),
		reference: getText(product, "reference"),
		supplierReference: getText(product, "supplier_reference"),
		location: getText(product, "location"),
		width: toFloat(getText(product, "width")),
		height: toFloat(getText(product, "height")),
		depth: toFloat(getText(product, "depth")),
		weight: toFloat(getText(product, "weight")),
		quantityDiscount: toBool(getText(product, "quantity_discount")),
		ean13: getText(product, "ean13"),
		isbn: getText(product, "isbn"),
		upc: getText(product, "upc"),
		mpn: getText(product, "mpn"),
		cacheIsPack: toBool(getText(product, "cache_is_pack")),
		cacheHasAttachments: toBool(getText(product, "cache_has_attachments")),
		isVirtual: toBool(getText(product, "is_virtual")),
		state: toInt(getText(product, "state")),
		additionalDeliveryTimes: toInt(getText(product, "additional_delivery_times")),
		deliveryInStock: getLanguages(product, "delivery_in_stock"),
		deliveryOutStock: getLanguages(product, "delivery_out_stock"),
		productType: getText(product, "product_type"),
		onSale: toBool(getText(product, "on_sale")),
		onlineOnly: toBool(getText(product, "online_only")),
		ecotax: toFloat(getText(product, "ecotax")),
		minimalQuantity: toInt(getText(product, "minimal_quantity")),
		lowStockThreshold: toInt(getText(product, "low_stock_threshold")),
		lowStockAlert: toBool(getText(product, "low_stock_alert")),
		price: toFloat(getText(product, "price")),
		wholesalePrice: toFloat(getText(product, "wholesale_price")),
		unity: getText(product, "unity"),
		unitPrice: toFloat(getText(product, "unit_price")),
		unitPriceRatio: toFloat(getText(product, "unit_price_ratio")),
		additionalShippingCost: toFloat(getText(product, "additional_shipping_cost")),
		customizable: toInt(getText(product, "customizable")),
		textFields: toInt(getText(product, "text_fields")),
		uploadableFiles: toInt(getText(product, "uploadable_files")),
		active: toBool(getText(product, "active")),
		redirectType: getText(product, "redirect_type"),
		idTypeRedirected: toInt(getText(product, "id_type_redirected")),
		availableForOrder: toBool(getText(product, "available_for_order")),
		availableDate: toDate(getText(product, "available_date")),
		showCondition: toBool(getText(product, "show_condition")),
		condition: getText(product, "condition"),
		showPrice: toBool(getText(product, "show_price")),
		indexed: toBool(getText(product, "indexed")),
		visibility: getText(product, "visibility"),
		advancedStockManagement: toBool(getText(product, "advanced_stock_management")),
		dateAdd: toDate(getText(product, "date_add")),
		dateUpd: toDate(getText(product, "date_upd")),
		packStockType: toInt(getText(product, "pack_stock_type")),
		metaDescription: getLanguages(product, "meta_description"),
		metaKeywords: getLanguages(product, "meta_keywords"),
		metaTitle: getLanguages(product, "meta_title"),
		linkRewrite: getLanguages(product, "link_rewrite"),
		name: getLanguages(product, "name"),
		description: getLanguages(product, "description"),
		descriptionShort: getLanguages(product, "description_short"),
		availableNow: getLanguages(product, "available_now"),
		availableLater: getLanguages(product, "available_later"),
		associations: {
			categories: associationsRoot ? getIdList(associationsRoot, "categories", "category") : [],
			images: associationsRoot ? getIdList(associationsRoot, "images", "image") : [],
			combinations: associationsRoot ? getIdList(associationsRoot, "combinations", "combination") : [],
			productOptionValues: associationsRoot
				? getIdList(associationsRoot, "product_option_values", "product_option_value")
				: [],
			productFeatures: associationsRoot ? getProductFeatures(associationsRoot) : [],
			tags: associationsRoot ? getIdList(associationsRoot, "tags", "tag") : [],
			stockAvailables: associationsRoot ? getStockAvailables(associationsRoot) : [],
			attachments: associationsRoot ? getIdList(associationsRoot, "attachments", "attachment") : [],
			accessories: associationsRoot ? getIdList(associationsRoot, "accessories", "product") : [],
			productBundle: associationsRoot ? getProductBundle(associationsRoot) : [],
		},
	}
}

export const toJSONList = (xml) => {
	if (!xml || typeof xml !== "string") {
		return []
	}

	const parser = new DOMParser()
	const doc = parser.parseFromString(xml, "application/xml")
	let nodes = Array.from(doc.querySelectorAll("products > product"))

	if (nodes.length === 0) {
		nodes = Array.from(doc.querySelectorAll("product"))
	}

	const serializer = new XMLSerializer()

	return nodes
		.map((node) => toJSON(serializer.serializeToString(node)))
		.filter((value) => value != null)
}

