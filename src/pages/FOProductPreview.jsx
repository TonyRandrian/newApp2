import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Product from "../backend/entities/Product.js";
import CartService from "../backend/services/CartService.js";

function FOProductPreview() {
    const { id } = useParams();

    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [declinaisons, setDeclinaisons] = useState(null);
    const [selectedDeclinaison, setSelectedDeclinaison] = useState(null);
    const [tax, setTax] = useState(0);
    const [ttcPrice, setTtcPrice] = useState(0);
    const [imageUrl, setImageUrl] = useState("");
    const [stockQuantity, setStockQuantity] = useState(null);
    const [badge, setBadge] = useState(null);

    const handleDeclinaisonChange = (e) => {
        const selectedId = Number(e.target.value);
        const selected = declinaisons?.values?.find((v) => v.id === selectedId) || null;
        setSelectedDeclinaison(selected);

        if (product?.id) {
            CartService.getStockForProductAttribute(product.id, selectedId)
                .then((qty) => setStockQuantity(qty))
                .catch((error) => {
                    console.error("Error fetching stock: ", error);
                });
        }
    };

    const handleAjouterPanier = () => {
        const userRaw = localStorage.getItem("user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const idCustomer = user?.id;

        if (!idCustomer) {
            alert("Veuillez vous connecter avant d'ajouter au panier.");
            return;
        }

        const idProductAttribute = selectedDeclinaison ? selectedDeclinaison.id : 0;

        CartService.addProductToCart(
            idCustomer,
            product.id,
            idProductAttribute,
            quantity,
            1
        ).then(() => {
            alert("Produit ajouté au panier !");
        }).catch((error) => {
            console.error("Error adding to cart: ", error);
            alert("Erreur lors de l'ajout au panier.");
        });
    };

    const getDisplayedPrice = (baseTtc, taxRate, declinaison) => {
        const impactPrice = declinaison ? Number(declinaison.priceImpact || 0) : 0;
        const safeBase = Number.isFinite(Number(baseTtc)) ? Number(baseTtc) : 0;
        const safeTax = Number.isFinite(Number(taxRate)) ? Number(taxRate) : 0;
        return safeBase + impactPrice * (1 + safeTax / 100);
    };

    const displayedPrice = getDisplayedPrice(ttcPrice, tax, selectedDeclinaison);

    useEffect(() => {
        const loadProduct = async () => {
            setIsLoading(true);

            try {
                const productObject = new Product({}, false);

                const productData = await productObject.getById(id);
                setProduct(productData);

                const badgeData = await productData.getBadge();
                setBadge(badgeData);

                const images = await productData.getImages();
                setImageUrl(images[0] || "");

                const taxRate = await productData.getTax();
                setTax(taxRate);

                const ttcPriceData = await productData.getTtcPrice();
                setTtcPrice(ttcPriceData);
                const data = await productData.getDeclinaisons();
                setDeclinaisons(data);
                if (data?.values?.length) {
                    setSelectedDeclinaison(data.values[0]);
                    const firstId = Number(data.values[0]?.id || 0);
                    const qty = await CartService.getStockForProductAttribute(productData.id, firstId);
                    setStockQuantity(qty);
                } else {
                    const qty = await CartService.getStockForProductAttribute(productData.id, 0);
                    setStockQuantity(qty);
                }

            } catch (error) {
                console.error("Error fetching products:", error);
            }

            setIsLoading(false);
        };

        loadProduct();
    }, [id]);

    if (isLoading) {
        return (
            <div className="fo-page">
                <p className="fo-status fo-status--loading">Chargement…</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="fo-page">
                <p className="fo-empty">Produit introuvable</p>
            </div>
        );
    }

    return (
        <div className="fo-page">
            <header className="fo-page__head">
                <div className="fo-page__heading">
                    <span className="fo-page__eyebrow">Produit #{id}</span>
                    <h1 className="fo-page__title">Aperçu du produit</h1>
                </div>
            </header>

            <div className="fo-product">
                <div
                    className={
                        imageUrl ? "fo-product__media" : "fo-product__media fo-product__media--empty"
                    }
                >
                    {imageUrl ? (
                        <img src={imageUrl} alt={product.name?.[0]?.value || ""} />
                    ) : (
                        <span>Aucune image disponible</span>
                    )}
                </div>

                <div className="fo-product__details">
                    {badge ? (
                        <span
                            className="fo-product__badge"
                            style={{ color: badge.color, borderColor: badge.color }}
                        >
                            {badge.label}
                        </span>
                    ) : null}

                    <h2 className="fo-product__name">{product.name?.[0]?.value}</h2>
                    <span className="fo-product__reference">Réf. {product.reference}</span>

                    <div className="fo-product__price">
                        {displayedPrice.toFixed(2)} €
                    </div>

                    <div className="fo-product__meta">
                        <span className="fo-product__meta-item">
                            <span className="fo-product__meta-label">Stock</span>
                            <span className="fo-product__meta-value">{stockQuantity ?? "-"}</span>
                        </span>
                        <span className="fo-product__meta-item">
                            <span className="fo-product__meta-label">TVA</span>
                            <span className="fo-product__meta-value">{tax}%</span>
                        </span>
                    </div>

                    <div className="fo-product__form">
                        {declinaisons?.values?.length ? (
                            <div className="fo-field">
                                <label className="fo-field__label">Déclinaison</label>
                                <select
                                    name="option"
                                    onChange={handleDeclinaisonChange}
                                    value={selectedDeclinaison?.id ?? declinaisons.values[0]?.id}
                                >
                                    {declinaisons.values.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.label || ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

                        <div className="fo-field">
                            <label className="fo-field__label">Quantité</label>
                            <div className="fo-qty">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                >
                                    −
                                </button>
                                <input type="number" value={quantity} readOnly min={1} />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const stock = Number(stockQuantity ?? 0);
                                        const next = quantity + 1;
                                        setQuantity(stock > 0 ? Math.min(next, stock) : next);
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="fo-product__cta">
                        <button
                            type="button"
                            className="fo-btn--primary fo-btn--lg"
                            onClick={handleAjouterPanier}
                        >
                            Ajouter au panier
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FOProductPreview;
