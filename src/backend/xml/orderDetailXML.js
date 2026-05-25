import { getText, toFloat, toInt } from "../utils/utils.js"

export const toXML = (data) => {
    const taxIds = Array.isArray(data?.taxIds) ? data.taxIds : [""]
    const taxNodes = (taxIds.length ? taxIds : [""])
        .map((id) => `<tax>
				<id><![CDATA[${id}]]></id>
			</tax>`)
        .join("\n")

    return `<?xml version="1.0" encoding="UTF-8"?>
            <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
                <order_detail>
                    <id_order><![CDATA[${data?.orderId ?? ""}]]></id_order>
                    <product_id><![CDATA[${data?.productId ?? ""}]]></product_id>
                    <product_attribute_id><![CDATA[${data?.productAttributeId ?? ""}]]></product_attribute_id>
                    <product_quantity_reinjected><![CDATA[${data?.productQuantityReinjected ?? 0}]]></product_quantity_reinjected>
                    <group_reduction><![CDATA[${data?.groupReduction ?? 0}]]></group_reduction>
                    <discount_quantity_applied><![CDATA[${data?.discountQuantityApplied ?? 0}]]></discount_quantity_applied>
                    <download_hash><![CDATA[${data?.downloadHash ?? ""}]]></download_hash>
                    <download_deadline><![CDATA[${data?.downloadDeadline ?? ""}]]></download_deadline>
                    <id_order_invoice><![CDATA[${data?.orderInvoiceId ?? ""}]]></id_order_invoice>
                    <id_warehouse><![CDATA[${data?.warehouseId ?? ""}]]></id_warehouse>
                    <id_shop><![CDATA[${data?.shopId ?? ""}]]></id_shop>
                    <id_customization><![CDATA[${data?.customizationId ?? ""}]]></id_customization>
                    <product_name><![CDATA[${data?.productName ?? ""}]]></product_name>
                    <product_quantity><![CDATA[${data?.productQuantity ?? 0}]]></product_quantity>
                    <product_quantity_in_stock><![CDATA[${data?.productQuantityInStock ?? 0}]]></product_quantity_in_stock>
                    <product_quantity_return><![CDATA[${data?.productQuantityReturn ?? 0}]]></product_quantity_return>
                    <product_quantity_refunded><![CDATA[${data?.productQuantityRefunded ?? 0}]]></product_quantity_refunded>
                    <product_price><![CDATA[${data?.productPrice ?? 0}]]></product_price>
                    <reduction_percent><![CDATA[${data?.reductionPercent ?? 0}]]></reduction_percent>
                    <reduction_amount><![CDATA[${data?.reductionAmount ?? 0}]]></reduction_amount>
                    <reduction_amount_tax_incl><![CDATA[${data?.reductionAmountTaxIncl ?? 0}]]></reduction_amount_tax_incl>
                    <reduction_amount_tax_excl><![CDATA[${data?.reductionAmountTaxExcl ?? 0}]]></reduction_amount_tax_excl>
                    <product_quantity_discount><![CDATA[${data?.productQuantityDiscount ?? 0}]]></product_quantity_discount>
                    <product_ean13><![CDATA[${data?.productEan13 ?? ""}]]></product_ean13>
                    <product_isbn><![CDATA[${data?.productIsbn ?? ""}]]></product_isbn>
                    <product_upc><![CDATA[${data?.productUpc ?? ""}]]></product_upc>
                    <product_mpn><![CDATA[${data?.productMpn ?? ""}]]></product_mpn>
                    <product_reference><![CDATA[${data?.productReference ?? ""}]]></product_reference>
                    <product_supplier_reference><![CDATA[${data?.productSupplierReference ?? ""}]]></product_supplier_reference>
                    <product_weight><![CDATA[${data?.productWeight ?? 0}]]></product_weight>
                    <tax_computation_method><![CDATA[${data?.taxComputationMethod ?? ""}]]></tax_computation_method>
                    <id_tax_rules_group><![CDATA[${data?.taxRulesGroupId ?? ""}]]></id_tax_rules_group>
                    <ecotax><![CDATA[${data?.ecotax ?? 0}]]></ecotax>
                    <ecotax_tax_rate><![CDATA[${data?.ecotaxTaxRate ?? 0}]]></ecotax_tax_rate>
                    <download_nb><![CDATA[${data?.downloadNb ?? 0}]]></download_nb>
                    <unit_price_tax_incl><![CDATA[${data?.unitPriceTaxIncl ?? 0}]]></unit_price_tax_incl>
                    <unit_price_tax_excl><![CDATA[${data?.unitPriceTaxExcl ?? 0}]]></unit_price_tax_excl>
                    <total_price_tax_incl><![CDATA[${data?.totalPriceTaxIncl ?? 0}]]></total_price_tax_incl>
                    <total_price_tax_excl><![CDATA[${data?.totalPriceTaxExcl ?? 0}]]></total_price_tax_excl>
                    <total_shipping_price_tax_excl><![CDATA[${data?.totalShippingPriceTaxExcl ?? 0}]]></total_shipping_price_tax_excl>
                    <total_shipping_price_tax_incl><![CDATA[${data?.totalShippingPriceTaxIncl ?? 0}]]></total_shipping_price_tax_incl>
                    <purchase_supplier_price><![CDATA[${data?.purchaseSupplierPrice ?? 0}]]></purchase_supplier_price>
                    <original_product_price><![CDATA[${data?.originalProductPrice ?? 0}]]></original_product_price>
                    <original_wholesale_price><![CDATA[${data?.originalWholesalePrice ?? 0}]]></original_wholesale_price>
                    <total_refunded_tax_excl><![CDATA[${data?.totalRefundedTaxExcl ?? 0}]]></total_refunded_tax_excl>
                    <total_refunded_tax_incl><![CDATA[${data?.totalRefundedTaxIncl ?? 0}]]></total_refunded_tax_incl>
                    <associations>
                        <taxes nodeType="tax" api="taxes">
                            ${taxNodes}
                        </taxes>
                    </associations>
                </order_detail>
            </prestashop>`
}

export const toJSON = (xml) => {
    if (!xml || typeof xml !== "string") {
        return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const detail = doc.querySelector("order_detail")

    if (!detail) {
        return null
    }

    return {
        id: toInt(getText(detail, "id")),
        orderId: toInt(getText(detail, "id_order")),
        productId: toInt(getText(detail, "product_id")),
        productAttributeId: toInt(getText(detail, "product_attribute_id")),
        productQuantityReinjected: toInt(getText(detail, "product_quantity_reinjected")),
        groupReduction: toInt(getText(detail, "group_reduction")),
        discountQuantityApplied: toInt(getText(detail, "discount_quantity_applied")),
        downloadHash: getText(detail, "download_hash"),
        downloadDeadline: getText(detail, "download_deadline"),
        orderInvoiceId: toInt(getText(detail, "id_order_invoice")),
        warehouseId: toInt(getText(detail, "id_warehouse")),
        shopId: toInt(getText(detail, "id_shop")),
        customizationId: toInt(getText(detail, "id_customization")),
        productName: getText(detail, "product_name"),
        productQuantity: toInt(getText(detail, "product_quantity")),
        productQuantityInStock: toInt(getText(detail, "product_quantity_in_stock")),
        productQuantityReturn: toInt(getText(detail, "product_quantity_return")),
        productQuantityRefunded: toInt(getText(detail, "product_quantity_refunded")),
        productPrice: toFloat(getText(detail, "product_price")),
        reductionPercent: toInt(getText(detail, "reduction_percent")),
        reductionAmount: toFloat(getText(detail, "reduction_amount")),
        reductionAmountTaxIncl: toFloat(getText(detail, "reduction_amount_tax_incl")),
        reductionAmountTaxExcl: toFloat(getText(detail, "reduction_amount_tax_excl")),
        productQuantityDiscount: toInt(getText(detail, "product_quantity_discount")),
        productEan13: getText(detail, "product_ean13"),
        productIsbn: getText(detail, "product_isbn"),
        productUpc: getText(detail, "product_upc"),
        productMpn: getText(detail, "product_mpn"),
        productReference: getText(detail, "product_reference"),
        productSupplierReference: getText(detail, "product_supplier_reference"),
        productWeight: toFloat(getText(detail, "product_weight")),
        taxComputationMethod: getText(detail, "tax_computation_method"),
        taxRulesGroupId: toInt(getText(detail, "id_tax_rules_group")),
        ecotax: toFloat(getText(detail, "ecotax")),
        ecotaxTaxRate: toFloat(getText(detail, "ecotax_tax_rate")),
        downloadNb: toInt(getText(detail, "download_nb")),
        unitPriceTaxIncl: toFloat(getText(detail, "unit_price_tax_incl")),
        unitPriceTaxExcl: toFloat(getText(detail, "unit_price_tax_excl")),
        totalPriceTaxIncl: toFloat(getText(detail, "total_price_tax_incl")),
        totalPriceTaxExcl: toFloat(getText(detail, "total_price_tax_excl")),
        totalShippingPriceTaxExcl: toFloat(getText(detail, "total_shipping_price_tax_excl")),
        totalShippingPriceTaxIncl: toFloat(getText(detail, "total_shipping_price_tax_incl")),
        purchaseSupplierPrice: toFloat(getText(detail, "purchase_supplier_price")),
        originalProductPrice: toFloat(getText(detail, "original_product_price")),
        originalWholesalePrice: toFloat(getText(detail, "original_wholesale_price")),
        totalRefundedTaxExcl: toFloat(getText(detail, "total_refunded_tax_excl")),
        totalRefundedTaxIncl: toFloat(getText(detail, "total_refunded_tax_incl")),
    }
}

export const toJSONList = (xml) => {
    if (!xml || typeof xml !== "string") {
        return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    let nodes = Array.from(doc.querySelectorAll("order_details > order_detail"))

    if (nodes.length === 0) {
        nodes = Array.from(doc.querySelectorAll("order_detail"))
    }

    const serializer = new XMLSerializer()

    return nodes
        .map((node) => toJSON(serializer.serializeToString(node)))
        .filter((value) => value != null)
}