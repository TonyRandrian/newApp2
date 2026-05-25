import { useEffect, useMemo, useRef } from "react"
import { MaterialReactTable, useMaterialReactTable } from "material-react-table"
import { formatDateInput, formatDateTime } from "../backend/utils/utils"

const noopValidator = () => null

function OrderActionCell({ cell, table }) {
    const meta = table?.options?.meta ?? {}
    const row = cell.row
    const rowId = Number(row.original?.id ?? 0)
    const edit = meta.editRef?.current ?? null
    const isSelected = Number(edit?.orderId ?? 0) === rowId
    const currentStateId = row.original?.currentState ?? ""
    const baseDate = formatDateInput(row.original?.dateUpd || row.original?.dateAdd)

    const dateValue = isSelected ? (edit?.dateUpdate || baseDate) : baseDate

    return (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <select
                name="orderStateId"
                onChange={meta.onChangeRef?.current?.(rowId)}
                value={isSelected ? (edit?.orderStateId ?? currentStateId) : currentStateId}
                style={{ padding: "4px" }}
            >
                <option value="">Sélectionner un état</option>
                <option value="5">Livré</option>
                <option value="6">Annulé</option>
            </select>
            <input
                type="date"
                name="dateUpdate"
                onChange={meta.onChangeRef?.current?.(rowId)}
                value={dateValue}
                style={{ padding: "4px" }}
            />
            <button type="button" onClick={() => meta.onClickRef?.current?.(rowId)} style={{ padding: "4px 8px" }}>
                Modifier
            </button>
        </div>
    )
}

function BOOrderRow({
    rows = [],
    edit = null,
    onChange,
    onClick,
    title = "",
}) {
    const safeRows = useMemo(() => (Array.isArray(rows) ? rows.filter(Boolean) : []), [rows])
    const editRef = useRef(edit)
    const onChangeRef = useRef(onChange)
    const onClickRef = useRef(onClick)

    useEffect(() => {
        editRef.current = edit
    }, [edit])

    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    useEffect(() => {
        onClickRef.current = onClick
    }, [onClick])

    const tableMeta = useMemo(
        () => ({
            editRef,
            onChangeRef,
            onClickRef,
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
                    const total = Number(row?.totalPaid ?? 0)
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
        muiTableBodyRowProps: ({ row }) => ({
            sx: {
                backgroundColor: row.index % 2 === 0 ? "#fafafa" : "#ffffff",
            },
        }),
    })

    return (
        <section>
            {title ? <h3>{title}</h3> : null}
            <MaterialReactTable table={table} />
        </section>
    )
}

OrderActionCell.propTypes = {
    cell: noopValidator,
    table: noopValidator,
}

BOOrderRow.propTypes = {
    rows: noopValidator,
    edit: noopValidator,
    onChange: noopValidator,
    onClick: noopValidator,
    title: noopValidator,
}

export default BOOrderRow
