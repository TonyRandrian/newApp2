import {formatDateTime, getText, toDate, toInt, toBool} from "../utils/utils.js"

export const toXML = (data) => {
    const name = data?.name ?? ""
    const slug = data?.slug ?? ""
    const description = data?.description ?? ""
    const metaTitle = data?.metaTitle ?? ""
    const metaDescription = data?.metaDescription ?? ""
    const metaKeywords = data?.metaKeywords ?? ""
    const parentId = data?.parentId ?? 2
    const active = data?.active ?? 1
    const idShopDefault = data?.idShopDefault ?? 1
    const isRootCategory = data?.isRootCategory ?? 0
    const position = data?.position ?? 0

    return `<?xml version="1.0" encoding="UTF-8"?>
            <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
              <category>
                <id_parent>${parentId}</id_parent>
                <active>${active}</active>
                <id_shop_default>${idShopDefault}</id_shop_default>
                <is_root_category>${isRootCategory}</is_root_category>
                <position>${position}</position>
                <date_add>${formatDateTime(data?.dateAdd ?? "")}</date_add>
                <date_upd>${formatDateTime(data?.dateUpd ?? "")}</date_upd>
                <name>
                  <language id="1"><![CDATA[${name}]]></language>
                  <language id="2"><![CDATA[]]></language>
                  <language id="3"><![CDATA[]]></language>
                </name>
                <description>
                  <language id="1"><![CDATA[${description}]]></language>
                  <language id="2"><![CDATA[]]></language>
                  <language id="3"><![CDATA[]]></language>
                </description>
                <link_rewrite>
                  <language id="1"><![CDATA[${slug}]]></language>
                  <language id="2"><![CDATA[]]></language>
                  <language id="3"><![CDATA[]]></language>
                </link_rewrite>
                <meta_title>
                  <language id="1"><![CDATA[${metaTitle || name}]]></language>
                </meta_title>
                <meta_description>
                  <language id="1"><![CDATA[${metaDescription}]]></language>
                </meta_description>
                <meta_keywords>
                  <language id="1"><![CDATA[${metaKeywords}]]></language>
                </meta_keywords>
              </category>
            </prestashop>`
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const category = doc.querySelector("category")

    if (!category) {
        return null
    }

    return {
        id: toInt(getText(category, "id")),
        parentId: toInt(getText(category, "id_parent")),
        levelDepth: toInt(getText(category, "level_depth")),
        nbProductsRecursive: toInt(getText(category, "nb_products_recursive")),
        active: toBool(getText(category, "active")),
        idShopDefault: toInt(getText(category, "id_shop_default")),
        isRootCategory: toBool(getText(category, "is_root_category")),
        position: toInt(getText(category, "position")),
        dateAdd: toDate(getText(category, "date_add")),
        dateUpd: toDate(getText(category, "date_upd")),
        name: getText(category, 'name > language[id="1"]'),
        slug: getText(category, 'link_rewrite > language[id="1"]'),
        description: getText(category, 'description > language[id="1"]'),
        metaTitle: getText(category, 'meta_title > language[id="1"]'),
        metaDescription: getText(category, 'meta_description > language[id="1"]'),
        metaKeywords: getText(category, 'meta_keywords > language[id="1"]'),
    }
}

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
      return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    let nodes = Array.from(doc.querySelectorAll("categories > category"))

    if (nodes.length === 0) {
      nodes = Array.from(doc.querySelectorAll("category"))
    }

    const serializer = new XMLSerializer()

    return nodes
      .map((node) => toJSON(serializer.serializeToString(node)))
      .filter((value) => value != null)
}
