import Product from "../entities/Product"
import { roundDecimal } from "../utils/utils"

// order_state default ids
const PAIEMENT_A_DISTANCE_ACCEPTE_ID = 11

// order param defaults
const VALID_FLAG = 0
const CONVERSION_RATE = 1.000000
const TOTAL_DISCOUNTS = 0.000000
const TOTAL_DISCOUNTS_TAX_INCL = 0.000000
const TOTAL_DISCOUNTS_TAX_EXCL = 0.000000

// payment defaults
const PAYMENT_MODULE = "ps_cashondelivery"
const PAYMENT_LABEL = "Cash on delivery"

// default attributes for order creation
const LANGUAGE_ID = 1
const SHOP_ID = 1
const SHOP_GROUP_ID = 1

export default class OrderPayload {
	constructor(data = {}) {
		this.addressDeliveryId = data.addressDeliveryId ?? 0
		this.addressInvoiceId = data.addressInvoiceId ?? 0
		this.cartId = data.cartId ?? 0
		this.currencyId = data.currencyId ?? 0
		this.langId = data.langId ?? LANGUAGE_ID
		this.customerId = data.customerId ?? 0
		this.carrierId = data.carrierId ?? 0
		this.currentState = data.currentState ?? PAIEMENT_A_DISTANCE_ACCEPTE_ID
		this.module = data.module ?? PAYMENT_MODULE
		this.valid = data.valid ?? VALID_FLAG
		this.dateAdd = data.dateAdd ?? ""
		this.dateUpd = data.dateUpd ?? ""
		this.payment = data.payment ?? PAYMENT_LABEL
		this.recyclable = data.recyclable ?? 0
		this.gift = data.gift ?? 0
		this.giftMessage = data.giftMessage ?? ""
		this.mobileTheme = data.mobileTheme ?? 0
		this.totalDiscounts = data.totalDiscounts ?? TOTAL_DISCOUNTS
		this.totalDiscountsTaxIncl = data.totalDiscountsTaxIncl ?? TOTAL_DISCOUNTS_TAX_INCL
		this.totalDiscountsTaxExcl = data.totalDiscountsTaxExcl ?? TOTAL_DISCOUNTS_TAX_EXCL
		this.totalPaid = data.totalPaid ?? 0
		this.totalPaidTaxIncl = data.totalPaidTaxIncl ?? 0
		this.totalPaidTaxExcl = data.totalPaidTaxExcl ?? 0
		this.totalPaidReal = data.totalPaidReal ?? 0
		this.totalProducts = data.totalProducts ?? 0
		this.totalProductsWt = data.totalProductsWt ?? 0
		this.totalShipping = data.totalShipping ?? 0
		this.totalShippingTaxIncl = data.totalShippingTaxIncl ?? 0
		this.totalShippingTaxExcl = data.totalShippingTaxExcl ?? 0
		this.carrierTaxRate = data.carrierTaxRate ?? 0
		this.totalWrapping = data.totalWrapping ?? 0
		this.totalWrappingTaxIncl = data.totalWrappingTaxIncl ?? 0
		this.totalWrappingTaxExcl = data.totalWrappingTaxExcl ?? 0
		this.roundMode = data.roundMode ?? ""
		this.roundType = data.roundType ?? ""
		this.conversionRate = data.conversionRate ?? CONVERSION_RATE
		this.reference = data.reference ?? ""
		this.shopId = data.shopId ?? SHOP_ID
		this.shopGroupId = data.shopGroupId ?? SHOP_GROUP_ID
		this.orderRows = Array.isArray(data.orderRows) ? data.orderRows : []
	}

	static toNumber(value) {
		const num = Number(value)
		return Number.isFinite(num) ? num : 0
	}

	static toSafeQty(value) {
		return Math.max(1, Math.trunc(OrderPayload.toNumber(value)))
	}

	static async getRowPriceTtc(product, attributeId) {
		if (!product) return NaN

		const attrId = OrderPayload.toNumber(attributeId)
		let priceTtc = 0

		if (attrId) {
			const combination = await product.getCombinationById(attrId)
			if (combination) {
				priceTtc = await product.getCombinationTtcPrice(combination)
			}
		}

		if (!Number.isFinite(priceTtc) || priceTtc === 0) {
			priceTtc = await product.getTtcPrice()
		}

		return priceTtc
	}

	static async computeRowTotals(product, attributeId, qty) {
		const priceTtc = await OrderPayload.getRowPriceTtc(product, attributeId)
		if (!Number.isFinite(priceTtc)) {
			return { rowHt: 0, rowTtc: 0 }
		}

		const taxRate = Number(await product.getTax()) || 0
		const divisor = 1 + taxRate / 100
		const priceHt = divisor ? priceTtc / divisor : priceTtc

		return {
			rowHt: priceHt * qty,
			rowTtc: priceTtc * qty,
		}
	}

	static async computeOrderTotals(cartRows = []) {
		let totalHt = 0
		let totalTtc = 0

		const productApi = new Product({}, false)

		for (const row of cartRows ?? []) {
			const productId = OrderPayload.toNumber(row?.productId)
			if (!productId) {
				continue
			}

			const product = await productApi.getById(productId)
			const qty = OrderPayload.toSafeQty(row?.quantity)
			if (!qty) {
				continue
			}

			const { rowHt, rowTtc } = await OrderPayload.computeRowTotals(
				product,
				row?.productAttributeId,
				qty,
			)

			totalHt += rowHt
			totalTtc += rowTtc
		}

		return {
			totalHt: roundDecimal(totalHt),
			totalTtc: roundDecimal(totalTtc),
		}
	}

	static buildTotalsPayload(totals) {
		return {
			totalPaid: totals.totalTtc,
			totalPaidTaxIncl: totals.totalTtc,
			totalPaidTaxExcl: totals.totalHt,
			totalPaidReal: totals.totalTtc,
			totalProducts: totals.totalHt,
			totalProductsWt: totals.totalTtc,
		}
	}

	static buildOrderRows(cartRows = []) {
		if (!Array.isArray(cartRows) || cartRows.length === 0) return []

		return cartRows.map((row) => ({
			productId: OrderPayload.toNumber(row?.productId),
			productAttributeId: OrderPayload.toNumber(row?.productAttributeId),
			productQuantity: OrderPayload.toNumber(row?.quantity ?? row?.productQuantity),
			customizationId: OrderPayload.toNumber(row?.customizationId),
		}))
	}

	static fromCart(cart, data = {}) {
		const cartRows = cart?.cartRows ?? []

		return new OrderPayload({
			...data,
			cartId: data.cartId ?? cart?.id ?? 0,
			customerId: data.customerId ?? cart?.customerId ?? 0,
			addressDeliveryId: data.addressDeliveryId ?? cart?.addressDeliveryId ?? 0,
			addressInvoiceId: data.addressInvoiceId ?? cart?.addressInvoiceId ?? 0,
			currencyId: data.currencyId ?? cart?.currencyId ?? 0,
			langId: data.langId ?? cart?.langId ?? 0,
			carrierId: data.carrierId ?? cart?.carrierId ?? 0,
			orderRows: OrderPayload.buildOrderRows(cartRows),
		})
	}
}