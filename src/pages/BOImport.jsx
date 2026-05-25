import {useState} from "react";
import executeImport from "../backend/services/import/executeImport.js";

function BOImport() {
    const [productFile, setProductFile] = useState(null)
    const [declinaisonFile, setDeclinaisonFile] = useState(null)
    const [ordersFile, setOrdersFile] = useState(null)
    const [imageZipFile, setImageZipFile] = useState(null)
    const [importResult, setImportResult] = useState(null)
    const [importError, setImportError] = useState(null)
    const [isImporting, setIsImporting] = useState(false)
    const [doImport, setDoImport] = useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        setImportError(null)
        setImportResult(null)
        setIsImporting(true)

        try {
            const result = await executeImport({
                productFile,
                declinaisonFile,
                ordersFile,
                imageZipFile,
                doImport,
                onProgress: (progress) => console.log(progress),
            })

            setImportResult(result)
        } catch (error) {
            setImportError(error?.message ?? 'Erreur inconnue')
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>
                    <span>Produits</span>
                    <input
                        type={"file"}
                        placeholder={"Produits"}
                        accept={".csv"}
                        onChange={(event) => setProductFile(event.target.files?.[0] ?? null)}
                    />
                </label>
                {productFile && <p>{productFile.name}</p>}
                <label>
                    <span>Déclinaisons & Stock initiaux</span>
                    <input
                        type={"file"}
                        placeholder={"Produits"}
                        accept={".csv"}
                        onChange={(event) => setDeclinaisonFile(event.target.files?.[0] ?? null)}
                    />
                </label>
                {declinaisonFile && <p>{declinaisonFile.name}</p>}
                <label>
                    <span>Clients & Commandes</span>
                    <input
                        type={"file"}
                        placeholder={"Produits"}
                        accept={".csv"}
                        onChange={(event) => setOrdersFile(event.target.files?.[0] ?? null)}
                    />
                </label>
                {ordersFile && <p>{ordersFile.name}</p>}
                <label>
                    <span>Images</span>
                    <input type="checkbox"
                        checked={doImport}
                        onChange={(event) => setDoImport(event.target.checked)}
                    />
                    <input
                        type={"file"}
                        placeholder={"Produits"}
                        accept={".zip"}
                        onChange={(event) => setImageZipFile(event.target.files?.[0] ?? null)}
                    />
                </label>
                {imageZipFile && <p>{imageZipFile.name}</p>}
                <button type={"submit"} disabled={isImporting}>
                    {isImporting ? 'Import en cours...' : 'Importer'}
                </button>
            </div>

            {importError && <p>{importError}</p>}
            {importResult && <pre>{JSON.stringify(importResult, null, 2)}</pre>}
        </form>
    )
}

export default BOImport;