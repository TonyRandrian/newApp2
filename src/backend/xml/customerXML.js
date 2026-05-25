import {formatDate, formatDateTime, getText, toDate, toFloat, toInt} from "../utils/utils.js"

export const toXML = (data) => {
    const idDefaultGroup = data?.idDefaultGroup ?? 3
    const groupIds = Array.isArray(data?.groupIds) ? data.groupIds : [idDefaultGroup]

    const groupNodes = (groupIds.length ? groupIds : [idDefaultGroup])
        .map((id) => `<group>
            <id><![CDATA[${id}]]></id>
            </group>`)
        .join("\n")

    return `<?xml version="1.0" encoding="UTF-8"?>
            <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
                <customer>
                <id_default_group><![CDATA[${idDefaultGroup}]]></id_default_group>
                <id_lang><![CDATA[${data?.idLang ?? 1}]]></id_lang>
                <newsletter_date_add><![CDATA[${formatDateTime(data?.newsletterDateAdd ?? "")}]]></newsletter_date_add>
                <ip_registration_newsletter><![CDATA[${data?.ipRegistrationNewsletter ?? ""}]]></ip_registration_newsletter>
                <last_passwd_gen><![CDATA[${formatDateTime(data?.lastPasswdGen ?? "")}]]></last_passwd_gen>
                <secure_key><![CDATA[${data?.secureKey ?? ""}]]></secure_key>
                <deleted><![CDATA[${data?.deleted ?? 0}]]></deleted>
                <passwd><![CDATA[${data?.password ?? ""}]]></passwd>
                <lastname><![CDATA[${data?.lastname ?? ""}]]></lastname>
                <firstname><![CDATA[${data?.firstname ?? ""}]]></firstname>
                <email><![CDATA[${data?.email ?? ""}]]></email>
                <id_gender><![CDATA[${data?.idGender ?? ""}]]></id_gender>
                <birthday><![CDATA[${formatDate(data?.birthday ?? "")}]]></birthday>
                <newsletter><![CDATA[${data?.newsletter ?? 0}]]></newsletter>
                <optin><![CDATA[${data?.optin ?? 0}]]></optin>
                <website><![CDATA[${data?.website ?? ""}]]></website>
                <company><![CDATA[${data?.company ?? ""}]]></company>
                <siret><![CDATA[${data?.siret ?? ""}]]></siret>
                <ape><![CDATA[${data?.ape ?? ""}]]></ape>
                <outstanding_allow_amount><![CDATA[${data?.outstandingAllowAmount ?? ""}]]></outstanding_allow_amount>
                <show_public_prices><![CDATA[${data?.showPublicPrices ?? 0}]]></show_public_prices>
                <id_risk><![CDATA[${data?.idRisk ?? 0}]]></id_risk>
                <max_payment_days><![CDATA[${data?.maxPaymentDays ?? 0}]]></max_payment_days>
                <active><![CDATA[${data?.active ?? 1}]]></active>
                <note><![CDATA[${data?.note ?? ""}]]></note>
                <is_guest><![CDATA[${data?.isGuest ?? 0}]]></is_guest>
                <id_shop><![CDATA[${data?.idShop ?? 1}]]></id_shop>
                <id_shop_group><![CDATA[${data?.idShopGroup ?? 1}]]></id_shop_group>
                <date_add><![CDATA[${formatDateTime(data?.dateAdd ?? "")}]]></date_add>
                <date_upd><![CDATA[${formatDateTime(data?.dateUpd ?? "")}]]></date_upd>
                <reset_password_token><![CDATA[${data?.resetPasswordToken ?? ""}]]></reset_password_token>
                <reset_password_validity><![CDATA[${formatDateTime(data?.resetPasswordValidity ?? "")}]]></reset_password_validity>
                <associations>
                    <groups nodeType="group" api="groups">
                        ${groupNodes}
                    </groups>
                </associations>
                </customer>
            </prestashop>`
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const customer = doc.querySelector("customer")

    if (!customer) {
        return null
    }

    const groupIds = Array.from(customer.querySelectorAll("associations groups group id"))
        .map((node) => node.textContent.trim())
        .filter((id) => id)

    return {
        id: toInt(getText(customer, "id")),
        idDefaultGroup: toInt(getText(customer, "id_default_group")),
        idLang: toInt(getText(customer, "id_lang")),
        newsletterDateAdd: toDate(getText(customer, "newsletter_date_add")),
        ipRegistrationNewsletter: getText(customer, "ip_registration_newsletter"),
        lastPasswdGen: toDate(getText(customer, "last_passwd_gen")),
        secureKey: getText(customer, "secure_key"),
        deleted: toInt(getText(customer, "deleted")),
        password: getText(customer, "passwd"),
        lastname: getText(customer, "lastname"),
        firstname: getText(customer, "firstname"),
        email: getText(customer, "email"),
        idGender: toInt(getText(customer, "id_gender")),
        birthday: toDate(getText(customer, "birthday")),
        newsletter: toInt(getText(customer, "newsletter")),
        optin: toInt(getText(customer, "optin")),
        website: getText(customer, "website"),
        company: getText(customer, "company"),
        siret: getText(customer, "siret"),
        ape: getText(customer, "ape"),
        outstandingAllowAmount: toFloat(getText(customer, "outstanding_allow_amount")),
        showPublicPrices: toInt(getText(customer, "show_public_prices")),
        idRisk: toInt(getText(customer, "id_risk")),
        maxPaymentDays: toInt(getText(customer, "max_payment_days")),
        active: toInt(getText(customer, "active")),
        note: getText(customer, "note"),
        isGuest: toInt(getText(customer, "is_guest")),
        idShop: toInt(getText(customer, "id_shop")),
        idShopGroup: toInt(getText(customer, "id_shop_group")),
        dateAdd: toDate(getText(customer, "date_add")),
        dateUpd: toDate(getText(customer, "date_upd")),
        resetPasswordToken: getText(customer, "reset_password_token"),
        resetPasswordValidity: toDate(getText(customer, "reset_password_validity")),
        groupIds,
    }
}

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    let nodes = Array.from(doc.querySelectorAll("customers > customer"))

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("customer"))
    }

    const serializer = new XMLSerializer()

    return nodes
        .map((node) => toJSON(serializer.serializeToString(node)))
        .filter((value) => value != null)
}
