// src/components/product/ProductGridNuevo.jsx
import { useState, useEffect, useContext, useMemo, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";


// Ajustá estos imports si tu estructura difiere:
import { Context } from "../../../js/store/appContext.jsx"// (si en tu proyecto es .jsx, cambialo)
import ProductCardPerfumes from "../cards//ProductCardPerfumes.jsx";        // o "../ui/cards/ProductCardPerfumes.jsx" / donde esté tu card
import SidebarFiltersNuevo from "./SidebarFiltersNuevo.jsx";     // o "./SidebarFilterNuevo.jsx" cuando lo refactoricemos
import Modal from "../../Modal.jsx";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { withWholesale } from "../../../utils/wholesaleMode.js";

// -----------------------------
// Persistencia ligera en sessionStorage
// -----------------------------
const GRID_STATE_KEY = "productGridState";

const readGridState = (key) => {
    try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const writeGridState = (key, state) => {
    try {
        sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
        // noop
    }
};

// -----------------------------
// Mapeos de categorías
// -----------------------------
const SLUG_TO_NAME = {
    "vapes-desechables": "Vapes Desechables",
    "pods-recargables": "Pods Recargables",
    "liquidos": "Líquidos",
    "resistencias": "Resistencias",
    "celulares": "Celulares",
    "perfumes": "Perfumes",
};

const SLUG_TO_ID = {
    "vapes-desechables": 1,
    "pods-recargables": 2,
    "liquidos": 3,
    "resistencias": 4,
    "celulares": 5,
    "perfumes": 6,
};

// -----------------------------
// Normalizadores
// -----------------------------
const normalizeBrand = (b = "") =>
    String(b).trim().replace(/\s+/g, " ").toLowerCase();

const normalizeFlavor = (s = "") =>
    String(s).trim().replace(/\s+/g, " ").toLowerCase();

// -----------------------------
// Componente
// -----------------------------
export default function ProductGridNuevo({ category, hideFilters = false }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { slug } = useParams();
    const [searchParams] = useSearchParams();


    const { store, actions } = useContext(Context);

    // Filtros
    const [priceRange, setPriceRange] = useState({ min: 0, max: Infinity });
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [selectedPuffs, setSelectedPuffs] = useState([]);
    const [selectedFlavors, setSelectedFlavors] = useState([]);

    // UI
    const [modalOpen, setModalOpen] = useState(false);

    // Paginación + Orden
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [currentPage, setCurrentPage] = useState(
        Number(searchParams.get("page")) || 1
    );
    const [sortOrder, setSortOrder] = useState("default"); // default | price-asc | price-desc

    // Persistencia por categoría
    const storageKey = useMemo(() => `${GRID_STATE_KEY}:${slug || "all"}`, [slug]);

    const restoredRef = useRef(false);
    const isInitialMount = useRef(true);
    const gridRestoredRef = useRef(false);
    const skipNextPageResetRef = useRef(false);


    const currentSlug = slug;
    const currentCategoryId = currentSlug ? SLUG_TO_ID[currentSlug] : null;

    const searchTerm = store.productSearch || "";
    const setSearchTerm = (val) => actions.searchProducts(val);

    // -----------------------------
    // Efectos iniciales
    // -----------------------------
    useEffect(() => {
        // Si venimos de un detalle y hay ancla guardada, NO scrollees arriba.
        // Dejá que el useLayoutEffect haga el scrollIntoView.
        const lastId = sessionStorage.getItem("lastProductId");
        if (lastId) return;

        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    useEffect(() => {
        if (actions?.fetchProducts) actions.fetchProducts();
    }, []);

    // Si venís desde footer, scroll arriba (mantengo tu lógica)
    useEffect(() => {
        if (location.state?.fromFooter) {
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }, 50);

            // Limpia state del historial para evitar repeticiones
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // -----------------------------
    // Restaurar filtros guardados (solo 1 vez)
    // -----------------------------
    useEffect(() => {
        if (!isInitialMount.current) return;

        const saved = readGridState(storageKey);
        if (saved) {
            setSearchTerm(saved.searchTerm ?? "");

            const pr = saved.priceRange ?? { min: 0, max: Infinity };
            setPriceRange({
                min: Number.isFinite(pr.min) ? pr.min : 0,
                max: Number.isFinite(pr.max) ? pr.max : Infinity,
            });

            setSelectedBrands(saved.selectedBrands ?? []);
            setSelectedPuffs(saved.selectedPuffs ?? []);
            setSelectedFlavors(saved.selectedFlavors ?? []);

            setItemsPerPage(saved.itemsPerPage ?? 12);
            setCurrentPage(saved.currentPage ?? 1);
            setSortOrder(saved.sortOrder ?? "default");

            restoredRef.current = true;
            skipNextPageResetRef.current = true;

        }

        isInitialMount.current = false;
    }, [storageKey]);

    // -----------------------------
    // Reset de filtros al cambiar categoría (si no hay estado guardado)
    // -----------------------------
    useEffect(() => {
        if (isInitialMount.current || restoredRef.current) {
            if (restoredRef.current) restoredRef.current = false;
            return;
        }

        // Si estamos volviendo desde un detalle con ancla, no reseteamos nada
        const lastId = sessionStorage.getItem("lastProductId");
        if (lastId) return;

        const saved = readGridState(storageKey);
        if (!saved) {
            setSearchTerm("");
            setPriceRange({ min: 0, max: Infinity });
            setSelectedBrands([]);
            setSelectedPuffs([]);
            setSelectedFlavors([]);
            setCurrentPage(1);
        }
    }, [slug, category, storageKey]);

    // -----------------------------
    // Productos por categoría / destacados
    // -----------------------------
    const categoryProducts = useMemo(() => {
        const products = store.products || [];

        // Home / destacados
        if (hideFilters && !currentCategoryId) return products.slice(0, 12);

        // Todos
        if (!currentCategoryId) return products;

        // Categoría actual
        return products.filter(
            (p) => Number(p.category_id) === Number(currentCategoryId)
        );
    }, [store.products, currentCategoryId, slug, category, hideFilters]);

    // -----------------------------
    // Opciones de filtros
    // -----------------------------
    const brandOptions = useMemo(() => {
        const counter = new Map();

        for (const p of categoryProducts) {
            if (!p?.brand) continue;
            const key = normalizeBrand(p.brand);
            if (!key) continue;
            counter.set(key, (counter.get(key) || 0) + 1);
        }

        return Array.from(counter.entries())
            .map(([key, count]) => ({ key, count, label: key.toUpperCase() }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [categoryProducts]);

    const puffsOptions = useMemo(() => {
        const counter = new Map();

        for (const p of categoryProducts) {
            const v = Number(p?.puffs);
            if (!Number.isFinite(v) || v <= 0) continue;
            counter.set(v, (counter.get(v) || 0) + 1);
        }

        return Array.from(counter.entries())
            .map(([value, count]) => ({ value, count, label: `${value}` }))
            .sort((a, b) => a.value - b.value);
    }, [categoryProducts]);

    const flavorOptions = useMemo(() => {
        const map = new Map();

        for (const p of categoryProducts) {
            const arr = Array.isArray(p?.flavors) ? p.flavors : [];
            for (const fRaw of arr) {
                const key = normalizeFlavor(fRaw);
                if (!key) continue;

                const prev = map.get(key);
                if (prev) {
                    prev.count += 1;
                } else {
                    map.set(key, {
                        value: key,
                        label: String(fRaw).trim(),
                        count: 1,
                    });
                }
            }
        }

        return Array.from(map.values()).sort((a, b) =>
            a.label.localeCompare(b.label)
        );
    }, [categoryProducts]);

    const categoryPriceRange = useMemo(() => {
        if (categoryProducts.length === 0) return { min: 0, max: 50000 };

        const prices = categoryProducts
            .map((p) => Number(p.price) || 0)
            .filter((p) => p > 0);

        if (prices.length === 0) return { min: 0, max: 50000 };

        return { min: 0, max: Math.max(...prices) };
    }, [categoryProducts]);

    const effectivePriceRange = useMemo(() => {
        return {
            min: Number.isFinite(priceRange?.min) ? priceRange.min : categoryPriceRange.min,
            max: Number.isFinite(priceRange?.max) ? priceRange.max : categoryPriceRange.max,
        };
    }, [priceRange, categoryPriceRange.min, categoryPriceRange.max]);

    const isPriceFilterApplied = useMemo(() => {
        return (
            effectivePriceRange.min !== categoryPriceRange.min ||
            effectivePriceRange.max !== categoryPriceRange.max
        );
    }, [effectivePriceRange, categoryPriceRange.min, categoryPriceRange.max]);


    // -----------------------------
    // Filtrado
    // -----------------------------
    const filteredProducts = useMemo(() => {
        const q = String(searchTerm).toLowerCase();
        const hasBrandFilter = selectedBrands.length > 0;

        return categoryProducts.filter((product) => {
            const name = product.name?.toLowerCase() || "";
            const brandNorm = normalizeBrand(product.brand || "");

            const matchesSearch = !q || name.includes(q) || brandNorm.includes(q);

            const price = Number(product.price) || 0;
            const matchesPrice =
                price >= effectivePriceRange.min &&
                (effectivePriceRange.max === Infinity || price <= effectivePriceRange.max);

            const matchesBrand =
                !hasBrandFilter || (brandNorm && selectedBrands.includes(brandNorm));

            const matchesPuffs =
                selectedPuffs.length === 0
                    ? true
                    : (Number(product.puffs) > 0 &&
                        selectedPuffs.includes(Number(product.puffs)));

            const matchesFlavors =
                selectedFlavors.length === 0
                    ? true
                    : Array.isArray(product.flavors) &&
                    product.flavors.some((f) =>
                        selectedFlavors.includes(normalizeFlavor(f))
                    );

            return (
                matchesSearch &&
                matchesPrice &&
                matchesBrand &&
                matchesPuffs &&
                matchesFlavors
            );
        });
    }, [
        categoryProducts,
        searchTerm,
        priceRange,
        selectedBrands,
        selectedPuffs,
        selectedFlavors,
    ]);

    // -----------------------------
    // Ordenamiento
    // -----------------------------
    const sortedProducts = useMemo(() => {
        const sorted = [...filteredProducts];

        if (sortOrder === "price-asc") {
            sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        } else if (sortOrder === "price-desc") {
            sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        }

        return sorted;
    }, [filteredProducts, sortOrder]);

    // -----------------------------
    // Paginación
    // -----------------------------
    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedProducts.slice(start, start + itemsPerPage);
    }, [sortedProducts, currentPage, itemsPerPage]);

    // Reset a página 1 cuando cambian filtros/orden/items
    // Reset a página 1 cuando cambian filtros/orden/items
    useEffect(() => {
        if (skipNextPageResetRef.current) {
            skipNextPageResetRef.current = false;
            return;
        }

        // Si venimos de detalle, primero restauramos producto/página antes de resetear.
        const lastId = sessionStorage.getItem("lastProductId");
        if (lastId) return;

        setCurrentPage(1);
    }, [
        searchTerm,
        priceRange,
        selectedBrands,
        selectedPuffs,
        selectedFlavors,
        sortOrder,
        itemsPerPage,
    ]);


    const handlePageChange = (pageNum) => {
        setCurrentPage(pageNum);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // -----------------------------
    // Restaurar scroll (mantengo tu lógica actual con delay)
    // -----------------------------


    // -----------------------------
    // Guardar estado (con debounce)
    // -----------------------------
    useEffect(() => {
        if (isInitialMount.current) return;

        const timeoutId = setTimeout(() => {
            const pr = {
                min: Number.isFinite(priceRange?.min) ? priceRange.min : 0,
                max: Number.isFinite(priceRange?.max) ? priceRange.max : null,
            };

            writeGridState(storageKey, {
                searchTerm,
                priceRange: pr,
                selectedBrands,
                selectedPuffs,
                selectedFlavors,
                itemsPerPage,
                currentPage,
                sortOrder,

            });
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [
        storageKey,
        searchTerm,
        priceRange,
        selectedBrands,
        selectedPuffs,
        selectedFlavors,
        itemsPerPage,
        currentPage,
        sortOrder,
    ]);



    // -----------------------------
    // Quick add (mantengo lógica)
    // -----------------------------
    const handleQuickAdd = (product) => {
        const hasFlavors =
            Array.isArray(product?.flavors) && product.flavors.length > 0;

        if (hasFlavors) {
            setModalOpen(true);
            return;
        }

        if (actions?.addToCart) {
            actions.addToCart({ productId: product.id, qty: 1, flavor: null });
        } else {
            console.warn("addToCart no está definido en actions");
        }
    };

    const pageTitle = currentCategoryId
        ? SLUG_TO_NAME?.[currentSlug] || "Todos los Productos"
        : category || "Todos los Productos";

    // -----------------------------
    // Sidebar: navegar a categoría (mantengo tu lógica exacta)
    // -----------------------------
    const handleSelectCategory = (newSlug) => {
        const prevKey = `productGridState:${currentSlug || "all"}`;
        const saved = JSON.parse(sessionStorage.getItem(prevKey) || "{}");
        sessionStorage.setItem(prevKey, JSON.stringify({ ...saved, scrollY: 0 }));
        window.scrollTo({ top: 0, behavior: "instant" });
    };

    useLayoutEffect(() => {
        if (gridRestoredRef.current) return;

        const lastIdRaw = sessionStorage.getItem("lastProductId");
        if (!lastIdRaw) return;

        const lastId = Number(lastIdRaw);
        if (!Number.isFinite(lastId)) {
            sessionStorage.removeItem("lastProductId");
            gridRestoredRef.current = true;
            return;
        }

        // Esperamos a tener el listado completo para saber en qué página está.
        if (sortedProducts.length === 0) return;

        const targetIndex = sortedProducts.findIndex(
            (p) => Number(p.id) === lastId
        );

        if (targetIndex === -1) {
            // Si ya no existe por filtros/categoría, limpiamos y salimos.
            sessionStorage.removeItem("lastProductId");
            gridRestoredRef.current = true;
            return;
        }

        const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;

        // Si no estamos en la página correcta, la seteamos y esperamos próximo render.
        if (targetPage !== currentPage) {
            setCurrentPage(targetPage);
            return;
        }

        // Ya en la página correcta: hacemos scroll al producto.
        const el = document.querySelector(`[data-product-id="${lastId}"]`);
        if (!el) return;

        el.scrollIntoView({
            block: "center",
            behavior: "instant"
        });

        sessionStorage.removeItem("lastProductId");
        gridRestoredRef.current = true;
    }, [sortedProducts, paginatedProducts, currentPage, itemsPerPage]);


    useEffect(() => {
        gridRestoredRef.current = false;
    }, [slug, currentPage, itemsPerPage]);
    // -----------------------------
    // Render
    // -----------------------------
    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Breadcrumb */}
            {!hideFilters && (
                <nav
                    className="flex items-center text-sm text-gray-600 mb-4"
                    aria-label="Breadcrumb"
                >
                    <Link to="/" className="hover:text-purple-600 transition-colors">
                        Inicio
                    </Link>

                    {currentCategoryId && (
                        <>
                            <ChevronRight size={16} className="mx-2" />
                            <span className="text-gray-900 font-medium">{pageTitle}</span>
                        </>
                    )}
                </nav>
            )}

            {/* Header (lo dejé vacío como lo tenías) */}
            <div className="mb-4 sm:mb-6"></div>

            <div className={hideFilters ? "w-full" : "md:flex md:items-start md:gap-6"}>
                {/* Sidebar */}
                {!hideFilters && (
                    <SidebarFiltersNuevo
                        className="md:shrink-0 md:sticky md:top-4 md:self-start"
                        currentCategorySlug={currentSlug}
                        onSelectCategory={handleSelectCategory}
                        priceMin={categoryPriceRange.min}
                        priceMax={categoryPriceRange.max}
                        brandOptions={brandOptions}
                        selectedBrands={selectedBrands}
                        onToggleBrand={(key) =>
                            setSelectedBrands((prev) =>
                                prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]
                            )
                        }
                        onClearBrands={() => setSelectedBrands([])}
                        puffsOptions={puffsOptions}
                        selectedPuffs={selectedPuffs}
                        onTogglePuffs={(v) =>
                            setSelectedPuffs((prev) =>
                                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                            )
                        }
                        onClearPuffs={() => setSelectedPuffs([])}
                        flavorOptions={flavorOptions}
                        selectedFlavors={selectedFlavors}
                        onToggleFlavor={(v) =>
                            setSelectedFlavors((prev) =>
                                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                            )
                        }
                        onClearFlavors={() => setSelectedFlavors([])}
                        price={isPriceFilterApplied ? effectivePriceRange : null}
                        onChangePrice={(newRange) => {
                            if (!newRange) {
                                setPriceRange({ min: categoryPriceRange.min, max: Infinity });
                                return;
                            }

                            setPriceRange({
                                min: Number(newRange.min) || categoryPriceRange.min,
                                max: Number.isFinite(Number(newRange.max))
                                    ? Number(newRange.max)
                                    : Infinity,
                            });
                        }}

                    />
                )}

                {/* Contenido */}
                <div className={hideFilters ? "w-full" : "flex-1"}>
                    {/* Barra de búsqueda y controles */}
                    {!hideFilters && (
                        <div className="mb-4 space-y-3">
                            <input
                                type="text"
                                placeholder="Buscar productos en esta categoría..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 sm:px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                                style={{ border: "1px solid #9ca5b5ff" }}
                            />

                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                                {/* Items por página */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-700 font-bold">Mostrar:</span>
                                    <div className="flex gap-1">
                                        {[8, 12, 16, 24].map((num) => (
                                            <button
                                                key={num}
                                                onClick={() => setItemsPerPage(num)}
                                                className={`px-2 py-1 text-sm rounded transition-colors ${itemsPerPage === num
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }`}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Ordenamiento */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-700 font-bold">Ordenar:</span>
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="default">Predeterminado</option>
                                        <option value="price-asc">Precio: Bajo a Alto</option>
                                        <option value="price-desc">Precio: Alto a Bajo</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading / Grid */}
                    {store.loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            <p className="mt-2 text-gray-600">Cargando productos...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:gap-6">
                                {paginatedProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        data-product-id={product.id}
                                        className="transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl rounded-xl"
                                    >
                                        <ProductCardPerfumes
                                            product={product}
                                            onQuickAdd={() => handleQuickAdd(product)}

                                            returnTo={`${location.pathname}?page=${currentPage}`}
                                            isGrid={true}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Paginación */}
                            {totalPages > 1 && (
                                <div className="mt-8 flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                        aria-label="Página anterior"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>

                                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                        let pageNum;

                                        if (totalPages <= 7) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 4) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 3) {
                                            pageNum = totalPages - 6 + i;
                                        } else {
                                            pageNum = currentPage - 3 + i;
                                        }

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`min-w-[40px] h-10 rounded-lg font-medium transition-all ${currentPage === pageNum
                                                    ? "bg-purple-600 text-white shadow-md scale-105"
                                                    : "bg-white border border-gray-300 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                        aria-label="Página siguiente"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    <Modal
                        open={modalOpen}
                        onClose={() => setModalOpen(false)}
                        title="Seleccioná un sabor"
                        body="Antes de agregar este producto al carrito, elegí al menos un sabor."
                        confirmText="Entendido"
                    />

                    {sortedProducts.length === 0 && !store.loading && (
                        <div className="text-center py-12">
                            <p className="text-gray-600">
                                No se encontraron productos que coincidan con tu búsqueda.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}