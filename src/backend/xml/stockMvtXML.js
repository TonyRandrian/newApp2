import { getText, toFloat, toInt } from "../utils/utils.js";

const getId = (node, tag) => {
    const el = node?.querySelector(tag)
    if (!el) return null
    const text = (el.textContent ?? "").trim()
    if (text !== "") return toInt(text)
    const href = el.getAttribute("xlink:href") || el.getAttribute("href")
    if (!href) return null
    const last = href.split("/").pop()
    return toInt(last)
}

const getMovementNodes = (doc) => {
    let nodes = Array.from(doc.querySelectorAll("stock_movements > stock_mvt"))

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("stock_mvt"))
    }

    return nodes
}

export const toXML = (data) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
        <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
            <stock_mvt>
                ${data.id ? `<id><![CDATA[${data.id}]]></id>` : ""}
                <id_product><![CDATA[${data?.idProduct ?? ""}]]></id_product>
                <id_product_attribute><![CDATA[${data?.idProductAttribute ?? ""}]]></id_product_attribute>
                <id_warehouse><![CDATA[${data?.idWarehouse ?? ""}]]></id_warehouse>
                <id_currency><![CDATA[${data?.idCurrency ?? ""}]]></id_currency>
                <management_type><![CDATA[${data?.managementType ?? ""}]]></management_type>
                <id_employee><![CDATA[${data?.idEmployee ?? ""}]]></id_employee>
                <id_stock><![CDATA[${data?.idStock ?? ""}]]></id_stock>
                <id_stock_mvt_reason><![CDATA[${data?.idStockMvtReason ?? ""}]]></id_stock_mvt_reason>
                <id_order><![CDATA[${data?.idOrder ?? ""}]]></id_order>
                <id_supply_order><![CDATA[${data?.idSupplyOrder ?? ""}]]></id_supply_order>

                <product_name>
                    <language id="1"><![CDATA[${data?.productName ?? ""}]]></language>
                </product_name>

                <ean13><![CDATA[${data?.ean13 ?? ""}]]></ean13>
                <upc><![CDATA[${data?.upc ?? ""}]]></upc>
                <reference><![CDATA[${data?.reference ?? ""}]]></reference>
                <mpn><![CDATA[${data?.mpn ?? ""}]]></mpn>

                <physical_quantity><![CDATA[${data?.physicalQuantity ?? ""}]]></physical_quantity>
                <sign><![CDATA[${data?.sign ?? ""}]]></sign>
                <last_wa><![CDATA[${data?.lastWa ?? ""}]]></last_wa>
                <current_wa><![CDATA[${data?.currentWa ?? ""}]]></current_wa>
                <price_te><![CDATA[${data?.priceTe ?? ""}]]></price_te>
                <date_add><![CDATA[${data?.dateAdd ?? ""}]]></date_add>
            </stock_mvt>
        </prestashop>`;
};

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const stockMvt = doc.querySelector("stock_mvt");

    if (!stockMvt) {
        return null;
    }

    return {
        id: getId(stockMvt, "id"),
        idProduct: getId(stockMvt, "id_product"),
        idProductAttribute: getId(stockMvt, "id_product_attribute"),
        idWarehouse: getId(stockMvt, "id_warehouse"),
        idCurrency: getId(stockMvt, "id_currency"),
        managementType: getText(stockMvt, "management_type"),
        idEmployee: getId(stockMvt, "id_employee"),
        idStock: getId(stockMvt, "id_stock"),
        idStockMvtReason: getId(stockMvt, "id_stock_mvt_reason"),
        idOrder: getId(stockMvt, "id_order"),
        idSupplyOrder: getId(stockMvt, "id_supply_order"),
        productName: getText(stockMvt, "product_name language"),
        ean13: getText(stockMvt, "ean13"),
        upc: getText(stockMvt, "upc"),
        reference: getText(stockMvt, "reference"),
        mpn: getText(stockMvt, "mpn"),
        physicalQuantity: toInt(getText(stockMvt, "physical_quantity")),
        sign: toInt(getText(stockMvt, "sign")),
        lastWa: toFloat(getText(stockMvt, "last_wa")),
        currentWa: toFloat(getText(stockMvt, "current_wa")),
        priceTe: toFloat(getText(stockMvt, "price_te")),
        dateAdd: getText(stockMvt, "date_add"),
    };
};

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return [];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    let nodes = Array.from(doc.querySelectorAll("stock_mvts > stock_mvt"));

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("stock_mvt"));
    }

    const serializer = new XMLSerializer();

    return nodes
        .map((node) => toJSON(serializer.serializeToString(node)))
        .filter((value) => value != null);
};

