import { useState, useContext, useEffect, useRef } from "react";
import { Context } from "../js/store/appContext.jsx";
import Cart from "../components/Cart.jsx";
import AccountDropdown from "../components/AccountDropdown.jsx";
import { Link, useNavigate, useLocation } from "react-router-dom";
/* import logo from '@/assets/logo.png'
import logo22 from '@/assets/logo-22.png' */
import zarpados from '@/assets/zarpados-22.png'
import { withWholesale } from "../utils/navigation.js";



export default function Header() {
  const { store, actions } = useContext(Context);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchBoxRef = useRef(null);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchTerm, setMobileSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);



  // Referencias para el dropdown
  const productsDropdownRef = useRef(null);

  // shrink + mostrar/ocultar
  const [isScrolled, setIsScrolled] = useState(false);
  const [show, setShow] = useState(true);
  const lastY = useRef(0);
  const downScrolls = useRef(0);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef(null);

  // ⚙️ Ajustes rápidos de tamaño (en px)
  const LOGO_BASE_H = 220;    // Altura normal del logo
  const LOGO_SCROLL_H = 195;  // Altura cuando se hace scroll (más pequeño)
  const LOGO_W = "auto";
  const USE_WHITE_KILLER = false;

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productsDropdownRef.current && !productsDropdownRef.current.contains(event.target)) {
        setProductsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 10);

      const SCROLLS_TO_HIDE = 3;
      const SCROLL_END_DELAY = 150;

      const goingDown = y > lastY.current;
      const goingUp = y < lastY.current;

      if (goingDown && y > 10) {
        if (!isScrolling.current) {
          downScrolls.current += 1;
          if (downScrolls.current >= SCROLLS_TO_HIDE) setShow(false);
        }
        isScrolling.current = true;
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
          isScrolling.current = false;
        }, SCROLL_END_DELAY);
      } else if (goingUp || y < 10) {
        downScrolls.current = 0;
        setShow(true);
        isScrolling.current = false;
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      }

      lastY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  // Cerrar y limpiar búsqueda cuando cambia la ruta
  useEffect(() => {
    setMobileSearchOpen(false);
    setMobileSearchTerm("");
    setSearchResults([]);
  }, [location.pathname]);

  // Cerrar si clickean fuera del cuadro de búsqueda / resultados
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileSearchOpen && searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setMobileSearchOpen(false);
        setMobileSearchTerm("");
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileSearchOpen]);


  const cartItemsCount = (store.cart || []).reduce((t, i) => t + (i.quantity || 0), 0);

  // Categorías para el dropdown (coinciden con las del backend)
  const productCategories = [
    { name: "Pods Descartables", route: "/categoria/vapes-desechables", icon: "💨" },
    { name: "Líquidos", route: "/categoria/liquidos", icon: "🧪" },
    { name: "Perfumes", route: "/categoria/perfumes", icon: "🌹" },
    { name: "Pods Recargables", route: "/categoria/pods-recargables", icon: "♻️" },
    { name: "Resistencias", route: "/categoria/resistencias", icon: "⚡" },
    //{ name: "Celulares", route: "/categoria/celulares", icon: "📱" },
  ];

  const goToContact = (e) => {
    e.preventDefault();

    const doScroll = () => {
      const el = document.getElementById("contacto");
      if (!el) return;
      // Altura del header sticky (medimos por si cambia)
      const headerH = document.querySelector("header")?.offsetHeight || 80;
      const y = el.getBoundingClientRect().top + window.pageYOffset - headerH - 8; // un pelín más arriba
      window.scrollTo({ top: y, behavior: "smooth" });
    };

    if (window.location.pathname !== "/inicio") {
      // navegamos al inicio y, tras montar, scrolleamos
      navigate("/inicio", { state: { scrollTo: "contacto" } });
    } else {
      doScroll();
    }

    setIsMenuOpen(false); // cerrar menú móvil si estaba abierto
  };

  // Evita recargar el header entero en navegación
  useEffect(() => {
    // Esto asegura que React Router no fuerce un re-render del header al cambiar de ruta
    const header = document.querySelector("header img");
    if (header) {
      header.setAttribute("fetchpriority", "high");
      header.decoding = "sync";
    }
  }, []);



  return (
    <header
      className={[
        "sticky top-0 z-50 bg-gray-900/90 backdrop-blur overflow-visible",
        "transition-all duration-300",
        isScrolled ? "shadow-lg" : "shadow-none",
        show ? "translate-y-0" : "-translate-y-full"
      ].join(" ")}
    >

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={["flex justify-between items-center", isScrolled ? "h-14 py-1" : "h-16 py-3"].join(" ")}>

          {/* Mobile hamburger menu - left */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Abrir menú"
              className="bg-transparent border-0 p-0 m-0"
              style={{ backgroundColor: 'transparent' }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Logo */}
          {/*   <div className="flex-shrink-0 md:mr-auto">
            <Link to={withWholesale("/inicio")}
              aria-label="Ir al inicio" className="block">
              <img
                src={zarpados}
                alt="Zarpados"
                className="block w-auto select-none transition-transform duration-300"
                style={{
                  height: isScrolled ? `${LOGO_SCROLL_H}px` : `${LOGO_BASE_H}px`,
                  width: LOGO_W,
                  objectFit: "contain",
                  maxWidth: "300px",
                  transform: isScrolled ? "scale(0.94)" : "scale(1)",
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                  translate: "0",
                  background: "transparent",
                }}
                decoding="sync"
                loading="eager"
                fetchPriority="high"
              />

            </Link>
          </div> */}

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex space-x-8">
            <Link to={withWholesale("/inicio")} className="hover:text-purple-400 transition-colors text-gray-300">Inicio</Link>


            {/* Dropdown de Productos */}
            <div className="relative" ref={productsDropdownRef}>
              <button
                onClick={() => setProductsDropdownOpen(!productsDropdownOpen)}
                className="flex items-center text-gray-300 hover:text-purple-400 bg-transparent p-0 border-0 rounded-none appearance-none focus:outline-none focus:ring-0 hover:bg-transparent active:bg-transparent"
                style={{ backgroundColor: 'transparent', boxShadow: 'none' }}
              >

                Productos
                <svg
                  className={`ml-1 w-4 h-4 transition-transform ${productsDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {productsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">

                  <div className="py-2">
                    <Link
                      to={withWholesale("/products")}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium border-b border-gray-100"
                      onClick={() => setProductsDropdownOpen(false)}
                    >
                      Ver todos los productos
                    </Link>
                    {productCategories.map((category) => (
                      <Link
                        key={category.route}
                        to={withWholesale(category.route)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        onClick={() => setProductsDropdownOpen(false)}
                      >
                        <span className="mr-3">{category.icon}</span>
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/mayorista"
              className="hover:text-purple-400 transition-colors text-gray-300"
            >
              Mayoristas
            </Link>
            <a
              href="/inicio#contacto"
              onClick={goToContact}
              className="hover:text-purple-400 transition-colors text-gray-300"
            >
              Contacto
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4 text-white ml-8">
            <AccountDropdown />
            {/* Lupa Desktop */}

            <button
              type="button"
              onClick={() => setMobileSearchOpen(v => !v)}   // <-- CAMBIO: antes tenías navigate("/busqueda")
              className="hover:text-purple-400 transition-colors bg-transparent border-0 p-0"
              aria-label="Buscar productos"
              title="Buscar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>


            {/* Carrito Desktop */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative hover:text-purple-400 transition-colors bg-transparent border-0 p-0"
              aria-label="Abrir carrito"
              title="Carrito"
            >
              <svg className={["w-6 h-6", isScrolled ? "scale-95" : "scale-100", "transition-transform"].join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9" />
              </svg>
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile cart - right */}
          <div className="md:hidden">
            {/* Mobile Search Icon (solo móvil) */}
            {/* Mobile Search Box */}

            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="relative hover:text-purple-400 transition-colors bg-transparent border-0 p-0 text-white mr-4 md:hidden"
              aria-label="Buscar productos"
              title="Buscar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative hover:text-purple-400 transition-colors bg-transparent border-0 p-0 text-white"
              aria-label="Abrir carrito"
              title="Carrito"
            >
              <svg className={["w-6 h-6", isScrolled ? "scale-95" : "scale-100", "transition-transform"].join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9" />
              </svg>
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Search Box (desktop + mobile) */}
        {mobileSearchOpen && (
          <div className="bg-gray-1000 p-3 z-50">
            <div className="flex justify-end px-4 sm:px-6 lg:px-8">
              <div className="relative w-full max-w-md" ref={searchBoxRef}>
                <div className="flex">
                  <input
                    type="text"
                    value={mobileSearchTerm}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setMobileSearchTerm(val);
                      if (!store.products || store.products.length === 0) {
                        await actions.fetchProducts();
                      }
                      setSearchResults(actions.searchProductsQuick(val));
                    }}
                    placeholder="Buscar productos..."
                    className="w-full max-w-md p-2 pr-9 rounded-md text-black focus:outline-none"
                    autoFocus
                  />

                  {/* Botón X (limpiar/cerrar) */}
                  {mobileSearchOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileSearchTerm("");
                        setSearchResults([]);
                        setMobileSearchOpen(false);
                      }}
                      aria-label="Cerrar búsqueda"
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                      title="Cerrar"
                    >
                      ✕
                    </button>
                  )}
                </div>


                {/* 👇 Caja de resultados: Pegar aquí, dentro del max-w-7xl */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full w-full mt-1 max-w-md bg-white rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">

                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          const prefix = location.pathname.startsWith("/mayorista") ? "/mayorista" : "";
                          navigate(`${prefix}/product/${p.id}`);
                          setMobileSearchOpen(false);
                        }}

                        className="flex items-center p-3 hover:bg-gray-300 cursor-pointer border-b border-gray-200 last:border-b-0"
                      >
                        <img
                          src={p.image_url || "/sinImagen.jpg"}
                          alt={p.name}
                          className="w-12 h-12 object-contain rounded mr-3"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">{p.name}</div>
                          <div className="text-green-600 font-bold text-sm">
                            {location.pathname.startsWith("/mayorista")
                              ? (
                                p.price_wholesale && Number(p.price_wholesale) > 0
                                  ? `$${Number(p.price_wholesale).toLocaleString("es-AR")}`
                                  : "Consultar"
                              )
                              : `$${Number(p.price).toLocaleString("es-AR")}`
                            }
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* 👆 Fin caja de resultados */}
              </div>
            </div>
          </div>
        )}


        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute left-0 right-0 top-full bg-gray-800 shadow-lg z-50">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                to={withWholesale("/inicio")}
                className="block px-3 py-2 hover:text-purple-400 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Inicio
              </Link>

              {/* Productos en mobile */}
              <div className="px-3 py-2">
                <span className="block text-gray-200 font-medium mb-2">Productos:</span>
                <div className="ml-4 space-y-1">
                  <Link
                    to={withWholesale("/products")}
                    className="block px-3 py-1 text-sm hover:text-purple-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Ver todos
                  </Link>
                  {productCategories.map((category) => (
                    <Link
                      key={category.route}
                      to={withWholesale(category.route)}
                      className="block px-3 py-1 text-sm hover:text-purple-400 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {category.icon} {category.name}
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                to="/mayorista"
                className="block px-3 py-2 text-gray-200 hover:text-purple-400 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Mayoristas
              </Link>
              <a
                href="/inicio#contacto"
                onClick={goToContact}
                className="block px-3 py-2 hover:text-purple-400 transition-colors"
              >
                Contacto
              </a>


              {/* Mobile: Ingresar solo si NO hay usuario */}
              {store.user ? (
                <div className="border-t border-gray-700 pt-2 ">
                  <div className="px-3 py-2 text-sm text-gray-300 ">Hola, {store.user.name}</div>

                  {/* 🔹 BOTÓN ADMIN SOLO PARA ADMIN - JUSTO AQUÍ */}
                  {store.user.email === "admin@vapestore.com" && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/admin/login");   // redirige al panel admin
                      }}
                      className="block w-full text-left px-3 py-2 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Panel Admin
                    </button>
                  )}

                  <button
                    onClick={() => { actions.logoutUser(); setIsMenuOpen(false); }}
                    className="block w-full text-left px-3 py-2 hover:text-purple-400 transition-colors"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-700 pt-2">
                  <Link
                    to="/login"
                    className="block px-3 py-2 hover:text-purple-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Ingresar
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Cart isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}