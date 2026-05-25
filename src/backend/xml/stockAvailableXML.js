import {getText, toBool, toInt} from "../utils/utils.js";

const toBinary = (value) => (value === true || value === 1 || value === "1" ? 1 : 0)

export const toXML = (data) => {
    const productId = data?.productId ?? data?.idProduct ?? ""
    const productAttributeId = data?.productAttributeId ?? data?.idProductAttribute ?? ""
    const shopId = data?.shopId ?? data?.idShop ?? ""
    const shopGroupId = data?.shopGroupId ?? data?.idShopGroup ?? ""

    return `<?xml version="1.0" encoding="UTF-8"?>
            <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
              <stock_available>
                ${data.id ? `<id><![CDATA[${data.id}]]></id>` : ""}
                <id_product><![CDATA[${productId}]]></id_product>
                <id_product_attribute><![CDATA[${productAttributeId}]]></id_product_attribute>
                <id_shop><![CDATA[${shopId}]]></id_shop>
                <id_shop_group><![CDATA[${shopGroupId}]]></id_shop_group>
                <quantity><![CDATA[${data?.quantity ?? ""}]]></quantity>
                <depends_on_stock><![CDATA[${toBinary(data?.dependsOnStock)}]]></depends_on_stock>
                <out_of_stock><![CDATA[${data?.outOfStock ?? ""}]]></out_of_stock>
                <location><![CDATA[${data?.location ?? ""}]]></location>
              </stock_available>
            </prestashop>`
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const stock_available = doc.querySelector("stock_available")

    if (!stock_available) {
        return null
    }

    return {
        id: toInt(getText(stock_available, "id")),
        idProduct: toInt(getText(stock_available, "id_product")),
        idProductAttribute: toInt(getText(stock_available, "id_product_attribute")),
        idShop: toInt(getText(stock_available, "id_shop")),
        idShopGroup: toInt(getText(stock_available, "id_shop_group")),
        quantity: toInt(getText(stock_available, "quantity")),
        dependsOnStock: toBool(getText(stock_available, "depends_on_stock")),
        outOfStock: toInt(getText(stock_available, "out_of_stock")),
        location: getText(stock_available, "location"),
    }
}

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    let nodes = Array.from(doc.querySelectorAll("stock_availables > stock_available"))

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("stock_available"))
    }

    const serializer = new XMLSerializer()

    return nodes
        .map((node) => toJSON(serializer.serializeToString(node)))
        .filter((value) => value != null)
}