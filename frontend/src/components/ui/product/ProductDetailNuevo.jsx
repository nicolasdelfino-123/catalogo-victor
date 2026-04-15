import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Context } from "../../../js/store/appContext.jsx";
import sinImagen from "@/assets/sin_imagen.jpg";
import { formatPrice } from "../../../utils/price.js";
import { getDisplayCategoryName } from "../../../utils/perfumeCategories.js";

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

const sanitizeRichHtml = (html = "") => {
    const source = String(html || "");
    if (!source.trim()) return "";
    const parser = new DOMParser();
    const parsed = parser.parseFromString(source, "text/html");
    const allowed = new Set(["STRONG", "EM", "B", "I", "U", "BR", "P", "DIV", "UL", "OL", "LI"]);

    const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
        if (node.nodeType !== Node.ELEMENT_NODE) return "";
        const tag = node.tagName.toUpperCase();
        const children = Array.from(node.childNodes).map(walk).join("");
        if (tag === "BR") return "<br>";
        if (!allowed.has(tag)) return children;
        if (tag === "B") return `<strong>${children}</strong>`;
        if (tag === "I") return `<em>${children}</em>`;
        return `<${tag.toLowerCase()}>${children}</${tag.toLowerCase()}>`;
    };

    return Array.from(parsed.body.childNodes).map(walk).join("");
};

const plainTextFromRich = (html = "") =>
    String(html || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const parseMl = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
    const text = String(value).trim();
    if (!text) return null;
    const match = text.match(/\d+/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? Math.floor(n) : null;
};

const parsePrice = (value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const normalized = String(value).replace(/\./g, "").replace(",", ".").trim();
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
};

const parseStock = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
};

/* =========================
   COMPONENT
========================= */

export default function ProductDetailNuevo() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { store, actions } = useContext(Context);

    const productId = Number(id);
    const product = Number.isFinite(productId)
        ? store.products?.find(p => Number(p.id) === productId)
        : null;

    const [quantity, setQuantity] = useState(1);
    const [selectedFlavor, setSelectedFlavor] = useState("");
    const [selectedSizeMl, setSelectedSizeMl] = useState("");
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

    const sizeOptions = useMemo(() => {
        const rows = [];
        const baseMl = parseMl(product?.volume_ml);
        const basePrice = parsePrice(product?.price);
        const baseWholesale = parsePrice(product?.price_wholesale);
        const baseStock = parseStock(product?.stock);

        if (baseMl && baseMl > 0) {
            rows.push({
                ml: baseMl,
                price: basePrice && basePrice > 0 ? basePrice : null,
                price_wholesale: baseWholesale && baseWholesale > 0 ? baseWholesale : null,
                stock: baseStock,
            });
        }

        const rawVolumeOptions = (() => {
            if (Array.isArray(product?.volume_options)) return product.volume_options;
            if (Array.isArray(product?.volumeOptions)) return product.volumeOptions;
            if (typeof product?.volume_options === "string") {
                try {
                    const parsed = JSON.parse(product.volume_options);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            }
            if (typeof product?.volumeOptions === "string") {
                try {
                    const parsed = JSON.parse(product.volumeOptions);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            }
            if (product?.volume_options && typeof product.volume_options === "object") {
                return Object.values(product.volume_options);
            }
            if (product?.volumeOptions && typeof product.volumeOptions === "object") {
                return Object.values(product.volumeOptions);
            }
            return [];
        })();

        for (const opt of rawVolumeOptions) {
            const ml = parseMl(
                opt?.ml ??
                opt?.volume_ml ??
                opt?.size_ml ??
                opt?.volumeMl ??
                opt?.sizeMl ??
                opt?.label ??
                opt?.name
            );
            const price = parsePrice(opt?.price ?? opt?.retail_price ?? opt?.retailPrice);
            const priceWholesale = parsePrice(
                opt?.price_wholesale ??
                opt?.wholesale_price ??
                opt?.wholesalePrice
            );
            const stock = parseStock(opt?.stock ?? opt?.qty ?? opt?.quantity);
            if (!ml || ml <= 0) continue;

            rows.push({
                ml,
                price: price && price > 0 ? price : null,
                price_wholesale: priceWholesale && priceWholesale > 0 ? priceWholesale : null,
                stock,
            });
        }

        const byMl = new Map();
        for (const row of rows) byMl.set(row.ml, row);
        return Array.from(byMl.values()).sort((a, b) => a.ml - b.ml);
    }, [product]);

    const selectedSize =
        sizeOptions.find((opt) => String(opt.ml) === String(selectedSizeMl)) ||
        sizeOptions[0] ||
        null;
    const displayCategoryName = getDisplayCategoryName(product);

    const retailPrice = Number(
        selectedSize ? selectedSize?.price : product?.price
    );
    const wholesalePrice = Number(
        selectedSize ? selectedSize?.price_wholesale : product?.price_wholesale
    );
    const finalPrice = isWholesale
        ? (wholesalePrice > 0 ? wholesalePrice : null)
        : (retailPrice > 0 ? retailPrice : null);
    const pricePrefix = isWholesale ? "$" : "$";

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

    useEffect(() => {
        if (sizeOptions.length > 0) setSelectedSizeMl(String(sizeOptions[0].ml));
        else setSelectedSizeMl("");
    }, [product?.id, sizeOptions.length]);

    /* =========================
       STOCK
    ========================= */

    const getMaxStock = () => {
        if (selectedFlavor && product?.flavor_catalog) {
            const found = product.flavor_catalog.find(f => f.name === selectedFlavor);
            if (found) return found.stock;
        }
        if (selectedSize && selectedSize.stock !== null && selectedSize.stock !== undefined) {
            return Number(selectedSize.stock);
        }
        return product?.stock ?? 0;
    };

    const getAvailableStock = () => {
        const inCart = store.cart?.find(
            i =>
                i.id === product.id &&
                (i.selectedFlavor || "") === (selectedFlavor || "") &&
                String(i.selected_size_ml ?? i.volume_ml ?? "") === String(selectedSize?.ml ?? product?.volume_ml ?? "")
        );
        return getMaxStock() - (inCart?.quantity || 0);
    };

    /* =========================
       HANDLERS
    ========================= */

    const handleAddToCart = () => {


        const available = getAvailableStock();

        if (available <= 0) {
            setFlavorError("Stock máximo alcanzado");
            return;
        }

        if (quantity > available) {
            setFlavorError(`Solo podés agregar ${available}`);
            return;
        }

        const productForCart = {
            ...product,
            volume_ml: selectedSize?.ml ?? product?.volume_ml,
            selected_size_ml: selectedSize?.ml ?? product?.volume_ml,
            price: selectedSize ? selectedSize?.price : product?.price,
            price_wholesale: selectedSize ? selectedSize?.price_wholesale : product?.price_wholesale,
            stock: selectedSize?.stock ?? product?.stock ?? 0,
        };

        actions?.addToCart(productForCart, quantity);
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

        // Si no venimos del grid, usamos returnTo si se proporcionó, sino listado según modo
        if (location.state?.returnTo) {
            navigate(location.state.returnTo);
            return;
        }

        navigate(`${prefix}/products`);
    };

    // Evita crash mientras carga productos o si el ID no existe.
    if (!product) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {store.loading ? "Cargando producto..." : "Producto no encontrado"}
                    </h2>
                    <button
                        onClick={() => navigate(`${prefix}/products`)}
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Volver a productos
                    </button>
                </div>
            </div>
        );
    }
    /* =========================
       UI
    ========================= */

    return (
        <div className="min-h-screen bg-stone-100 pt-3 pb-8">

            <div className="max-w-6xl mx-auto px-4">

                {/* VOLVER */}
                <button
                    onClick={handleBack}
                    className="hidden sm:inline-flex mb-1 -mt-4 px-4 py-2 text-black text-sm font-medium hover:text-stone-600 transition-colors bg-transparent border-0 rounded-none shadow-none outline-none focus:outline-none focus:ring-0"

                    style={{ backgroundColor: "transparent", border: "none", boxShadow: "none" }}
                >
                    ← Volver
                </button>

                <div className="bg-stone-50 border border-stone-200 rounded-2xl shadow-sm p-4 sm:p-8 grid md:grid-cols-2 gap-8">

                    {/* IMAGEN */}
                    <div>
                        <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-6">
                            <img
                                src={toAbsUrl(activeImg) || sinImagen}
                                className="w-full object-contain"
                                onError={e => (e.currentTarget.src = sinImagen)}
                            />
                        </div>

                        {gallery.length > 1 && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                                {gallery.map((u, i) => (
                                    <img
                                        key={i}
                                        src={toAbsUrl(u)}
                                        onClick={() => setActiveImg(u)}
                                        className={`w-16 h-16 object-contain border rounded p-1 cursor-pointer transition ${activeImg === u ? "border-black" : "border-stone-300 hover:border-stone-500"
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* INFO */}
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-[#232325] mb-4 tracking-wide">{product.name}</h1>
                        {product.brand && (
                            <p className="text-base font-serif text-stone-600 mb-4 tracking-wide">Marca: {product.brand}</p>
                        )}


                        <div className="text-2xl sm:text-2xl font-semibold text-black mb-4">
                            {finalPrice !== null
                                ? `${pricePrefix}${formatPrice(finalPrice)}`
                                : "Consultar"}
                        </div>
                        {sizeOptions.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs font-serif text-stone-600 tracking-wide mb-2">
                                    Tamaño: {selectedSize?.ml}ml
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {sizeOptions.map((opt) => {
                                        const active = String(opt.ml) === String(selectedSizeMl);
                                        return (
                                            <button
                                                key={opt.ml}
                                                type="button"
                                                onClick={() => setSelectedSizeMl(String(opt.ml))}
                                                className={`px-3 py-1 rounded-full text-xs border transition ${active
                                                    ? "bg-black text-white border-black"
                                                    : "border-stone-300 text-stone-600 hover:border-black"
                                                    }`}
                                            >
                                                {opt.ml}ml
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="mb-6">
                            <p className="text-xs font-serif text-stone-500 tracking-wide">Categoría: {displayCategoryName || "Sin categoría"}</p>
                        </div>
                        {product.description && (
                            <div
                                className="font-serif text-stone-700 mb-4 leading-relaxed whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.description) }}
                            />
                        )}

                        {/* selector sabores */}
                        {/*  {flavors.length > 0 && (
                            <select
                                className="w-full border border-stone-300 rounded-md px-3 py-2 mb-4 bg-white focus:outline-none focus:ring-1 focus:ring-black"
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
                        )} */}

                        {/* cantidad */}
                        <div className="flex items-center gap-3 mb-4">
                            <button
                                type="button"
                                className="w-9 h-9 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 flex items-center justify-center text-lg"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            >
                                -
                            </button>
                            <span className="min-w-[36px] text-center font-medium text-stone-800">{quantity}</span>
                            <button
                                type="button"
                                className="w-9 h-9 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 flex items-center justify-center text-lg"
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
                            className={`w-full py-3 rounded-md font-medium text-sm tracking-wide transition-all duration-300 ${getAvailableStock() <= 0
                                ? "border border-stone-300 bg-stone-100 text-white cursor-not-allowed shadow-none hover:bg-stone-100"
                                : "bg-black text-white hover:bg-stone-800"
                                }`}
                        >
                            <span className={getAvailableStock() <= 0 ? "text-stone-900" : ""}>
                                {getAvailableStock() <= 0 ? "Agotado" : "Agregar al carrito"}
                            </span>
                        </button>

                        {/* TABS */}
                        <div className="mt-8 border-b border-stone-200 flex gap-6">
                            <button
                                onClick={() => setActiveTab("desc")}
                                className={activeTab === "desc"
                                    ? "font-serif font-semibold border-b-2 border-black pb-2 text-[#232325]"
                                    : "font-serif pb-2 text-stone-500 hover:text-[#d4af37] transition-colors"}
                            >
                                Descripción
                            </button>
                            {/*  <button
                                onClick={() => setActiveTab("info")}
                                className={activeTab === "desc"
                                    ? "font-serif font-semibold border-b-2 border-black pb-2 text-[#232325]"
                                    : "font-serif pb-2 text-stone-500 hover:text-[#d4af37] transition-colors"}
                            >
                                Información adicional
                            </button> */}
                        </div>

                        {activeTab === 'desc' ? (
                            <div className="pt-4">
                                <div className="relative">
                                    <div
                                        className={`font-serif text-stone-700 whitespace-pre-line leading-relaxed`}
                                        style={
                                            descExpanded
                                                ? { maxHeight: 'none', overflow: 'visible', display: 'block' }
                                                : { maxHeight: '12em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical' }
                                        }
                                        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.short_description || "Sin descripción.") }}
                                    >
                                    </div>
                                    {(plainTextFromRich(product.short_description).length ?? 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setDescExpanded((v) => !v)}
                                            className="mt-2 font-serif text-sm text-stone-600 hover:text-[#d4af37] transition-colors flex items-center gap-1"
                                        >
                                            {descExpanded ? (
                                                <>
                                                    Ver menos
                                                    <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </>
                                            ) : (
                                                <>
                                                    Ver más
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="pt-4 space-y-3">
                                {getFlavors(product).length > 0 ? (
                                    <div>
                                        <h4 className="font-medium mb-2">Sabores disponibles</h4>
                                        <ul className="list-disc pl-5 space-y-1 text-gray-700">
                                            {getFlavors(product).map((f) => (
                                                <li key={f}>{f}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <p className="text-gray-500">Sin información adicional.</p>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
