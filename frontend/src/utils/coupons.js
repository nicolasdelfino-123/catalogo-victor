const API = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, "") || "";

export const normalizeCouponCode = (value = "") =>
    String(value || "").trim().toUpperCase();

export const formatCouponMoney = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed).toLocaleString("es-AR") : "0";
};

export const getCouponFromOrder = (order) => {
    const coupon =
        order?.coupon ||
        order?.billing_address?.coupon ||
        order?.shipping_address?.coupon ||
        null;
    return coupon && typeof coupon === "object" ? coupon : null;
};

export const validateCoupon = async ({ code, subtotal }) => {
    const res = await fetch(`${API}/public/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizeCouponCode(code), subtotal }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.valid) {
        return { valid: false, error: data?.error || "Cupón inválido o inactivo" };
    }
    return data;
};
