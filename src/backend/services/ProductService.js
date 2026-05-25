import Product from "../entities/Product.js";
import StockAvailable from "../entities/StockAvailable.js";
import Combination from "../entities/Combination.js";
import ProductOptionValue from "../entities/ProductOptionValue.js";

export async function fetchProductWithStock() {
    const productApi = new Product({}, false);
    const stockApi = new StockAvailable({}, false);
    const combinationApi = new Combination({}, false);
    const optionValueApi = new ProductOptionValue({}, false);

    const products = await productApi.getAll();
    const result = [];

    for (const product of products) {
        const entries = product.associations?.stockAvailables ?? [];

        let totalQuantity = 0;
        const declinations = [];

        for (const entry of entries) {
            const stock = await stockApi.getById(entry.id);
            const quantity = Number(stock.quantity) || 0;
            const combinationId = Number(entry.idProductAttribute);

            if (combinationId === 0) {
                // stock global du produit
                totalQuantity = quantity;
            } else {
                // stock d'une déclinaison
                // récupérer le nom de la déclinaison via ses option values
                const combination = await combinationApi.getById(combinationId);
                const nameParts = [];

                for (const optionValueId of combination.optionValueIds) {
                    const optionValue = await optionValueApi.getById(optionValueId);
                    const label = Product.pickLang(optionValue.name, 1);
                    if (label) {
                        nameParts.push(label);
                    }
                }

                declinations.push({
                    stockAvailableId: stock.id,
                    combinationId: combinationId,
                    name: nameParts.join(" - "),
                    quantity: quantity,
                });
            }
        }

        result.push({
            product: product,
            totalQuantity: totalQuantity,
            declinations: declinations,
        });
    }

    return result;
}

export function filterProductsByPrice(products, minPrice = 0, maxPrice = 0) {
    const priceMin = Math.max(0, Number(minPrice) || 0);
    const priceMax = Math.max(0, Number(maxPrice) || 0);

    return products.filter((product) => {
        const price = Number(product.priceTtc ?? product.price) || 0;

        if (priceMin > 0 && price < priceMin) {
            return false;
        }

        if (priceMax > 0 && price > priceMax) {
            return false;
        }

        return true;
    });
}

export function filterProductsByCategory(products, categoryId) {
    const targetId = String(categoryId);
    return products.filter((product) => {
        if (product.idCategoryDefault != null && String(product.idCategoryDefault) === targetId) {
            return true;
        }

        const categories = product.associations?.categories || [];

        for (const category of categories) {
            const id = category?.id ?? category;
            if (String(id) === targetId) {
                return true;
            }
        }
        return false;
    });
}

export function filterProductsByName(products, name = "") {
    return products.filter((product) => {
        const productName = product.name?.[0]?.value || "";

        if (productName.toLowerCase().includes(name.toLowerCase())) {
            return true;
        }
        return false;
    });
}

export function filterProducts({products, minPrice = 0, maxPrice = 0, categoryId = null, name = ""}) {
    let filtered = Array.isArray(products) ? products : [];

    if (name) {
        filtered = filterProductsByName(filtered, name);
    }

    if (categoryId) {
        filtered = filterProductsByCategory(filtered, categoryId);
    }

    if (Number(minPrice) > 0 || Number(maxPrice) > 0) {
        filtered = filterProductsByPrice(filtered, minPrice, maxPrice);
    }

    return filtered;
}