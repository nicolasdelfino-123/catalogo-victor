import { useMemo, useState } from "react";

const collectCategoryIds = (category) => [
    Number(category.id),
    ...(category.children || []).flatMap(collectCategoryIds),
];

const flattenCategoryTree = (categories = []) =>
    categories.flatMap((category) => [
        category,
        ...flattenCategoryTree(category.children || []),
    ]);

const parsePercent = (value = "") => {
    const normalized = String(value || "").trim().replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeBrandKey = (value = "") =>
    String(value || "").trim().toLowerCase();

const getProductCategoryIds = (product = {}) => {
    const ids = [];
    const pushId = (rawId) => {
        const id = Number(rawId);
        if (Number.isFinite(id) && id > 0 && !ids.includes(id)) ids.push(id);
    };
    pushId(product.category_id);
    if (Array.isArray(product.category_ids)) product.category_ids.forEach(pushId);
    if (Array.isArray(product.extra_category_ids)) product.extra_category_ids.forEach(pushId);
    return ids;
};

const formatAdjustmentDate = (value) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getAdjustmentText = (item) => {
    const percent = Number(item?.percent || 0);
    const action = percent >= 0 ? "aumento" : "descuento";
    const targetType = item?.target_type === "brand" ? "Marca" : "Categoría";
    const targetLabel = item?.target_label || item?.category_label || item?.brand || "Selección";
    const priceScope = item?.price_scope_label || "minorista y mayorista";
    return `${targetType} ${targetLabel}: ${Math.abs(percent)}% de ${action} sobre ${priceScope}`;
};

export default function AdminPriceAdjustmentModal({
    open = false,
    categories = [],
    products = [],
    pendingAdjustment = null,
    history = [],
    applying = false,
    onClose = () => { },
    onApply = () => { },
    onUndoHistoryItem = () => { },
    onDeleteHistoryItem = () => { },
}) {
    const flatCategories = useMemo(() => flattenCategoryTree(categories), [categories]);
    const brandOptions = useMemo(() => {
        const byKey = new Map();
        for (const product of products) {
            const brand = String(product?.brand || "").trim();
            if (!brand) continue;
            const key = normalizeBrandKey(brand);
            if (!byKey.has(key)) byKey.set(key, brand);
        }
        return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "es"));
    }, [products]);
    const defaultCategoryId = flatCategories[0]?.id ? String(flatCategories[0].id) : "";
    const defaultBrand = brandOptions[0] || "";
    const [targetType, setTargetType] = useState("category");
    const [priceScope, setPriceScope] = useState("both");
    const [categoryId, setCategoryId] = useState(defaultCategoryId);
    const [brand, setBrand] = useState(defaultBrand);
    const [percentDraft, setPercentDraft] = useState("");
    const [showHistory, setShowHistory] = useState(false);
    const [historyItemToDelete, setHistoryItemToDelete] = useState(null);

    const selectedCategory = flatCategories.find((category) => String(category.id) === String(categoryId));
    const selectedCategoryIds = selectedCategory ? collectCategoryIds(selectedCategory) : [];
    const selectedBrand = brand || defaultBrand;
    const affectedCount = targetType === "brand"
        ? products.filter((product) => normalizeBrandKey(product?.brand) === normalizeBrandKey(selectedBrand)).length
        : products.filter((product) =>
            getProductCategoryIds(product).some((categoryId) => selectedCategoryIds.includes(categoryId))
        ).length;
    const percent = parsePercent(percentDraft);
    const canApply =
        !pendingAdjustment &&
        !applying &&
        (targetType === "brand" ? selectedBrand : selectedCategory) &&
        affectedCount > 0 &&
        percent !== null &&
        percent !== 0 &&
        percent > -100 &&
        percent <= 1000;

    if (!open) return null;

    const submit = () => {
        if (!canApply) return;
        if (targetType === "brand") {
            onApply({
                target_type: "brand",
                brand: selectedBrand,
                price_scope: priceScope,
                percent,
            });
            return;
        }

        onApply({
            target_type: "category",
            category_ids: selectedCategoryIds,
            category_label: selectedCategory.name,
            price_scope: priceScope,
            percent,
        });
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
                <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-stone-900">Actualizar precios</h2>
                        <p className="mt-1 text-sm text-stone-500">
                            Elegí categoría o marca y aplicá un porcentaje sobre sus precios.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded border px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    {pendingAdjustment && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            Hay un ajuste pendiente. Confirmalo o deshacelo antes de aplicar otro.
                        </div>
                    )}

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-stone-700">Aplicar por</span>
                        <select
                            value={targetType}
                            onChange={(e) => setTargetType(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2"
                            disabled={Boolean(pendingAdjustment) || applying}
                        >
                            <option value="category">Categoría</option>
                            <option value="brand">Marca</option>
                        </select>
                    </label>

                    {targetType === "brand" ? (
                        <label className="block">
                            <span className="mb-1 block text-sm font-medium text-stone-700">Marca</span>
                            <select
                                value={selectedBrand}
                                onChange={(e) => setBrand(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2"
                                disabled={Boolean(pendingAdjustment) || applying || brandOptions.length === 0}
                            >
                                {brandOptions.length === 0 ? (
                                    <option value="">No hay marcas cargadas</option>
                                ) : (
                                    brandOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))
                                )}
                            </select>
                        </label>
                    ) : (
                        <label className="block">
                            <span className="mb-1 block text-sm font-medium text-stone-700">Categoría</span>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2"
                                disabled={Boolean(pendingAdjustment) || applying}
                            >
                                {flatCategories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.level > 0 ? `${" ".repeat(category.level * 2)}${category.name}` : category.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-stone-700">Aplicar sobre</span>
                        <select
                            value={priceScope}
                            onChange={(e) => setPriceScope(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2"
                            disabled={Boolean(pendingAdjustment) || applying}
                        >
                            <option value="both">Minorista y mayorista</option>
                            <option value="retail">Solo minorista</option>
                            <option value="wholesale">Solo mayorista</option>
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-stone-700">Porcentaje</span>
                        <div className="flex overflow-hidden rounded-lg border">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={percentDraft}
                                onChange={(e) => setPercentDraft(e.target.value.replace(/[^\d,.\-\s]/g, ""))}
                                className="w-full px-3 py-2 outline-none"
                                placeholder="Ej: 10 o -5"
                                disabled={Boolean(pendingAdjustment) || applying}
                            />
                            <span className="border-l bg-stone-50 px-3 py-2 text-stone-600">%</span>
                        </div>
                    </label>

                    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                        Productos afectados: <strong>{affectedCount}</strong>
                    </div>

                    <p className="text-sm text-stone-500">
                        Los precios se guardan sin centavos. Después de aplicar, podés revisar la tabla y confirmar o deshacer el cambio.
                    </p>

                    <div className="border-t pt-4">
                        <button
                            type="button"
                            onClick={() => setShowHistory((prev) => !prev)}
                            className="rounded border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                        >
                            {showHistory ? "Ocultar historial" : "Historial de cambios"}
                        </button>

                        {showHistory && (
                            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-3">
                                {history.length === 0 ? (
                                    <p className="text-sm text-stone-500">Todavía no hay cambios de precios guardados.</p>
                                ) : (
                                    history.map((item) => {
                                        const isUndone = item.status === "undone";
                                        const statusLabel = isUndone ? "Deshecho" : "Aplicado";
                                        const itemToneClass = isUndone
                                            ? "border-red-200 bg-red-50/80"
                                            : "border-emerald-200 bg-emerald-50/80";
                                        const badgeClass = isUndone
                                            ? "border-red-300 bg-red-100 text-red-800"
                                            : "border-emerald-300 bg-emerald-100 text-emerald-800";
                                        return (
                                            <div key={item.id} className={`rounded-lg border p-3 text-sm ${itemToneClass}`}>
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="font-semibold text-stone-900">
                                                        {getAdjustmentText(item)}
                                                    </div>
                                                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                                                        {statusLabel}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-stone-500">
                                                    {formatAdjustmentDate(item.created_at)} · {item.affected_count} productos
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => onUndoHistoryItem(item.id)}
                                                        disabled={applying || isUndone}
                                                        className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Deshacer
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setHistoryItemToDelete(item)}
                                                        disabled={applying}
                                                        className="rounded border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-shrink-0 justify-end gap-2 border-t px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded border px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!canApply}
                        className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {applying ? "Aplicando..." : "Aplicar ajuste"}
                    </button>
                </div>
            </div>

            {historyItemToDelete && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <h3 className="text-lg font-semibold text-stone-900">Eliminar del historial</h3>
                        <p className="mt-2 text-sm text-stone-600">
                            Esto va a borrar el registro del historial y ya no vas a poder deshacer este cambio desde acá.
                        </p>
                        <div className="mt-4 rounded-lg border bg-stone-50 p-3 text-sm text-stone-700">
                            {getAdjustmentText(historyItemToDelete)}
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setHistoryItemToDelete(null)}
                                className="rounded border px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onDeleteHistoryItem(historyItemToDelete.id);
                                    setHistoryItemToDelete(null);
                                }}
                                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
