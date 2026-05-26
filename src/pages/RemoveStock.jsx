import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import Category from "../backend/entities/Category.js";

function RemoveStock() {
    const navigate = useNavigate()
    const [categories, setCategories] = useState([])

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


    return <div>

    </div>
}

export default RemoveStock;