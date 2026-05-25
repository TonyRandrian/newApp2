import {useMemo, useState} from "react";
import {RESOURCES_TO_RESET} from "../backend/services/Reset.js";
import {deleteAll} from "../backend/services/Reset.js";

function BOReset() {
    const [selected, setSelected] = useState(new Set());
    const orderByValue = useMemo(() => {
        const orderMap = new Map();
        RESOURCES_TO_RESET.forEach((r) => orderMap.set(r.value, {
            order: r.order,
            description: r.description,
            value: r.value
        }));
        return orderMap;
    }, [])
    const isAllSelected = selected.size === RESOURCES_TO_RESET.length;
    
    const toggleItem = (key) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            console.log("reset key", key);
            const ordered = Array.from(next).sort((a, b) => {
                const orderA = orderByValue.get(a)?.order ?? Number.MAX_SAFE_INTEGER;
                const orderB = orderByValue.get(b)?.order ?? Number.MAX_SAFE_INTEGER;
                return orderA - orderB;
            });
            return new Set(ordered);
        });
    }

    const toggleAll = () => {
        if (isAllSelected) {
            setSelected(new Set());
        }
        else {
            const allKeys = RESOURCES_TO_RESET.map((r) => r.value);
            setSelected(new Set(allKeys));
        }
    }

    const doDelete = () => {
        deleteAll(selected);
    }

    return (
        <div>
            {[...orderByValue.values()].map((resource) => (
                <div key={resource.value}>
                    <input
                        id={`reset-${resource.value}`}
                        type="checkbox"
                        checked={selected.has(resource.value)}
                        onChange={() => toggleItem(resource.value)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor={`reset-${resource.value}`}
                    >
                        {resource.value} / {resource.description}
                    </label>
                </div>
            ))}
            <button onClick={toggleAll}>{isAllSelected ? "Désélectionner tout" : "Sélectionner tout"}</button>
            <button onClick={doDelete}>Valider</button>
        </div>
    );

}

export default BOReset;