import Category from "../entities/Category.js"
import Product from "../entities/Product.js"
import Order from "../entities/Order.js"
import OrderDetail from "../entities/OrderDetail.js"
import OrderState from "../entities/OrderState.js"
import ProductWithDeclinaisons from "../dto/ProductWithCombinations.js"
import OrderDetailWithMetrics from "../dto/OrderLineMetrics.js"
import OrderDashboardDTO from "../dto/OrderDashboardDTO.js"
import OrderWithDetails from "../dto/OrderWithDetails.js"
import { convertTTCtoHT, normalizeNumber } from "../utils/utils.js"
import { getCartDayKey } from "../utils/dashboardUtils.js"
import CartService from "./CartService.js"

const CANCELLED_ORDER_STATE_ID = 6

function sumRowsTotals(rows = []) {
	return rows.reduce(
		(accumulator, row) => {
			accumulator.totalHT += normalizeNumber(row?.totalHT)
			accumulator.totalTTC += normalizeNumber(row?.totalTTC)
			return accumulator
		},
		{ totalHT: 0, totalTTC: 0 },
	)
}

async function getCartRowTotals(cartRow) {
	const productId = Number(cartRow?.productId || 0)
	const quantity = normalizeNumber(cartRow?.quantity)

	if (!productId || quantity <= 0) {
		return { totalHT: 0, totalTTC: 0 }
	}

	const product = await new Product({}, false).getById(productId)
	if (!product) {
		return { totalHT: 0, totalTTC: 0 }
	}

	const priceTTC = Number(await product.getDeclinaisonDetails(Number(cartRow?.productAttributeId || 0)).then((details) => details?.priceTtc ?? product.getTtcPrice()))
	const taxRate = Number(await product.getTax())
	const priceHT = convertTTCtoHT(priceTTC, taxRate)

	return {
		totalHT: priceHT * quantity,
		totalTTC: priceTTC * quantity,
	}
}

async function buildCartDashboardRow(cart) {
	const rowTotals = await Promise.all((cart?.cartRows ?? []).map((cartRow) => getCartRowTotals(cartRow)))
	const totals = sumRowsTotals(rowTotals)

	return {
		dayKey: getCartDayKey(cart),
		totalHT: totals.totalHT,
		totalTTC: totals.totalTTC,
	}
}

export function sumCartDashboardRowsTotals(rows = []) {
	return sumRowsTotals(rows)
}

export function aggregateCartDashboardRowsByDay(rows = []) {
	const grouped = new Map()

	for (const row of rows ?? []) {
		const dayKey = row?.dayKey || ""
		const current = grouped.get(dayKey) ?? {
			day: dayKey,
			cartsCount: 0,
			totalHT: 0,
			totalTTC: 0,
		}

		current.cartsCount += 1
		current.totalHT += normalizeNumber(row?.totalHT)
		current.totalTTC += normalizeNumber(row?.totalTTC)
		grouped.set(dayKey, current)
	}

	return Array.from(grouped.values()).sort((left, right) => String(right.day).localeCompare(String(left.day)))
}

export async function loadDashboardData() {
	const [categories, products, orders, orderStates] = await Promise.all([
		new Category({}, false).getExclApi([1, 2]),
		new Product({}, false).getAll(),
		new Order({}, false).getByNot("currentState", CANCELLED_ORDER_STATE_ID),
		new OrderState({}, false).getInclApi([11, 5]),
	])

	const productsWithDeclinaisons = await ProductWithDeclinaisons.listFromProductsWithCategories(products, categories)
	const orderIds = orders.map((order) => order?.id).filter((id) => Number.isFinite(Number(id)));
	const orderDetailsRaw = orderIds.length > 0 ? await new OrderDetail({}, false).getBy("orderId", orderIds) : [];
	const orderGroups = OrderWithDetails.groupOrdersWithDetails(orders, orderDetailsRaw)
	const orderDetailsMetrics = OrderDetailWithMetrics.listFromOrderGroups(orderGroups, productsWithDeclinaisons)
	const dashboardRows = OrderDashboardDTO.fromOrderCollection(orders, orderDetailsMetrics, orderStates);
	const cartsWithoutOrder = await CartService.getCartsWithoutOrder();
	const cartDashboardRows = await Promise.all(cartsWithoutOrder.map((cart) => buildCartDashboardRow(cart)));

	return {
		orderStates,
		dashboardRows,
		cartDashboardRows,
	}
}

export function filterDashboardRowsByDates(rows = [], dateMin = "", dateMax = "") {
	if (!dateMin && !dateMax) {
		return [...rows]
	}

	return rows.filter((row) => {
		const day = row?.dayKey || ""
		if (dateMin && day < dateMin) {
			return false
		}
		if (dateMax && day > dateMax) {
			return false
		}
		return true
	})
}

export function filterDashboardRowsByStatus(rows = [], statusId = "all") {
	if (statusId === "all" || statusId === "") {
		return [...rows]
	}

	const numericStatusId = Number(statusId)
	return rows.filter((row) => Number(row?.statusId) === numericStatusId)
}

export function countDashboardRows(rows = []) {
	return rows.length
}

export function sumDashboardRowsTotals(rows = []) {
	return sumRowsTotals(rows)
}

export function aggregateDashboardRowsByDay(rows = []) {
	const grouped = new Map()

	for (const row of rows ?? []) {
		const dayKey = row?.dayKey || ""
		const current = grouped.get(dayKey) ?? {
			day: dayKey,
			ordersCount: 0,
			totalHT: 0,
			totalTTC: 0,
		}

		current.ordersCount += 1
		current.totalHT += normalizeNumber(row?.totalHT)
		current.totalTTC += normalizeNumber(row?.totalTTC)
		grouped.set(dayKey, current)
	}

	return Array.from(grouped.values()).sort((left, right) => String(right.day).localeCompare(String(left.day)))
}
