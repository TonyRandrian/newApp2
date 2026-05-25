import { getText, toBool, toFloat, toInt } from "../utils/utils.js"

export const toXML = (data) => {
		return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
	<carrier>
		<id><![CDATA[${data?.id ?? ""}]]></id>
		<deleted><![CDATA[${data?.deleted ?? 0}]]></deleted>
		<is_module><![CDATA[${data?.isModule ?? 0}]]></is_module>
		<id_tax_rules_group><![CDATA[${data?.idTaxRulesGroup ?? ""}]]></id_tax_rules_group>
		<id_reference><![CDATA[${data?.idReference ?? ""}]]></id_reference>
		<name><![CDATA[${data?.name ?? ""}]]></name>
		<active><![CDATA[${data?.active ?? 1}]]></active>
		<is_free><![CDATA[${data?.isFree ?? 0}]]></is_free>
		<url><![CDATA[${data?.url ?? ""}]]></url>
		<shipping_handling><![CDATA[${data?.shippingHandling ?? 0}]]></shipping_handling>
		<shipping_external><![CDATA[${data?.shippingExternal ?? 0}]]></shipping_external>
		<range_behavior><![CDATA[${data?.rangeBehavior ?? 0}]]></range_behavior>
		<shipping_method><![CDATA[${data?.shippingMethod ?? 0}]]></shipping_method>
		<max_width><![CDATA[${data?.maxWidth ?? 0}]]></max_width>
		<max_height><![CDATA[${data?.maxHeight ?? 0}]]></max_height>
		<max_depth><![CDATA[${data?.maxDepth ?? 0}]]></max_depth>
		<max_weight><![CDATA[${data?.maxWeight ?? 0}]]></max_weight>
		<grade><![CDATA[${data?.grade ?? 0}]]></grade>
		<external_module_name><![CDATA[${data?.externalModuleName ?? ""}]]></external_module_name>
		<need_range><![CDATA[${data?.needRange ?? 0}]]></need_range>
		<position><![CDATA[${data?.position ?? 0}]]></position>
		<delay>
			<language id="1"><![CDATA[${data?.delay ?? ""}]]></language>
			<language id="2"><![CDATA[]]></language>
			<language id="3"><![CDATA[]]></language>
		</delay>
	</carrier>
</prestashop>`
}

export const toJSON = (xml) => {
		if (!xml || typeof xml !== "string") {
				return null
		}

		const parser = new DOMParser()
		const doc = parser.parseFromString(xml, "application/xml")
		const carrier = doc.querySelector("carrier")

		if (!carrier) {
				return null
		}

		return {
				id: toInt(getText(carrier, "id")),
				deleted: toInt(getText(carrier, "deleted")),
				isModule: toBool(getText(carrier, "is_module")),
				idTaxRulesGroup: toInt(getText(carrier, "id_tax_rules_group")),
				idReference: toInt(getText(carrier, "id_reference")),
				name: getText(carrier, "name"),
				active: toBool(getText(carrier, "active")),
				isFree: toBool(getText(carrier, "is_free")),
				url: getText(carrier, "url"),
				shippingHandling: toBool(getText(carrier, "shipping_handling")),
				shippingExternal: toBool(getText(carrier, "shipping_external")),
				rangeBehavior: toBool(getText(carrier, "range_behavior")),
				shippingMethod: toInt(getText(carrier, "shipping_method")),
				maxWidth: toFloat(getText(carrier, "max_width")),
				maxHeight: toFloat(getText(carrier, "max_height")),
				maxDepth: toFloat(getText(carrier, "max_depth")),
				maxWeight: toFloat(getText(carrier, "max_weight")),
				grade: toInt(getText(carrier, "grade")),
				externalModuleName: getText(carrier, "external_module_name"),
				needRange: toBool(getText(carrier, "need_range")),
				position: toInt(getText(carrier, "position")),
				delay: getText(carrier, 'delay > language[id="1"]'),
		}
}

export const toJSONList = (xml) => {
	if (!xml || typeof xml !== "string") {
		return []
	}

	const parser = new DOMParser()
	const doc = parser.parseFromString(xml, "application/xml")
	let nodes = Array.from(doc.querySelectorAll("carriers > carrier"))

	if (nodes.length === 0) {
		nodes = Array.from(doc.querySelectorAll("carrier"))
	}

	const serializer = new XMLSerializer()

	return nodes
		.map((node) => toJSON(serializer.serializeToString(node)))
		.filter((value) => value != null)
}