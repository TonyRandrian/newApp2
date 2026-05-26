import Product from "../../entities/Product.js";
import StockAvailable from "../../entities/StockAvailable.js";
import StockMvt from "../../entities/StockMvt.js";
import {formatDateTime} from "../../utils/utils.js";

export async function updateStockByCategory(categoryIdAdd, qttAdd, categoryIdRemove, qttRemove) {
    const products = await new Product({}, false).getAll();

    await addStockByCategory(products, categoryIdAdd, qttAdd, limite);
    await removeStockByCategory(products, categoryIdRemove, qttRemove);
}

export async function removeStockByCategory(products, categoryId, quantityToRemove) {
    const productsFilter = products.filter(p => String(p.idCategoryDefault) === String(categoryId))

    let totalEffective = 0
    let totalExpected = 0
    const stockApi = new StockAvailable({}, false)
    console.log("Produits: ")
    console.log(productsFilter)

    for (const product of productsFilter) {
        const prodStockAvailable = product.associations?.stockAvailables ?? []
        console.log("Produit stock available")
        console.log(prodStockAvailable)
        const haveDeclinaison = product.associations?.combinations?.length > 0

        for (const psa of prodStockAvailable) {
            const stock = await stockApi.getById(psa.id)

            const quantityActual = Number(stock.quantity ?? 0)
            const delta = Math.max(0, Math.min(quantityActual, Number(quantityToRemove)));

            if (haveDeclinaison && psa.idProductAttribute === 0) {
                continue
            } else {
                const movement = StockMvt.fromData({
                    idStock: stock.id,
                    idProduct: product.id,
                    idProductAttribute: psa.idProductAttribute,
                    physicalQuantity: delta,
                    sign: -1,
                    idStockMvtReason: 2,
                    idEmployee: 1,
                    priceTe: 0,
                    dateAdd: formatDateTime(new Date()),
                })
                totalExpected += Number(quantityToRemove)
                await movement.save();
                const updated = StockAvailable.fromData(stock)
                updated.quantity = quantityActual - delta
                await updated.update()
            }

            totalEffective += Math.min(quantityActual, Number(quantityToRemove))
        }
    }

    console.log("Category id " + categoryId)
    console.log("Tokony niala: " + totalExpected)
    return {totalEffective, totalExpected}
}


export async function addStockByCategory(products, categoryId, quantityToAdd, limite = 0) {
    const productsFilter = products.filter(p => String(p.idCategoryDefault) === String(categoryId))

    let totalEffective = 0
    let totalExpected = 0
    const stockApi = new StockAvailable({}, false)
    console.log("Produits: ")
    console.log(productsFilter)

    for (const product of productsFilter) {
        const prodStockAvailable = product.associations?.stockAvailables ?? []
        console.log("Produit stock available")
        console.log(prodStockAvailable)
        const haveDeclinaison = product.associations?.combinations?.length > 0

        for (const psa of prodStockAvailable) {
            const stock = await stockApi.getById(psa.id)

            const quantityActual = Number(stock.quantity ?? 0)
            //const delta = Math.max(0, Math.min(quantityActual, Number(quantityToAdd)));
            let toAdd = quantityToAdd;

            if (limite > 0) {
                toAdd = limite - quantityToAdd
            }

            if (haveDeclinaison && psa.idProductAttribute === 0) {
                continue
            } else {
                const movement = StockMvt.fromData({
                    idStock: stock.id,
                    idProduct: product.id,
                    idProductAttribute: psa.idProductAttribute,
                    physicalQuantity: toAdd,
                    sign: 1,
                    idStockMvtReason: 1,
                    idEmployee: 1,
                    priceTe: 0,
                    dateAdd: formatDateTime(new Date()),
                })

                totalExpected += Number(quantityToAdd)
                await movement.save();
                const updated = StockAvailable.fromData(stock)
                updated.quantity = quantityActual + toAdd
                await updated.update()
            }

            totalEffective += Math.min(quantityActual, Number(quantityToAdd))
        }
    }

    return {totalEffective, totalExpected}
}

/*
const updateQuantity = async (row, MVT_REASON) => {
        const isDeclination = Boolean(row.original?.isDeclination)
        const idProduct = isDeclination ? row.original.parentProduct?.id : row.original.product?.id
        const idProductAttribute = isDeclination ? (row.original.combinationId ?? 0) : 0
        const amount = Number(quantity[row.id] ?? 0)

        if (!amount) return

        const delta = amount * MVT_REASON.sign

        try {
            onLoadingChange?.(true)
            const stockApi = new StockAvailable({}, false)
            const existing = await stockApi.getByProductAndAttribute(idProduct, idProductAttribute)

            if (!existing) {
                console.error("stock_available introuvable", {idProduct, idProductAttribute})
                return
            }

            // insertion des mvts de stock
            const movement = StockMvt.fromData({
                idStock: existing.id,
                idProduct,
                idProductAttribute,
                physicalQuantity: amount,
                sign: MVT_REASON.sign,
                idStockMvtReason: MVT_REASON.id,
                idEmployee: 1,
                priceTe: 0,
                dateAdd: dateChange || formatDateTime(new Date()),
            })
            await movement.save()

            // modification de stock available
            const stockEntity = StockAvailable.fromData(existing)
            stockEntity.quantity = Number(existing.quantity ?? 0) + delta
            await stockEntity.update()

            const fresh = await fetchProductWithStock()
            // rafraississement du data existant
            setData(fresh ?? [])
            setQuantity((prev) => {
                // Supprime la valeur temporaire associée à cette ligne du state `quantity` après réussite de la mise à jour.
                // Cela réinitialise le champ d'entrée pour cette ligne.
                const next = {...prev}
                delete next[row.id]
                return next
            })
        } catch (error) {
            console.error("Erreur lors de la mise à jour du stock:", error)
        } finally {
            onLoadingChange?.(false)
        }
    }

 */