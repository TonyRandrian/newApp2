import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

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

    if (isGuest) {
        return (
            <>
                <nav>
                    <Link to="/fo/products">Products</Link>
                    <Link to="/fo/cart">My cart</Link>
                    <button onClick={handleLogout}>Logout</button>
                </nav>

                <main>
                    <Outlet />
                </main>
            </>
        );
    }

    if (isLoginRoute) {
        return <Outlet />;
    }

    return (
        <>
            <nav>
                <Link to="/fo/products">Products</Link>
                <Link to="/fo/orders">My orders</Link>
                <Link to="/fo/cart">My cart</Link>
                <button onClick={handleLogout}>Logout</button>
            </nav>

            <main>
                <Outlet />
            </main>
        </>
    );
}

export default FOMainLayout;