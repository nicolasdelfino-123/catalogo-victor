const BEST_SELLERS_STORAGE_KEY = "bestSellerProductIds";

const normalizeIds = (ids = []) =>
    Array.from(
        new Set(
            (ids || [])
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && id > 0)
        )
    );

export const getBestSellerProductIds = () => {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(BEST_SELLERS_STORAGE_KEY);
        if (!raw) return [];
        return normalizeIds(JSON.parse(raw));
    } catch {
        return [];
    }
};

export const saveBestSellerProductIds = (ids = []) => {
    if (typeof window === "undefined") return [];
    const normalized = normalizeIds(ids);
    try {
        localStorage.setItem(BEST_SELLERS_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
        // noop
    }
    return normalized;
};

export const setProductBestSellerStatus = (productId, checked) => {
    const current = new Set(getBestSellerProductIds());
    const numericId = Number(productId);
    if (!Number.isFinite(numericId) || numericId <= 0) return Array.from(current);

    if (checked) current.add(numericId);
    else current.delete(numericId);

    return saveBestSellerProductIds(Array.from(current));
};

export const isBestSellerProduct = (product, idsOrSet = null) => {
    const productId = Number(product?.id);
    if (!Number.isFinite(productId) || productId <= 0) return false;
    if (idsOrSet instanceof Set) return idsOrSet.has(productId);

    const ids = Array.isArray(idsOrSet) ? idsOrSet : getBestSellerProductIds();
    return ids.includes(productId);
};
