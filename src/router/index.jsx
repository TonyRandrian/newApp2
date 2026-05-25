import {createBrowserRouter} from "react-router-dom";
import BOMainLayout from "../layouts/BOMainLayout.jsx";
import BOReset from "../pages/BOReset.jsx";
import BOImport from "../pages/BOImport.jsx";
import BOOrderList from "../pages/BOOrderList.jsx";
import FOMainLayout from "../layouts/FOMainLayout.jsx";
import FOUserList from "../pages/FOUserList.jsx";
import FOOrderList from "../pages/FOOrderList.jsx";
import FOProductList from "../pages/FOProductList.jsx";
import FOProductPreview from "../pages/FOProductPreview.jsx";
import FOGuestCheckout from "../pages/FOGuestCheckout.jsx";
import BOStock from "../pages/BOStock.jsx";
import BOLogin from "../pages/BOLogin.jsx";
import FOCart from "../pages/FOCart.jsx";

import BOStatistic from "../pages/BOStatistic.jsx";
import BODashboard from "../pages/BODashboard.jsx";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <BOMainLayout/>,

        children: [
            {
                index: true,
                element: <BOLogin/>
            },
            {
                path: "reset",
                element: <BOReset/>
            },
            {
                path: "import",
                element: <BOImport/>
            },
            {
                path: "orders",
                element: <BOOrderList/>
            },
            {
                path: "stocks",
                element: <BOStock/>
            },
            {
                path: "statistics",
                element: <BOStatistic/>
            },
            {
                path: "dashboard",
                element: <BODashboard/>
            }
        ]
    },
    {
        path: "/fo",
        element: <FOMainLayout/>,

        children: [
            {
                index: true,
                element: <FOUserList/>
            },
            {
                path: "products",
                element: <FOProductList/>
            },
            {
                path: "product/preview/:id",
                element: <FOProductPreview/>
            },
            {
                path: "orders",
                element: <FOOrderList/>
            },
            {
                path: "cart",
                element: <FOCart />
            },
            {
                path: "checkout",
                element: <FOGuestCheckout />
            }
        ]
    }
])