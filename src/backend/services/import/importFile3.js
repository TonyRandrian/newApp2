import { parseCSV, checkCSVHeader, parseAchatField } from '../../utils/csv.js'
import Customer from '../../entities/Customer.js'
import Address from '../../entities/Address.js'
import Cart from '../../entities/Cart.js'
import Order from '../../entities/Order.js'
import OrderState from '../../entities/OrderState.js'
import Carrier from '../../entities/Carrier.js'
import OderService from '../OderService.js'
import { roundDecimal, convertDateFormat, normalizeKey, ensureMd5Like, validateOrderStatusStrict } from '../../utils/utils.js'
import { getExistingOrderStateId } from '../../utils/parsing.js'

const FILE3_HEADER = ['email', 'nom', 'pwd', 'adresse', 'achat', 'etat', 'date']

export const parseFile3CSV = async (file) => {
    const text = await file.text()
    checkCSVHeader(text, FILE3_HEADER)
    return parseCSV(text)
}
export const buildCustomerPayload = (firstname, lastname, email, password) => {
    return Customer.fromData({ firstname, lastname, email, password, idShop: 1, idShopGroup: 1 })
}

export const buildAddressPayload = (customerId, firstname, lastname, address) => {
    return Address.fromData({ idCustomer: customerId, idCountry: 8, firstname, lastname, address1: address, city: 'Antananarivo', alias: 'import' })
}

export const buildCartPayload = ({ customerId, addressId, secureKey, dateCmd, cartRows, shopGroupId, carrierId }) => {
    return Cart.fromData({ customerId, addressDeliveryId: addressId, addressInvoiceId: addressId, currencyId: 1, langId: 1, shopId: 1, shopGroupId: shopGroupId || 1, carrierId: carrierId || 1, secureKey, dateAdd: `${dateCmd} 00:00:00`, cartRows })
}

export const buildOrderPayload = ({ customerId, addressId, cartId, defaultCarrierId, secureKey, dateCmd, totals, orderRows, shopGroupId }) => {
    return Order.fromData({
        customerId,
        addressDeliveryId: addressId,
        addressInvoiceId: addressId,
        cartId,
        currencyId: 1,
        carrierId: defaultCarrierId,
        shopGroupId: shopGroupId || 1,
        shopId: 1,
        langId: 1,
        module: 'ps_cashondelivery',
        payment: 'Paiement a la livraison',
        secureKey,
        currentState: 11,
        dateAdd: `${dateCmd} 00:00:00`,
        dateUpd: `${dateCmd} 00:00:00`,
        totalPaid: roundDecimal(totals.totalPaid),
        totalProducts: roundDecimal(totals.totalProducts),
        totalProductsWt: roundDecimal(totals.totalProductsWT),
        orderRows,
    })
}

export const calculateTotals = (items, productMap, combinationPriceMap) => {
    let totalPaid = 0
    let totalProducts = 0
    let totalProductsWT = 0

    for (const item of items) {
        const product = productMap[item.reference]
        if (product) {
            const variantKey = item.variante ? `${item.reference}:${normalizeKey(item.variante)}` : null
            const priceImpact = variantKey ? (combinationPriceMap[variantKey] || 0) : 0
            const finalPriceHT = roundDecimal(Number.parseFloat(product.priceHT || 0) + Number.parseFloat(priceImpact || 0))
            const priceTTC = roundDecimal(finalPriceHT * (1 + (product.taxRate || 0) / 100))
            const itemTotalTTC = roundDecimal(priceTTC * item.quantity)
            const itemTotalHT = roundDecimal(finalPriceHT * item.quantity)
            totalPaid = roundDecimal(totalPaid + itemTotalTTC)
            totalProducts = roundDecimal(totalProducts + itemTotalHT)
            totalProductsWT = roundDecimal(totalProductsWT + itemTotalTTC)
        }
    }

    return { totalPaid, totalProducts, totalProductsWT }
}

const processRow = async (row, idx, productMap, combinationMap, combinationPriceMap, orderStates, defaultCarrierId) => {
    const i = idx
    try {
        const email = (row.email?.trim() || '').toLowerCase()
        const nom = row.nom?.trim()
        const pwd = row.pwd?.trim()
        const adresse = row.adresse?.trim()
        const achatField = row.achat?.trim()
        const etat = row.etat?.trim()
        const dateCmd = convertDateFormat(row.date?.trim())

        if (!email || !nom || !pwd) return { errors: [`Ligne ${i + 1}: Donnees client incompletes`] }
        if (!adresse) return { errors: [`Ligne ${i + 1}: Adresse manquante pour ${email}`] }
        if (!achatField) return { errors: [`Ligne ${i + 1}: Articles d'achat manquants pour ${email}`] }

        // fetch or create customer — use API-side filter when possible
        let existing = null
        try {
            const c = new Customer('', false)
            const matches = await c.getByApi('email', email)
            existing = matches?.[0] ?? null
        } catch {
            existing = null
        }
        let customerRecord
        if (existing?.id) {
            customerRecord = { id: existing.id, secure_key: existing.secureKey ?? existing.secure_key, id_shop_group: existing.idShopGroup ?? 1 }
        } else {
            const customerPayload = buildCustomerPayload(nom, nom, email, pwd)
            const saved = await customerPayload.save()
            customerRecord = { id: saved.id, secure_key: saved.secureKey ?? saved.secure_key, id_shop_group: saved.idShopGroup ?? 1 }
        }

        // address
        let addressId
        try {
            const addressPayload = buildAddressPayload(customerRecord.id, nom, nom, adresse)
            const savedAddr = await addressPayload.save()
            addressId = savedAddr.id
            if (!addressId) throw new Error('Pas d\'ID retourne pour l\'adresse')
        } catch (err) {
            return { errors: [`Adresse pour '${email}': ${err.message}`] }
        }

        const items = parseAchatField(achatField)
        if (!items || items.length === 0) return { errors: [`Ligne ${i + 1}: Articles d'achat vides pour ${email}`] }

        const totals = calculateTotals(items, productMap, combinationPriceMap)
        if (totals.totalPaid === 0) return { errors: [`Ligne ${i + 1}: Total de commande = 0 pour ${email}`] }

        // prepare cart items
        const secureKey = ensureMd5Like((customerRecord.secure_key || '').toString())
        const cartItems = items.map(item => {
            const product = productMap[item.reference]
            if (!product) return null
            const variantId = item.variante ? (combinationMap[`${item.reference}:${normalizeKey(item.variante)}`] || 0) : 0
            return { productId: product.id, productAttributeId: variantId, quantity: item.quantity, customizationId: 0 }
        }).filter(Boolean)

        if (cartItems.length === 0) return { errors: [`Commande pour '${email}': aucun produit valide dans le panier`] }

        // create cart
        const cartPayload = buildCartPayload({ customerId: customerRecord.id, addressId, secureKey, dateCmd, cartRows: cartItems, shopGroupId: customerRecord.id_shop_group || 1, carrierId: defaultCarrierId })
        const cartSaved = await cartPayload.save()
        const cartId = cartSaved.id
        if (!cartId) throw new Error('Pas d\'ID retourne pour le panier')

        const normalizedStatus = validateOrderStatusStrict(etat)
        const isCartOnlyStatus = normalizedStatus === '' || normalizedStatus === 'dans le panier'
        const isOrderStatus = normalizedStatus === 'paiement accepté' || normalizedStatus === 'annulé' || normalizedStatus === 'livré'

        if (isOrderStatus) {
            // create order rows from cartItems
            const orderRows = cartItems.map(item => ({ productId: item.productId, productAttributeId: item.productAttributeId || 0, productQuantity: item.quantity, customizationId: item.customizationId || 0 }))

            const orderPayload = buildOrderPayload({ customerId: customerRecord.id, addressId, cartId, defaultCarrierId, secureKey, dateCmd, totals, orderRows, shopGroupId: customerRecord.id_shop_group || 1 })

            const createdOrder = await orderPayload.save()
            const orderId = createdOrder.id

            if (!orderId) return { errors: [`Impossible de créer la commande pour '${email}'`] }

            // update state if needed
            if (normalizedStatus === 'annulé') {
                const stateRes = await OderService.updateOrderState(orderId, getExistingOrderStateId('annule', orderStates) || 6, `${dateCmd} 00:00:00`)
                if (!stateRes.success) return { errors: [`Commande '${email}': ${stateRes.error}`] }
            }

            if (normalizedStatus === 'livré') {
                const stateRes = await OderService.updateOrderState(orderId, getExistingOrderStateId('livre', orderStates) || 5, `${dateCmd} 00:00:00`)
                if (!stateRes.success) return { errors: [`Commande '${email}': ${stateRes.error}`] }
            }

            const orderDetails = []
            for (const item of items) {
                const product = productMap[item.reference]
                if (!product) {
                    orderDetails.push({ error: `Produit '${item.reference}' non trouve` })
                    continue
                }
                const idProductAttribute = item.variante ? (combinationMap[`${item.reference}:${normalizeKey(item.variante)}`] || 0) : 0
                const variantKey = item.variante ? `${item.reference}:${normalizeKey(item.variante)}` : null
                const priceImpact = variantKey ? (combinationPriceMap[variantKey] || 0) : 0
                const finalPriceHT = roundDecimal(Number.parseFloat(product.priceHT || 0) + Number.parseFloat(priceImpact || 0))
                const priceTTC = roundDecimal(finalPriceHT * (1 + product.taxRate / 100))
                orderDetails.push({ order: orderId, product: item.reference, quantity: item.quantity, productAttributeId: idProductAttribute, priceHT: finalPriceHT, priceTTC, status: 'success' })
            }

            return {
                customers: [{ email, nom, id: customerRecord.id, status: 'success' }],
                addresses: [{ customer: email, address: adresse, id: addressId, status: 'success' }],
                orders: [{ customer: email, date: row.date, state: etat, id: orderId, status: 'success', total: totals.totalPaid }],
                orderDetails,
                errors: []
            }
        }

        if (isCartOnlyStatus) {
            return {
                customers: [{ email, nom, id: customerRecord.id, status: 'success' }],
                addresses: [{ customer: email, address: adresse, id: addressId, status: 'success' }],
                orders: [{ customer: email, date: row.date, state: etat, id: `CART-${cartId}`, status: 'cart-only', total: totals.totalPaid, cartId }],
                orderDetails: [],
                errors: []
            }
        }

        return { errors: [`Ligne ${i + 1}: Etat non supporte ('${etat || 'vide'}') pour ${email}`] }

    } catch (err) {
        return { errors: [`Commande pour '${row.email || 'inconnu'}': ${err.message}`] }
    }
}

export const importFile3 = async (file, file1Results, file2Results, onProgress = () => {}) => {
    const results = { customers: [], addresses: [], orders: [], orderDetails: [], errors: [], summary: {} }

    onProgress?.({ step: 'parsing', message: 'Parsing du CSV fichier 3...' })
    const csvData = await parseFile3CSV(file)

    if (!csvData || csvData.length === 0) throw new Error('Fichier CSV vide')

    const productMap = {}
    for (const p of file1Results.products ?? []) {
        if (p.status === 'success' && p.id) productMap[p.reference] = { id: p.id, name: p.name, priceHT: p.priceHT, taxRate: p.taxRate }
    }

    const combinationMap = {}
    const combinationPriceMap = {}
    for (const c of file2Results.combinations ?? []) {
        if (c.status === 'success') {
            const optionName = (c.attribute || '').split(':').pop()
            const key = `${c.product}:${normalizeKey(optionName)}`
            combinationMap[key] = c.id
            combinationPriceMap[key] = Number.parseFloat(c.priceImpact || 0) || 0
        }
    }

    const orderStateClass = new OrderState('', false)
    const orderStates = await orderStateClass.getAll()
    const carrierClass = new Carrier('', false)
    const carriers = await carrierClass.getAll()
    const activeCarrier = carriers.find(c => Number(c.active) === 1 && Number(c.deleted || 0) === 0)
    const defaultCarrierId = activeCarrier?.id || 1

    for (let idx = 0; idx < csvData.length; idx++) {
        try {
            const row = csvData[idx]
            const res = await processRow(row, idx, productMap, combinationMap, combinationPriceMap, orderStates, defaultCarrierId)
            if (!res) continue
            if (res.errors?.length) results.errors.push(...res.errors)
            if (res.customers) results.customers.push(...res.customers)
            if (res.addresses) results.addresses.push(...res.addresses)
            if (res.orders) results.orders.push(...res.orders)
            if (res.orderDetails) results.orderDetails.push(...res.orderDetails)

            onProgress?.({ step: 'orders', message: `Import des commandes... (${idx + 1}/${csvData.length})`, progress: ((idx + 1) / csvData.length) * 100 })
        } catch (err) {
            results.errors.push(`Ligne ${idx + 1}: ${err.message}`)
        }
    }

    results.summary = {
        totalCustomers: results.customers.length,
        successCustomers: results.customers.filter(c => c.status === 'success').length,
        totalAddresses: results.addresses.length,
        successAddresses: results.addresses.filter(a => a.status === 'success').length,
        totalOrders: results.orders.length,
        successOrders: results.orders.filter(o => o.status === 'success').length,
        totalOrderDetails: results.orderDetails.length,
        successOrderDetails: results.orderDetails.filter(od => od.status === 'success').length,
        totalErrors: results.errors.length,
    }

    onProgress?.({ step: 'complete', message: 'Import Fichier 3 termine!' })

    // Si des erreurs ont été accumulées, relancer une exception pour déclencher le reset
    if (results.errors.length > 0) {
        const errorSummary = results.errors.join('\n')
        throw new Error(`Erreurs lors de l'import fichier 3 (commandes/clients):\n${errorSummary}`)
    }

    return results
}

const importFile3Service = { parseFile3CSV, buildCustomerPayload, buildAddressPayload, buildCartPayload, buildOrderPayload, calculateTotals, importFile3 }

export default importFile3Service
