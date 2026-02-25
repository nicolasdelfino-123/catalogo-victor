import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Context } from "../../../js/store/appContext.jsx";
import sinImagen from "@/assets/sin_imagen.jpg";

/* =========================
   HELPERS
========================= */

const normalizeFlavor = (s) =>
    s.replace(/\s+/g, " ").trim().replace(/^[-•·]+/, "").trim();

const extractFlavorsFromDescription = (txt = "") => {
    const m = txt.match(/sabor\s*:\s*(.+)$/i);
    if (!m) return [];
    return [...new Set(
        m[1]
            .split(/,|\||\/|\n/)
            .map(normalizeFlavor)
            .filter(Boolean)
            .filter(f => !/^peso\b|^dimensiones\b/i.test(f))
    )];
};

const getFlavors = (product) => {
    if (!product) return [];

    if (Array.isArray(product.flavor_catalog) && product.flavor_catalog.length) {
        return product.flavor_catalog
            .filter(f => (f.stock ?? 0) > 0)
            .map(f => f.name);
    }

    if (Array.isArray(product.flavors) && product.flavors.length)
        return product.flavors;

    return extractFlavorsFromDescription(product.description || "");
};

const NAME_TO_SLUG = {
    "Vapes Desechables": "vapes-desechables",
    "Pods Recargables": "pods-recargables",
    "Líquidos": "liquidos",
    "Accesorios": "accesorios",
    "Celulares": "celulares",
    "Perfumes": "perfumes",
};

const API = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, "") || "";

const normalizeImagePath = (u = "") => {
    if (!u) return "";
    if (u.startsWith("/admin/uploads/")) u = u.replace("/admin", "/public");
    if (u.startsWith("/uploads/")) u = `/public${u}`;
    return u;
};

const toAbsUrl = (u = "") => {
    u = normalizeImagePath(u);
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith("/public/")) return `${API}${u}`;
    if (u.startsWith("/")) return u;
    return `${API}/${u}`;
};

/* =========================
   COMPONENT
========================= */

export default function ProductDetailNuevo() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { store, actions } = useContext(Context);

    const product = store.products?.find(p => p.id === parseInt(id));

    const [quantity, setQuantity] = useState(1);
    const [selectedFlavor, setSelectedFlavor] = useState("");
    const [flavorError, setFlavorError] = useState("");
    const [activeTab, setActiveTab] = useState("desc");
    const [descExpanded, setDescExpanded] = useState(false);

    const flavors = getFlavors(product);

    const gallery =
        Array.isArray(product?.image_urls) && product.image_urls.length
            ? product.image_urls
            : product?.image_url
                ? [product.image_url]
                : [sinImagen];

    const [activeImg, setActiveImg] = useState(gallery[0]);

    const isWholesale = location.pathname.startsWith("/mayorista");
    const prefix = isWholesale ? "/mayorista" : "";

    /* =========================
       EFFECTS
    ========================= */

    useEffect(() => window.scrollTo(0, 0), [id]);

    useEffect(() => {
        if (!store.products?.length) actions?.fetchProducts?.();
    }, []);

    useEffect(() => {
        setActiveImg(gallery[0]);
    }, [product?.id]);

    /* =========================
       STOCK
    ========================= */

    const getMaxStock = () => {
        if (selectedFlavor && product?.flavor_catalog) {
            const found = product.flavor_catalog.find(f => f.name === selectedFlavor);
            if (found) return found.stock;
        }
        return product?.stock ?? 0;
    };

    const getAvailableStock = () => {
        const key = selectedFlavor || "";
        const inCart = store.cart?.find(
            i => i.id === product.id && (i.selectedFlavor || "") === key
        );
        return getMaxStock() - (inCart?.quantity || 0);
    };

    /* =========================
       HANDLERS
    ========================= */

    const handleAddToCart = () => {
        if (flavors.length && !selectedFlavor) {
            setFlavorError("Elegí un sabor");
            return;
        }

        const available = getAvailableStock();

        if (available <= 0) {
            setFlavorError("Stock máximo alcanzado");
            return;
        }

        if (quantity > available) {
            setFlavorError(`Solo podés agregar ${available}`);
            return;
        }

        actions?.addToCart(
            selectedFlavor ? { ...product, selectedFlavor } : product,
            quantity
        );
    };

    const handleBack = () => {

        if (product?.id) {
            sessionStorage.setItem("lastProductId", String(product.id));
        }

        // Si venimos desde un grid, preferimos retroceder en el historial
        // para preservar filtros/página y permitir que el grid restaure
        // la posición exacta mediante la ancla `lastProductId`.
        if (location.state?.fromGrid) {
            // Si hay historial, volvemos atrás; si no, usamos returnTo si existe.
            if (window.history.length > 1) {
                navigate(-1);
                return;
            }
            if (location.state?.returnTo) {
                navigate(location.state.returnTo);
                return;
            }
        }

        // Si no venimos del grid, usamos returnTo si se proporcionó, sino /products
        if (location.state?.returnTo) {
            navigate(location.state.returnTo);
            return;
        }

        navigate("/products");
    };
    /* =========================
       UI
    ========================= */

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">

                {/* VOLVER */}
                <button
                    onClick={handleBack}
                    className="mb-6 text-purple-600 hover:text-purple-700"
                >
                    ← Volver
                </button>

                <div className="bg-white rounded-lg shadow-lg p-8 grid md:grid-cols-2 gap-8">

                    {/* IMAGEN */}
                    <div>
                        <img
                            src={toAbsUrl(activeImg) || sinImagen}
                            className="w-full rounded-lg"
                            onError={e => (e.currentTarget.src = sinImagen)}
                        />

                        {gallery.length > 1 && (
                            <div className="flex gap-2 mt-3">
                                {gallery.map((u, i) => (
                                    <img
                                        key={i}
                                        src={toAbsUrl(u)}
                                        onClick={() => setActiveImg(u)}
                                        className="w-16 h-16 object-contain border cursor-pointer"
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* INFO */}
                    <div>
                        <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

                        <div className="text-4xl font-bold text-purple-600 mb-4">
                            ${Number(
                                isWholesale ? product.price_wholesale : product.price
                            ).toLocaleString("es-AR")}
                        </div>

                        {/* selector sabores */}
                        {flavors.length > 0 && (
                            <select
                                className="w-full border rounded px-3 py-2 mb-4"
                                value={selectedFlavor}
                                onChange={(e) => {
                                    setSelectedFlavor(e.target.value);
                                    setFlavorError("");
                                }}
                            >
                                <option value="">Elegir sabor</option>
                                {flavors.map(f => (
                                    <option key={f}>{f}</option>
                                ))}
                            </select>
                        )}

                        {flavorError && (
                            <p className="text-red-500 text-sm mb-2">{flavorError}</p>
                        )}

                        {/* cantidad */}
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                            <span>{quantity}</span>
                            <button
                                onClick={() =>
                                    setQuantity(Math.min(getAvailableStock(), quantity + 1))
                                }
                            >
                                +
                            </button>
                        </div>

                        <button
                            onClick={handleAddToCart}
                            disabled={getAvailableStock() <= 0}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold"
                        >
                            {getAvailableStock() <= 0 ? "Sin stock" : "Agregar al carrito"}
                        </button>

                        {/* TABS */}
                        <div className="mt-8 border-b flex gap-6">
                            <button
                                onClick={() => setActiveTab("desc")}
                                className={activeTab === "desc" ? "font-semibold border-b-2 border-purple-600 pb-2" : ""}
                            >
                                Descripción
                            </button>
                            <button
                                onClick={() => setActiveTab("info")}
                                className={activeTab === "info" ? "font-semibold border-b-2 border-purple-600 pb-2" : ""}
                            >
                                Información adicional
                            </button>
                        </div>

                        {/* contenido tabs */}
                        {activeTab === "desc" ? (
                            <div className="mt-4">
                                <p className="whitespace-pre-line text-gray-700">
                                    {product.short_description || product.description}
                                </p>

                                {product.description && (
                                    <button
                                        onClick={() => setDescExpanded(!descExpanded)}
                                        className="text-purple-600 text-sm mt-2"
                                    >
                                        {descExpanded ? "Ver menos" : "Ver más"}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="mt-4 text-gray-700">
                                {flavors.length > 0 ? (
                                    <ul className="list-disc pl-5 space-y-1">
                                        {flavors.map(f => <li key={f}>{f}</li>)}
                                    </ul>
                                ) : (
                                    <p>Sin información adicional.</p>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}