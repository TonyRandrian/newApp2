import { useEffect, useMemo, useRef } from "react"
import { MaterialReactTable, useMaterialReactTable } from "material-react-table"
import { formatDateInput, formatDateTime } from "../backend/utils/utils"

const noopValidator = () => null

function OrderActionCell({ cell, table }) {
    const meta = table?.options?.meta ?? {}
    const row = cell.row
    const rowId = Number(row.original?.id ?? 0)
    const edit = meta.editRef?.current ?? null
    const actionMode = meta.actionModeRef?.current ?? "order"
    const isCartMode = actionMode === "cart"
    const isSelected = isCartMode ? Number(edit?.cartId ?? 0) === rowId : Number(edit?.orderId ?? 0) === rowId
    const baseDate = formatDateInput(row.original?.dateAdd)

    if (isCartMode) {
        const dateValue = isSelected ? (edit?.cartDateOrder || baseDate) : baseDate

        return (
            <div className="fo-order-action">
                <input
                    type="date"
                    name="cartDateOrder"
                    onChange={meta.onChangeRef?.current?.(rowId, true)}
                    value={dateValue}
                />
                <button
                    type="button"
                    className="fo-btn--primary fo-btn--sm"
                    onClick={() => meta.onClickRef?.current?.(rowId)}
                >
                    Commander
                </button>
            </div>
        )
    }

    const dateValue = isSelected ? (edit?.dateUpdate || baseDate) : baseDate
    const multiplicateur = meta.multiplicateurRef?.current ?? 1
    const multiplicateurValue = isSelected ? (edit?.multiplicateur ?? multiplicateur) : multiplicateur

    return (
        <div className="fo-order-action">
            <input
                type="number"
                name="multiplicateur"
                onChange={meta.onChangeRef?.current?.(rowId, false)}
                value={multiplicateurValue}
            />
            <input
                type="date"
                name="dateUpdate"
                onChange={meta.onChangeRef?.current?.(rowId, false)}
                value={dateValue}
            />
            <button
                type="button"
                className="fo-btn--sm"
                onClick={() => meta.onClickRef?.current?.(rowId)}
            >
                Dupliquer
            </button>
        </div>
    )
}

function FOOderRow({
    rows = [],
    edit = null,
    multiplicateur = 1,
    onChange,
    onClick,
    actionMode = "order",
    title = "",
}) {
    const safeRows = useMemo(() => (Array.isArray(rows) ? rows.filter(Boolean) : []), [rows])
    const editRef = useRef(edit)
    const onChangeRef = useRef(onChange)
    const onClickRef = useRef(onClick)
    const actionModeRef = useRef(actionMode)
    const multiplicateurRef = useRef(multiplicateur)

    useEffect(() => {
        editRef.current = edit
    }, [edit])

    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    useEffect(() => {
        onClickRef.current = onClick
    }, [onClick])

    useEffect(() => {
        actionModeRef.current = actionMode
    }, [actionMode])

    useEffect(() => {
        multiplicateurRef.current = multiplicateur
    }, [multiplicateur])

    const tableMeta = useMemo(
        () => ({
            editRef,
            onChangeRef,
            onClickRef,
            actionModeRef,
            multiplicateurRef,
        }),
        [],
    )

    const columns = useMemo(
        () => [
            {
                header: "REFERENCE",
                accessorKey: "id",
            },
            {
                header: "NOM",
                accessorKey: "customerName",
            },
            {
                header: "DATE",
                accessorFn: (row) => formatDateTime(row.dateAdd) || "N/A",
            },
            {
                header: "TOTAL",
                accessorFn: (row) => {
                    const total = Number(row?.totalPaid ?? row?.totals?.totalTtc ?? 0)
                    return Number.isFinite(total) ? total.toFixed(2) : "N/A"
                },
            },
            {
                header: "ETAT ACTUEL",
                accessorKey: "orderStateName",
            },
            {
                header: "ACTION",
                Cell: OrderActionCell,
            },
        ],
        [],
    )

    const table = useMaterialReactTable({
        columns,
        data: safeRows,
        meta: tableMeta,
        enablePagination: true,
        initialState: {
            pagination: { pageIndex: 0, pageSize: 10 },
        },
    })

    return (
        <div className="fo-card">
            {title ? (
                <div className="fo-card__head">
                    <div className="fo-card__heading">
                        <h2 className="fo-card__title">{title}</h2>
                        <span className="fo-card__subtitle">
                            {safeRows.length} ligne{safeRows.length > 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            ) : null}
            <div className="fo-card__body fo-card__body--flush">
                <MaterialReactTable table={table} />
            </div>
        </div>
    )
}

OrderActionCell.propTypes = {
    cell: noopValidator,
    table: noopValidator,
}

FOOderRow.propTypes = {
    rows: noopValidator,
    edit: noopValidator,
    multiplicateur: noopValidator,
    onChange: noopValidator,
    onClick: noopValidator,
    actionMode: noopValidator,
    title: noopValidator,
}

export default FOOderRow
