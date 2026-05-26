import {useEffect} from "react";
import {useNavigate} from "react-router-dom";

function RemoveStock() {
    const navigate = useNavigate()

    useEffect(() => {
        const password = prompt("Entrez mot de passe: ")
        if (password === "admin123") {
            console.log("tafiditra")
        } else {
            alert("Erreur")
            navigate("/fo/products")
        }
    }, []);


    return <h1>Hello</h1>
}

export default RemoveStock;