import { useState, useMemo } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { withWholesale } from "../../../utils/wholesaleMode"; // ✅ ruta correcta desde /components/product

const CATEGORIES = [
    { id: 1, name: "Pods Descartables", slug: "vapes-desechables" },
    { id: 2, name: "Pods Recargables", slug: "pods-recargables" },
    { id: 3, name: "Líquidos", slug: "liquidos" },
    { id: 4, name: "Resistencias", slug: "resistencias" },
    // { id: 5, name: "Celulares", slug: "celulares" },
    { id: 6, name: "Perfumes", slug: "perfumes" },
];

// normalizador simple (lowercase + sin tildes + colapsa espacios)
const norm = (s = "") =>
    String(s)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");

export default function SidebarFiltersNuevo({
    currentCategorySlug,
    onSelectCategory,

    // Precio
    priceMin = 0,
    priceMax = 50000,
    price, // {min, max}
    onChangePrice,

    className = "",

    // Fabricantes
    brandOptions = [], // [{ key, label, count }]
    selectedBrands = [],
    onToggleBrand = () => { },
    onClearBrands = () => { },

    // Puffs
    puffsOptions = [], // [{ value, label, count }]
    selectedPuffs = [],
    onTogglePuffs = () => { },
    onClearPuffs = () => { },

    // Sabores
    flavorOptions = [], // [{ value, label, count }]
    selectedFlavors = [],
    onToggleFlavor = () => { },
    onClearFlavors = () => { },
}) {
    const [open, setOpen] = useState(false);
    const [flavorSearch, setFlavorSearch] = useState("");
    const [draftPrice, setDraftPrice] = useState(null); // {min,max} mientras el usuario ajusta

    const navigate = useNavigate();
    const location = useLocation();


    const p = useMemo(() => {
        const src = draftPrice ?? price ?? { min: priceMin, max: priceMax };

        return {
            min: Math.max(priceMin, Math.min(src.min ?? priceMin, priceMax)),
            max: Math.min(priceMax, Math.max(src.max ?? priceMax, priceMin)),
        };
    }, [priceMin, priceMax, price, draftPrice]);

    const setMin = (val) => {
        const base = {
            min: Math.max(priceMin, Math.min(price?.min ?? priceMin, priceMax)),
            max: Math.min(priceMax, Math.max(price?.max ?? priceMax, priceMin)),
        };
        const cur = draftPrice ?? base;

        const v = Math.max(priceMin, Math.min(Number(val), cur.max));
        setDraftPrice({ min: v, max: cur.max });
    };

    const setMax = (val) => {
        const base = {
            min: Math.max(priceMin, Math.min(price?.min ?? priceMin, priceMax)),
            max: Math.min(priceMax, Math.max(price?.max ?? priceMax, priceMin)),
        };
        const cur = draftPrice ?? base;

        const v = Math.min(priceMax, Math.max(Number(val), cur.min));
        setDraftPrice({ min: cur.min, max: v });
    };

    const hasActiveFilters = useMemo(() => {
        const currentMin = Number.isFinite(price?.min) ? price.min : priceMin;
        const currentMax = Number.isFinite(price?.max) ? price.max : priceMax;

        // ✅ Activo SOLO si el usuario aplicó un price (price != null)
        const isPriceActive =
            price != null && (currentMin !== priceMin || currentMax !== priceMax);

        return (
            isPriceActive ||
            (Array.isArray(selectedBrands) && selectedBrands.length > 0) ||
            (Array.isArray(selectedPuffs) && selectedPuffs.length > 0) ||
            (Array.isArray(selectedFlavors) && selectedFlavors.length > 0)
        );
    }, [price, priceMin, priceMax, selectedBrands, selectedPuffs, selectedFlavors]);


    // Filtrado local de la lista de sabores según el buscador
    const filteredFlavorOptions = useMemo(() => {
        const list = Array.isArray(flavorOptions) ? flavorOptions : [];
        const q = norm(flavorSearch);
        if (!q) return list;
        const tokens = q.split(" ").filter(Boolean);
        return list.filter(({ value, label }) => {
            const haystack = norm(label || value);
            return tokens.every((t) => haystack.includes(t));
        });
    }, [flavorOptions, flavorSearch]);

    const getActiveFilterTags = () => {
        const tags = [];


        // Precio (✅ solo si el usuario aplicó filtro: price != null)
        if (price != null) {
            const currentMin = Number.isFinite(price?.min) ? price.min : priceMin;
            const currentMax = Number.isFinite(price?.max) ? price.max : priceMax;

            const minActive = currentMin !== priceMin;
            const maxActive = currentMax !== priceMax;

            if (minActive || maxActive) {
                const minLabel = currentMin.toLocaleString("es-AR");
                const maxLabel = currentMax.toLocaleString("es-AR");
                const priceLabel =
                    minActive && maxActive
                        ? `$${minLabel} - $${maxLabel}`
                        : minActive
                            ? `Desde $${minLabel}`
                            : `Hasta $${maxLabel}`;

                tags.push({
                    type: "price",
                    key: "price",
                    label: priceLabel,
                    onRemove: () => onChangePrice?.(null), // ✅ limpia el filtro, no lo setea
                });
            }
        }


        // Brands
        for (const b of selectedBrands || []) {
            tags.push({
                type: "brand",
                key: b,
                label: b?.toString()?.toUpperCase?.() || String(b),
                onRemove: () => onToggleBrand?.(b),
            });
        }

        // Puffs
        for (const puff of selectedPuffs || []) {
            tags.push({
                type: "puffs",
                key: puff,
                label: `${puff} puffs`,
                onRemove: () => onTogglePuffs?.(puff),
            });
        }

        // Flavors
        for (const f of selectedFlavors || []) {
            const opt = (flavorOptions || []).find((x) => x.value === f);
            tags.push({
                type: "flavor",
                key: f,
                label: opt?.label || f,
                onRemove: () => onToggleFlavor?.(f),
            });
        }

        return tags;
    };

    const clearAllFilters = () => {
        onClearBrands?.();
        onClearPuffs?.();
        onClearFlavors?.();
        onChangePrice?.(null); // 🔥 IMPORTANTE
    };

    // ⚠️ sin h-full (rompe sticky); nada de overflow aquí
    const body = (
        <div className="w-64 max-w-[80vw] bg-white border-r p-4 space-y-6">
            <div className="md:hidden flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Filtros</h3>
                <button onClick={() => setOpen(false)} className="px-3 py-1 border rounded">
                    Cerrar
                </button>
            </div>

            {/* Etiquetas de filtros activos */}
            {hasActiveFilters && (
                <div className="border-b pb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Filtros activos</h4>
                        <button
                            onClick={clearAllFilters}
                            className="text-xs text-purple-600 hover:text-purple-800 underline"
                        >
                            Limpiar todos
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {getActiveFilterTags().map((tag) => (
                            <div
                                key={`${tag.type}-${tag.key}`}
                                className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm border"
                            >
                                <span className="max-w-[120px] truncate">{tag.label}</span>
                                <button
                                    onClick={tag.onRemove}
                                    className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                                    title="Remover filtro"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Categorías */}
            <div>
                <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide">Categorías</h4>
                <ul className="space-y-2">
                    {CATEGORIES.map((c) => {
                        const active = c.slug === currentCategorySlug;

                        return (
                            <li key={c.slug}>
                                <button
                                    onClick={() => {
                                        const isWholesale = location.pathname.startsWith("/mayorista");
                                        const base = isWholesale ? "/mayorista" : "";
                                        navigate(`${base}/categoria/${c.slug}`);
                                        setOpen(false);
                                    }}
                                    className={`w-full text-left px-2 py-1 rounded border transition-colors ${active
                                        ? "bg-purple-200 border-purple-300 text-purple-800 font-semibold"
                                        : "border-transparent text-gray-900 hover:bg-purple-50"
                                        }`}
                                >
                                    {c.name}
                                </button>
                            </li>
                        );
                    })}

                </ul>
            </div>

            {/* Precio */}
            <div>
                <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide">Filtrar por precio</h4>

                <div className="flex items-center justify-between text-sm mb-2">
                    <span>${p.min.toLocaleString("es-AR")}</span>
                    <span>${p.max.toLocaleString("es-AR")}</span>
                </div>
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        onClick={() => {
                            // ✅ aplicar solo cuando el usuario confirma
                            onChangePrice?.(draftPrice ?? { min: priceMin, max: priceMax });
                            setDraftPrice(null);
                        }}
                        className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold"
                    >
                        Aplicar
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            // ✅ limpiar
                            setDraftPrice(null);
                            onChangePrice?.(null);
                        }}
                        className="flex-1 py-2 rounded-lg border text-sm font-semibold"
                    >
                        Limpiar
                    </button>
                </div>

                <div className="relative h-6 mt-2">
                    <input
                        type="range"
                        min={priceMin}
                        max={priceMax}
                        step={100}
                        value={p.min}
                        onChange={(e) => setMin(e.target.value)}
                        className="absolute w-full appearance-none h-1 bg-gray-200 rounded pointer-events-none"
                        style={{ zIndex: 3 }}
                    />
                    <input
                        type="range"
                        min={priceMin}
                        max={priceMax}
                        step={100}
                        value={p.max}
                        onChange={(e) => setMax(e.target.value)}
                        className="absolute w-full appearance-none h-1 bg-gray-200 rounded"
                        style={{ zIndex: 4 }}
                    />
                </div>
            </div>

            {/* Marcas */}
            {brandOptions.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide">Marcas</h4>

                    <div className="flex items-center justify-between mb-2">
                        {selectedBrands.length > 0 ? (
                            <button
                                type="button"
                                onClick={onClearBrands}
                                className="text-xs text-purple-600 hover:underline"
                                title="Limpiar selección"
                            >
                                Limpiar selección
                            </button>
                        ) : (
                            <span className="text-xs text-gray-500">Seleccioná una o más</span>
                        )}
                    </div>

                    <div className="space-y-2 max-h-56 overflow-auto pr-1 border rounded p-2">
                        {brandOptions.map(({ key, label, count }) => {
                            const checked = selectedBrands.includes(key);
                            return (
                                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onToggleBrand(key)}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="flex-1">
                                        {label} <span className="text-gray-500">({count})</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Puffs */}
            {puffsOptions.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide">Puffs</h4>

                    <div className="flex items-center justify-between mb-2">
                        {selectedPuffs.length > 0 ? (
                            <button
                                type="button"
                                onClick={onClearPuffs}
                                className="text-xs text-purple-600 hover:underline"
                                title="Limpiar selección"
                            >
                                Limpiar selección
                            </button>
                        ) : (
                            <span className="text-xs text-gray-500">Seleccioná uno o más</span>
                        )}
                    </div>

                    <div className="space-y-2 max-h-56 overflow-auto pr-1 border rounded p-2">
                        {puffsOptions.map(({ value, label, count }) => {
                            const numeric = Number(value);
                            const checked = selectedPuffs.includes(numeric);
                            return (
                                <label key={numeric} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onTogglePuffs(numeric)}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="flex-1">
                                        {label} puffs <span className="text-gray-500">({count})</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sabores */}
            {flavorOptions.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide">Sabores</h4>

                    <div className="flex items-center justify-between mb-2">
                        {selectedFlavors.length > 0 ? (
                            <button
                                type="button"
                                onClick={onClearFlavors}
                                className="text-xs text-purple-600 hover:underline"
                                title="Limpiar selección"
                            >
                                Limpiar selección
                            </button>
                        ) : (
                            <span className="text-xs text-gray-500">Seleccioná uno o más</span>
                        )}
                    </div>

                    {/* 🔎 Buscador local de sabores */}
                    <div className="mb-2">
                        <input
                            type="text"
                            value={flavorSearch}
                            onChange={(e) => setFlavorSearch(e.target.value)}
                            placeholder="Buscar sabor..."
                            className="w-full border rounded px-2 py-1 text-sm"
                        />
                    </div>

                    <div id="sf-scroll" className="space-y-2 max-h-56 overflow-auto pr-1 border rounded p-2">
                        {filteredFlavorOptions.length === 0 && (
                            <div className="text-xs text-gray-500 px-1">Sin resultados</div>
                        )}

                        {filteredFlavorOptions.map(({ value, label, count }) => {
                            const checked = selectedFlavors.includes(value);
                            return (
                                <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onToggleFlavor(value)}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="flex-1">
                                        {label} <span className="text-gray-500">({count})</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            <style>{`
        /* Firefox */
        #sf-scroll { scrollbar-width: thin; scrollbar-color: #e5e7eb transparent; }
        /* WebKit */
        #sf-scroll::-webkit-scrollbar { width: 10px; }
        #sf-scroll::-webkit-scrollbar-track { background: transparent; }
        #sf-scroll::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        #sf-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>

            <aside className={className}>
                {/* Botón hamburguesa (mobile) */}
                <div className="md:hidden mb-3">
                    <button
                        onClick={() => setOpen(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 border rounded-md"
                    >
                        <Menu size={18} />
                        Filtros
                        {hasActiveFilters && (
                            <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                                {getActiveFilterTags().length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Desktop */}
                <div className="hidden md:block">{body}</div>

                {/* Drawer Mobile */}
                {open && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                        <div className="absolute left-0 top-0 h-full overflow-auto">{body}</div>
                    </div>
                )}
            </aside>
        </>
    );
}