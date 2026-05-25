import {Link, Navigate, Outlet, useLocation, useNavigate} from "react-router-dom";

function BOMainLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isAuthed = localStorage.getItem("boAuth") === "true";
    const isLoginRoute = location.pathname === "/";

    const handleLogout = () => {
        localStorage.removeItem("boAuth");
        navigate("/");
    };

    if (!isAuthed && !isLoginRoute) {
        return <Navigate to="/" replace />;
    }

    if (isLoginRoute) {
        return (
            <div className="bo-app bo-app--login">
                {isAuthed ? <Navigate to="/orders" replace /> : <Outlet />}
            </div>
        );
    }

    return (
        <div className="bo-app">
            <aside className="bo-sidebar">
                <div className="bo-sidebar__brand">
                    <span className="bo-sidebar__brand-mark">N</span>
                    <span className="bo-sidebar__brand-name">Backoffice</span>
                </div>

                <nav className="bo-sidebar__nav">
                    <span className="bo-sidebar__section">Pilotage</span>
                    <Link to={"/dashboard"} className="bo-sidebar__link">Dashboard</Link>
                    <Link to={"/statistics"} className="bo-sidebar__link">Statistics</Link>
                    <Link to={"/orders"} className="bo-sidebar__link">Orders</Link>

                    <span className="bo-sidebar__section">Catalogue</span>
                    <Link to={"/stocks"} className="bo-sidebar__link">Stocks</Link>
                    <Link to={"/import"} className="bo-sidebar__link">Import</Link>

                    <span className="bo-sidebar__section">Système</span>
                    <Link to={"/reset"} className="bo-sidebar__link">Reset</Link>
                </nav>

                <div className="bo-sidebar__footer">
                    <button type="button" onClick={handleLogout} className="bo-sidebar__logout">
                        Logout
                    </button>
                </div>
            </aside>

            <main className="bo-main">
                <Outlet/>
            </main>
        </div>
    )
}

export default BOMainLayout;