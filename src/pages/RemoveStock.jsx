import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import Category from "../backend/entities/Category.js";
import {updateStockByCategory} from "../backend/services/import/RemoveStockService.js";

function RemoveStock() {
    const navigate = useNavigate()
    const [categories, setCategories] = useState([])
    const [categoryIdAdd, setCategoryIdAdd] = useState("0");
    const [qttAdd, setQttAdd] = useState("")
    const [categoryIdRemove, setCategoryIdRemove] = useState("");
    const [qttRemove, setQttRemove] = useState("")
    const [result, setResult] = useState(null)
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [limite, setLimite] = useState("0")

    useEffect(() => {
        const password = prompt("Entrez mot de passe: ")
        if (password === "admin") {
            const loadCategories = async () => {
                try {
                    const categoryApi = new Category({}, false);
                    const categoryList = await categoryApi.getExclApi([1, 2]);
                    setCategories(categoryList);
                } catch (error) {
                    console.error("Error fetching categories:", error);
                } finally {
                    setIsLoading(false);
                }
            };

            loadCategories()
        } else {
            alert("Erreur")
            navigate("/fo/products")
        }
    }, []);

    const selectableCategories = useMemo(() => {
        return categories.filter((category) => String(category?.name ?? "").trim() !== "");
    }, [categories]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const result = await updateStockByCategory(categoryIdAdd, qttAdd, categoryIdRemove, qttRemove, limite)
            setResult(result)
        } catch (error) {
            console.error("Error removing stock:", error)
        } finally {
            setIsSubmitting(false);
        }
    }

    const hasResult = result

    return (
        <div className="fo-page">
            <header className="fo-page__head">
                <div className="fo-page__heading">
                    <span className="fo-page__eyebrow">Gestion du stock</span>
                    <h1 className="fo-page__title">Retirer du stock</h1>
                    <p className="fo-page__subtitle">
                        Sélectionnez une catégorie et une quantité à retirer du stock.
                    </p>
                </div>
            </header>

            <div className="fo-card">
                <div className="fo-card__head">
                    <div className="fo-card__heading">
                        <h2 className="fo-card__title">Paramètres</h2>
                    </div>
                </div>
                <div className="fo-card__body">
                    <div className="fo-filters">
                        <div className="fo-filter">
                            <label className="fo-filter__label">Catégorie à AJOUTER</label>
                            <select
                                value={categoryIdAdd}
                                onChange={(e) => setCategoryIdAdd(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="">
                                    {isLoading ? "Chargement…" : "Sélectionnez une catégorie"}
                                </option>
                                {selectableCategories.map((category, index) => (
                                    <option key={`${category.id}-${index}`} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            <label className="fo-filter__label">Limite</label>
                            <input
                                type="number"
                                placeholder="Rechercher un nom"
                                value={limite}
                                onChange={(e) => setLimite(e.target.value)}
                            />
                        </div>
                        <div className="fo-filter">
                            <label className="fo-filter__label">Quantité</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={qttAdd}
                                min={0}
                                onChange={(e) => setQttAdd(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="fo-filters">
                        <div className="fo-filter">
                            <label className="fo-filter__label">Catégorie à déduire</label>
                            <select
                                value={categoryIdRemove}
                                onChange={(e) => setCategoryIdRemove(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="">
                                    {isLoading ? "Chargement…" : "Sélectionnez une catégorie"}
                                </option>
                                {selectableCategories.map((category, index) => (
                                    <option key={`${category.id}-${index}`} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="fo-filter">
                            <label className="fo-filter__label">Quantité</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={qttRemove}
                                min={0}
                                onChange={(e) => setQttRemove(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="fo-card__actions">
                        <button
                            type="button"
                            className="fo-btn--primary"
                            onClick={handleSubmit}
                        >
                            {isSubmitting ? "Traitement…" : "Valider"}
                        </button>
                    </div>
                </div>
            </div>

            {hasResult ? (
                <div className="fo-card">
                    <div className="fo-card__head">
                        <div className="fo-card__heading">
                            <h2 className="fo-card__title">Résultat</h2>
                        </div>
                    </div>
                    <div className="fo-card__body">
                        <h1>=== Ajouté ===</h1>
                        <h2>Catégorie: {result.add.category.name} ajouté: {result.add.totalEffective}</h2>
                        {
                            result.add.totalEffectives.map(total => (
                                <div>
                                    <h3>Produit déclinaison ID: {total.productAttributeId}</h3>
                                    <h3>Total ajouté: {total.totalEffective}</h3>
                                </div>
                            ))
                        }
                    </div>

                    <div className="fo-card__body">
                        <h1>==== Déduit ===</h1>
                        <h2>Catégorie: {result.remove.category.name} déduit: {result.remove.totalEffective}</h2>
                        {
                            result.remove.totalEffectives.map(total => (
                                <div>
                                    <h3>Produit déclinaison ID: {total.productAttributeId}</h3>
                                    <h3>Total déduit: {total.totalEffective}</h3>
                                </div>
                            ))
                        }
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default RemoveStock;
