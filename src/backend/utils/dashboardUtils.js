import { formatDate } from "./utils.js"

export const toNumber = (value) => {
	if (value === null || value === undefined || value === "") {
		return null
	}

	const numericValue = Number(value)
	return Number.isFinite(numericValue) ? numericValue : null
}

export const pickOrderAmount = (...values) => {
	for (const value of values) {
		const numericValue = toNumber(value)
		if (numericValue !== null) {
			return numericValue
		}
	}

	return 0
}

export const getOrderDayKey = (order) => {
	return formatDate(order?.dateAdd) || String(order?.dateAdd || "").slice(0, 10)
}

export const getCartDayKey = (cart) => {
	return formatDate(cart?.dateAdd) || String(cart?.dateAdd || "").slice(0, 10)
}

export const getOrderStateLabel = (state) => {
	if (!state) {
		return ""
	}

	if (typeof state.name === "string") {
		return state.name
	}

	if (Array.isArray(state.name) && state.name.length > 0) {
		const first = state.name[0]
		if (typeof first === "string") {
			return first
		}
		if (first && typeof first.value === "string") {
			return first.value
		}
	}

	return `#${state.id ?? "?"}`
}

export const formatAmount = (value) => Number(value ?? 0).toFixed(2)