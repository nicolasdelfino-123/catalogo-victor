const parseJson = async (response) => response.json().catch(() => ({}));

const adminHeaders = (token) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
});

const requestAdminPriceAdjustment = async (url, token, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...adminHeaders(token),
            ...(options.headers || {}),
        },
    });
    const data = await parseJson(response);
    if (!response.ok) {
        throw new Error(data?.error || response.statusText || "No se pudo completar la acción");
    }
    return data;
};

export const getAdminPriceAdjustment = (api, token) =>
    requestAdminPriceAdjustment(`${api}/admin/price-adjustment`, token, {
        method: "GET",
    });

export const applyAdminPriceAdjustment = (api, token, payload) =>
    requestAdminPriceAdjustment(`${api}/admin/price-adjustment/apply`, token, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const getAdminPriceAdjustmentHistory = (api, token) =>
    requestAdminPriceAdjustment(`${api}/admin/price-adjustment/history`, token, {
        method: "GET",
    });

export const undoAdminPriceAdjustment = (api, token, id = null) =>
    requestAdminPriceAdjustment(`${api}/admin/price-adjustment/undo`, token, {
        method: "POST",
        body: JSON.stringify(id ? { id } : {}),
    });

export const confirmAdminPriceAdjustment = (api, token) =>
    requestAdminPriceAdjustment(`${api}/admin/price-adjustment/confirm`, token, {
        method: "POST",
        body: JSON.stringify({}),
    });

export const deleteAdminPriceAdjustmentHistoryItem = (api, token, id) =>
    requestAdminPriceAdjustment(`${api}/admin/price-adjustment/history/${id}`, token, {
        method: "DELETE",
        body: JSON.stringify({}),
    });
