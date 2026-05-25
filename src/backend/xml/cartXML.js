import {formatDateTime, getText, toDate, toInt} from "../utils/utils.js";

export const toXML = (data) => {
    const rows = Array.isArray(data?.cartRows) ? data.cartRows : []

        const rowNodes = rows
                .map((row) => {
                        return `
                        <cart_row>
                            <id_product>${row?.productId ?? ""}</id_product>
                            <id_product_attribute>${row?.productAttributeId ?? ""}</id_product_attribute>
                            <id_address_delivery>${row?.addressDeliveryId ?? ""}</id_address_delivery>
                            <id_customization>${row?.customizationId ?? ""}</id_customization>
                            <quantity>${row?.quantity ?? ""}</quantity>
                        </cart_row>`
                })
                .join("")

    return `
      <?xml version="1.0" encoding="UTF-8"?>
    <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
        <cart>
                    ${data?.id != null ? `<id>${data.id}</id>` : ""}
          <id_customer>${data?.customerId ?? ""}</id_customer>
          <id_guest>${data?.idGuest ?? ""}</id_guest>
          <id_address_delivery>${data?.addressDeliveryId ?? ""}</id_address_delivery>
          <id_address_invoice>${data?.addressInvoiceId ?? ""}</id_address_invoice>
          <id_currency>${data?.currencyId ?? ""}</id_currency>
          <id_lang>${data?.langId ?? ""}</id_lang>
          <id_carrier>${data?.carrierId ?? ""}</id_carrier>
          <id_shop>${data?.shopId ?? ""}</id_shop>
          <id_shop_group>${data?.shopGroupId ?? ""}</id_shop_group>
          <secure_key><![CDATA[${data?.secureKey ?? ""}]]></secure_key>
          <recyclable>${data?.recyclable ?? 0}</recyclable>
          <gift>${data?.gift ?? 0}</gift>
          <gift_message><![CDATA[${data?.giftMessage ?? ""}]]></gift_message>
          <mobile_theme>${data?.mobileTheme ?? 0}</mobile_theme>
          <delivery_option><![CDATA[${data?.deliveryOption ?? ""}]]></delivery_option>
          <allow_seperated_package>${data?.allowSeperatedPackage ?? 0}</allow_seperated_package>
          <date_add>${formatDateTime(data?.dateAdd ?? "")}</date_add>
          <date_upd>${formatDateTime(data?.dateUpd ?? "")}</date_upd>
          ${rows.length > 0 ? `<associations>
            <cart_rows>${rowNodes}
            </cart_rows>
          </associations>` : ""}
        </cart>
      </prestashop>
      `
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const cart = doc.querySelector("cart")

    if (!cart) {
        return null
    }

    const rows = Array.from(cart.querySelectorAll("associations cart_rows cart_row")).map((row) => {
        const getRowText = (tag) => {
            const node = row.querySelector(tag)
            return node ? node.textContent.trim() : ""
        }

        return {
            productId: toInt(getRowText("id_product")),
            productAttributeId: toInt(getRowText("id_product_attribute")),
            addressDeliveryId: toInt(getRowText("id_address_delivery")),
            quantity: toInt(getRowText("quantity")),
            customizationId: toInt(getRowText("id_customization")),
        }
    })

    return {
        id: toInt(getText(cart, "id")),
        customerId: toInt(getText(cart, "id_customer")),
        idGuest: toInt(getText(cart, "id_guest")),
        addressDeliveryId: toInt(getText(cart, "id_address_delivery")),
        addressInvoiceId: toInt(getText(cart, "id_address_invoice")),
        currencyId: toInt(getText(cart, "id_currency")),
        langId: toInt(getText(cart, "id_lang")),
        carrierId: toInt(getText(cart, "id_carrier")),
        shopId: toInt(getText(cart, "id_shop")),
        shopGroupId: toInt(getText(cart, "id_shop_group")),
        secureKey: getText(cart, "secure_key"),
        recyclable: toInt(getText(cart, "recyclable")),
        gift: toInt(getText(cart, "gift")),
        giftMessage: getText(cart, "gift_message"),
        mobileTheme: toInt(getText(cart, "mobile_theme")),
        deliveryOption: getText(cart, "delivery_option"),
        allowSeperatedPackage: toInt(getText(cart, "allow_seperated_package")),
        dateAdd: toDate(getText(cart, "date_add")),
        dateUpd: toDate(getText(cart, "date_upd")),
        cartRows: rows,
    }
}

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    let nodes = Array.from(doc.querySelectorAll("carts > cart"))

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("cart"))
    }

    const serializer = new XMLSerializer()

    return nodes
        .map((node) => toJSON(serializer.serializeToString(node)))
        .filter((value) => value != null)
}
