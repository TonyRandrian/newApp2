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
            quantity, 1).then(() => {
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

                const ttcPrice = await productData.getTtcPrice();
                setTtcPrice(ttcPrice);
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

    if (isLoading) 
        return <h1>Chargement...</h1>;
    if (!product) 
        return <h1>Produit introuvable</h1>;

    return (
        <>
            <h1>Apperçu du produit : {id}</h1>

            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={imageUrl}
                    width="160"
                />
            ) : (
                <p>no image</p>
            )}

            <h2>name : {product.name?.[0]?.value}</h2>
            {badge ? (
                <h2 style={{ color: badge.color }}>{badge.label}</h2>
            ) : null}
            <h2>reference : {product.reference}</h2>
            <h2>price TTC : {displayedPrice.toFixed(2)}</h2>
            <h2>stock : {stockQuantity ?? "-"}</h2>

            {declinaisons?.values?.length ? (
                <>
                    <h2>Declinaison :</h2>

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
                </>
            ) : null}

            <h2>
                <p>Quantite : </p>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <input type="number" value={quantity} readOnly min={1} />
                <button
                    onClick={() => {
                        const stock = Number(stockQuantity ?? 0);
                        const next = quantity + 1;
                        setQuantity(stock > 0 ? Math.min(next, stock) : next);
                    }}
                >
                    +
                </button>
            </h2>

            <button onClick={handleAjouterPanier}>
                Ajouter au panier
            </button>
        </>
    );
}

export default FOProductPreview;