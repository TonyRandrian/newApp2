import { getText, toFloat, toInt, toDate } from "../utils/utils.js"

export const toXML = (data) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
            <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
                <order_payment>
                    <order_reference><![CDATA[${data?.orderReference ?? ""}]]></order_reference>
                    <id_currency><![CDATA[${data?.currencyId ?? ""}]]></id_currency>
                    <amount><![CDATA[${data?.amount ?? 0}]]></amount>
                    <payment_method><![CDATA[${data?.paymentMethod ?? ""}]]></payment_method>
                    <conversion_rate><![CDATA[${data?.conversionRate ?? 1}]]></conversion_rate>
                    <transaction_id><![CDATA[${data?.transactionId ?? ""}]]></transaction_id>
                    <card_number><![CDATA[${data?.cardNumber ?? ""}]]></card_number>
                    <card_brand><![CDATA[${data?.cardBrand ?? ""}]]></card_brand>
                    <card_expiration><![CDATA[${data?.cardExpiration ?? ""}]]></card_expiration>
                    <card_holder><![CDATA[${data?.cardHolder ?? ""}]]></card_holder>
                    <date_add><![CDATA[${data?.dateAdd ?? ""}]]></date_add>
                    <id_employee><![CDATA[${data?.employeeId ?? ""}]]></id_employee>
                </order_payment>
            </prestashop>`
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const payment = doc.querySelector("order_payment")

    if (!payment) {
        return null
    }

    return {
        id: toInt(getText(payment, "id")),
        orderReference: getText(payment, "order_reference"),
        currencyId: toInt(getText(payment, "id_currency")),
        amount: toFloat(getText(payment, "amount")),
        paymentMethod: getText(payment, "payment_method"),
        conversionRate: toFloat(getText(payment, "conversion_rate")),
        transactionId: getText(payment, "transaction_id"),
        cardNumber: getText(payment, "card_number"),
        cardBrand: getText(payment, "card_brand"),
        cardExpiration: getText(payment, "card_expiration"),
        cardHolder: getText(payment, "card_holder"),
        dateAdd: toDate(getText(payment, "date_add")),
        employeeId: toInt(getText(payment, "id_employee")),
    }
}

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    let nodes = Array.from(doc.querySelectorAll("order_payments > order_payment"))

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("order_payment"))
    }

    const serializer = new XMLSerializer()

    return nodes
        .map((node) => toJSON(serializer.serializeToString(node)))
        .filter((value) => value != null)
}