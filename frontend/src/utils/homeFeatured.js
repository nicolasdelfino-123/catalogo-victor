const toBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "si";
    }
    return false;
};

export const isHomeFeaturedProduct = (product) => {
    const productId = Number(product?.id);
    if (!Number.isFinite(productId) || productId <= 0) return false;
    return toBoolean(product?.is_home_featured);
};

export const sortHomeFeaturedProducts = (products = []) => (
    [...products].sort((a, b) => {
        const posA = Number.isFinite(Number(a?.home_featured_position)) ? Number(a.home_featured_position) : 999;
        const posB = Number.isFinite(Number(b?.home_featured_position)) ? Number(b.home_featured_position) : 999;
        if (posA !== posB) return posA - posB;
        return (Number(a?.id) || 0) - (Number(b?.id) || 0);
    })
);
