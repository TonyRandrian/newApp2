import { useEffect, useMemo, useState } from "react"
import orderService from "../backend/services/OderService"
import cartService from "../backend/services/CartService.js"
import FOOrderRow from "../components/FOOrderRow"
import useLocalStorage from "../hooks/useLocalStorage.jsx"
import { formatDateInput } from "../backend/utils/utils.js"

const getOrdersByCustomer = async (customerId) => {
    return await orderService.getOrderRowsByCustomer(customerId)
}

const getCartsByCustomer = async (customerId) => {
    const rawCarts = await cartService.getCartWithoutOrderByCustomer(customerId)
    return await cartService.enrichCarts(rawCarts)
}

function FOOrderList() {
    const [orders, setOrders] = useState([])
    const [carts, setCarts] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [banner, setBanner] = useState(null)
    const [user] = useLocalStorage("user", null)
    const [edit, setEdit] = useState({
        orderId: null,
        cartId: null,
        multiplicateur: 1,
        dateUpdate: "",
        cartDateOrder: "",
    })

    const handleChange = (id, isCart = false) => (event) => {
        const { name, value } = event.target

        setEdit((prev) => ({
            ...prev,
            [isCart ? "cartId" : "orderId"]: id,
            [name]: value,
        }))
    }

    const handleClick = async (orderId) => {
        setBanner(null)
        try {
            await orderService.duplicateCart(orderId, edit?.multiplicateur ?? 1, edit?.dateUpdate || formatDateInput(new Date()))

            const userId = user?.id || 0
            const [nextOrders, nextCarts] = await Promise.all([
                getOrdersByCustomer(userId),
                getCartsByCustomer(userId),
            ])
            setOrders(nextOrders)
            setCarts(nextCarts)

            setBanner({
                type: "success",
                title: "Panier dupliqué",
                message: "Le panier a bien été créé à partir de la commande.",
            })
        } catch (error) {
            console.log("Erreur lors de la duplication du panier de la commande", error)
            setBanner({
                type: "error",
                title: "Erreur",
                message: error?.message || "Erreur lors de la duplication du panier.",
            })
        }
    }

    const handleCommanderClick = async (cartId) => {
        setBanner(null)
        try {
            const commandDate = edit?.cartId === cartId
                ? (edit?.cartDateOrder || formatDateInput(new Date()))
                : formatDateInput(new Date())

            await orderService.createOrderFromCartId(cartId, user?.id || 0, commandDate)

            const userId = user?.id || 0
            const [nextOrders, nextCarts] = await Promise.all([
                getOrdersByCustomer(userId),
                getCartsByCustomer(userId),
            ])

            setOrders(nextOrders)
            setCarts(nextCarts)
            setEdit({ orderId: null, multiplicateur: 1, dateUpdate: "", cartId: null, cartDateOrder: "" })
            setBanner({
                type: "success",
                title: "Commande créée",
                message: "La commande a été créée à partir du panier.",
            })
        } catch (error) {
            console.error("Erreur création commande depuis panier", error)
            if (error?.stockErrors?.length) {
                const lines = error.stockErrors.map(item =>
                    `${item.productName} : demandé ${item.requested}, disponible ${item.available}`
                )
                setBanner({
                    type: "error",
                    title: "Stock insuffisant",
                    message: lines.join(" ; "),
                })
            } else {
                setBanner({
                    type: "error",
                    title: "Erreur",
                    message: error?.message || "Erreur lors de la création de la commande.",
                })
            }
        }
    }

    useEffect(() => {
        const loadAll = async () => {
            setIsLoading(true)
            try {
                const userId = user?.id || 0
                const [nextOrders, nextCarts] = await Promise.all([
                    getOrdersByCustomer(userId),
                    getCartsByCustomer(userId),
                ])

                setOrders(nextOrders)
                setCarts(nextCarts)
            } catch (error) {
                console.log("Erreur lors de la recuperation des donnees", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadAll()
    }, [user?.id])

    const cartRows = useMemo(
        () => (carts || []).map((cart) => ({
            ...cart,
            customerName: user?.firstname && user?.lastname
                ? `${user.firstname} ${user.lastname}`
                : "Panier (sans commande)",
            totalPaid: Number(cart?.totals?.totalTtc ?? 0),
            orderStateName: "En attente de commande",
        })),
        [carts, user],
    )

    return (
        <div className="fo-page">
            <header className="fo-page__head">
                <div className="fo-page__heading">
                    <span className="fo-page__eyebrow">Historique</span>
                    <h1 className="fo-page__title">Mes commandes</h1>
                    <p className="fo-page__subtitle">
                        Vos commandes passées et vos paniers en attente de validation.
                    </p>
                </div>
            </header>

            {banner ? (
                <div className={`fo-banner fo-banner--${banner.type}`}>
                    <span className="fo-banner__title">{banner.title}</span>
                    <span>{banner.message}</span>
                </div>
            ) : null}

            <div className="fo-page__body">
                {isLoading ? (
                    <p className="fo-status fo-status--loading">Chargement des commandes…</p>
                ) : (
                    <FOOrderRow
                        title="Commandes"
                        rows={orders}
                        edit={edit}
                        multiplicateur={1}
                        onChange={handleChange}
                        onClick={handleClick}
                        actionMode="order"
                    />
                )}

                {isLoading ? (
                    <p className="fo-status fo-status--loading">Chargement des paniers…</p>
                ) : (
                    <FOOrderRow
                        title="Paniers sans commande"
                        rows={cartRows}
                        edit={edit}
                        onChange={handleChange}
                        onClick={handleCommanderClick}
                        actionMode="cart"
                    />
                )}
            </div>
        </div>
    )
}

export default FOOrderList
