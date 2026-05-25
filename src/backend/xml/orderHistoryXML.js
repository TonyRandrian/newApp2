import { getText, toInt, toDate } from "../utils/utils.js"

export const toXML = (data) => {
    const emp = data?.employeeId ?? 0
    const dateNode = data?.dateAdd ? `<date_add><![CDATA[${data.dateAdd}]]></date_add>` : ""

    return `<?xml version="1.0" encoding="UTF-8"?>\n            <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">\n                <order_history>\n                    ${data?.id != null ? `<id>${data.id}</id>` : ""}\n                    <id_order><![CDATA[${data?.orderId ?? ""}]]></id_order>\n                    <id_order_state><![CDATA[${data?.orderStateId ?? ""}]]></id_order_state>\n                    <id_employee><![CDATA[${emp}]]></id_employee>\n                    ${dateNode}\n                </order_history>\n            </prestashop>`
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const history = doc.querySelector("order_history")

    if (!history) {
        return null
    }

    return {
        id: toInt(getText(history, "id")),
        orderStateId: toInt(getText(history, "id_order_state")),
        orderId: toInt(getText(history, "id_order")),
        employeeId: toInt(getText(history, "id_employee")),
        dateAdd: toDate(getText(history, "date_add")),
    }
}

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    let nodes = Array.from(doc.querySelectorAll("order_histories > order_history"))

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("order_history"))
    }

    const serializer = new XMLSerializer()

    return nodes
        .map((node) => toJSON(serializer.serializeToString(node)))
        .filter((value) => value != null)
}