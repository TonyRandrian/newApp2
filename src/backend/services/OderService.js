import Customer from "../entities/Customer";
import Order from "../entities/Order"
import OrderHistory from "../entities/OrderHistory";
import MyOrderState from "../entities/MyOrderState";
import OrderState from "../entities/OrderState";
import OrderPayload from "../dto/OrderPayload";
import StockAvailable from "../entities/StockAvailable";
import { ensureLocalDateTime } from "../utils/utils"
import Cart from "../entities/Cart";
import CartService from "./CartService";

// order_state default ids
const PAIEMENT_A_DISTANCE_ACCEPTE_ID = 11
const LIVRE_ID = 5
const ANONYMOUS_ID = 1
const ANNULE_ID = 6

// order param defaults
const VALID_FLAG = 0
const CONVERSION_RATE = 1.000000
const TOTAL_DISCOUNTS = 0.000000
const TOTAL_DISCOUNTS_TAX_INCL = 0.000000
const TOTAL_DISCOUNTS_TAX_EXCL = 0.000000

// payement defaults
const PAYMENT_MODULE = "ps_cashondelivery"
const PAYMENT_LABEL = "Cash on delivery"

// livraison defaults
const SHIPPING_MODULE = "ps_carrier"
const SHIPPING_LABEL = "My carrier"

// default attributes for order creation
const LANGUAGE_ID = 1
const SHOP_ID = 1
const SHOP_GROUP_ID = 1
const CUSTOMER_GROUP_ID = 1
const COUNTRY_ID = 8
const STATE_ID = 0
const ADDRESS_ALIAS = "Checkout"

const checkCartStock = async (cartRows = [], multiplicateur = 1) => {
    const stockApi = new StockAvailable({}, false)
    const errors = []
    const factor = Math.max(1, Math.trunc(Number(multiplicateur || 1)))

    for (const row of cartRows ?? []) {
        const productId = Number(row?.productId || 0)
        const attributeId = Number(row?.productAttributeId || 0)
        const qty = Math.max(1, Math.trunc(Number(row?.quantity || 0))) * factor
        if (!productId) {
            continue
        }

        const stock = await stockApi.getByProductAndAttribute(productId, attributeId)
        const available = Number(stock?.quantity ?? 0)
        if (qty > available) {
            errors.push({
                productId,
                productAttributeId: attributeId,
                requested: qty,
                available,
            })
        }
    }

    return errors
}

const getOrderRows = async () => {
    const orderClass = new Order("", false)
    const customerClass = new Customer("", false)
    const orderStateClass = new OrderState("", false);

    const [orders, customers, orderStates] = await Promise.all([
        orderClass.getAll(),
        customerClass.getAll(),
        orderStateClass.getAll(),
    ])

    //Fanaovana map [key, value]
    const customerById = new Map(
        customers.map((customer) => [Number(customer.id), `${customer.firstname} ${customer.lastname}`.trim()])
    )

    const orderStateById = new Map(
        orderStates.map((orderState) => [Number(orderState.id), orderState.name])
    )

    console.log("orderstates", orderStateById);

    return orders.map((order) => (
        {
            ...order,
            customerName: customerById.get(Number(order.customerId)) ?? "",
            orderStateName: orderStateById.get(Number(order.currentState)) ?? "",
        }
    ))
}

const getOrderRowsByCustomer = async (customerId) => {
    const orderClass = new Order("", false)
    const customerClass = new Customer("", false)
    const orderStateClass = new OrderState("", false);

    const [orders, customers, orderStates] = await Promise.all([
        orderClass.getBy("customerId", customerId),
        customerClass.getByApi("id", customerId),
        orderStateClass.getAll(),
    ]);

    console.log("orders for customer", customerId, orders);

    const customerById = new Map(
        customers.map((customer) => [Number(customer.id), `${customer.firstname} ${customer.lastname}`.trim()])
    );

    const orderStateById = new Map(
        orderStates.map((orderState) => [Number(orderState.id), orderState.name])
    );

    return orders.map((order) => (
        {
            ...order,
            customerName: customerById.get(Number(order.customerId)) ?? "",
            orderStateName: orderStateById.get(Number(order.currentState)) ?? "",
        }
    ))
}

const updateOrderState = async (orderId, newStateId, dateUpdate) => {

    if (!newStateId) {
        throw new Error("Missing newStateId")
    }

    if (!dateUpdate) {
        throw new Error("Missing dateUpdate")
    }

    console.log("updateOrderState", { orderId, newStateId, dateUpdate });

    try {
        const orderHistoryClass = new OrderHistory("", false)
        const histories = await orderHistoryClass.getByApi("id_order", Number(orderId))
        const sortedHistories = [...(histories ?? [])].sort((a, b) => Number(b.id) - Number(a.id))
        const latest = sortedHistories.length > 0 ? sortedHistories[0] : null
        const currentStateId = latest ? Number(latest.orderStateId ?? 0) : null

        const allowed = new Set(["11-5", "11-6", "5-6"])
        const fromTo = `${currentStateId ?? "null"}-${Number(newStateId)}`
        if (!allowed.has(fromTo)) {
            throw new Error(`Transition de statut non autorisée: ${fromTo}`)
        }

        const dateAdd = ensureLocalDateTime(dateUpdate)

        const payload = MyOrderState.fromData({
            orderId: Number(orderId),
            orderStateId: Number(newStateId),
            employeeId: 1,
            date: dateAdd,
            useExistingPayment: false,
            sendEmail: false,
        })

        const res = await payload.save()
        console.log("my_order_state response", res)

        return {
            success: true,
            orderId: Number(orderId),
            orderStateId: Number(newStateId),
            orderHistory: latest,
            rawResponse: res,
        }
    } catch (err) {
        console.error("Failed to save order history:", err)
        throw err
    }
}

const createOrderFromCart = async (cart, customerId, date, clone = 0) => {
    const cloneCount = Math.max(0, Math.trunc(Number(clone)))
    const totalOrders = cloneCount + 1

    const stockErrors = await checkCartStock(cart.cartRows, totalOrders)

    if (stockErrors.length > 0) {
        const message = stockErrors
            .map(item =>
                `product ${item.productId} attr ${item.productAttributeId}: ${item.requested} > ${item.available}`
            )
            .join("; ")

        throw new Error(`Stock insuffisant: ${message}`)
    }

    const customerApi = new Customer({}, false)
    await customerApi.getById(customerId)

    const dateUsed = ensureLocalDateTime(date)
    const results = []

    const originalTotals = await OrderPayload.computeOrderTotals(cart.cartRows)

    const commonOrderData = {
        customerId,
        dateAdd: dateUsed,
        dateUpd: dateUsed,
        currentState: PAIEMENT_A_DISTANCE_ACCEPTE_ID,
        module: PAYMENT_MODULE,
        payment: PAYMENT_LABEL,
        valid: VALID_FLAG,
        conversionRate: CONVERSION_RATE,
        totalDiscounts: TOTAL_DISCOUNTS,
        totalDiscountsTaxIncl: TOTAL_DISCOUNTS_TAX_INCL,
        totalDiscountsTaxExcl: TOTAL_DISCOUNTS_TAX_EXCL,
        totalShipping: 0,
        totalShippingTaxIncl: 0,
        totalShippingTaxExcl: 0,
        totalWrapping: 0,
        totalWrappingTaxIncl: 0,
        totalWrappingTaxExcl: 0,
    }

    const originalPayload = OrderPayload.fromCart(cart, {
        ...commonOrderData,
        totalPaid: originalTotals.totalTtc,
        totalPaidTaxIncl: originalTotals.totalTtc,
        totalPaidTaxExcl: originalTotals.totalHt,
        totalPaidReal: originalTotals.totalTtc,
        totalProducts: originalTotals.totalHt,
        totalProductsWt: originalTotals.totalTtc,
    })

    const savedOriginalOrder =
        await Order.fromData(originalPayload).save()

    results.push({
        cart,
        order: savedOriginalOrder
    })

    for (let i = 0; i < cloneCount; i++) {
        const newCart = new Cart({
            customerId,
            idGuest: cart.idGuest,
            addressDeliveryId: cart.addressDeliveryId,
            addressInvoiceId: cart.addressInvoiceId,
            currencyId: cart.currencyId,
            langId: cart.langId,
            carrierId: cart.carrierId,
            shopId: cart.shopId,
            shopGroupId: cart.shopGroupId,
            secureKey: cart.secureKey,
            recyclable: cart.recyclable,
            gift: cart.gift,
            giftMessage: cart.giftMessage,
            mobileTheme: cart.mobileTheme,
            deliveryOption: cart.deliveryOption,
            allowSeperatedPackage: cart.allowSeperatedPackage,
            dateAdd: dateUsed,
            dateUpd: dateUsed,
            cartRows: [...cart.cartRows],
        })

        const savedCart = await newCart.save()

        const totals = await OrderPayload.computeOrderTotals(
            savedCart.cartRows
        )

        const payload = OrderPayload.fromCart(savedCart, {
            ...commonOrderData,
            totalPaid: totals.totalTtc,
            totalPaidTaxIncl: totals.totalTtc,
            totalPaidTaxExcl: totals.totalHt,
            totalPaidReal: totals.totalTtc,
            totalProducts: totals.totalHt,
            totalProductsWt: totals.totalTtc,
        })

        const savedOrder =
            await Order.fromData(payload).save()

        results.push({
            cart: savedCart,
            order: savedOrder
        })
    }

    return results
}

const duplicateCart = async (orderId, multiplicateur, dateUpdate) => {
    try {
        const orderClass = new Order("", false)
        const order = await orderClass.getById(Number(orderId))
        let cart = null

        if (order && order.cartId) {
            const cartClass = new Cart({}, false)
            cart = await cartClass.getById(Number(order.cartId))
        }

        CartService.duplicateCart(cart, multiplicateur, dateUpdate);

        console.log("aaaaaaaaaaaaa", cart, " a la date ", dateUpdate, " avec multiplicateur ", multiplicateur, " et orderId ", orderId);
        return { success: !!cart, cart, orderId: Number(orderId) }
    } catch (err) {
        console.error("Failed in duplicateCart:", err)
        throw err
    }
}

const createOrderFromCartId = async (cartId, customerId, date, clone = 0) => {
    const cartClass = new Cart({}, false);
    const cart = await cartClass.getById(Number(cartId));
    if (!cart) {
        throw new Error(`Cart ${cartId} not found`);
    }
    return await createOrderFromCart(cart, customerId, date, clone);
}

export default {
    getOrderRows,
    getOrderRowsByCustomer,
    updateOrderState,
    duplicateCart,
    createOrderFromCart,
    createOrderFromCartId,
}