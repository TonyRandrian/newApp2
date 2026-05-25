import api from "../utils/api";
import Customer from "../entities/Customer";
import Order from "../entities/Order"
import Cart from "../entities/Cart"
import Product from "../entities/Product";
import StockAvailable from "../entities/StockAvailable";
import { ensureLocalDateTime } from "../utils/utils"
import { toJSONList } from "../xml/cartXML";
import { toJSONList as toOrderJSONList } from "../xml/orderXML";
import CartWithDetails from "../dto/CartWithDetails.js";

// Constants 
const CURRENCY_ID = 1; // Euro
const LANGUAGE_ID = 1;
const SHOP_GROUP_ID = 1;
const SHOP_ID = 1;
const DEFAULT_CARRIER_ID = 1;
const RECYCLABLE = 0;
const GIFT = 0;
const MOBILE_THEME = 0;
const ALLOW_SEPARATED_PACKAGE = 0;

const buildDeliveryOption = (addressId, carrierId = DEFAULT_CARRIER_ID) => {
    if (!addressId || !carrierId) {
        return "";
    }
    return JSON.stringify({
        [addressId]: `${carrierId},`,
    });
};



const isCartActive = async (idCart) => {
    const orderApi = new Order({}, false);
    // const xml = orderApi.getBy("id_cart",idCart);
    const xml = await api.get(`${orderApi.endpoint}?display=full&filter[id_cart]=[${idCart}]`);
    const orders = toOrderJSONList(xml);
    return orders.length === 0;
}

const getLastCartByCustomer = async (idCustomer) => {
    const cartApi = new Cart({}, false);

        const response = await api.get(
            `${cartApi.endpoint}?display=full&filter[id_customer]=[${idCustomer}]`
        );

    // const response = await cartApi.getBy("id_customer", idCustomer);

    const carts = toJSONList(response);

    if (carts.length === 0) {
        return null;
    }

    carts.sort((a, b) => {
        const aDate = a?.date_add ?? a?.dateAdd ?? "";
        const bDate = b?.date_add ?? b?.dateAdd ?? "";
        return new Date(bDate) - new Date(aDate);
    });

    const latestCart = Cart.fromData(carts[0]);
    console.log("Latest cart:", latestCart);
    return latestCart;
};


const createOrUpdateCart  = async (idCustomer, date = new Date(), initialRows = []) => {    

    const dateUsed = ensureLocalDateTime(date)

    const customerApi = new Customer({}, false);

    const customer = await customerApi.getById(idCustomer);
    const address = await customer.getAddress();
    
    const customerCart = await getLastCartByCustomer(idCustomer);
    if (customerCart && await isCartActive(customerCart.id)) {
        return { cart: customerCart, isNew: false };
    }

    if (!address?.length) {
        throw new Error(`No address found for customer ${idCustomer}`);
    }

    const deliveryOption = buildDeliveryOption(address[0].id, DEFAULT_CARRIER_ID);

    const seededRows = Array.isArray(initialRows)
        ? initialRows.map((row) => ({
            ...row,
            addressDeliveryId: row?.addressDeliveryId || address[0].id,
        }))
        : [];

    const newCart = new Cart({
        customerId: idCustomer,
        idGuest: 0,
        addressDeliveryId: address[0].id,
        addressInvoiceId: address[0].id,
        currencyId: CURRENCY_ID,
        langId: LANGUAGE_ID,
        carrierId: DEFAULT_CARRIER_ID,
        shopId: SHOP_ID,
        shopGroupId: SHOP_GROUP_ID,
        secureKey: customer?.secureKey ?? "",
        recyclable: RECYCLABLE,
        gift: GIFT,
        deliveryOption,
        mobileTheme: MOBILE_THEME,
        allowSeperatedPackage: ALLOW_SEPARATED_PACKAGE,
        dateAdd: dateUsed,
        dateUpd: dateUsed,
        cartRows: seededRows,
    });

    const savedCart = await newCart.save();
    return { cart: savedCart, isNew: true };

}

const deleteItems = async (cart, rowIndex) => {
    const rows = cart?.cartRows ?? [];
    const index = Number(rowIndex);
    if (!Number.isInteger(index) || index < 0 || index >= rows.length) {
        return cart;
    }

    const nextRows = rows.filter((_, idx) => idx !== index);
    if (nextRows.length === 0) {
        await cart.delete();
        return null;
    }

    cart.cartRows = nextRows;
    await cart.update();
    return cart;
}

const addProductToCart = async (idCustomer, idProduct, idProductAttribute, quantity, multiplicateur = 1) => {
    const factor = Number(multiplicateur) || 1;
    const safeQty = Math.max(1, Math.trunc((Number(quantity) || 0) * factor));

    const cartRow = {
        productId: idProduct,
        productAttributeId: idProductAttribute,
        quantity: safeQty,
        addressDeliveryId: 0,
    };

    const { cart, isNew } = await createOrUpdateCart(idCustomer, new Date(), [cartRow]);
    if (isNew) {
        return cart;
    }

    cartRow.addressDeliveryId = cart.addressDeliveryId;
    cart.cartRows = [...(cart.cartRows ?? []), cartRow];
    await cart.update();
    return cart;
}

const duplicateCart = async(cart, multiplicateur, dateUpdate) => {
    for (const row of cart.cartRows) {
        row.quantity = Number(row.quantity) * multiplicateur
        await addProductToCart(cart.customerId, row.productId, row.productAttributeId, row.quantity);
    }   
}

const getProductForRow = async (cartRow) => {
    if (!cartRow) {
        return null;
    }

    const productId = Number(cartRow.productId || 0);
    if (!productId) {
        return null;
    }

    const productApi = new Product({}, false);
    return await productApi.getById(productId);
}

const getStockForProductAttribute = async (productId, productAttributeId = 0) => {
    const stockApi = new StockAvailable({}, false);
    const stock = await stockApi.getByProductAndAttribute(productId, productAttributeId);
    return Number(stock?.quantity ?? 0);
}

const getCartRowDetails = async (cartRow) => {
    if (!cartRow) {
        return null;
    }

    const product = await getProductForRow(cartRow);
    if (!product) {
        return null;
    }

    const attributeId = Number(cartRow.productAttributeId || 0);
    const declinaisonDetails = await product.getDeclinaisonDetails(attributeId);
    const stockQuantity = await getStockForProductAttribute(product.id, attributeId);

    let productImageURL = declinaisonDetails.imageUrl;
    if (!productImageURL) {
        const images = await product.getImages();
        productImageURL = images[0] || "";
    }

    return {
        product,
        productImageURL,
        declinaison: declinaisonDetails.declinaison,
        priceTtc: declinaisonDetails.priceTtc,
        stockQuantity,
        quantity: cartRow.quantity,
    };
}

const updateCartForCustomer = async (cart, customer, address) => {
    if (!cart?.id) {
        throw new Error("Cart not found");
    }
    if (!customer?.id) {
        throw new Error("Customer not found");
    }
    if (!address?.id) {
        throw new Error("Address not found");
    }

    const nextRows = (cart.cartRows ?? []).map((row) => ({
        ...row,
        addressDeliveryId: row?.addressDeliveryId || address.id,
    }));

    cart.customerId = customer.id;
    cart.idGuest = 0;
    cart.addressDeliveryId = address.id;
    cart.addressInvoiceId = address.id;
    cart.secureKey = customer.secureKey ?? customer.secure_key ?? "";
    cart.deliveryOption = buildDeliveryOption(address.id, cart.carrierId || DEFAULT_CARRIER_ID);
    cart.cartRows = nextRows;

    return await cart.update();
}

const getCartTotals = (cart) => {
    const rows = cart?.cartRows ?? [];
    let totalHt = 0;
    let totalTtc = 0;

    for (const row of rows) {
        const qty = Number(row?.quantity || 0);
        const baseTtc = Number(row?.baseTtcPrice || 0);
        const taxRate = Number(row?.taxRate || 0);
        const impact = Number(row?.selectedOptionImpact || 0);
        const divisor = 1 + taxRate / 100;
        const baseHt = divisor ? baseTtc / divisor : 0;

        totalHt += (baseHt + impact) * qty;
        totalTtc += (baseTtc + impact * divisor) * qty;
    }

    return { totalHt, totalTtc };
}

const getCartsWithoutOrder = async () => {
    const orderApi = new Order({}, false);
    const cartApi = new Cart({}, false);
    const orders = await orderApi.getAll();
    const cartIds = [...new Set(
        orders
            .map((order) => Number(order?.cartId))
            .filter((cartId) => Number.isFinite(cartId) && cartId > 0)
    )];

    return await cartApi.getExclApi(cartIds);
}

const getCartWithoutOrderByCustomer = async (customerId) => {
    const cartsWithoutOrder = await getCartsWithoutOrder();
    return (cartsWithoutOrder || []).filter(cart => Number(cart?.customerId) === Number(customerId));
}

const enrichCarts = async (carts = []) => {
    const detailed = [];
    for (const cart of carts ?? []) {
        try {
            const enumerated = CartWithDetails.fromCart(cart);
            const enriched = await enumerated.enrich();
            detailed.push(enriched);
        } catch (err) {
            console.warn('Failed to enrich cart:', err);
        }
    }
    return detailed;
}

export default {
    isCartActive,
    getLastCartByCustomer,
    createOrUpdateCart,
    deleteItems,
    addProductToCart,
    getCartRowDetails,
    getStockForProductAttribute,
    updateCartForCustomer,
    getCartTotals,
    getCartsWithoutOrder,
    duplicateCart,
    getCartWithoutOrderByCustomer,
    enrichCarts,
}
