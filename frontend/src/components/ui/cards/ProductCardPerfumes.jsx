import { useState, useContext, useMemo, useEffect } from "react";
import { Context } from "../../../js/store/appContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import sinImagen from "@/assets/sin_imagen.jpg";
import { formatPrice } from "../../../utils/price.js";

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

export default function ProductCardPerfumes({ product, returnTo, isGrid = true }) {

    const [quantity, setQuantity] = useState(1);
    const [selectedFlavor, setSelectedFlavor] = useState("");
    const [selectedSizeMl, setSelectedSizeMl] = useState("");

    const { actions } = useContext(Context);
    const navigate = useNavigate();
    const location = useLocation();

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
            const price = parsePrice(
                opt?.price ??
                opt?.retail_price ??
                opt?.retailPrice
            );
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

    useEffect(() => {
        if (sizeOptions.length > 0) {
            setSelectedSizeMl(String(sizeOptions[0].ml));
        } else {
            setSelectedSizeMl("");
        }
    }, [product?.id, sizeOptions.length]);

    const selectedSize =
        sizeOptions.find((opt) => String(opt.ml) === String(selectedSizeMl)) ||
        sizeOptions[0] ||
        null;

    const wholesalePrice = Number(
        selectedSize ? selectedSize?.price_wholesale : product?.price_wholesale
    );
    const retailPrice = Number(
        selectedSize ? selectedSize?.price : product?.price
    );

    const finalPrice = isWholesale
        ? (wholesalePrice > 0 ? wholesalePrice : null)
        : (retailPrice > 0 ? retailPrice : null);
    const pricePrefix = isWholesale ? "$" : "$";
    const displayBrand = String(product?.brand || "").trim();

    const stock = Number(selectedSize?.stock ?? product?.stock ?? 0);
    const hasStock = stock > 0;
    const hasVolume = sizeOptions.length > 0;

    useEffect(() => {
        if (quantity > Math.max(1, stock)) setQuantity(Math.max(1, stock));
    }, [stock, quantity]);

    const handleAddToCart = () => {
        const hasFlavors =
            product.flavor_enabled &&
            Array.isArray(product.flavors) &&
            product.flavors.length > 0;

        if (hasFlavors && !selectedFlavor) {
            sessionStorage.setItem("lastProductId", String(product.id));

            const state = returnTo ? { fromGrid: true, returnTo } : undefined;
            navigate(`${prefix}/product/${product.id}`, { state });

            return;
        }

        const productForCart = selectedSize
            ? {
                ...product,
                volume_ml: selectedSize.ml,
                price: selectedSize.price,
                price_wholesale: selectedSize.price_wholesale,
                selected_size_ml: selectedSize.ml,
                stock: selectedSize.stock ?? product.stock ?? 0,
            }
            : product;

        actions.addToCart(
            { ...productForCart, selectedFlavor: hasFlavors ? selectedFlavor : null },
            quantity
        );
    };


    /*  const handleProductClick = () => {
         sessionStorage.setItem("lastProductId", String(product.id));
         navigate(`${prefix}/product/${product.id}`);
     }; */

    const handleProductClick = () => {
        // ancla para restauración exacta
        // ancla + página exacta para restauración sólida
        sessionStorage.setItem("lastProductId", String(product.id));

        const pageFromReturnTo = (() => {
            if (!returnTo) return null;
            const qs = returnTo.split("?")[1] || "";
            const p = Number(new URLSearchParams(qs).get("page"));
            return Number.isFinite(p) && p > 0 ? p : null;
        })();

        if (pageFromReturnTo) {
            sessionStorage.setItem("lastProductPage", String(pageFromReturnTo));
        }

        // guardo returnTo y marco si viene del grid según el prop `isGrid`
        const state = returnTo ? { fromGrid: Boolean(isGrid), returnTo } : undefined;


        navigate(`${prefix}/product/${product.id}`, { state });
    };
    return (
        <div className="group bg-white rounded-xl border border-stone-100 shadow-sm hover:shadow-md hover:border-stone-200 transition-all duration-300 flex flex-col h-full">

            {/* Imagen */}
            <div
                onClick={handleProductClick}
                className="aspect-square bg-gradient-to-b from-white to-stone-50 flex items-center justify-center p-2 sm:p-4 lg:p-5 cursor-pointer overflow-hidden"
            >
                <img
                    src={toAbsUrl(product?.image_url) || sinImagen}
                    alt={product?.name || "Producto"}
                    className="h-full w-full object-contain scale-[1.12] sm:scale-[1.08] transition-transform duration-500 ease-out group-hover:scale-[1.16] sm:group-hover:scale-[1.12]"
                    onError={(e) => { e.currentTarget.src = sinImagen; }}
                />
            </div>

            {/* CONTENIDO */}
            <div className="p-3 sm:p-5 flex flex-col flex-grow">

                {/* Nombre */}
                <h3
                    onClick={handleProductClick}
                    className="text-sm sm:text-lg font-semibold text-stone-900 tracking-wide cursor-pointer hover:text-black line-clamp-2 text-center"
                >
                    {product.name}
                </h3>

                {/* Marca */}
                <p className="text-[10px] sm:text-xs text-stone-400 uppercase tracking-widest mt-1 text-center">
                    {displayBrand || " "}
                </p>

                {/* Precio */}
                <div className="mt-2 sm:mt-4 text-center">
                    {finalPrice !== null ? (
                        <span className="text-lg sm:text-xl font-semibold text-black tracking-tight">
                            {pricePrefix}{formatPrice(finalPrice)}
                        </span>
                    ) : (
                        <span className="text-xs text-stone-400 italic">
                            Consultar
                        </span>
                    )}
                </div>

                {/* Acciones */}
                <div className="mt-3 sm:mt-6 pt-3 sm:pt-4 border-t border-stone-200 mt-auto">

                    {hasVolume && (
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <span className="text-[10px] sm:text-xs text-stone-600 uppercase tracking-wide">
                                Tamaño
                            </span>
                            <div className="flex flex-wrap justify-end gap-1 sm:gap-2 max-w-[65%]">
                                {sizeOptions.map((opt) => {
                                    const active = String(opt.ml) === String(selectedSizeMl);
                                    return (
                                        <button
                                            key={opt.ml}
                                            type="button"
                                            onClick={() => setSelectedSizeMl(String(opt.ml))}
                                            className={`px-2 py-[3px] sm:px-3 sm:py-1 text-[10px] sm:text-xs rounded-full border transition ${active
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

                    {/* Cantidad */}
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <span className="text-[10px] sm:text-xs text-stone-600 uppercase tracking-wide">
                            Cantidad
                        </span>

                        <select
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            disabled={!hasStock}
                            className="w-14 sm:w-20 border border-stone-300 rounded-md px-1 sm:px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-black disabled:bg-stone-100"
                        >
                            {[...Array(Math.min(stock || 1, 10))].map((_, i) => (
                                <option key={i + 1}>{i + 1}</option>
                            ))}
                        </select>
                    </div>

                    {/* Botón */}
                    <button
                        onClick={handleAddToCart}
                        disabled={!hasStock}
                        className={`w-full px-1 py-2 sm:px-5 sm:py-3 rounded-lg font-serif text-xs sm:text-sm md:text-lg whitespace-nowrap tracking-wide transition-colors duration-200 ${hasStock
                            ? "bg-black text-white hover:bg-stone-800"
                            : "border border-stone-300 bg-stone-100 text-white cursor-not-allowed shadow-none hover:bg-stone-100"
                            }`}
                    >
                        <span className={hasStock ? "" : "text-stone-900"}>{hasStock ? "Agregar al carrito" : "Agotado"}</span>
                    </button>

                </div>
            </div>
        </div>
    );
}
