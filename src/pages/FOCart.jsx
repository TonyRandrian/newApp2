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

        try {
            const result =
                await OderService.createOrderFromCart(cart, user.id, new Date(),0);
            console.log(result);
            alert(
                "Commande créée avec succès !"
            );
        } catch (error) {
            console.error(error);
            alert(
                "Erreur lors de la création."
            );
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
        return <p>chargement du panier...</p>;
    }

    if (!cart) {
        return <p>pas de panier</p>;
    }

    return <>
        <h1>Panier : {cart.id}</h1>

        {rowDetails.length === 0 ? (
            <p>panier vide</p>
        ) : (
            <>
                <table>
                    <thead>
                    <tr>
                        <th>Nom</th>
                        <th>Reference</th>
                        <th>Image</th>
                        <th>Declinaison</th>
                        <th>Stock</th>
                        <th>Prix TTC</th>
                        <th>Quantite</th>
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

                <p>Total HT : {formatPrice(totals.totalHt)}</p>
                <p>Total TTC : {formatPrice(totals.totalTtc)}</p>

                <button onClick={handleCheckout}>
                    Commander
                </button>
            </>
        )}
    </>;
}

export default FOCart;