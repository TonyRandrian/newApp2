import { useEffect, useState } from "react";
import orderService from "../backend/services/OderService"
import BOOrderRow from "../components/BOOrderRow";
import { formatDateInput } from "../backend/utils/utils"

function BOOrderList() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [actionResult, setActionResult] = useState(null);
    const [edit, setEdit] = useState({
        orderId: null,
        orderStateId: "",
        dateUpdate: "",
    });

    const handleChange = (orderId) => (e) => {
        const { name, value } = e.target;

        setEdit((prev) => ({
            ...prev,
            orderId,
            [name]: value,
        }));
    };

    const handleClick = async (orderId) => {
        const currentOrder = orders.find((order) => Number(order.id) === Number(orderId))
        const newStateId = edit.orderStateId || currentOrder?.currentState || ""
        const dateUpdate = edit.dateUpdate || formatDateInput(currentOrder?.dateUpd) || formatDateInput(currentOrder?.dateAdd)

        try {
            const result = await orderService.updateOrderState(orderId, newStateId, dateUpdate);
            setActionResult(result);
        } catch (error) {
            console.log("Erreur lors de la modification de l'état de la commande", error);
            setActionResult({
                success: false,
                orderId,
                orderStateId: newStateId,
                error: error?.message || "Erreur inconnue",
            });
        }

        console.log(
            "Modifier la commande " +
                orderId +
                " à l'état " +
                (newStateId ?? "") +
                " avec la date " +
                (dateUpdate ?? "")
        );
    };

    useEffect(()=>{
        const loadOrders = async () =>{
            setIsLoading(true);
            try {
                const data = await orderService.getOrderRows();
                setOrders(data);
                setIsLoading(false);
            } catch (error) {
                console.log('Erreur lors de la recuperation des commandes', error);
            }
        }
        loadOrders();
    },[]);


    return (
        <div className="bo-page">
            <header className="bo-page__head">
                <div className="bo-page__heading">
                    <span className="bo-page__eyebrow">Pilotage</span>
                    <h1 className="bo-page__title">Commandes</h1>
                    <p className="bo-page__subtitle">
                        Liste des commandes enregistrées. Modifiez le statut ou la date depuis le tableau ci-dessous.
                    </p>
                </div>
            </header>

            {actionResult && (
                <div className={`bo-banner ${actionResult.success ? "bo-banner--success" : "bo-banner--error"}`}>
                    {actionResult.success ? (
                        <span>
                            <span className="bo-banner__title">Commande #{actionResult.orderId} mise à jour.</span>
                            Nouvel état : {actionResult.orderStateId}.
                            {" "}
                            {actionResult.orderHistory
                                ? `Dernier historique : ID ${actionResult.orderHistory.id} le ${actionResult.orderHistory.dateAdd}.`
                                : "Aucun historique trouvé."}
                        </span>
                    ) : (
                        <span>
                            <span className="bo-banner__title">Échec sur la commande #{actionResult.orderId} :</span>
                            {actionResult.error}
                        </span>
                    )}
                </div>
            )}

            <div className="bo-page__body">
                {isLoading ? (
                    <p className="bo-status bo-status--loading">Chargement des commandes…</p>
                ) : (
                    <div className="bo-card">
                        <div className="bo-card__head">
                            <div className="bo-card__heading">
                                <h3 className="bo-card__title">Liste des commandes</h3>
                                <span className="bo-card__subtitle">{orders.length} commande{orders.length > 1 ? "s" : ""} au total</span>
                            </div>
                        </div>
                        <div className="bo-card__body bo-card__body--flush">
                            <BOOrderRow
                                title=""
                                rows={orders}
                                edit={edit}
                                onChange={handleChange}
                                onClick={handleClick}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )

}
export default BOOrderList;
