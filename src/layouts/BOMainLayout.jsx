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
        return isAuthed ? <Navigate to="/orders" replace /> : <Outlet />;
    }

    return (
        <>
            <nav>
                <Link to={"/reset"}> Reset </Link>
                <Link to={"/import"}> Import </Link>
                <Link to={"/stocks"}>Stocks</Link>
                <Link to={"/orders"}> Orders </Link>
                <Link to={"/statistics"}>Statistics</Link>
                <Link to={"/dashboard"}>Dashboard</Link>
                <button type="button" onClick={handleLogout}>Logout</button>
            </nav>

            <main>
                <Outlet/>
            </main>
        </>
    )
}

export default BOMainLayout;