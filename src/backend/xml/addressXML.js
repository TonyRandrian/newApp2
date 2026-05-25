import {getText, toBool, toDate, toInt} from "../utils/utils.js";

export const toXML = (data) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
    <address>
        ${data?.id != null ? `<id>${data.id}</id>` : ""}
        <id_customer>${data?.idCustomer ?? ""}</id_customer>
        <id_manufacturer>${data?.idManufacturer ?? ""}</id_manufacturer>
        <id_supplier>${data?.idSupplier ?? ""}</id_supplier>
        <id_warehouse>${data?.idWarehouse ?? ""}</id_warehouse>
        <id_country>${data?.idCountry ?? ""}</id_country>
        <id_state>${data?.idState ?? ""}</id_state>
        <alias><![CDATA[${data?.alias ?? ""}]]></alias>
        <company><![CDATA[${data?.company ?? ""}]]></company>
        <lastname><![CDATA[${data?.lastname ?? ""}]]></lastname>
        <firstname><![CDATA[${data?.firstname ?? ""}]]></firstname>
        <vat_number><![CDATA[${data?.vatNumber ?? ""}]]></vat_number>
        <address1><![CDATA[${data?.address1 ?? ""}]]></address1>
        <address2><![CDATA[${data?.address2 ?? ""}]]></address2>
        <postcode><![CDATA[${data?.postcode ?? ""}]]></postcode>
        <city><![CDATA[${data?.city ?? ""}]]></city>
        <other><![CDATA[${data?.other ?? ""}]]></other>
        <phone><![CDATA[${data?.phone ?? ""}]]></phone>
        <phone_mobile><![CDATA[${data?.phoneMobile ?? ""}]]></phone_mobile>
        <dni><![CDATA[${data?.dni ?? ""}]]></dni>
        <deleted>${data?.deleted ?? ""}</deleted>
        <date_add>${data?.dateAdd ?? ""}</date_add>
        <date_upd>${data?.dateUpd ?? ""}</date_upd>
    </address>
</prestashop>`
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const address = doc.querySelector("address")

    if (!address) {
        return null
    }

    return {
        id: toInt(getText(address, "id")),
        idCustomer: toInt(getText(address, "id_customer")),
        idManufacturer: toInt(getText(address, "id_manufacturer")),
        idSupplier: toInt(getText(address, "id_supplier")),
        idWarehouse: toInt(getText(address, "id_warehouse")),
        idCountry: toInt(getText(address, "id_country")),
        idState: toInt(getText(address, "id_state")),
        alias: getText(address, "alias"),
        company: getText(address, "company"),
        lastname: getText(address, "lastname"),
        firstname: getText(address, "firstname"),
        vatNumber: getText(address, "vat_number"),
        address1: getText(address, "address1"),
        address2: getText(address, "address2"),
        postcode: getText(address, "postcode"),
        city: getText(address, "city"),
        other: getText(address, "other"),
        phone: getText(address, "phone"),
        phoneMobile: getText(address, "phone_mobile"),
        dni: getText(address, "dni"),
        deleted: toBool(getText(address, "deleted")),
        dateAdd: toDate(getText(address, "date_add")),
        dateUpd: toDate(getText(address, "date_upd")),
    }
}

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    let nodes = Array.from(doc.querySelectorAll("addresses > address"))

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("address"))
    }

    const serializer = new XMLSerializer()

    return nodes
        .map((node) => toJSON(serializer.serializeToString(node)))
        .filter((value) => value != null)
}