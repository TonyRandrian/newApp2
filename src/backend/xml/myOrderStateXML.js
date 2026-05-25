import { toInt, toBool, toDate } from "../utils/utils.js"

export const toXML = (data) => {
    const orderId = data?.orderId ?? data?.idOrder ?? ""
    const orderStateId = data?.orderStateId ?? data?.idOrderState ?? ""
    const employeeId = data?.employeeId ?? data?.idEmployee ?? 0
    const empNode = employeeId ? `<id_employee><![CDATA[${employeeId}]]></id_employee>` : ""
    const dateNode = data?.date ? `<date><![CDATA[${data.date}]]></date>` : ""
    const useExisting = data?.useExistingPayment ? 1 : 0
    const sendEmail = data?.sendEmail ? 1 : 0

    return `<?xml version="1.0" encoding="UTF-8"?>\n<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">\n  <order_history>\n    <id_order><![CDATA[${orderId}]]></id_order>\n    <id_order_state><![CDATA[${orderStateId}]]></id_order_state>\n    ${empNode}\n    ${dateNode}\n    <use_existing_payment><![CDATA[${useExisting}]]></use_existing_payment>\n    <sendemail><![CDATA[${sendEmail}]]></sendemail>\n  </order_history>\n</prestashop>`
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") return null

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const node = doc.querySelector("order_history")

    if (!node) return null

    const getText = (tag) => {
        const el = node.querySelector(tag)
        return el ? el.textContent : null
    }

    return {
        orderId: toInt(getText("id_order")),
        orderStateId: toInt(getText("id_order_state")),
        employeeId: toInt(getText("id_employee")),
        date: toDate(getText("date")),
        useExistingPayment: toBool(getText("use_existing_payment")),
        sendEmail: toBool(getText("sendemail")),
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
