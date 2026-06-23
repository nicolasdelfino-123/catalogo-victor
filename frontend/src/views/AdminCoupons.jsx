import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PERFUME_CATEGORY_DEFINITIONS } from "../utils/perfumeCategories.js";

const API = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, "") || "";

const normalizeCode = (value = "") => String(value || "").trim().toUpperCase();
const normalizeOption = (value = "") => String(value || "").trim();

const getScopeLabel = (coupon) => {
    const values = Array.isArray(coupon?.scope_values) ? coupon.scope_values : [];
    if (coupon?.scope_type === "brand") return values.length ? `Marca: ${values.join(", ")}` : "Marca";
    if (coupon?.scope_type === "category") return values.length ? `Categoría: ${values.join(", ")}` : "Categoría";
    if (coupon?.scope_type === "best_seller") return "Más vendidos";
    return "Todos los productos";
};

export default function AdminCoupons() {
    const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
    const [coupons, setCoupons] = useState([]);
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({ code: "", percent: "", active: true, scope_type: "all", scope_values: [] });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const fetchCoupons = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/admin/coupons`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => []);
            if (!res.ok) {
                setMessage(data?.error || "No se pudieron cargar los cupones");
                return;
            }
            setCoupons(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            setMessage("Error cargando cupones");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    useEffect(() => {
        if (!token) return;
        const fetchProducts = async () => {
            try {
                const res = await fetch(`${API}/admin/products`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json().catch(() => []);
                if (res.ok && Array.isArray(data)) setProducts(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchProducts();
    }, [token]);

    const brandOptions = useMemo(() => {
        const seen = new Map();
        for (const product of products) {
            const brand = normalizeOption(product?.brand);
            if (!brand) continue;
            const key = brand.toLocaleLowerCase("es-AR");
            if (!seen.has(key)) seen.set(key, brand);
        }
        return [...seen.values()].sort((a, b) => a.localeCompare(b, "es-AR"));
    }, [products]);

    const categoryOptions = useMemo(() => (
        PERFUME_CATEGORY_DEFINITIONS
            .map((category) => ({
                value: category.name,
                label: category.name,
            }))
    ), []);

    const setScopeType = (scope_type) => {
        setForm((prev) => ({ ...prev, scope_type, scope_values: [] }));
    };

    const setScopeValuesFromSelect = (event) => {
        const values = [...event.target.selectedOptions].map((option) => option.value);
        setForm((prev) => ({ ...prev, scope_values: values }));
    };

    const saveCoupon = async (event) => {
        event.preventDefault();
        const code = normalizeCode(form.code);
        const percent = Number(form.percent);

        if (!code) {
            setMessage("Ingresá un código");
            return;
        }
        if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
            setMessage("El descuento debe estar entre 1 y 100");
            return;
        }
        const isBestSellerCoupon = form.scope_type === "category" && form.scope_values.includes("Más Vendidos");
        if (isBestSellerCoupon && form.scope_values.length > 1) {
            setMessage("Más Vendidos debe seleccionarse solo, sin mezclar con otras categorías");
            return;
        }
        if (["brand", "category"].includes(form.scope_type) && form.scope_values.length === 0) {
            setMessage(form.scope_type === "brand" ? "Seleccioná al menos una marca" : "Seleccioná al menos una categoría");
            return;
        }

        setSaving(true);
        setMessage("");
        try {
            const res = await fetch(`${API}/admin/coupons`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    code,
                    percent,
                    active: form.active,
                    scope_type: isBestSellerCoupon ? "best_seller" : form.scope_type,
                    scope_values: ["all", "best_seller"].includes(form.scope_type) || isBestSellerCoupon ? [] : form.scope_values,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage(data?.error || "No se pudo guardar el cupón");
                return;
            }
            setCoupons(data?.coupons || []);
            setForm({ code: "", percent: "", active: true, scope_type: "all", scope_values: [] });
            setMessage("Cupón guardado");
        } catch (error) {
            console.error(error);
            setMessage("Error guardando cupón");
        } finally {
            setSaving(false);
        }
    };

    const setActive = async (coupon, active) => {
        setMessage("");
        try {
            const res = await fetch(`${API}/admin/coupons/${encodeURIComponent(coupon.code)}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ active }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage(data?.error || "No se pudo actualizar el cupón");
                return;
            }
            setCoupons(data?.coupons || []);
        } catch (error) {
            console.error(error);
            setMessage("Error actualizando cupón");
        }
    };

    const removeCoupon = async (coupon) => {
        setMessage("");
        try {
            const res = await fetch(`${API}/admin/coupons/${encodeURIComponent(coupon.code)}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage(data?.error || "No se pudo eliminar el cupón");
                return;
            }
            setCoupons(data?.coupons || []);
            setMessage("Cupón eliminado de la vista");
        } catch (error) {
            console.error(error);
            setMessage("Error eliminando cupón");
        }
    };

    if (!token) return <div className="p-6">No autorizado</div>;

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Cupones</h1>
                    <p className="text-sm text-gray-500">
                        Los cupones desactivados quedan guardados, pero no aplican descuentos.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link to="/admin/products" className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
                        Productos
                    </Link>
                    <Link to="/admin/pedidos" className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                        Pedidos
                    </Link>
                </div>
            </div>

            <form onSubmit={saveCoupon} className="mb-6 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-[1fr_160px_auto_auto] sm:items-end">
                <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Código</span>
                    <input
                        value={form.code}
                        onChange={(e) => setForm((prev) => ({ ...prev, code: normalizeCode(e.target.value) }))}
                        className="w-full rounded border px-3 py-2"
                        placeholder="VERANO20"
                    />
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Descuento %</span>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={form.percent}
                        onChange={(e) => setForm((prev) => ({ ...prev, percent: e.target.value }))}
                        className="w-full rounded border px-3 py-2"
                        placeholder="20"
                    />
                </label>
                <label className="inline-flex items-center gap-2 rounded border px-3 py-2">
                    <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                        className="accent-gray-900"
                    />
                    Activo
                </label>
                <div className="sm:col-span-4">
                    <span className="mb-2 block text-xs font-semibold uppercase text-gray-500">Aplicar cupón</span>
                    <div className="grid gap-2 sm:grid-cols-3">
                        <label className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm ${form.scope_type === "all" ? "border-emerald-800 bg-emerald-700 text-white" : ""}`}>
                            <input
                                type="radio"
                                name="coupon_scope"
                                checked={form.scope_type === "all"}
                                onChange={() => setScopeType("all")}
                                className="accent-gray-900"
                            />
                            Todos los productos
                        </label>
                        <label className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm ${form.scope_type === "brand" ? "border-emerald-800 bg-emerald-700 text-white" : ""}`}>
                            <input
                                type="radio"
                                name="coupon_scope"
                                checked={form.scope_type === "brand"}
                                onChange={() => setScopeType("brand")}
                                className="accent-gray-900"
                            />
                            Por marca
                        </label>
                        <label className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm ${form.scope_type === "category" ? "border-emerald-800 bg-emerald-700 text-white" : ""}`}>
                            <input
                                type="radio"
                                name="coupon_scope"
                                checked={form.scope_type === "category"}
                                onChange={() => setScopeType("category")}
                                className="accent-gray-900"
                            />
                            Por categoría
                        </label>
                    </div>
                </div>
                <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Marcas</span>
                    <select
                        multiple
                        value={form.scope_type === "brand" ? form.scope_values : []}
                        onChange={setScopeValuesFromSelect}
                        disabled={form.scope_type !== "brand"}
                        className="h-28 w-full rounded border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        {brandOptions.map((brand) => (
                            <option key={brand} value={brand}>{brand}</option>
                        ))}
                    </select>
                </label>
                <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Categorías</span>
                    <select
                        multiple
                        value={form.scope_type === "category" ? form.scope_values : []}
                        onChange={setScopeValuesFromSelect}
                        disabled={form.scope_type !== "category"}
                        className="h-28 w-full rounded border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        {categoryOptions.map((category) => (
                            <option key={category.value} value={category.value}>{category.label}</option>
                        ))}
                    </select>
                </label>
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-start-4"
                >
                    {saving ? "Guardando..." : "Agregar"}
                </button>
            </form>

            {message && <p className="mb-4 rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700">{message}</p>}

            <div className="overflow-x-auto rounded-lg border bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left">Cupón</th>
                            <th className="p-3 text-left">Descuento</th>
                            <th className="p-3 text-left">Aplicado a</th>
                            <th className="p-3 text-left">Estado</th>
                            <th className="p-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-gray-500">Cargando...</td>
                            </tr>
                        ) : coupons.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-gray-500">Sin cupones cargados</td>
                            </tr>
                        ) : coupons.map((coupon) => (
                            <tr key={coupon.code} className="border-t">
                                <td className="p-3 font-semibold">{coupon.code}</td>
                                <td className="p-3">{coupon.percent}%</td>
                                <td className="p-3 text-gray-600">{getScopeLabel(coupon)}</td>
                                <td className="p-3">
                                    <span className={`rounded px-2 py-1 text-xs ${coupon.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                                        {coupon.active ? "Activo" : "Inactivo"}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <div className="inline-flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setActive(coupon, !coupon.active)}
                                            className={`rounded px-3 py-1.5 text-sm text-white ${coupon.active ? "bg-gray-700 hover:bg-gray-900" : "bg-emerald-600 hover:bg-emerald-700"}`}
                                        >
                                            {coupon.active ? "Desactivar" : "Activar"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeCoupon(coupon)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-200 text-red-700 hover:bg-red-50"
                                            aria-label={`Eliminar cupón ${coupon.code}`}
                                            title="Eliminar de la vista"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
