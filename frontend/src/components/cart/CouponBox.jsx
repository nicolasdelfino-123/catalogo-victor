import { formatCouponMoney } from "../../utils/coupons.js";

export default function CouponBox({
    code,
    onCodeChange,
    onApply,
    onClear,
    appliedCoupon,
    status,
    loading,
    subtotal,
    pricePrefix = "$",
}) {
    return (
        <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">Cupón de descuento</p>
                {appliedCoupon && (
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        {appliedCoupon.percent}% OFF
                    </span>
                )}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onApply();
                        }
                    }}
                    placeholder="Ingresá tu cupón"
                    className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm uppercase tracking-wide focus:border-gray-900 focus:outline-none"
                />
                {appliedCoupon ? (
                    <button
                        type="button"
                        onClick={onClear}
                        className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                        Quitar
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onApply}
                        disabled={loading || subtotal <= 0}
                        className="rounded bg-[#232325] px-3 py-2 text-sm text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "..." : "Aplicar"}
                    </button>
                )}
            </div>

            {status && (
                <p className={`mt-2 text-xs ${status.type === "error" ? "text-red-600" : "text-emerald-700"}`}>
                    {status.message}
                </p>
            )}

            {appliedCoupon && (
                <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                    <div className="flex justify-between text-gray-500">
                        <span>Subtotal original</span>
                        <span className="line-through">
                            {pricePrefix}{formatCouponMoney(appliedCoupon.subtotal)}
                        </span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                        <span>Descuento {appliedCoupon.code}</span>
                        <span>-{pricePrefix}{formatCouponMoney(appliedCoupon.discount)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
