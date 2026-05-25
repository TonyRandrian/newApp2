import Product from "../entities/Product.js"
import { getOrderDayKey, getOrderStateLabel, pickOrderAmount } from "../utils/dashboardUtils.js"
import { normalizeNumber } from "../utils/utils.js"

export default class OrderDashboardDTO {
	constructor({
		order = null,
		orderState = null,
		orderDetails = [],
		dayKey = "",
		statusId = 0,
		statusLabel = "",
		totalHT = 0,
		totalTTC = 0,
		ordersCount = 0,
		linesCount = 0,
		products = [],
		categories = [],
	} = {}) {
		this.order = order
		this.orderState = orderState
		this.orderDetails = orderDetails
		this.dayKey = dayKey
		this.statusId = statusId
		this.statusLabel = statusLabel
		this.totalHT = totalHT
		this.totalTTC = totalTTC
		this.ordersCount = ordersCount
		this.linesCount = linesCount
		this.products = products
		this.categories = categories
	}

	static fromOrderAndDetails(order, orderDetails = [], orderState = null) {
		const lineTotalHT = orderDetails.reduce((sum, detail) => sum + normalizeNumber(detail?.totalVente), 0)
		const productsMap = new Map()
		const categoriesMap = new Map()

		for (const detail of orderDetails) {
			const productId = Number(detail?.orderDetail?.productId ?? detail?.productDto?.product?.id)
			const productLabel = Product.pickLang(detail?.orderDetail?.productName) || detail?.orderDetail?.productName || `#${productId}`
			const categoryLabel = detail?.categorieLibelle || detail?.productDto?.getCategoryLabel?.() || "Aucune"
			const quantity = normalizeNumber(detail?.orderDetail?.productQuantity)

			if (Number.isFinite(productId) && productId > 0) {
				const current = productsMap.get(productId) ?? {
					productId,
					label: productLabel,
					quantity: 0,
					totalHT: 0,
				}

				current.quantity += quantity
				current.totalHT += normalizeNumber(detail?.totalVente)
				productsMap.set(productId, current)
			}

			const categoryKey = categoryLabel || "Aucune"
			const currentCategory = categoriesMap.get(categoryKey) ?? {
				label: categoryKey,
				quantity: 0,
				totalHT: 0,
			}

			currentCategory.quantity += quantity
			currentCategory.totalHT += normalizeNumber(detail?.totalVente)
			categoriesMap.set(categoryKey, currentCategory)
		}

		const totalHT = pickOrderAmount(order?.totalPaidTaxExcl, order?.totalProducts, lineTotalHT)
		const totalTTC = pickOrderAmount(order?.totalPaidTaxIncl, order?.totalPaid, totalHT)

		return new OrderDashboardDTO({
			order,
			orderState,
			orderDetails,
			dayKey: getOrderDayKey(order),
			statusId: Number(order?.currentState ?? 0),
			statusLabel: getOrderStateLabel(orderState),
			totalHT,
			totalTTC,
			ordersCount: 1,
			linesCount: orderDetails.length,
			products: Array.from(productsMap.values()).sort((left, right) => String(left.label).localeCompare(String(right.label))),
			categories: Array.from(categoriesMap.values()).sort((left, right) => String(left.label).localeCompare(String(right.label))),
		})
	}

	static fromOrderCollection(orders = [], orderDetailsMetrics = [], orderStates = []) {
		const orderById = new Map()
		for (const order of orders ?? []) {
			const id = Number(order?.id)
			if (Number.isFinite(id)) {
				orderById.set(id, order)
			}
		}

		const stateById = new Map()
		for (const state of orderStates ?? []) {
			const id = Number(state?.id)
			if (Number.isFinite(id)) {
				stateById.set(id, state)
			}
		}

		const metricsByOrderId = new Map()
		for (const detail of orderDetailsMetrics ?? []) {
			const orderId = Number(detail?.order?.id ?? detail?.orderDetail?.orderId)
			if (!Number.isFinite(orderId)) {
				continue
			}

			const entries = metricsByOrderId.get(orderId) ?? []
			entries.push(detail)
			metricsByOrderId.set(orderId, entries)
		}

		return Array.from(orderById.entries())
			.map(([orderId, order]) => {
				const orderMetrics = metricsByOrderId.get(orderId) ?? []
				const state = stateById.get(Number(order?.currentState)) ?? null
				return OrderDashboardDTO.fromOrderAndDetails(order, orderMetrics, state)
			})
			.sort((left, right) => String(right.dayKey).localeCompare(String(left.dayKey)) || Number(right.order?.id ?? 0) - Number(left.order?.id ?? 0))
	}
}