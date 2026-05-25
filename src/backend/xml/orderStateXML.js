import { getText, toInt, toDate, getLanguageText } from "../utils/utils.js"

export const toXML = (data) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
            <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
                <order_state>
                    <unremovable><![CDATA[${data?.unremovable ?? 0}]]></unremovable>
                    <delivery><![CDATA[${data?.delivery ?? 0}]]></delivery>
                    <hidden><![CDATA[${data?.hidden ?? 0}]]></hidden>
                    <send_email><![CDATA[${data?.sendEmail ?? 0}]]></send_email>
                    <module_name><![CDATA[${data?.moduleName ?? ""}]]></module_name>
                    <invoice><![CDATA[${data?.invoice ?? 0}]]></invoice>
                    <color><![CDATA[${data?.color ?? ""}]]></color>
                    <logable><![CDATA[${data?.logable ?? 0}]]></logable>
                    <shipped><![CDATA[${data?.shipped ?? 0}]]></shipped>
                    <paid><![CDATA[${data?.paid ?? 0}]]></paid>
                    <pdf_delivery><![CDATA[${data?.pdfDelivery ?? 0}]]></pdf_delivery>
                    <pdf_invoice><![CDATA[${data?.pdfInvoice ?? 0}]]></pdf_invoice>
                    <deleted><![CDATA[${data?.deleted ?? 0}]]></deleted>
                    <name>
                      <language id="1"><![CDATA[${data?.name ?? ""}]]></language>
                    </name>
                    <template>
                      <language id="1"><![CDATA[${data?.template ?? ""}]]></language>
                    </template>
                    <date_add><![CDATA[${data?.dateAdd ?? ""}]]></date_add>
                </order_state>
            </prestashop>`
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const state = doc.querySelector("order_state")

    if (!state) {
        return null
    }

    return {
        id: toInt(getText(state, "id")),
        unremovable: toInt(getText(state, "unremovable")),
        delivery: toInt(getText(state, "delivery")),
        hidden: toInt(getText(state, "hidden")),
        sendEmail: toInt(getText(state, "send_email")),
        moduleName: getText(state, "module_name"),
        invoice: toInt(getText(state, "invoice")),
        color: getText(state, "color"),
        logable: toInt(getText(state, "logable")),
        shipped: toInt(getText(state, "shipped")),
        paid: toInt(getText(state, "paid")),
        pdfDelivery: toInt(getText(state, "pdf_delivery")),
        pdfInvoice: toInt(getText(state, "pdf_invoice")),
        deleted: toInt(getText(state, "deleted")),
        name: getLanguageText(state, "name") || getText(state, "name"),
        template: getLanguageText(state, "template") || getText(state, "template"),
        dateAdd: toDate(getText(state, "date_add")),
    }
}

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    let nodes = Array.from(doc.querySelectorAll("order_states > order_state"))

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("order_state"))
    }

    const serializer = new XMLSerializer()

    return nodes
        .map((node) => toJSON(serializer.serializeToString(node)))
        .filter((value) => value != null)
}