import {useEffect, useState} from "react";
import Customer from "../backend/entities/Customer.js";
import FOUserRow from "../components/FOUserRow.jsx";
import useLocalStorage from "../hooks/useLocalStorage.jsx";
import CustomerService from "../backend/services/CustomerService.js";
import {useNavigate} from "react-router-dom";

function FOUserList() {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [, setUser] = useLocalStorage("user", null);
    const [, setIsGuest] = useLocalStorage("isGuest", false);
    const navigate = useNavigate();

    const ANONYMOUS_CUSTOMER_ID = [1, 2];

    useEffect(() => {
        async function loadCustomers() {
            setIsLoading(true);

            try {
                const customer = new Customer({}, false);
                const data = await customer.getExclApi(ANONYMOUS_CUSTOMER_ID);

                setCustomers(data);
                setIsLoading(false);
            } catch (error) {
                console.error("ERROS WHILE FETCHING CUSTOMERS: " + error);
                return null;
            }
        }

        loadCustomers();
    }, []);

    const connectCustomer = (customer) => {
        setUser(customer);
        setIsGuest(false);
        navigate('/fo/products');
    };

    const connectGuest = () => {
        setUser({id: CustomerService.ANONYMOUS_ID});
        setIsGuest(true);
        navigate('/fo/products');
    };

    return (
        <section className="fo-login">
            <header className="fo-login__header">
                <span className="fo-login__eyebrow">Boutique</span>
                <h1 className="fo-login__title">Se connecter</h1>
                <p className="fo-login__subtitle">
                    Sélectionnez votre profil client ou continuez en visiteur.
                </p>
            </header>

            <div className="fo-login__actions">
                <button
                    type="button"
                    className="fo-btn--ghost"
                    onClick={connectGuest}
                >
                    Connexion anonyme
                </button>
            </div>

            <div className="fo-card">
                <div className="fo-card__head">
                    <div className="fo-card__heading">
                        <h2 className="fo-card__title">Clients enregistrés</h2>
                        <span className="fo-card__subtitle">
                            Cliquez sur un client pour vous connecter.
                        </span>
                    </div>
                </div>

                <div className="fo-card__body fo-card__body--flush">
                    {isLoading ? (
                        <p className="fo-status fo-status--loading">Chargement des clients…</p>
                    ) : customers.length === 0 ? (
                        <p className="fo-empty">Aucun client disponible.</p>
                    ) : (
                        <table className="fo-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Prénom</th>
                                    <th>Nom</th>
                                    <th>Email</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((customer) => (
                                    <FOUserRow
                                        key={customer.id}
                                        customer={customer}
                                        onClick={() => connectCustomer(customer)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <p className="fo-login__footer">Une seule session active à la fois.</p>
        </section>
    );
}

export default FOUserList;
