import { getText, toBool, toInt } from "../utils/utils.js";

export const toXML = (data) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
        <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
            <tax_rule_group>
                ${data.id ? `<id><![CDATA[${data.id}]]></id>` : ""}
                <name><![CDATA[${data?.name ?? ""}]]></name>
                <active><![CDATA[${data?.active ?? ""}]]></active>
                <deleted><![CDATA[${data?.deleted ?? ""}]]></deleted>
                <date_add><![CDATA[${data?.dateAdd ?? ""}]]></date_add>
                <date_upd><![CDATA[${data?.dateUpd ?? ""}]]></date_upd>
            </tax_rule_group>
        </prestashop>`;
};

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const taxRuleGroup = doc.querySelector("tax_rule_group");

    if (!taxRuleGroup) {
        return null;
    }

    return {
        id: toInt(getText(taxRuleGroup, "id")),
        name: getText(taxRuleGroup, "name"),
        active: toBool(getText(taxRuleGroup, "active")),
        deleted: toBool(getText(taxRuleGroup, "deleted")),
        dateAdd: getText(taxRuleGroup, "date_add"),
        dateUpd: getText(taxRuleGroup, "date_upd"),
    };
};

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return [];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const groups = Array.from(doc.querySelectorAll("tax_rule_groups tax_rule_group"));

    return groups
        .map((group) => ({
            id: toInt(getText(group, "id")),
            name: getText(group, "name"),
            active: toBool(getText(group, "active")),
            deleted: toBool(getText(group, "deleted")),
            dateAdd: getText(group, "date_add"),
            dateUpd: getText(group, "date_upd"),
        }))
        .filter((group) => group.id != null);
};