import {useEffect, useMemo, useState} from "react"
import Product from "../backend/entities/Product"
import Category from "../backend/entities/Category"
import Order from "../backend/entities/Order"
import OrderDetail from "../backend/entities/OrderDetail"
import ProductWithCombinations from "../backend/dto/ProductWithCombinations.js"
import OrderLineMetrics from "../backend/dto/OrderLineMetrics.js"
import OrderCategoryMetrics from "../backend/dto/OrderCategoryMetrics.js"
import OrderWithDetails from "../backend/dto/OrderWithDetails.js"
import StockMvt from "../backend/entities/StockMvt.js";
import StockProductAvailability from "../backend/dto/StockProductAvailability.js";
import StockAvailable from "../backend/entities/StockAvailable.js";
import StockCategoryAvailability from "../backend/dto/StockCategoryAvailability.js";
import {MaterialReactTable, useMaterialReactTable} from "material-react-table"
import {getDisplayText, toInt} from "../backend/utils/utils.js";

function BOStatistic() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [mvtStock, setMvtStock] = useState([])
    const [stockAvailables, setStockAvailables] = useState([])
    const [productsWithDecl, setproductsWithDecl] = useState([])
    const [categories, setCategories] = useState([])
    const [orders, setOrders] = useState([])
    const [baseOrderGroups, setBaseOrderGroups] = useState([])
    const [dateMin, setDateMin] = useState("")
    const [dateMax, setDateMax] = useState("")
    //const [test, setTest] = useState([])

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                setError("")

                //Recuperer les produits, categories, commandes(non annulées) et details des commandes
                const categories = await new Category({}, false).getExclApi([1, 2]) // Exclude root category
                const products = await new Product({}, false).getAll()
                const mvtStock = await new StockMvt({}, false).getAll()
                const stockAvailables = await new StockAvailable({}, false).getAll()

                const productsWithDecl = await ProductWithCombinations.listFromProductsWithCategories(products, categories)

                const orders = await new Order({}, false).getByNot("currentState", 6)
                const orderIds = orders.map(order => order.id)
                const orderDetailsRaw = await new OrderDetail({}, false).getBy("orderId", [...orderIds])

                const orderGroups = OrderWithDetails.groupOrdersWithDetails(orders, orderDetailsRaw)

                setproductsWithDecl(productsWithDecl)
                setCategories(categories)
                setOrders(orders)
                setMvtStock(mvtStock)
                setStockAvailables(stockAvailables)
                setBaseOrderGroups(orderGroups)

                //setTest(orderLineMetrics)
            } catch (err) {
                setError(err?.message || "Erreur lors du chargement")
            } finally {
                setLoading(false)
            }
        }

        load().then(r => console.log(r))
    }, [])

    const formatNumber = (value) => Number(value ?? 0).toFixed(2)

    const orderFiltered = useMemo(
        () => OrderWithDetails.filterGroupsByDate(baseOrderGroups, dateMin, dateMax),
        [baseOrderGroups, dateMin, dateMax])

    const mvtFiltered = useMemo(
        () => StockMvt.filterByDateRange(mvtStock, dateMin, dateMax),
        [mvtStock, dateMin, dateMax])

    const mvtFilteredWithoutMin = useMemo(
        () => StockMvt.filterByDateRange(mvtStock, null, dateMax),
        [mvtStock, dateMax])

    const orderCategoryMetrics = useMemo(() => {
        const orderLineMetrics = OrderLineMetrics.listFromOrderGroups(orderFiltered, productsWithDecl)
        const orderLineMetricsGroupedByProduct = OrderLineMetrics.groupByProductAndCombinationLines(orderLineMetrics)
        return OrderCategoryMetrics.groupByCategoryFromProductLines(orderLineMetricsGroupedByProduct)
    }, [orderFiltered, productsWithDecl])

    const orderCategoryMetricsFromStock = useMemo(() => {
        const orderLineMetricsFromStock = OrderLineMetrics.listFromProductsWithStockMovements(
            orderFiltered,
            productsWithDecl,
            mvtFiltered,
            stockAvailables
        )
        return OrderCategoryMetrics.groupByCategoryFromTotals(orderLineMetricsFromStock)
    }, [orderFiltered, mvtFiltered, productsWithDecl, stockAvailables])

    const stockCategoryMetrics = useMemo(() => {
        const stockAvailabilityMetrics = StockProductAvailability.listFromProductsAndStockData(
            mvtFilteredWithoutMin,
            orderFiltered,
            productsWithDecl,
            stockAvailables
        )
        return StockCategoryAvailability.groupByCategory(stockAvailabilityMetrics)
    }, [mvtFilteredWithoutMin, orderFiltered, productsWithDecl, stockAvailables])

    const orderCategoryTotals = useMemo(() => orderCategoryMetrics.reduce((acc, row) => ({
        quantity: acc.quantity + Number(row?.quantity ?? 0),
        totalVente: acc.totalVente + Number(row?.totalVente ?? 0),
        totalAchat: acc.totalAchat + Number(row?.totalAchat ?? 0),
        benefice: acc.benefice + Number(row?.benefice ?? 0),
    }), {quantity: 0, totalVente: 0, totalAchat: 0, benefice: 0}), [orderCategoryMetrics])

    const columns = useMemo(() => [
        {
            header: "Categorie",
            accessorFn: (row) => getDisplayText(row?.category?.name, row?.category?.slug || "Aucune"),
            Footer: () => <strong>Total</strong>,
        },
        {
            header: "Qte",
            accessorFn: (row) => Number(row?.quantity ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
            Footer: () => <strong>{formatNumber(orderCategoryTotals.quantity)}</strong>,
        },
        {
            header: "Vente total",
            accessorFn: (row) => Number(row?.totalVente ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
            Footer: () => <strong>{formatNumber(orderCategoryTotals.totalVente)}</strong>,
        },
        {
            header: "Achat total",
            accessorFn: (row) => Number(row?.totalAchat ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
            Footer: () => <strong>{formatNumber(orderCategoryTotals.totalAchat)}</strong>,
        },
        {
            header: "Benefice",
            accessorFn: (row) => Number(row?.benefice ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
            Footer: () => <strong>{formatNumber(orderCategoryTotals.benefice)}</strong>,
        },
    ], [orderCategoryTotals])

    const columnsProducts = useMemo(() => [
        {
            header: "Produit",
            accessorFn: (row) => getDisplayText(row?.productDto?.product?.name, "-"),
        },
        {
            header: "Categorie",
            accessorFn: (row) => getDisplayText(row?.categorieLibelle, "Aucune"),
        },
        {
            header: "Qte",
            accessorFn: (row) => Number(row?.orderDetail?.productQuantity),
            Cell: ({cell}) => formatNumber(cell.getValue()),
        },
        {
            header: "Vente total",
            accessorFn: (row) => Number(row?.totalVente ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
        },
        {
            header: "Achat total",
            accessorFn: (row) => Number(row?.totalAchat ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
        },
        {
            header: "Benefice",
            accessorFn: (row) => Number(row?.benefice ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
        },
    ], [])

    const table = useMaterialReactTable({
        columns: columns,
        data: orderCategoryMetrics,
    })

    const orderCategoryFromStockTotal = useMemo(() => orderCategoryMetricsFromStock.reduce((acc, row) => ({
        quantity: acc.quantity + Number(row?.quantity ?? 0),
        totalVente: acc.totalVente + Number(row?.totalVente ?? 0),
        totalAchat: acc.totalAchat + Number(row?.totalAchat ?? 0),
        benefice: acc.benefice + Number(row?.benefice ?? 0),
    }), {quantity: 0, totalVente: 0, totalAchat: 0, benefice: 0}), [orderCategoryMetricsFromStock])

    const columns2 = useMemo(() => [
        {
            header: "Categorie",
            accessorFn: (row) => getDisplayText(row?.category?.name, row?.category?.slug || "Aucune"),
            Footer: () => <strong>Total</strong>,
        },
        {
            header: "Qte",
            accessorFn: (row) => Number(row?.quantity ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
            Footer: () => <strong>{formatNumber(orderCategoryFromStockTotal.quantity)}</strong>,
        },
        {
            header: "Vente total",
            accessorFn: (row) => Number(row?.totalVente ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
            Footer: () => <strong>{formatNumber(orderCategoryFromStockTotal.totalVente)}</strong>,
        },
        {
            header: "Achat total",
            accessorFn: (row) => Number(row?.totalAchat ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
            Footer: () => <strong>{formatNumber(orderCategoryFromStockTotal.totalAchat)}</strong>,
        },
        {
            header: "Benefice",
            accessorFn: (row) => Number(row?.benefice ?? 0),
            Cell: ({cell}) => formatNumber(cell.getValue()),
            Footer: () => <strong>{formatNumber(orderCategoryFromStockTotal.benefice)}</strong>,
        },
    ], [orderCategoryFromStockTotal.benefice, orderCategoryFromStockTotal.quantity, orderCategoryFromStockTotal.totalAchat, orderCategoryFromStockTotal.totalVente])

    const stockCostTable = useMaterialReactTable({
        columns: columns2,
        data: orderCategoryMetricsFromStock,
    })

    // const stockCostTableTest = useMaterialReactTable({
    //     columns: columnsProducts,
    //     data: test,
    // })

    const stockTotal = useMemo(() => stockCategoryMetrics.reduce((acc, row) => ({
        physique: acc.physique + Number(row.physicalQuantity ?? 0),
        reserve: acc.reserve + Number(row.reservedQuantity ?? 0),
        dispo: acc.dispo + Number(row.availableQuantity ?? 0)
    }), {physique: 0, reserve: 0, dispo: 0}), [stockCategoryMetrics])

    const stockColumns = useMemo(() => [
        {
            header: "Categorie",
            accessorFn: (row) => getDisplayText(row?.category?.name, row?.category?.slug || "Aucune"),
            Footer: () => <strong>Total</strong>
        },
        {
            header: "Qte physique",
            accessorFn: (row) => Number(row?.physicalQuantity ?? 0),
            Cell: ({cell}) => toInt(cell.getValue()),
            Footer: () => <strong>{stockTotal.physique}</strong>
        },
        {
            header: "Qte reserve",
            accessorFn: (row) => Number(row?.reservedQuantity ?? 0),
            Cell: ({cell}) => toInt(cell.getValue()),
            Footer: () => <strong>{stockTotal.reserve}</strong>
        },
        {
            header: "Qte dispo",
            accessorFn: (row) => Number(row?.availableQuantity ?? 0),
            Cell: ({cell}) => toInt(cell.getValue()),
            Footer: () => <strong>{stockTotal.dispo}</strong>
        },
    ], [stockTotal.dispo, stockTotal.physique, stockTotal.reserve])

    const stockTable = useMaterialReactTable({
        columns: stockColumns,
        data: stockCategoryMetrics,
    })

    const resetDateFilter = () => {
        setDateMin("");
        setDateMax("");
    }

    return (
        <div>
            <h1>Statistiques</h1>

            {loading && <p>Chargement...</p>}
            {!loading && error && <p>{error}</p>}

            {!loading && !error && (
                <div>
                    <div>
                        <div>
                            date min
                            <input
                                type="date"
                                value={dateMin}
                                onChange={(event) => setDateMin(event.target.value)}
                            />
                        </div>

                        <div>
                            date max
                            <input
                                type="date"
                                value={dateMax}
                                onChange={(event) => setDateMax(event.target.value)}
                            />
                        </div>

                        <button onClick={resetDateFilter}>
                            Reset filtre date
                        </button>
                    </div>
                    <MaterialReactTable table={table}/>

                    <h3>Commande par categorie (cout depuis mouvements)</h3>
                    <MaterialReactTable table={stockCostTable}/>

                    {/* <h3>Test</h3>
                    <MaterialReactTable table={stockCostTableTest} /> */}

                    <h3>Disponibilite Stock</h3>
                    <MaterialReactTable table={stockTable}/>
                </div>
            )}
        </div>
    )
}

export default BOStatistic
