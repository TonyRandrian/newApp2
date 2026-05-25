import { useEffect } from "react";

function FOCartRow({ row, index, onOptionChange, onQuantityChange, onDelete, formatPrice }) {
    const options = row?.options ?? [];
    const selectedOptionId = Number(row?.selectedOptionId || 0);

    useEffect(() => {
        if (options.length === 0) {
            return;
        }
        if (selectedOptionId !== 0) {
            return;
        }
        const firstId = Number(options[0]?.id || 0);
        if (firstId && typeof onOptionChange === "function") {
            onOptionChange(index, firstId, row?.cartRowIndex);
        }
    }, [index, onOptionChange, options, row?.cartRowIndex, selectedOptionId]);

    const getRowDisplayedPrice = (rowValue) => {
        const selectedId = Number(rowValue?.selectedOptionId || 0);
        const selected = (rowValue?.options || []).find((value) => Number(value.id) === selectedId);
        const impact = selected ? Number(selected.priceImpact || 0) : 0;
        const base = Number(rowValue?.baseTtcPrice || 0);
        const taxRate = Number(rowValue?.taxRate || 0);
        return base + impact * (1 + taxRate / 100);
    };

    const getRowLineTotal = (rowValue) => {
        const price = getRowDisplayedPrice(rowValue);
        const qty = Number(rowValue?.quantity || 0);
        return price * qty;
    };

    const handleChange = (event) => {
        const nextId = Number(event.target.value || 0);
        if (typeof onOptionChange === "function") {
            onOptionChange(index, nextId, row?.cartRowIndex);
        }
    };

    const handleDecrease = () => {
        const current = Number(row?.quantity || 1);
        const nextQty = Math.max(1, current - 1);
        if (typeof onQuantityChange === "function") {
            onQuantityChange(index, nextQty, row?.cartRowIndex);
        }
    };

    const handleIncrease = () => {
        const current = Number(row?.quantity || 0);
        const stock = Number(row?.stockQuantity ?? 0);
        const limited = stock > 0 ? Math.min(current + 1, stock) : current + 1;
        const nextQty = Math.max(1, limited);
        if (typeof onQuantityChange === "function") {
            onQuantityChange(index, nextQty, row?.cartRowIndex);
        }
    };

    return (
        <tr>
            <td>
                {row.productImageURL ? (
                    <img src={row.productImageURL} alt={row.productName || ""} width="72" height="72" />
                ) : (
                    <span className="fo-status">-</span>
                )}
            </td>
            <td>{row.productName || ""}</td>
            <td>{row.productReference || ""}</td>
            <td>
                {options.length > 0 ? (
                    <select value={selectedOptionId} onChange={handleChange}>
                        {options.map((value) => (
                            <option key={value.id} value={value.id}>
                                {value.label || ""}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className="fo-status">Sans déclinaison</span>
                )}
            </td>
            <td className="fo-table__numeric">{row.stockQuantity ?? "-"}</td>
            <td className="fo-table__price">{formatPrice(getRowDisplayedPrice(row))}</td>
            <td>
                <div className="fo-qty">
                    <button type="button" onClick={handleDecrease}>−</button>
                    <input type="number" value={row.quantity} readOnly min={1} />
                    <button type="button" onClick={handleIncrease}>+</button>
                </div>
            </td>
            <td className="fo-table__price">{formatPrice(getRowLineTotal(row))}</td>
            <td>
                <div className="fo-table__actions">
                    <button
                        type="button"
                        className="fo-btn--danger fo-btn--sm"
                        onClick={() => onDelete?.(index, row?.cartRowIndex)}
                    >
                        Supprimer
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default FOCartRow;
