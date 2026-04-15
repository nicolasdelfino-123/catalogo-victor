import { useState, useEffect, useContext, useMemo, useRef } from "react"
import { useParams, useNavigate, Link, useLocation } from "react-router-dom"
import { Context } from "../js/store/appContext"
import ProductCard from "./ProductCard.jsx"
import SidebarFilters from "./SidebarFilters"
import Modal from "./Modal.jsx"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { isBestSellerProduct } from "../utils/bestSellers.js";
import { withWholesale } from "../utils/navigation";
import { SLUG_TO_ID, SLUG_TO_NAME } from "../utils/perfumeCategories.js";


// --- Persistencia ligera en sessionStorage ---
const GRID_STATE_KEY = "productGridState";

const readGridState = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const writeGridState = (key, state) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch { }
};

const normalizeBrand = (b = "") =>
  String(b).trim().replace(/\s+/g, " ").toLowerCase()

const normalizeFlavor = (s = "") =>
  String(s).trim().replace(/\s+/g, " ").toLowerCase()

//este componente se encarga de mostrar los productos en una cuadrícula
// y permite filtrar, ordenar y paginar los productos

export default function ProductGrid({ category, hideFilters = false }) {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { store, actions } = useContext(Context)

  const [priceRange, setPriceRange] = useState({ min: 0, max: Infinity })
  const [selectedBrands, setSelectedBrands] = useState([])
  const [selectedPuffs, setSelectedPuffs] = useState([])
  const [selectedFlavors, setSelectedFlavors] = useState([])
  const [modalOpen, setModalOpen] = useState(false)

  // Nuevos estados para paginación y ordenamiento
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState("default") // "default" | "price-asc" | "price-desc"

  const storageKey = useMemo(
    () => `${GRID_STATE_KEY}:${slug || "all"}`,
    [slug]
  );

  const restoredRef = useRef(false);
  const isInitialMount = useRef(true);

  const currentSlug = slug;
  const currentCategoryId = currentSlug ? SLUG_TO_ID[currentSlug] : null;
  const searchTerm = store.productSearch || "";
  const setSearchTerm = (val) => actions.searchProducts(val);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (actions?.fetchProducts) actions.fetchProducts()
  }, [])

  const location = useLocation();

  useEffect(() => {
    if (location.state?.fromFooter) {
      // Espera a que React renderice el nuevo contenido
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 50);

      // Limpia el state del historial para evitar repeticiones
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Restaurar filtros guardados
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
    }
    isInitialMount.current = false;
  }, [storageKey]);

  // Reset al cambiar de categoría
  useEffect(() => {
    if (isInitialMount.current || restoredRef.current) {
      if (restoredRef.current) {
        restoredRef.current = false;
      }
      return;
    }

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

  const categoryProducts = useMemo(() => {
    const products = store.products || [];
    if (currentSlug === "mas-vendidos") return products.filter((p) => isBestSellerProduct(p));
    if (hideFilters && !currentCategoryId) return products.slice(0, 12);
    if (!currentCategoryId) return products;
    return products.filter(p => Number(p.category_id) === Number(currentCategoryId));
  }, [store.products, currentCategoryId, slug, category, hideFilters]);

  const brandOptions = useMemo(() => {
    const counter = new Map()
    for (const p of categoryProducts) {
      if (!p?.brand) continue
      const key = normalizeBrand(p.brand)
      if (!key) continue
      counter.set(key, (counter.get(key) || 0) + 1)
    }
    return Array.from(counter.entries())
      .map(([key, count]) => ({ key, count, label: key.toUpperCase() }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [categoryProducts])

  const puffsOptions = useMemo(() => {
    const counter = new Map()
    for (const p of categoryProducts) {
      const v = Number(p?.puffs)
      if (!Number.isFinite(v) || v <= 0) continue
      counter.set(v, (counter.get(v) || 0) + 1)
    }
    return Array.from(counter.entries())
      .map(([value, count]) => ({ value, count, label: `${value}` }))
      .sort((a, b) => a.value - b.value)
  }, [categoryProducts])

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
          map.set(key, { value: key, label: String(fRaw).trim(), count: 1 });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryProducts]);

  const categoryPriceRange = useMemo(() => {
    if (categoryProducts.length === 0) return { min: 0, max: 50000 }
    const prices = categoryProducts.map(p => Number(p.price) || 0).filter(p => p > 0)
    if (prices.length === 0) return { min: 0, max: 50000 }
    return { min: 0, max: Math.max(...prices) }
  }, [categoryProducts])

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase()
    const hasBrandFilter = selectedBrands.length > 0

    return categoryProducts.filter(product => {
      const name = product.name?.toLowerCase() || ""
      const brandNorm = normalizeBrand(product.brand || "")

      const matchesSearch = !q || name.includes(q) || brandNorm.includes(q)
      const price = Number(product.price) || 0
      const matchesPrice =
        price >= priceRange.min &&
        (priceRange.max === Infinity || price <= priceRange.max)

      const matchesBrand = !hasBrandFilter || (brandNorm && selectedBrands.includes(brandNorm))
      const matchesPuffs = selectedPuffs.length === 0
        ? true
        : (Number(product.puffs) > 0 && selectedPuffs.includes(Number(product.puffs)))

      const matchesFlavors =
        selectedFlavors.length === 0
          ? true
          : (Array.isArray(product.flavors) &&
            product.flavors.some(f => selectedFlavors.includes(normalizeFlavor(f))));

      return matchesSearch && matchesPrice && matchesBrand && matchesPuffs && matchesFlavors
    })
  }, [categoryProducts, searchTerm, priceRange, selectedBrands, selectedPuffs, selectedFlavors]);

  // Ordenamiento
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    if (sortOrder === "price-asc") {
      sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortOrder === "price-desc") {
      sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }
    return sorted;
  }, [filteredProducts, sortOrder]);

  // Paginación
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedProducts.slice(start, start + itemsPerPage);
  }, [sortedProducts, currentPage, itemsPerPage]);

  // Restaurar scroll
  // Restaurar scroll con pequeño delay (más preciso)
  useEffect(() => {
    const saved = readGridState(storageKey);
    const y = saved?.scrollY ?? 0;
    if (y > 0) {
      setTimeout(() => {
        window.scrollTo({ top: y, behavior: "instant" });
      }, 250); // espera a que el DOM y las imágenes se acomoden
    }
  }, [storageKey, paginatedProducts.length]);

  // Guardar estado
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
        scrollY: window.scrollY,
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [storageKey, searchTerm, priceRange, selectedBrands, selectedPuffs, selectedFlavors, itemsPerPage, currentPage, sortOrder]);

  // Guardar scroll periódicamente
  useEffect(() => {
    const handleScroll = () => {
      if (isInitialMount.current) return;

      const saved = readGridState(storageKey);
      if (saved) {
        writeGridState(storageKey, {
          ...saved,
          scrollY: window.scrollY,
        });
      }
    };

    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [storageKey]);

  const handleQuickAdd = (product) => {
    const hasFlavors = Array.isArray(product?.flavors) && product.flavors.length > 0

    if (hasFlavors) {
      setModalOpen(true)
      return
    }

    if (actions?.addToCart) {
      actions.addToCart({ productId: product.id, qty: 1, flavor: null })
    } else {
      console.warn("addToCart no está definido en actions")
    }
  }

  const pageTitle = currentCategoryId
    ? (SLUG_TO_NAME?.[currentSlug] || "Todos los Productos")
    : (category || "Todos los Productos");

  // Reset a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priceRange, selectedBrands, selectedPuffs, selectedFlavors, sortOrder, itemsPerPage]);

  // Scroll suave hacia arriba al cambiar de página
  const handlePageChange = (pageNum) => {
    setCurrentPage(pageNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Breadcrumb */}
      {!hideFilters && (
        <nav className="flex items-center text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-purple-600 transition-colors">Inicio</Link>
          {currentCategoryId && (
            <>
              <ChevronRight size={16} className="mx-2" />
              <span className="text-gray-900 font-medium">{pageTitle}</span>
            </>
          )}
        </nav>
      )}

      {/* Header */}
      <div className="mb-4 sm:mb-6">


      </div>

      <div className={hideFilters ? "w-full" : "md:flex md:items-start md:gap-6"}>
        {/* Sidebar */}
        {!hideFilters && (
          <SidebarFilters
            className="md:shrink-0 md:sticky md:top-4 md:self-start"
            currentCategorySlug={currentSlug}
            onSelectCategory={(newSlug) => {
              // Limpia el scroll guardado de la categoría anterior
              const prevKey = `productGridState:${currentSlug || "all"}`;
              const saved = JSON.parse(sessionStorage.getItem(prevKey) || "{}");
              sessionStorage.setItem(prevKey, JSON.stringify({ ...saved, scrollY: 0 }));

              // Navega a la nueva categoría
              navigate(withWholesale(`/categoria/${newSlug}`))



              // Scroll inmediato + otro después del render
              window.scrollTo({ top: 0, behavior: "instant" });
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: "instant" });
              }, 150);
            }}

            priceMin={categoryPriceRange.min}
            priceMax={categoryPriceRange.max}
            brandOptions={brandOptions}
            selectedBrands={selectedBrands}
            onToggleBrand={(key) => setSelectedBrands(prev => prev.includes(key) ? prev.filter(b => b !== key) : [...prev, key])}
            onClearBrands={() => setSelectedBrands([])}
            puffsOptions={puffsOptions}
            selectedPuffs={selectedPuffs}
            onTogglePuffs={(v) => setSelectedPuffs(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
            onClearPuffs={() => setSelectedPuffs([])}
            flavorOptions={flavorOptions}
            selectedFlavors={selectedFlavors}
            onToggleFlavor={(v) => setSelectedFlavors(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
            onClearFlavors={() => setSelectedFlavors([])}
            price={priceRange}
            onChangePrice={(newRange) =>
              setPriceRange({
                min: Number(newRange.min) || 0,
                max: Number(newRange.max) || Infinity
              })
            }
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

              {/* Controles: Items por página y Ordenamiento */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                {/* Items por página */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-bold">Mostrar:</span>
                  <div className="flex gap-1">
                    {[8, 12, 16, 24].map(num => (
                      <button
                        key={num}
                        onClick={() => setItemsPerPage(num)}
                        className={`px-2 py-1 text-sm rounded transition-colors ${itemsPerPage === num
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    className="transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl rounded-xl"
                  >
                    <ProductCard
                      product={product}
                      onQuickAdd={() => handleQuickAdd(product)}
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
                          ? 'bg-purple-600 text-white shadow-md scale-105'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
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
              <p className="text-gray-600">No se encontraron productos que coincidan con tu búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
