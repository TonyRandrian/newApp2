import { getText, toInt } from "../utils/utils.js";

export const toXML = (data) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
        <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
            <tax_rule>
                ${data.id ? `<id><![CDATA[${data.id}]]></id>` : ""}
                <id_tax_rules_group><![CDATA[${data?.idTaxRulesGroup ?? ""}]]></id_tax_rules_group>
                <id_state><![CDATA[${data?.idState ?? ""}]]></id_state>
                <id_country><![CDATA[${data?.idCountry ?? ""}]]></id_country>
                <zipcode_from><![CDATA[${data?.zipcodeFrom ?? ""}]]></zipcode_from>
                <zipcode_to><![CDATA[${data?.zipcodeTo ?? ""}]]></zipcode_to>
                <id_tax><![CDATA[${data?.idTax ?? ""}]]></id_tax>
                <behavior><![CDATA[${data?.behavior ?? ""}]]></behavior>
                <description><![CDATA[${data?.description ?? ""}]]></description>
            </tax_rule>
        </prestashop>`;
};

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const taxRule = doc.querySelector("tax_rule");

    if (!taxRule) {
        return null;
    }

    return {
        id: toInt(getText(taxRule, "id")),
        idTaxRulesGroup: toInt(getText(taxRule, "id_tax_rules_group")),
        idState: toInt(getText(taxRule, "id_state")),
        idCountry: toInt(getText(taxRule, "id_country")),
        zipcodeFrom: getText(taxRule, "zipcode_from"),
        zipcodeTo: getText(taxRule, "zipcode_to"),
        idTax: toInt(getText(taxRule, "id_tax")),
        behavior: toInt(getText(taxRule, "behavior")),
        description: getText(taxRule, "description"),
    };
};

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return [];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const taxRules = Array.from(doc.querySelectorAll("tax_rules tax_rule"));

    return taxRules
        .map((taxRule) => ({
            id: toInt(getText(taxRule, "id")),
            idTaxRulesGroup: toInt(getText(taxRule, "id_tax_rules_group")),
            idState: toInt(getText(taxRule, "id_state")),
            idCountry: toInt(getText(taxRule, "id_country")),
            zipcodeFrom: getText(taxRule, "zipcode_from"),
            zipcodeTo: getText(taxRule, "zipcode_to"),
            idTax: toInt(getText(taxRule, "id_tax")),
            behavior: toInt(getText(taxRule, "behavior")),
            description: getText(taxRule, "description"),
        }))
        .filter((taxRule) => taxRule.id != null);
};