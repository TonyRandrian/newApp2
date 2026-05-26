import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import Category from "../backend/entities/Category.js";
import {removeStockByCategory} from "../backend/services/import/RemoveStockService.js";

function RemoveStock() {
    const navigate = useNavigate()
    const [categories, setCategories] = useState([])
    const [categoryIdAdd, setCategoryIdAdd] = useState("0");
    const [qttAdd, setQttAdd] = useState("")
    const [categoryIdRemove, setCategoryIdRemove] = useState("");
    const [qttRemove, setQttRemove] = useState("")
    const [total, setTotal] = useState({})
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const password = prompt("Entrez mot de passe: ")
        if (password === "admin123") {
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

    const removeStock = async () => {
        if (!categoryId || !qtt) return;
        setIsSubmitting(true);
        try {
            const result = await removeStockByCategory(categoryId, qtt)
            setTotal(result)
        } catch (error) {
            console.error("Error removing stock:", error)
        } finally {
            setIsSubmitting(false);
        }
    }

    const hasResult = total && (total.total !== undefined || total.totalNormal !== undefined);

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
                            onClick={removeStock}
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
                        <div className="fo-filters">
                            <div className="fo-filter">
                                <label className="fo-filter__label">Total</label>
                                <strong>{total.total ?? 0}</strong>
                            </div>
                            <div className="fo-filter">
                                <label className="fo-filter__label">Total dû</label>
                                <strong>{total.totalNormal ?? 0}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default RemoveStock;
