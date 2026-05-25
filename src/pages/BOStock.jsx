import BOStockUpdate from "../components/BOStockUpdate.jsx";
import BOStockEvolution from "../components/BOStockEvolution.jsx";
import {useState} from "react";

function BOStock() {
    // combination: productId (combination[0]) + productAttributeId (combination[1])
    const [combination, setCombination] = useState([])
    // les produits avec détails qui sera passé entre les composants pour éviter les requêtes à chaque appel
    const [productDetails, setProductDetails] = useState([])

    return <div>
        <section>
            <BOStockUpdate setCombination={setCombination} setProductDetails={setProductDetails}/>
        </section>
        <section>
            <BOStockEvolution combination={combination} productDetails={productDetails}/>
        </section>
    </div>
}

export default BOStock;
