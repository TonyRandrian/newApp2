import { getText, toFloat, toInt, toDate } from "../utils/utils.js"

export const toXML = (data) => {
    const orderRows = data?.orderRows ?? []
    const formatAmount = (value) => Number.parseFloat(value ?? 0).toFixed(2)
    const rowNodes = (orderRows.length ? orderRows : [{}])
        .map((row) => {
            const {
                id = "",
                productId = "",
                productAttributeId = "",
                productQuantity = "",
                customizationId = "",
            } = row

            return `      <order_row>
				<id><![CDATA[${id}]]></id>
				<product_id><![CDATA[${productId}]]></product_id>
				<product_attribute_id><![CDATA[${productAttributeId}]]></product_attribute_id>
				<product_quantity><![CDATA[${productQuantity}]]></product_quantity>
				<product_name><![CDATA[]]></product_name>
				<product_reference><![CDATA[]]></product_reference>
				<product_ean13><![CDATA[]]></product_ean13>
				<product_isbn><![CDATA[]]></product_isbn>
				<product_upc><![CDATA[]]></product_upc>
				<product_price><![CDATA[]]></product_price>
				<id_customization><![CDATA[${customizationId}]]></id_customization>
				<unit_price_tax_incl><![CDATA[]]></unit_price_tax_incl>
				<unit_price_tax_excl><![CDATA[]]></unit_price_tax_excl>
			</order_row>`
        })
        .join("\n")

    return `<?xml version="1.0" encoding="UTF-8"?>
            <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
                <order>
                    ${data?.id != null ? `<id>${data.id}</id>` : ""}
                    <id_address_delivery><![CDATA[${data?.addressDeliveryId ?? ""}]]></id_address_delivery>
                    <id_address_invoice><![CDATA[${data?.addressInvoiceId ?? ""}]]></id_address_invoice>
                    <id_cart><![CDATA[${data?.cartId ?? ""}]]></id_cart>
                    <id_currency><![CDATA[${data?.currencyId ?? ""}]]></id_currency>
                    <id_lang><![CDATA[${data?.langId ?? ""}]]></id_lang>
                    <id_customer><![CDATA[${data?.customerId ?? ""}]]></id_customer>
                    <id_carrier><![CDATA[${data?.carrierId ?? ""}]]></id_carrier>
                    <current_state><![CDATA[${data?.currentState ?? ""}]]></current_state>
                    <module><![CDATA[${data?.module ?? ""}]]></module>
                    <invoice_number><![CDATA[${data?.invoiceNumber ?? ""}]]></invoice_number>
                    <invoice_date><![CDATA[${data?.invoiceDate ?? ""}]]></invoice_date>
                    <delivery_number><![CDATA[${data?.deliveryNumber ?? ""}]]></delivery_number>
                    <delivery_date><![CDATA[${data?.deliveryDate ?? ""}]]></delivery_date>
                    <valid><![CDATA[${data?.valid ?? ""}]]></valid>
                    <date_add><![CDATA[${data?.dateAdd ?? ""}]]></date_add>
                    <date_upd><![CDATA[${data?.dateUpd ?? ""}]]></date_upd>
                    <shipping_number><![CDATA[${data?.shippingNumber ?? ""}]]></shipping_number>
                    <note><![CDATA[${data?.note ?? ""}]]></note>
                    <id_shop_group><![CDATA[${data?.shopGroupId ?? 1}]]></id_shop_group>
                    <id_shop><![CDATA[${data?.shopId ?? 1}]]></id_shop>
                    <secure_key><![CDATA[${data?.secureKey ?? ""}]]></secure_key>
                    <payment><![CDATA[${data?.payment ?? ""}]]></payment>
                    <recyclable><![CDATA[${data?.recyclable ?? 0}]]></recyclable>
                    <gift><![CDATA[${data?.gift ?? 0}]]></gift>
                    <gift_message><![CDATA[${data?.giftMessage ?? ""}]]></gift_message>
                    <mobile_theme><![CDATA[${data?.mobileTheme ?? 0}]]></mobile_theme>
                    <total_discounts><![CDATA[${formatAmount(data?.totalDiscounts ?? 0)}]]></total_discounts>
                    <total_discounts_tax_incl><![CDATA[${formatAmount(data?.totalDiscountsTaxIncl ?? 0)}]]></total_discounts_tax_incl>
                    <total_discounts_tax_excl><![CDATA[${formatAmount(data?.totalDiscountsTaxExcl ?? 0)}]]></total_discounts_tax_excl>
                    <total_paid><![CDATA[${formatAmount(data?.totalPaid ?? 0)}]]></total_paid>
                    <total_paid_tax_incl><![CDATA[${formatAmount(data?.totalPaid ?? 0)}]]></total_paid_tax_incl>
                    <total_paid_tax_excl><![CDATA[${formatAmount(data?.totalProducts ?? 0)}]]></total_paid_tax_excl>
                    <total_paid_real><![CDATA[${formatAmount(data?.totalPaid ?? 0)}]]></total_paid_real>
                    <total_products><![CDATA[${formatAmount(data?.totalProducts ?? 0)}]]></total_products>
                    <total_products_wt><![CDATA[${formatAmount(data?.totalPaid ?? 0)}]]></total_products_wt>
                    <total_shipping><![CDATA[${formatAmount(data?.totalShipping ?? 0)}]]></total_shipping>
                    <total_shipping_tax_incl><![CDATA[${formatAmount(data?.totalShippingTaxIncl ?? 0)}]]></total_shipping_tax_incl>
                    <total_shipping_tax_excl><![CDATA[${formatAmount(data?.totalShippingTaxExcl ?? 0)}]]></total_shipping_tax_excl>
                    <carrier_tax_rate><![CDATA[${formatAmount(data?.carrierTaxRate ?? 0)}]]></carrier_tax_rate>
                    <total_wrapping><![CDATA[${formatAmount(data?.totalWrapping ?? 0)}]]></total_wrapping>
                    <total_wrapping_tax_incl><![CDATA[${formatAmount(data?.totalWrappingTaxIncl ?? 0)}]]></total_wrapping_tax_incl>
                    <total_wrapping_tax_excl><![CDATA[${formatAmount(data?.totalWrappingTaxExcl ?? 0)}]]></total_wrapping_tax_excl>
                    <round_mode><![CDATA[${data?.roundMode ?? ""}]]></round_mode>
                    <round_type><![CDATA[${data?.roundType ?? ""}]]></round_type>
                    <conversion_rate><![CDATA[${formatAmount(data?.conversionRate ?? 1)}]]></conversion_rate>
                    <reference><![CDATA[${data?.reference ?? ""}]]></reference>
                    ${orderRows.length > 0 ? `<associations>
                        <order_rows nodeType="order_row" virtualEntity="true">
                            ${rowNodes}
                        </order_rows>
                    </associations>` : ""}
                </order>
            </prestashop>`
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const order = doc.querySelector("order")

    if (!order) {
        return null
    }

    return {
        id: toInt(getText(order, "id")),
        addressDeliveryId: toInt(getText(order, "id_address_delivery")),
        addressInvoiceId: toInt(getText(order, "id_address_invoice")),
        cartId: toInt(getText(order, "id_cart")),
        currencyId: toInt(getText(order, "id_currency")),
        langId: toInt(getText(order, "id_lang")),
        customerId: toInt(getText(order, "id_customer")),
        carrierId: toInt(getText(order, "id_carrier")),
        currentState: getText(order, "current_state"),
        module: getText(order, "module"),
        invoiceNumber: getText(order, "invoice_number"),
        invoiceDate: getText(order, "invoice_date"),
        deliveryNumber: getText(order, "delivery_number"),
        deliveryDate: getText(order, "delivery_date"),
        valid: getText(order, "valid"),
        dateAdd: toDate(getText(order, "date_add")),
        dateUpd: toDate(getText(order, "date_upd")),
        shippingNumber: getText(order, "shipping_number"),
        note: getText(order, "note"),
        shopGroupId: toInt(getText(order, "id_shop_group")),
        shopId: toInt(getText(order, "id_shop")),
        secureKey: getText(order, "secure_key"),
        payment: getText(order, "payment"),
        recyclable: toInt(getText(order, "recyclable")),
        gift: toInt(getText(order, "gift")),
        giftMessage: getText(order, "gift_message"),
        mobileTheme: toInt(getText(order, "mobile_theme")),
        totalDiscounts: toFloat(getText(order, "total_discounts")),
        totalDiscountsTaxIncl: toFloat(getText(order, "total_discounts_tax_incl")),
        totalDiscountsTaxExcl: toFloat(getText(order, "total_discounts_tax_excl")),
        totalPaid: toFloat(getText(order, "total_paid")),
        totalPaidTaxIncl: toFloat(getText(order, "total_paid_tax_incl")),
        totalPaidTaxExcl: toFloat(getText(order, "total_paid_tax_excl")),
        totalPaidReal: toFloat(getText(order, "total_paid_real")),
        totalProducts: toFloat(getText(order, "total_products")),
        totalProductsWt: toFloat(getText(order, "total_products_wt")),
        totalShipping: toFloat(getText(order, "total_shipping")),
        totalShippingTaxIncl: toFloat(getText(order, "total_shipping_tax_incl")),
        totalShippingTaxExcl: toFloat(getText(order, "total_shipping_tax_excl")),
        carrierTaxRate: toFloat(getText(order, "carrier_tax_rate")),
        totalWrapping: toFloat(getText(order, "total_wrapping")),
        totalWrappingTaxIncl: toFloat(getText(order, "total_wrapping_tax_incl")),
        totalWrappingTaxExcl: toFloat(getText(order, "total_wrapping_tax_excl")),
        roundMode: getText(order, "round_mode"),
        roundType: getText(order, "round_type"),
        conversionRate: toFloat(getText(order, "conversion_rate")),
        reference: getText(order, "reference"),
    }
}

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    let nodes = Array.from(doc.querySelectorAll("orders > order"))

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("order"))
    }

    const serializer = new XMLSerializer()

    return nodes
        .map((node) => toJSON(serializer.serializeToString(node)))
        .filter((value) => value != null)
}