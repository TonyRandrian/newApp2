import {Link, useNavigate} from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import Product from "../backend/entities/Product.js";
import Category from "../backend/entities/Category.js";
import { filterProducts } from "../backend/services/ProductService.js";

function FOProductList() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [imageUrls, setImageUrls] = useState({});
    const [badges, setBadges] = useState({});

    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(0);
    const [categoryId, setCategoryId] = useState("");
    const [name, setName] = useState("");

    const navigate = useNavigate();

    const handlePreview = (productId) => {
        navigate(`/fo/product/preview/${productId}`);
    };

    useEffect(() => {
        const loadProducts = async () => {
            setIsLoading(true);
            try {
                const product = new Product({}, false);
                const productList = await product.getAll();

                const nextImageUrls = {};
                const nextBadges = {};

                const enrichedProducts = await Promise.all(
                    productList.map(async (item) => {
                        const [images, quantity, badge, priceTtc, category] = await Promise.all([
                            item.getImages(),
                            item.getQuantity(),
                            item.getBadge(),
                            item.getTtcPrice(),
                            item.getCategory(),
                        ]);

                        item.quantity = quantity;
                        item.badge = badge;
                        item.priceTtc = priceTtc;
                        item.categoryName = category?.name ?? "";

                        nextImageUrls[item.id] = images[0] || "";
                        nextBadges[item.id] = badge;

                        return item;
                    })
                );

                setProducts(enrichedProducts);
                setImageUrls(nextImageUrls);
                setBadges(nextBadges);
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching products:", error);
                setIsLoading(false);
            }
        };

        loadProducts();
    }, []);

    useEffect(() => {
        let isActive = true;

        const loadCategories = async () => {
            try {
                const categoryApi = new Category({}, false);
                const categoryList = await categoryApi.getExcl([1, 2]);
                if (isActive) {
                    setCategories(categoryList);
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };

        loadCategories();

        return () => {
            isActive = false;
        };
    }, []);

    const filteredProducts = useMemo(() => {
        return filterProducts({
            products,
            minPrice,
            maxPrice,
            categoryId: categoryId || null,
            name,
        });
    }, [products, minPrice, maxPrice, categoryId, name]);

    const selectableCategories = useMemo(() => {
        return categories.filter((category) => String(category?.name ?? "").trim() !== "");
    }, [categories]);

    return (
        <div className="fo-page">
            <header className="fo-page__head">
                <div className="fo-page__heading">
                    <span className="fo-page__eyebrow">Catalogue</span>
                    <h1 className="fo-page__title">Nos produits</h1>
                    <p className="fo-page__subtitle">
                        Parcourez le catalogue, filtrez par nom, prix et catégorie.
                    </p>
                    <Link to={"/fo/rm-stock"}>Remove stock</Link>
                </div>
            </header>

            <div className="fo-card">
                <div className="fo-card__head">
                    <div className="fo-card__heading">
                        <h2 className="fo-card__title">Filtres</h2>
                    </div>
                </div>
                <div className="fo-card__body">
                    <div className="fo-filters">
                        <div className="fo-filter">
                            <label className="fo-filter__label">Nom</label>
                            <input
                                type="text"
                                placeholder="Rechercher un nom"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="fo-filter">
                            <label className="fo-filter__label">Prix min</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                min={0}
                            />
                        </div>
                        <div className="fo-filter">
                            <label className="fo-filter__label">Prix max</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                min={0}
                            />
                        </div>
                        <div className="fo-filter">
                            <label className="fo-filter__label">Catégorie</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                            >
                                <option value="">Toutes les catégories</option>
                                {selectableCategories.map((category, index) => (
                                    <option key={`${category.id}-${index}`} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fo-card">
                <div className="fo-card__head">
                    <div className="fo-card__heading">
                        <h2 className="fo-card__title">Produits</h2>
                        <span className="fo-card__subtitle">
                            {filteredProducts.length} résultat{filteredProducts.length > 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
                <div className="fo-card__body fo-card__body--flush">
                    {isLoading ? (
                        <p className="fo-status fo-status--loading">Chargement des produits…</p>
                    ) : filteredProducts.length === 0 ? (
                        <p className="fo-empty">Aucun produit ne correspond aux filtres.</p>
                    ) : (
                        <table className="fo-table">
                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th>Nom</th>
                                    <th>Référence</th>
                                    <th>Prix</th>
                                    <th>Catégorie</th>
                                    <th>Stock</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredProducts.map((product, index) => (
                                    <tr key={`${product.id}-${index}`}>
                                        <td>
                                            {imageUrls[product.id] ? (
                                                <img
                                                    src={imageUrls[product.id]}
                                                    alt="product"
                                                    width="64"
                                                    height="64"
                                                />
                                            ) : (
                                                <span className="fo-status">Aucune image</span>
                                            )}
                                        </td>

                                        <td>
                                            {product.name?.[0]?.value}
                                            {badges[product.id] ? (
                                                <span
                                                    className="fo-table__badge"
                                                    style={{
                                                        color: badges[product.id].color,
                                                        borderColor: badges[product.id].color,
                                                    }}
                                                >
                                                    {badges[product.id].label}
                                                </span>
                                            ) : null}
                                        </td>

                                        <td>{product.reference}</td>
                                        <td className="fo-table__price">
                                            {Number(product.priceTtc ?? product.price).toFixed(2)}
                                        </td>
                                        <td>{product.categoryName || "-"}</td>
                                        <td className="fo-table__numeric">{product.quantity}</td>

                                        <td>
                                            <div className="fo-table__actions">
                                                <button
                                                    type="button"
                                                    className="fo-btn--primary fo-btn--sm"
                                                    onClick={() => handlePreview(product.id)}
                                                >
                                                    Aperçu
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FOProductList;
