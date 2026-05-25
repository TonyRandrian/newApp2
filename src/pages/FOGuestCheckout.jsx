import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import useLocalStorage from "../hooks/useLocalStorage.jsx";
import CartService from "../backend/services/CartService.js";
import Customer from "../backend/entities/Customer.js";
import OderService from "../backend/services/OderService.js";
import CustomerService from "../backend/services/CustomerService.js";
import FOUserRow from "../components/FOUserRow.jsx";

function FOGuestCheckout() {
    const [user, setUser] = useLocalStorage("user", null);
    const [isGuest, setIsGuest] = useLocalStorage("isGuest", false);
    const [cart, setCart] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [mode, setMode] = useState("login");
    const [customers, setCustomers] = useState([]);

    const [form, setForm] = useState({
        firstname: "",
        lastname: "",
        email: "",
        password: "",
        address1: "",
        postcode: "",
        city: "",
    });

    const ANONYMOUS_CUSTOMER_ID = [1,2];

    const navigate = useNavigate();

    useEffect(() => {
        if (!user?.id) {
            navigate("/fo");
            return;
        }
        if (!isGuest) {
            navigate("/fo/cart");
            return;
        }

        const loadCart = async () => {
            try {
                setIsLoading(true);
                const customerCart = await CartService.getLastCartByCustomer(user.id);
                if (!customerCart) {
                    setCart(null);
                    return;
                }
                const isActive = await CartService.isCartActive(customerCart.id);
                if (!isActive) {
                    setCart(null);
                    return;
                }
                setCart(customerCart);
            } catch (err) {
                console.error("Error loading cart: ", err);
                setCart(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadCart();
    }, [isGuest, navigate, user?.id]);

    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const customerApi = new Customer({}, false);
                const data = await customerApi.getExclApi(ANONYMOUS_CUSTOMER_ID);
                const filtered = (data ?? []).filter((item) => (
                    Number(item?.isGuest ?? 0) !== 1
                    && Number(item?.id ?? 0) !== CustomerService.ANONYMOUS_ID
                ));
                setCustomers(filtered);
            } catch (err) {
                console.error("Error fetching customers: ", err);
            }
        };

        if (mode === "login") {
            loadCustomers();
        }
    }, [mode]);

    const handleLoginCustomer = async (customer) => {
        if (!customer || isSubmitting) {
            return;
        }
        setIsSubmitting(true);
        setError("");
        try {
            const result = await CustomerService.connectCustomerToCart(cart, customer);
            setCart(result.cart);
            setUser(result.customer);
            setIsGuest(false);
        } catch (err) {
            console.error("Error connecting customer: ", err);
            setError("Connexion impossible");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFormChange = (field) => (event) => {
        setForm((prev) => ({
            ...prev,
            [field]: event.target.value,
        }));
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        setError("");

        const { firstname, lastname, email, password, address1, postcode, city } = form;
        if (!firstname || !lastname || !email || !password || !address1 || !postcode || !city) {
            setError("Veuillez remplir tous les champs");
            return;
        }

        if (!cart) {
            setError("Panier introuvable");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await CustomerService.registerCustomerForCart(cart, {
                firstname,
                lastname,
                email,
                password,
                address1,
                postcode,
                city,
            });
            setCart(result.cart);
            setUser(result.customer);
            setIsGuest(false);
        } catch (err) {
            console.error("Error creating customer/address: ", err);
            setError("Erreur lors de la creation du compte");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmOrder = () => {
        if (!cart || !user?.id) {
            setError("Panier ou client introuvable");
            return;
        }
        const dateNow = new Date();
        OderService.createOrderFromCart(cart, user.id, dateNow, 0).then(() => {
            alert("Commande créée avec succès !");
            navigate("/fo/orders");
        }).catch((err) => {
            console.error("Error creating order: ", err);
            setError("Erreur lors de la creation de la commande");
        });
    };

    if (isLoading) {
        return <p>Chargement...</p>;
    }

    if (!cart) {
        return <p>Pas de panier</p>;
    }

    return (
        <div>
            <h1>Finaliser la commande</h1>

            {error ? <p>{error}</p> : null}

            <div>
                <button type="button" onClick={() => setMode("login")}>Se connecter</button>
                <button type="button" onClick={() => setMode("register")}>Inserer les infos</button>
            </div>

            {mode === "login" ? (
                <div>
                    <h2>Choisir un client</h2>
                    <table>
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Firstname</th>
                            <th>Lastname</th>
                            <th>Email</th>
                            <th>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {customers.map((customer) => (
                            <FOUserRow
                                key={customer.id}
                                customer={customer}
                                onClick={() => handleLoginCustomer(customer)}
                            />
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <form onSubmit={handleFormSubmit}>
                    <h2>Informations client</h2>
                    <input type="text" placeholder="Firstname" value={form.firstname} onChange={handleFormChange("firstname")} />
                    <input type="text" placeholder="Lastname" value={form.lastname} onChange={handleFormChange("lastname")} />
                    <input type="email" placeholder="Email" value={form.email} onChange={handleFormChange("email")} />
                    <input type="text" placeholder="Password" value={form.password} onChange={handleFormChange("password")} />
                    <input type="text" placeholder="Adresse" value={form.address1} onChange={handleFormChange("address1")} />
                    <input type="text" placeholder="Code postal" value={form.postcode} onChange={handleFormChange("postcode")} />
                    <input type="text" placeholder="Ville" value={form.city} onChange={handleFormChange("city")} />
                    <button type="submit" disabled={isSubmitting}>Creer compte</button>
                </form>
            )}

            {!isGuest ? (
                <div>
                    <button type="button" onClick={handleConfirmOrder}>
                        Effectuer la commande
                    </button>
                </div>
            ) : null}
        </div>
    );
}

export default FOGuestCheckout;
