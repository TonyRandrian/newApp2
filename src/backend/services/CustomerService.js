import Customer from "../entities/Customer";
import Address from "../entities/Address";
import CartService from "./CartService";

const CustomerService = {
    customerApi: new Customer({}, false),
    ANONYMOUS_ID: 1,
    DEFAULT_COUNTRY_ID: 8,

    async connectCustomerToCart(cart, customer) {
        if (!cart?.id) {
            throw new Error("Cart not found");
        }

        const customerApi = new Customer({}, false);
        const freshCustomer = customer?.id ? await customerApi.getById(customer.id) : customer;
        const addresses = await freshCustomer.getAddress();

        if (!addresses?.length) {
            throw new Error("Aucune adresse pour ce client");
        }

        const updated = await CartService.updateCartForCustomer(cart, freshCustomer, addresses[0]);
        return { cart: updated, customer: freshCustomer, address: addresses[0] };
    },

    async registerCustomerForCart(cart, form, options = {}) {
        if (!cart?.id) {
            throw new Error("Cart not found");
        }

        const {
            firstname,
            lastname,
            email,
            password,
            address1,
            postcode,
            city,
        } = form || {};

        const newCustomer = Customer.fromData({
            firstname,
            lastname,
            email,
            password,
            active: 1,
            isGuest: 0,
            idLang: 1,
            idShop: 1,
            idShopGroup: 1,
            idDefaultGroup: 3,
        });
        const createdCustomer = await newCustomer.save();

        const countryId = Number(options?.countryId || CustomerService.DEFAULT_COUNTRY_ID);
        const newAddress = Address.fromData({
            idCustomer: createdCustomer.id,
            idCountry: countryId,
            idState: 0,
            alias: "Checkout",
            firstname,
            lastname,
            address1,
            postcode,
            city,
        });
        const createdAddress = await newAddress.save();

        const updated = await CartService.updateCartForCustomer(cart, createdCustomer, createdAddress);
        return { cart: updated, customer: createdCustomer, address: createdAddress };
    },
};

export default CustomerService;