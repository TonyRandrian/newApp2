import { getText, toBool, toInt } from "../utils/utils"

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

export const toXML = (data) => {
	const associations = data?.associations ?? {}

	return `<?xml version="1.0" encoding="UTF-8"?>
		<prestashop>
      <product_option>
        <id>${data?.id ?? ""}</id>
        <is_color_group>${data?.isColorGroup ?? ""}</is_color_group>
		    <group_type><![CDATA[${data?.groupType ?? ""}]]></group_type>
        <position>${data?.position ?? ""}</position>
        ${buildLanguageTag("name", data?.name)}
        ${buildLanguageTag("public_name", data?.publicName)}
        <associations>
          ${buildIdList(
            "product_option_values",
            "product_option_value",
            associations.productOptionValues
          )}
        </associations>
      </product_option>
    </prestashop>
  `
}

export const toJSON = (xml) => {
	if (!xml || typeof xml !== "string") {
		return null
	}

	const parser = new DOMParser()
	const doc = parser.parseFromString(xml, "application/xml")
	const option = doc.querySelector("product_option")

	if (!option) {
		return null
	}

	const associationsRoot = option.querySelector("associations")

	return {
		id: toInt(getText(option, "id")),
		isColorGroup: toBool(getText(option, "is_color_group")),
		groupType: getText(option, "group_type"),
		position: toInt(getText(option, "position")),
		name: getLanguages(option, "name"),
		publicName: getLanguages(option, "public_name"),
		associations: {
			productOptionValues: associationsRoot
				? getIdList(associationsRoot, "product_option_values", "product_option_value")
				: [],
		},
	}
}

export const toJSONList = (xml) => {
	if (!xml || typeof xml !== "string") {
		return []
	}

	const parser = new DOMParser()
	const doc = parser.parseFromString(xml, "application/xml")
	let nodes = Array.from(doc.querySelectorAll("product_options > product_option"))

	if (nodes.length === 0) {
		nodes = Array.from(doc.querySelectorAll("product_option"))
	}

	const serializer = new XMLSerializer()

	return nodes
		.map((node) => toJSON(serializer.serializeToString(node)))
		.filter((value) => value != null)
}