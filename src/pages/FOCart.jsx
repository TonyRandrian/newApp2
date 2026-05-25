import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import CartService from "../backend/services/CartService.js";
import Cart from "../backend/entities/Cart.js";
import Product from "../backend/entities/Product.js";
import CartWithDetails from "../backend/dto/CartWithDetails.js";
import OderService from "../backend/services/OderService.js";
import FOCartRow from "../components/FOCartRow.jsx";
import useLocalStorage from "../hooks/useLocalStorage.jsx";

function FOCart() {
    const [cart, setCart] = useState(null);
    const [rowDetails, setRowDetails] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [banner, setBanner] = useState(null);

    const [user] = useLocalStorage("user", null);
    const [isGuest] = useLocalStorage("isGuest", false);

    const navigate = useNavigate();

    const totals = useMemo(() => (
        CartService.getCartTotals({
            cartRows: rowDetails
        })
    ), [rowDetails]);

    const formatPrice = (value) => {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            return "-";
        }
        return number.toFixed(2);
    };

    const getRowKey = (row, index) => {
        return `${row.productId}-${index}`;
    };

    const updateRow = (rowIndex, values) => {
        setRowDetails(prev =>
            prev.map((row, index) =>
                index === rowIndex ? {...row, ...values} : row
            )
        );
    };

    const persistCartRows = async (nextCartRows) => {
        try {
            const nextCart = Cart.fromData({
                ...cart,
                cartRows: nextCartRows,
            });

            setCart(nextCart);

            const updated = await nextCart.update();
            setCart(updated);

        } catch (error) {
            console.error("Error updating cart:", error);
        }
    };

    const updateCartRow = (cartRowIndex, values) => {
        const nextRows = cart.cartRows.map((row, index) =>
            index === cartRowIndex
                ? {...row, ...values}
                : row
        );

        persistCartRows(nextRows);
    };

    const handleOptionChange = async (rowIndex, nextId, cartRowIndex) => {
        updateRow(rowIndex, {
            selectedOptionId: nextId
        });

        updateCartRow(cartRowIndex, {
            productAttributeId: nextId
        });

        try {
            const productId = rowDetails[rowIndex].productId;

            const stockQuantity =
                await CartService.getStockForProductAttribute(
                    productId,
                    nextId
                );

            updateRow(rowIndex, {stockQuantity});

        } catch (error) {
            console.error("Error stock:", error);
        }
    };

    const handleQuantityChange = (rowIndex, nextQty, cartRowIndex) => {
        const stock = Number(rowDetails[rowIndex].stockQuantity);
        const rawQty = Math.max(1, Number(nextQty));
        const quantity = stock > 0 ? Math.min(rawQty, stock) : rawQty;

        updateRow(rowIndex, {quantity});
        updateCartRow(cartRowIndex, {quantity});
    };

    const handleDeleteRow = async (rowIndex) => {
        try {
            const updated = await CartService.deleteItems(
                cart,
                rowIndex
            );

            if (!updated) {
                setCart(null);
                return;
            }

            setCart(updated);

            setRowDetails(prev =>
                prev.filter((_, index) =>
                    index !== rowIndex
                )
            );

        } catch (error) {
            console.error(
                "Error deleting row:",
                error
            );
        }
    };

    const handleCheckout = async () => {
        if (isGuest) {
            navigate("/fo/checkout");
            return;
        }

        setBanner(null);
        try {
            const result =
                await OderService.createOrderFromCart(cart, user.id, new Date(),0);
            console.log(result);
            setBanner({
                type: "success",
                title: "Commande créée",
                message: "Commande créée avec succès !"
            });
        } catch (error) {
            console.error(error);
            if (error?.stockErrors?.length) {
                const lines = error.stockErrors.map(item =>
                    `${item.productName} : demandé ${item.requested}, disponible ${item.available}`
                );
                setBanner({
                    type: "error",
                    title: "Stock insuffisant",
                    message: lines.join(" ; ")
                });
            } else {
                setBanner({
                    type: "error",
                    title: "Erreur",
                    message: error?.message || "Erreur lors de la création."
                });
            }
        }
    };

    useEffect(() => {
        const loadDatas = async () => {
            try {
                setIsLoading(true);
                if (!user.id) {
                    setCart(null);
                    return;
                }
                const customerCart = await CartService.getLastCartByCustomer(user.id);
                if (!customerCart) {
                    setCart(null);
                    return;
                }
                const isActive =
                    await CartService.isCartActive(
                        customerCart.id
                    );
                if (!isActive) {
                    setCart(null);
                    return;
                }

                const enriched = await CartWithDetails
                    .fromCart(customerCart)
                    .enrich();

                const enrichedByKey = new Map();
                for (const enrichedRow of enriched.enrichedRows ?? []) {
                    const key = `${enrichedRow.productId}:${enrichedRow.productAttributeId}`;
                    if (!enrichedByKey.has(key)) {
                        enrichedByKey.set(key, enrichedRow);
                    }
                }

                const productCache = new Map();
                const getProduct = async (productId) => {
                    if (productCache.has(productId)) {
                        return productCache.get(productId);
                    }
                    const product = await new Product({}, false).getById(productId);
                    productCache.set(productId, product);
                    return product;
                };

                const cartRows = customerCart.cartRows ?? [];
                const rows = (await Promise.all(
                    cartRows.map(async (row, index) => {
                        const productId = Number(row?.productId);
                        const attributeId = Number(row?.productAttributeId || 0);
                        const key = `${productId}:${attributeId}`;
                        const enrichedRow = enrichedByKey.get(key);
                        if (!enrichedRow || !productId) {
                            return null;
                        }

                        const product = await getProduct(productId);
                        if (!product) {
                            return null;
                        }

                        const [images, stockQuantity, declinaisons] = await Promise.all([
                            product.getImages(),
                            CartService.getStockForProductAttribute(productId, attributeId),
                            product.getDeclinaisons(),
                        ]);

                        const values = declinaisons?.values || [];
                        const productImageURL = images?.[0] || "";

                        return {
                            productId,
                            productName: enrichedRow.productName,
                            productReference: product.reference,
                            productImageURL,
                            quantity: row?.quantity,
                            baseTtcPrice: await product.getTtcPrice(),
                            taxRate: await product.getTax(),
                            options: values.map(value => ({
                                id: value.id,
                                label: value.label,
                                priceImpact: value.priceImpact
                            })),
                            selectedOptionId: attributeId,
                            stockQuantity,
                            cartRowIndex: index
                        };
                    })
                ))
                    .filter(Boolean);

                setCart(customerCart);
                setRowDetails(rows);

            } catch (error) {
                console.error(error);
                setCart(null);
                setRowDetails([]);

            } finally {
                setIsLoading(false);
            }
        };

        loadDatas();

    }, [user.id]);

    if (isLoading) {
        return (
            <div className="fo-page">
                <p className="fo-status fo-status--loading">Chargement du panier…</p>
            </div>
        );
    }

    if (!cart) {
        return (
            <div className="fo-page">
                <header className="fo-page__head">
                    <div className="fo-page__heading">
                        <span className="fo-page__eyebrow">Panier</span>
                        <h1 className="fo-page__title">Aucun panier en cours</h1>
                    </div>
                </header>
                <p className="fo-empty">Aucun panier actif pour ce client.</p>
            </div>
        );
    }

    return (
        <div className="fo-page">
            <header className="fo-page__head">
                <div className="fo-page__heading">
                    <span className="fo-page__eyebrow">Panier #{cart.id}</span>
                    <h1 className="fo-page__title">Mon panier</h1>
                    <p className="fo-page__subtitle">
                        Vérifiez vos articles puis validez la commande.
                    </p>
                </div>
                <div className="fo-page__actions">
                    <button
                        type="button"
                        className="fo-btn--primary"
                        onClick={handleCheckout}
                        disabled={rowDetails.length === 0}
                    >
                        Commander
                    </button>
                </div>
            </header>

            {banner ? (
                <div className={`fo-banner fo-banner--${banner.type}`}>
                    <span className="fo-banner__title">{banner.title}</span>
                    <span>{banner.message}</span>
                </div>
            ) : null}

            <div className="fo-card">
                <div className="fo-card__head">
                    <div className="fo-card__heading">
                        <h2 className="fo-card__title">Articles</h2>
                        <span className="fo-card__subtitle">
                            {rowDetails.length} ligne{rowDetails.length > 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                <div className="fo-card__body fo-card__body--flush">
                    {rowDetails.length === 0 ? (
                        <p className="fo-empty">Panier vide.</p>
                    ) : (
                        <table className="fo-table">
                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th>Nom</th>
                                    <th>Référence</th>
                                    <th>Déclinaison</th>
                                    <th>Stock</th>
                                    <th>Prix TTC</th>
                                    <th>Quantité</th>
                                    <th>Total ligne</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {rowDetails.map((row, index) => (
                                    <FOCartRow
                                        key={getRowKey(row, index)}
                                        row={row}
                                        index={index}
                                        onOptionChange={handleOptionChange}
                                        onQuantityChange={handleQuantityChange}
                                        onDelete={handleDeleteRow}
                                        formatPrice={formatPrice}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {rowDetails.length > 0 && (
                    <div className="fo-totals">
                        <div className="fo-totals__row">
                            <span className="fo-totals__label">Total HT</span>
                            <span className="fo-totals__value">{formatPrice(totals.totalHt)}</span>
                        </div>
                        <div className="fo-totals__row fo-totals__row--main">
                            <span>Total TTC</span>
                            <span className="fo-totals__value">{formatPrice(totals.totalTtc)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FOCart;