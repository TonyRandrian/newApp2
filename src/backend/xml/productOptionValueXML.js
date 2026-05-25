import { getText, toInt } from "../utils/utils"

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

export const toXML = (data) => {
	return `<?xml version="1.0" encoding="UTF-8"?>
		<prestashop>
      <product_option_value>
        <id>${data?.id ?? ""}</id>
        <id_attribute_group>${data?.idAttributeGroup ?? ""}</id_attribute_group>
		    <color><![CDATA[${data?.color ?? ""}]]></color>
        <position>${data?.position ?? ""}</position>
        ${buildLanguageTag("name", data?.name)}
      </product_option_value>
    </prestashop>
  `
}

export const toJSON = (xml) => {
	if (!xml || typeof xml !== "string") {
		return null
	}

	const parser = new DOMParser()
	const doc = parser.parseFromString(xml, "application/xml")
	const value = doc.querySelector("product_option_value")

	if (!value) {
		return null
	}

	return {
		id: toInt(getText(value, "id")),
		idAttributeGroup: toInt(getText(value, "id_attribute_group")),
		color: getText(value, "color"),
		position: toInt(getText(value, "position")),
		name: getLanguages(value, "name"),
	}
}

export const toJSONList = (xml) => {
	if (!xml || typeof xml !== "string") {
		return []
	}

	const parser = new DOMParser()
	const doc = parser.parseFromString(xml, "application/xml")
	let nodes = Array.from(doc.querySelectorAll("product_option_values > product_option_value"))

	if (nodes.length === 0) {
		nodes = Array.from(doc.querySelectorAll("product_option_value"))
	}

	const serializer = new XMLSerializer()

	return nodes
		.map((node) => toJSON(serializer.serializeToString(node)))
		.filter((value) => value != null)
}