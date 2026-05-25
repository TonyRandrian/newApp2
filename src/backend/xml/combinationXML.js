import {getText, toInt, toBool, toFloat} from "../utils/utils.js"

export const toXML = (data) => {
    const productId = data?.productId ?? ""
    const ean13 = data?.ean13 ?? ""
    const isbn = data?.isbn ?? ""
    const upc = data?.upc ?? ""
    const mpn = data?.mpn ?? ""
    const reference = data?.reference ?? ""
    const supplierReference = data?.supplierReference ?? ""
    const location = data?.location ?? ""
    const wholesalePrice = data?.wholesalePrice ?? 0
    const priceImpact = data?.priceImpact ?? 0
    const ecotax = data?.ecotax ?? 0
    const weight = data?.weight ?? 0
    const unitPriceImpact = data?.unitPriceImpact ?? 0
    const minimalQuantity = data?.minimalQuantity ?? 1
    const lowStockThreshold = data?.lowStockThreshold ?? 0
    const lowStockAlert = data?.lowStockAlert ?? 0
    const defaultOn = data?.defaultOn ?? 0
    const availableDate = data?.availableDate ?? "0000-00-00"
    const availableNow = data?.availableNow ?? ""
    const availableLater = data?.availableLater ?? ""
    const optionValueIds = data?.optionValueIds ?? []
    const imageIds = data?.imageIds ?? []

    const optionValueNodes = (optionValueIds.length ? optionValueIds : [""])
        .map((id) => `<product_option_value>
                                        <id><![CDATA[${id}]]></id>
                                    </product_option_value>`,)
        .join("\n");

    const imageNodes = (imageIds.length ? imageIds : [""])
        .map((id) => `<image>
                                        <id><![CDATA[${id}]]></id>
                                    </image>`,)
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
            <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
              <combination>
                <id_product><![CDATA[${productId}]]></id_product>
                <ean13><![CDATA[${ean13}]]></ean13>
                <isbn><![CDATA[${isbn}]]></isbn>
                <upc><![CDATA[${upc}]]></upc>
                <mpn><![CDATA[${mpn}]]></mpn>
                <reference><![CDATA[${reference}]]></reference>
                <supplier_reference><![CDATA[${supplierReference}]]></supplier_reference>
                <location><![CDATA[${location}]]></location>
                <wholesale_price><![CDATA[${wholesalePrice}]]></wholesale_price>
                <price><![CDATA[${priceImpact}]]></price>
                <ecotax><![CDATA[${ecotax}]]></ecotax>
                <weight><![CDATA[${weight}]]></weight>
                <unit_price_impact><![CDATA[${unitPriceImpact}]]></unit_price_impact>
                <minimal_quantity><![CDATA[${minimalQuantity}]]></minimal_quantity>
                <low_stock_threshold><![CDATA[${lowStockThreshold}]]></low_stock_threshold>
                <low_stock_alert><![CDATA[${lowStockAlert}]]></low_stock_alert>
                <default_on><![CDATA[${defaultOn}]]></default_on>
                <available_date><![CDATA[${availableDate}]]></available_date>
                <available_now>
                  <language id="1"><![CDATA[${availableNow}]]></language>
                  <language id="2"><![CDATA[]]></language>
                  <language id="3"><![CDATA[]]></language>
                </available_now>
                <available_later>
                  <language id="1"><![CDATA[${availableLater}]]></language>
                  <language id="2"><![CDATA[]]></language>
                  <language id="3"><![CDATA[]]></language>
                </available_later>
                <associations>
                  <product_option_values>
                    ${optionValueNodes}
                  </product_option_values>
                  <images>
                    ${imageNodes}
                  </images>
                </associations>
              </combination>
            </prestashop>`;
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const combination = doc.querySelector("combination")

    if (!combination) {
        return null
    }

    const optionValueIds = Array.from(combination.querySelectorAll("product_option_values product_option_value id"))
        .map(el => el.textContent.trim())
        .filter(id => id)

    const imageIds = Array.from(combination.querySelectorAll("images image id"))
        .map(el => el.textContent.trim())
        .filter(id => id)

    return {
        id: toInt(getText(combination, "id")),
        productId: toInt(getText(combination, "id_product")),
        ean13: getText(combination, "ean13"),
        isbn: getText(combination, "isbn"),
        upc: getText(combination, "upc"),
        mpn: getText(combination, "mpn"),
        reference: getText(combination, "reference"),
        supplierReference: getText(combination, "supplier_reference"),
        location: getText(combination, "location"),
        wholesalePrice: toFloat(getText(combination, "wholesale_price")),
        priceImpact: toFloat(getText(combination, "price")),
        ecotax: toFloat(getText(combination, "ecotax")),
        weight: toFloat(getText(combination, "weight")),
        unitPriceImpact: toFloat(getText(combination, "unit_price_impact")),
        minimalQuantity: toInt(getText(combination, "minimal_quantity")),
        lowStockThreshold: toInt(getText(combination, "low_stock_threshold")),
        lowStockAlert: toBool(getText(combination, "low_stock_alert")),
        defaultOn: toBool(getText(combination, "default_on")),
        availableDate: getText(combination, "available_date"),
        availableNow: getText(combination, 'available_now > language[id="1"]'),
        availableLater: getText(combination, 'available_later > language[id="1"]'),
        optionValueIds: optionValueIds,
        imageIds: imageIds,
    }
}

    export const toJSONList = (xml) => {
      if (!xml || typeof xml !== "string") {
        return []
      }

      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, "application/xml")
      const combinations = Array.from(doc.querySelectorAll("combinations combination"))

      return combinations
        .map((node) => ({
          id: toInt(getText(node, "id")),
          productId: toInt(getText(node, "id_product")),
          ean13: getText(node, "ean13"),
          isbn: getText(node, "isbn"),
          upc: getText(node, "upc"),
          mpn: getText(node, "mpn"),
          reference: getText(node, "reference"),
          supplierReference: getText(node, "supplier_reference"),
          location: getText(node, "location"),
          wholesalePrice: toFloat(getText(node, "wholesale_price")),
          priceImpact: toFloat(getText(node, "price")),
          ecotax: toFloat(getText(node, "ecotax")),
          weight: toFloat(getText(node, "weight")),
          unitPriceImpact: toFloat(getText(node, "unit_price_impact")),
          minimalQuantity: toInt(getText(node, "minimal_quantity")),
          lowStockThreshold: toInt(getText(node, "low_stock_threshold")),
          lowStockAlert: toBool(getText(node, "low_stock_alert")),
          defaultOn: toBool(getText(node, "default_on")),
          availableDate: getText(node, "available_date"),
          availableNow: getText(node, 'available_now > language[id="1"]'),
          availableLater: getText(node, 'available_later > language[id="1"]'),
          optionValueIds: Array.from(node.querySelectorAll("product_option_values product_option_value id"))
            .map((el) => el.textContent.trim())
            .filter((id) => id),
          imageIds: Array.from(node.querySelectorAll("images image id"))
            .map((el) => el.textContent.trim())
            .filter((id) => id),
        }))
        .filter((item) => item.id != null)
    }
