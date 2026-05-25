import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

function FOMainLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    const isGuest = localStorage.getItem("isGuest") === "true";
    const isLoginRoute = location.pathname === "/fo";

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("isGuest");
        navigate("/fo");
    };

    if (isLoginRoute) {
        return (
            <div className="fo-app fo-app--login">
                <Outlet />
            </div>
        );
    }

    const linkClass = ({ isActive }) =>
        isActive ? "fo-navbar__link is-active" : "fo-navbar__link";

    return (
        <div className="fo-app">
            <header className="fo-navbar">
                <div className="fo-navbar__brand">
                    <span className="fo-navbar__brand-mark">N</span>
                    <span className="fo-navbar__brand-name">Boutique</span>
                </div>

                <nav className="fo-navbar__nav">
                    <NavLink to="/fo/products" className={linkClass}>Produits</NavLink>
                    {!isGuest && (
                        <NavLink to="/fo/orders" className={linkClass}>Mes commandes</NavLink>
                    )}
                    <NavLink to="/fo/cart" className={linkClass}>Mon panier</NavLink>
                </nav>

                <div className="fo-navbar__actions">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="fo-navbar__logout"
                    >
                        Déconnexion
                    </button>
                </div>
            </header>

            <main className="fo-main">
                <Outlet />
            </main>
        </div>
    );
}

export default FOMainLayout;
