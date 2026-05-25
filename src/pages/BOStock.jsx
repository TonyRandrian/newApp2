import BOStockUpdate from "../components/BOStockUpdate.jsx";
import BOStockEvolution from "../components/BOStockEvolution.jsx";
import {useState} from "react";

function BOStock() {
    // combination: productId (combination[0]) + productAttributeId (combination[1])
    const [combination, setCombination] = useState([])
    // les produits avec détails qui sera passé entre les composants pour éviter les requêtes à chaque appel
    const [productDetails, setProductDetails] = useState([])
    const [isUpdateLoading, setIsUpdateLoading] = useState(true)
    const [isEvolutionLoading, setIsEvolutionLoading] = useState(true)

    const isLoading = isUpdateLoading || isEvolutionLoading

    return (
        <div className="bo-page">
            <header className="bo-page__head">
                <div className="bo-page__heading">
                    <span className="bo-page__eyebrow">Catalogue</span>
                    <h1 className="bo-page__title">Gestion des stocks</h1>
                    <p className="bo-page__subtitle">
                        Ajustez les quantités et consultez l'évolution journalière des mouvements de stock.
                    </p>
                </div>
            </header>

            {isLoading && <p className="bo-status bo-status--loading">Chargement des stocks…</p>}

            <div className="bo-page__body">
                <BOStockUpdate
                    setCombination={setCombination}
                    setProductDetails={setProductDetails}
                    onLoadingChange={setIsUpdateLoading}
                />
                <BOStockEvolution
                    combination={combination}
                    productDetails={productDetails}
                    onLoadingChange={setIsEvolutionLoading}
                />
            </div>
        </div>
    )
}

export default BOStock;
