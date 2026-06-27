export default function AdminPriceAdjustmentReviewBar({
    adjustment = null,
    busy = false,
    onConfirm = () => { },
    onUndo = () => { },
}) {
    if (!adjustment) return null;

    const percent = Number(adjustment.percent || 0);
    const direction = percent > 0 ? "aumento" : "descuento";
    const absPercent = Math.abs(percent);
    const targetTypeLabel = adjustment.target_type === "brand" ? "Marca" : "Categoría";
    const targetLabel = adjustment.target_label || adjustment.category_label || adjustment.brand || "Selección";
    const priceScope = adjustment.price_scope_label || "minorista y mayorista";

    return (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="text-sm font-semibold">
                        Ajuste de precios pendiente
                    </div>
                    <div className="mt-1 text-sm">
                        {targetTypeLabel} {targetLabel}: {direction} de {absPercent}% sobre {priceScope} en {adjustment.affected_count} productos.
                        Revisá la tabla y confirmá o deshacé el cambio.
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={onUndo}
                        disabled={busy}
                        className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Deshacer
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}
