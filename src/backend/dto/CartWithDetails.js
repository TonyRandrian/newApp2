import Product from '../entities/Product.js'

class CartWithDetails {
    constructor(cart) {
        Object.assign(this, cart)
        this.enrichedRows = []
        this.totals = { totalHt: 0, totalTtc: 0 }
    }

    static fromCart(cart) {
        return new CartWithDetails(cart)
    }

    async getCartRowDetailsForRow(cartRow) {
        if (!cartRow) {
            return null
        }

        const productId = Number(cartRow.productId || 0)
        if (!productId) {
            return null
        }

        try {
            const productApi = new Product({}, false)
            const product = await productApi.getById(productId)
            if (!product) {
                return null
            }

            const attributeId = Number(cartRow.productAttributeId || 0)
            const declinaisonDetails = await product.getDeclinaisonDetails(attributeId)

            let productImageURL = declinaisonDetails.imageUrl
            if (!productImageURL) {
                const images = await product.getImages()
                productImageURL = images[0] || ''
            }

            const productName = Product.pickLang(product.name)

            return {
                product,
                productImageURL,
                productName,
                declinaison: declinaisonDetails.declinaison,
                priceTtc: declinaisonDetails.priceTtc,
                imageUrl: productImageURL,
            }
        } catch (err) {
            console.warn('Failed to get cart row details:', err)
            return null
        }
    }

    async enrich() {
        const enrichedRows = []

        for (const row of this.cartRows ?? []) {
            try {
                const details = await this.getCartRowDetailsForRow(row)
                if (!details) {
                    continue
                }

                const qty = Number(row?.quantity || 0)
                const priceTtc = Number(details?.priceTtc || 0)

                enrichedRows.push({
                    productId: Number(row?.productId || 0),
                    productName: details.productName,
                    productAttributeId: Number(row?.productAttributeId || 0),
                    attributeLabel: details.declinaison,
                    quantity: qty,
                    priceTtc,
                    rowTotalTtc: priceTtc * qty,
                    imageUrl: details.imageUrl,
                })
            } catch (err) {
                console.warn('Failed to enrich cart row:', err)
            }
        }

        this.enrichedRows = enrichedRows
        const totalTtc = enrichedRows.reduce((sum, row) => sum + Number(row.rowTotalTtc || 0), 0)
        this.totals = { totalHt: totalTtc, totalTtc }

        return this
    }

    toJSON() {
        return {
            id: this.id,
            customerId: this.customerId,
            dateAdd: this.dateAdd,
            totals: this.totals,
            cartRows: this.enrichedRows,
        }
    }
}

export default CartWithDetails
