import {useEffect} from "react";

function RemoveStock() {
    useEffect(() => {
        const password = prompt("Entrez mot de passe: ")
        console.log(password)
    }, []);


    return <h1>Hello</h1>
}

export default RemoveStock;