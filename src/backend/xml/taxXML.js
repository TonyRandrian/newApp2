import { getText, toBool, toFloat, toInt } from "../utils/utils.js";

export const toXML = (data) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
        <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
            <tax>
                ${data.id ? `<id><![CDATA[${data.id}]]></id>` : ""}
                <rate><![CDATA[${data?.rate ?? ""}]]></rate>
                <active><![CDATA[${data?.active ?? ""}]]></active>
                <deleted><![CDATA[${data?.deleted ?? ""}]]></deleted>

                <name>
                    <language id="1"><![CDATA[${data?.name ?? ""}]]></language>
                </name>
            </tax>
        </prestashop>`;
};

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const tax = doc.querySelector("tax");

    if (!tax) {
        return null;
    }

    return {
        id: toInt(getText(tax, "id")),
        rate: toFloat(getText(tax, "rate")),
        active: toBool(getText(tax, "active")),
        deleted: toBool(getText(tax, "deleted")),
        name: getText(tax, "name language"),
    };
};

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return [];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const taxes = Array.from(doc.querySelectorAll("taxes tax"));

    return taxes
        .map((tax) => ({
            id: toInt(getText(tax, "id")),
            rate: toFloat(getText(tax, "rate")),
            active: toBool(getText(tax, "active")),
            deleted: toBool(getText(tax, "deleted")),
            name: getText(tax, "name language"),
        }))
        .filter((tax) => tax.id != null);
};