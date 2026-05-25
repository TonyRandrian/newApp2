import {useEffect, useMemo, useState} from "react";
import {fetchProductWithStock} from "../backend/services/ProductService.js";
import StockAvailable from "../backend/entities/StockAvailable.js";
import StockMvt from "../backend/entities/StockMvt.js";
import {formatDateTime} from "../backend/utils/utils.js";
import {MaterialReactTable, useMaterialReactTable} from "material-react-table";

function BOStockUpdate({setCombination, setProductDetails}) {
    const [data, setData] = useState([])
    const [quantity, setQuantity] = useState({})
    const [dateChange, setDateChange] = useState("")

    const ID_MVT_REASON = {
        AUGMENTATION: {
            id: 1,
            sign: 1
        },
        DIMINUTION: {
            id: 2,
            sign: -1
        }
    }

    // appel API pour récupérer les produits avec leur stock
    useEffect(() => {
        const loadProducts = async () => {
            try {
                return await fetchProductWithStock();
            } catch (error) {
                console.error("Erreur lors de la récupération des produits avec stocks: " + error)
            }
        }

        loadProducts().then(result => setData(result ?? []))
    }, []);

    // transformation des données pour intégrer les déclinaisons comme sous-lignes
    // ilay clé subRow convention
    // dia avadika manaraka format an'ilay colonne de table ilay subRows
    const tableData = useMemo(() => {
        return data.map((row) => ({
            ...row,
            subRows: (row.declinations ?? []).map((declination) => ({
                isDeclination: true,
                parentProduct: row.product,
                declinationName: declination.name,
                quantity: declination.quantity,
                stockAvailableId: declination.stockAvailableId,
                combinationId: declination.combinationId,
            })),
        }));
    }, [data]);

    // déclaration des colonnes du datatable
    const columns = useMemo(() => [
        {
            header: "Produits",
            accessorFn: (row) => row.isDeclination ? "" : row.product.name[0].value,
        },
        {
            header: "Déclinaisons",
            accessorFn: (row) => row.isDeclination ? row.declinationName : "-",
        },
        {
            header: "Stock disponible",
            accessorFn: (row) => row.isDeclination ? row.quantity : row.totalQuantity,
        },
        {
            header: "Quantité",
            Cell: ({row}) => {
                const showInput = (!row.original.isDeclination && row.original.declinations.length === 0) || row.original.isDeclination;
                if (!showInput) return null;

                return (
                    <input
                        type={"number"}
                        value={quantity[row.id] ?? ""}
                        onChange={(e) =>
                            setQuantity((prev) => ({
                                ...prev,
                                [row.id]: e.target.value === "" ? "" : Number(e.target.value)
                            }))
                        }
                    />
                )
            }
        },
        {
            header: "Actions",
            Cell: ({row}) => (
                <div>
                    <button onClick={() => updateQuantity(row, ID_MVT_REASON.AUGMENTATION)}>
                        Ajouter
                    </button>
                    <button onClick={() => updateQuantity(row, ID_MVT_REASON.DIMINUTION)}>
                        Retirer
                    </button>
                    <button onClick={() => {
                        const isDeclination = Boolean(row.original?.isDeclination)
                        const product = isDeclination ? row.original.parentProduct : row.original.product
                        const idProductAttribute = isDeclination ? (row.original.combinationId ?? 0) : 0

                        setProductDetails(row.original)
                        setCombination([product.id, idProductAttribute])
                    }}>
                        Voir évolution
                    </button>
                </div>
            ),
        },
    ], [quantity, dateChange]);

    const updateQuantity = async (row, MVT_REASON) => {
        const isDeclination = Boolean(row.original?.isDeclination)
        const idProduct = isDeclination ? row.original.parentProduct?.id : row.original.product?.id
        const idProductAttribute = isDeclination ? (row.original.combinationId ?? 0) : 0
        const amount = Number(quantity[row.id] ?? 0)

        if (!amount) return

        const delta = amount * MVT_REASON.sign

        try {
            const stockApi = new StockAvailable({}, false)
            const existing = await stockApi.getByProductAndAttribute(idProduct, idProductAttribute)

            if (!existing) {
                console.error("stock_available introuvable", {idProduct, idProductAttribute})
                return
            }

            // insertion des mvts de stock
            const movement = StockMvt.fromData({
                idStock: existing.id,
                idProduct,
                idProductAttribute,
                physicalQuantity: amount,
                sign: MVT_REASON.sign,
                idStockMvtReason: MVT_REASON.id,
                idEmployee: 1,
                priceTe: 0,
                dateAdd: dateChange || formatDateTime(new Date()),
            })
            await movement.save()

            // modification de stock available
            const stockEntity = StockAvailable.fromData(existing)
            stockEntity.quantity = Number(existing.quantity ?? 0) + delta
            await stockEntity.update()

            const fresh = await fetchProductWithStock()
            // rafraississement du data existant
            setData(fresh ?? [])
            setQuantity((prev) => {
                // Supprime la valeur temporaire associée à cette ligne du state `quantity` après réussite de la mise à jour.
                // Cela réinitialise le champ d'entrée pour cette ligne.
                const next = {...prev}
                delete next[row.id]
                return next
            })
        } catch (error) {
            console.error("Erreur lors de la mise à jour du stock:", error)
        }
    }

    const table = useMaterialReactTable({
        columns,
        data: tableData,
        enableExpanding: true,
        getSubRows: (row) => row.subRows,
        getRowId: (row) =>
            row.isDeclination
                ? `${row.parentProduct?.id ?? row.product?.id}:${row.combinationId ?? 0}`
                : `${row.product?.id ?? 0}:0`,
        filterFromLeafRows: true,
        paginateExpandedRows: false,
    })

    return <>
        <header>
            <h5>Mise à jour des stocks</h5>
        </header>
        <div>
            <label>
                Date de changement
                <input
                    type={"date"}
                    value={dateChange}
                    onChange={(e) => setDateChange(e.target.value)}
                />
            </label>
        </div>
        <MaterialReactTable table={table}/>
    </>
}

export default BOStockUpdate;