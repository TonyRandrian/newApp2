import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import Category from "../backend/entities/Category.js";
import {removeStockByCategory} from "../backend/services/import/RemoveStockService.js";

function RemoveStock() {
    const navigate = useNavigate()
    const [categories, setCategories] = useState([])
    const [categoryId, setCategoryId] = useState("");
    const [qtt, setQtt] = useState("")
    const [total, setTotal] = useState(0)

    useEffect(() => {

        const password = prompt("Entrez mot de passe: ")
        if (password === "admin123") {
            const loadCategories = async () => {
                try {
                    const categoryApi = new Category({}, false);
                    const categoryList = await categoryApi.getExcl([1, 2]);

                    setCategories(categoryList);
                } catch (error) {
                    console.error("Error fetching categories:", error);
                }
            };

            loadCategories()
        } else {
            alert("Erreur")
            navigate("/fo/products")
        }
    }, []);

    const removeStock = async () => {
        console.log("Removing stock")
        const total = await removeStockByCategory(categoryId, qtt)
        setTotal(total)
        console.log("stock removed")
    }

    return <div>
        <div className="fo-filter">
            <label className="fo-filter__label">Catégorie</label>
            <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
            >
                {categories.map((category, index) => (
                    <option key={`${category.id}-${index}`} value={category.id}>
                        {category.name}
                    </option>
                ))}
            </select>
        </div>
        <div>
            QUANTITE
            <input
                type={"number"}
                onChange={(e) => setQtt(e.target.value)}
            />
        </div>
        <div>
            <button onClick={removeStock}>Valider</button>
        </div>
        <h1>Total: {total}</h1>
    </div>
}

export default RemoveStock;