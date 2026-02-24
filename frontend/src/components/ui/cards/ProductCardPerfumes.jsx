import { useState, useContext } from "react";
import { Context } from "../../../js/store/appContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";

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

export default function ProductCardPerfumes({ product }) {

    const [quantity, setQuantity] = useState(1);
    const [selectedFlavor, setSelectedFlavor] = useState("");

    const { actions } = useContext(Context);
    const navigate = useNavigate();
    const location = useLocation();

    const isWholesale = location.pathname.startsWith("/mayorista");
    const prefix = isWholesale ? "/mayorista" : "";

    const wholesalePrice = Number(product?.price_wholesale);
    const retailPrice = Number(product?.price);

    const finalPrice = isWholesale
        ? (wholesalePrice > 0 ? wholesalePrice : null)
        : retailPrice;

    const stock = Number(product?.stock ?? 0);
    const hasStock = stock > 0;

    const handleAddToCart = () => {
        const hasFlavors =
            product.flavor_enabled &&
            Array.isArray(product.flavors) &&
            product.flavors.length > 0;

        if (hasFlavors && !selectedFlavor) {
            navigate(`${prefix}/product/${product.id}`);
            return;
        }

        actions.addToCart(
            { ...product, selectedFlavor: hasFlavors ? selectedFlavor : null },
            quantity
        );
    };

    const handleProductClick = () => {
        navigate(`${prefix}/product/${product.id}`);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition overflow-hidden flex flex-col h-full">

            {/* Imagen */}
            <div
                onClick={handleProductClick}
                className="aspect-square bg-gray-100 overflow-hidden cursor-pointer"
            >
                <img
                    src={toAbsUrl(product?.image_url) || "/sin_imagen.jpg"}
                    alt={product?.name || "Producto"}
                    className="w-full h-full object-cover hover:scale-105 transition"
                />
            </div>

            {/* CONTENIDO */}
            <div className="p-4 flex flex-col flex-grow">

                {/* selector sabores */}
                {/*  {product.flavor_enabled && product.flavors?.length > 0 && (
                    <select
                        value={selectedFlavor}
                        onChange={(e) => setSelectedFlavor(e.target.value)}
                        className="mb-2 border rounded-md px-2 py-1 text-sm"
                    >
                        <option value="">Elegir opción</option>
                        {product.flavors.map((f) => (
                            <option key={f}>{f}</option>
                        ))}
                    </select>
                )} */}

                {/* nombre */}
                <h3
                    onClick={handleProductClick}
                    className="font-semibold text-gray-900 cursor-pointer hover:text-purple-600 line-clamp-2"
                >
                    {product.name}
                </h3>

                {/* categoría */}
                <p className="text-xs text-gray-400 mt-1">
                    {product.category_name}
                </p>

                {/* precio */}
                <div className="mt-2">
                    {finalPrice !== null ? (
                        <span className="text-xl font-bold text-gray-900">
                            ${finalPrice.toLocaleString("es-AR")}
                        </span>
                    ) : (
                        <span className="text-sm text-gray-400 italic">
                            Consultar
                        </span>
                    )}

                    {isWholesale && finalPrice !== null && (
                        <div className="text-xs text-gray-500">
                            Precio mayorista
                        </div>
                    )}
                </div>

                {/* acciones */}
                <div className="mt-4 pt-3 border-t border-gray-100 mt-auto">

                    {/* Cantidad */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">
                            Cantidad:
                        </span>

                        <select
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            disabled={!hasStock}
                            className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                        >
                            {[...Array(Math.min(stock || 1, 10))].map((_, i) => (
                                <option key={i + 1}>{i + 1}</option>
                            ))}
                        </select>
                    </div>

                    {/* Botón SIEMPRE abajo */}
                    <button
                        onClick={handleAddToCart}
                        disabled={!hasStock}
                        className={`w-full py-2 rounded-lg font-semibold text-sm transition
        ${hasStock
                                ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:opacity-90"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        {hasStock ? "Agregar al carrito" : "Sin stock"}
                    </button>

                </div>
            </div>
        </div>
    );
}