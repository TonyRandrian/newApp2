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
        <div className="bo-page">
            <header className="bo-page__head">
                <div className="bo-page__heading">
                    <span className="bo-page__eyebrow">Système</span>
                    <h1 className="bo-page__title">Réinitialisation des données</h1>
                    <p className="bo-page__subtitle">
                        Sélectionnez les ressources à supprimer. L'opération est définitive.
                    </p>
                </div>
            </header>

            <div className="bo-page__body">
                <div className="bo-banner bo-banner--error">
                    <span className="bo-banner__title">Attention :</span>
                    cette action supprime les données de manière irréversible sur l'environnement courant.
                </div>

                <div className="bo-checklist">
                    <div className="bo-checklist__list">
                        {[...orderByValue.values()].map((resource) => (
                            <div className="bo-checklist__row" key={resource.value}>
                                <input
                                    id={`reset-${resource.value}`}
                                    type="checkbox"
                                    checked={selected.has(resource.value)}
                                    onChange={() => toggleItem(resource.value)}
                                />
                                <label
                                    className="bo-checklist__label"
                                    htmlFor={`reset-${resource.value}`}
                                >
                                    <span className="bo-checklist__key">{resource.value}</span>
                                    <span className="bo-checklist__desc">{resource.description}</span>
                                </label>
                            </div>
                        ))}
                    </div>

                    <div className="bo-checklist__footer">
                        <span className="bo-checklist__count">
                            <strong>{selected.size}</strong> ressource{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}
                            {" sur "}
                            <strong>{RESOURCES_TO_RESET.length}</strong>
                        </span>
                        <div className="bo-checklist__actions">
                            <button type="button" className="bo-btn--ghost" onClick={toggleAll}>
                                {isAllSelected ? "Tout désélectionner" : "Tout sélectionner"}
                            </button>
                            <button type="button" className="bo-btn--danger" onClick={doDelete} disabled={selected.size === 0}>
                                Supprimer la sélection
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

}

export default BOReset;
