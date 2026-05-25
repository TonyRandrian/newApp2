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
        try {
            await orderService.duplicateCart(orderId, edit?.multiplicateur ?? 1, edit?.dateUpdate || formatDateInput(new Date()))
        } catch (error) {
            console.log("Erreur lors de la duplication du panier de la commande", error)
        }
    }

    const handleCommanderClick = async (cartId) => {
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
        } catch (error) {
            console.error("Erreur création commande depuis panier", error)
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
        <>
            <h1>Liste de tous les commandes</h1>

            {isLoading ? (
                <p>Chargements des clients</p>
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

            <h2>Mes paniers sans commande</h2>

            {isLoading ? (
                <p>Chargements des paniers</p>
            ) : (
                <FOOrderRow
                    title="Paniers"
                    rows={cartRows}
                    edit={edit}
                    onChange={handleChange}
                    onClick={handleCommanderClick}
                    actionMode="cart"
                />
            )}
        </>
    )
}

export default FOOrderList
