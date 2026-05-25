import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import Product from "../backend/entities/Product.js";
import Category from "../backend/entities/Category.js";
import { filterProducts } from "../backend/services/ProductService.js";

function FOProductList() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [, setIsLoading] = useState(true);
    const [imageUrls, setImageUrls] = useState({});
    const [badges, setBadges] = useState({});

    // filtres
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
            name
        });
    }, [products, minPrice, maxPrice, categoryId, name]);

    const selectableCategories = useMemo(() => {
        return categories.filter((category) => String(category?.name ?? "").trim() !== "");
    }, [categories]);

    return (
        <div>
            <h1>Product List</h1>

            <div>
                <label>Name : </label>
                <input placeholder="Search name" value={name} onChange={(e) => setName(e.target.value)} />
                <label>Min price : </label>
                <input placeholder="Min price" type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} min={0} />
                <label>Max price : </label>
                <input placeholder="Max price" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} min={0} />
                <label>Category : </label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">All Categories</option>
                    {selectableCategories.map((category, index) => (
                        <option key={`${category.id}-${index}`} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Reference</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Stock total</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody>
                    {filteredProducts.map((product, index) => (
                        <tr key={`${product.id}-${index}`}>
                            <td>
                                {imageUrls[product.id] ? (
                                    <img src={imageUrls[product.id]} alt="product" width="80" />
                                ) : (
                                    "no image"
                                )}
                            </td>

                            <td>
                                {product.name?.[0]?.value}
                                {badges[product.id] ? (
                                    <span style={{ color: badges[product.id].color }}>
                                        {` (${badges[product.id].label})`}
                                    </span>
                                ) : null}
                            </td>

                            <td>{product.reference}</td>
                            <td>{Number(product.priceTtc ?? product.price).toFixed(2)}</td>
                            <td>{product.categoryName || "-"}</td>
                            <td>{product.quantity}</td>

                            <td>
                                <button onClick={() => handlePreview(product.id)}>
                                    Aperçu
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default FOProductList;