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
        <div className="bo-page">
            <header className="bo-page__head">
                <div className="bo-page__heading">
                    <span className="bo-page__eyebrow">Système</span>
                    <h1 className="bo-page__title">Import des données</h1>
                    <p className="bo-page__subtitle">
                        Chargez les fichiers CSV (et l'archive d'images) à intégrer dans la base.
                    </p>
                </div>
            </header>

            <div className="bo-page__body bo-import">
                <form className="bo-card bo-import__form" onSubmit={handleSubmit}>
                    <div className="bo-card__body">
                        {isImporting && <p className="bo-status bo-status--loading">Import en cours…</p>}

                        <div className="bo-import__fields">
                            <div className="bo-import__field">
                                <div className="bo-import__field-header">
                                    <span className="bo-import__field-title">Produits</span>
                                    <span className="bo-import__field-hint">Fichier CSV — catalogue produits</span>
                                </div>
                                <input
                                    type={"file"}
                                    accept={".csv"}
                                    onChange={(event) => setProductFile(event.target.files?.[0] ?? null)}
                                />
                                {productFile && <span className="bo-field__filename">{productFile.name}</span>}
                            </div>

                            <div className="bo-import__field">
                                <div className="bo-import__field-header">
                                    <span className="bo-import__field-title">Déclinaisons &amp; stock initial</span>
                                    <span className="bo-import__field-hint">Fichier CSV — variantes et stock</span>
                                </div>
                                <input
                                    type={"file"}
                                    accept={".csv"}
                                    onChange={(event) => setDeclinaisonFile(event.target.files?.[0] ?? null)}
                                />
                                {declinaisonFile && <span className="bo-field__filename">{declinaisonFile.name}</span>}
                            </div>

                            <div className="bo-import__field">
                                <div className="bo-import__field-header">
                                    <span className="bo-import__field-title">Clients &amp; commandes</span>
                                    <span className="bo-import__field-hint">Fichier CSV — historique commandes</span>
                                </div>
                                <input
                                    type={"file"}
                                    accept={".csv"}
                                    onChange={(event) => setOrdersFile(event.target.files?.[0] ?? null)}
                                />
                                {ordersFile && <span className="bo-field__filename">{ordersFile.name}</span>}
                            </div>

                            <div className="bo-import__field">
                                <div className="bo-import__field-header">
                                    <span className="bo-import__field-title">Images</span>
                                    <span className="bo-import__field-hint">Archive ZIP — visuels produits</span>
                                </div>
                                <div className="bo-import__field-row">
                                    <label className="bo-import__toggle">
                                        <input
                                            type="checkbox"
                                            checked={doImport}
                                            onChange={(event) => setDoImport(event.target.checked)}
                                        />
                                        Activer l'import des images
                                    </label>
                                </div>
                                <input
                                    type={"file"}
                                    accept={".zip"}
                                    onChange={(event) => setImageZipFile(event.target.files?.[0] ?? null)}
                                />
                                {imageZipFile && <span className="bo-field__filename">{imageZipFile.name}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="bo-card__footer">
                        <button type={"submit"} className="bo-btn--primary" disabled={isImporting}>
                            {isImporting ? 'Import en cours…' : 'Lancer l\'import'}
                        </button>
                    </div>
                </form>

                {importError && (
                    <div className="bo-banner bo-banner--error">
                        <span className="bo-banner__title">Échec de l'import :</span>
                        {importError}
                    </div>
                )}

                {importResult && (
                    <div className="bo-card bo-import__result">
                        <div className="bo-card__head">
                            <div className="bo-card__heading">
                                <h3 className="bo-card__title">Résultat de l'import</h3>
                                <span className="bo-card__subtitle">Détail technique de l'opération</span>
                            </div>
                        </div>
                        <div className="bo-card__body bo-card__body--flush">
                            <pre>{JSON.stringify(importResult, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default BOImport;
