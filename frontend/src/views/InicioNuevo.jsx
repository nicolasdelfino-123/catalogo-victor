import React, { useContext, useEffect, useLayoutEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Context } from "../js/store/appContext.jsx";
import ProductCardPerfumes from "../components/ui/cards/ProductCardPerfumes.jsx";
import HomeContact from "../components/home/HomeContact.jsx";
import banner from "../assets/banner_shatha.png";
import Asesoria from "../components/Asesoria.jsx";


export default function InicioNuevo() {
    const { store, actions } = useContext(Context);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (actions?.fetchProducts) {
            actions.fetchProducts();
        }
    }, []);

    const ADDRESS = "Vélez Sarsfield 303, Las Varillas, Córdoba";
    const HOURS = "Lunes a Sábado 8:00–12:00 / 17:00–20:15";
    const IG_URL = "https://www.instagram.com/shatha_oriental/";
    const WA_URL = `https://wa.me/5493533459552?text=${encodeURIComponent(
        "Hola, quiero consultar por un perfume del catálogo"
    )}`;

    const MAP_EMBED =
        "https://www.google.com/maps?q=-31.8704952,-62.7228966&z=17&hl=es&output=embed";


    useLayoutEffect(() => {
        const lastId = sessionStorage.getItem("lastProductId");
        if (!lastId) return;

        const el = document.querySelector(`[data-product-id="${lastId}"]`);
        if (!el) return;

        el.scrollIntoView({ block: "center" });

        // opcional: limpiar para que no te re-scrollee en futuras entradas
        sessionStorage.removeItem("lastProductId");
    }, []);



    useEffect(() => {
        if (location.state?.scrollTo === "contacto") {
            const el = document.getElementById("asesoria");
            if (!el) return;
            const headerH = document.querySelector("header")?.offsetHeight || 80;
            const y = el.getBoundingClientRect().top + window.pageYOffset - headerH - 8;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
    }, [location.state]);
    return (
        <div className="min-h-screen bg-gray-50">


            {/* HERO PREMIUM CON IMAGEN IMPORTADA */}
            <section className="relative h-[400px] sm:h-[420px] md:h-[75vh] flex items-center justify-center text-center overflow-hidden">

                {/* Fondo con tu imagen */}
                <div
                    className="absolute inset-0 bg-cover bg-[center_top_-5px] sm:bg-center animate-zoomSlow brightness-110 saturate-110"
                    style={{ backgroundImage: `url(${banner})` }}
                />

                {/* Overlay oscuro elegante */}

                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/0 to-black/40" />

                {/* Contenido */}
                <div className="relative z-10 px-6 max-w-3xl mt-[190px] sm:mt-[180px] md:mt-[350px]">
                    <h1 className="text-2xl md:text-5xl font-serif font-semibold text-white mb-4 tracking-wide">
                        Fragancias Árabes
                    </h1>

                    <p className="text-sm md:text-xl font-serif text-gray-200 mb-6 tracking-wide">
                        Aromas intensos • Elegancia sofisticada • Exclusividad
                    </p>

                    {/* <a
                        href={WA_URL}
                        className="inline-block px-8 py-3 bg-[#232325] text-white rounded-lg font-medium tracking-wide hover:bg-black transition-colors"
                    >
                        Solicitar Asesoría
                    </a> */}
                </div>

            </section>

            {/* PRODUCTOS */}
            <section className="max-w-7xl mx-auto px-2 sm:px-4 py-12">
                <div className="text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-serif font-semibold tracking-wide">
                        Productos destacados
                    </h2>

                    <div className="w-16 h-[2px] bg-amber-500 mx-auto mt-4"></div>
                </div>

                {store.loading ? (
                    <p className="text-center">Cargando...</p>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
                        {(store.products || []).slice(0, 12).map((product) => (
                            <div
                                key={product.id}
                                data-product-id={product.id}
                                className="transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl rounded-xl"
                            >
                                <ProductCardPerfumes product={product} returnTo={location.pathname} isGrid={false} />
                            </div>
                        ))}
                    </div>
                )}
            </section>
            <div className="flex justify-center mt-0 mb-12 lg:px-12 lg:py-12">
                <div
                    onClick={() => navigate(location.pathname.startsWith("/mayorista") ? "/mayorista/products" : "/products")}
                    className="
cursor-pointer
px-8 py-3
font-serif
tracking-wide
text-sm
uppercase
rounded-lg
text-black
bg-[linear-gradient(110deg,#fbbf24,#f59e0b,#fbbf24)]
bg-[length:200%_100%]
bg-left
hover:bg-right
transition-all duration-500
shadow-lg shadow-amber-500/20
"
                >
                    Explorar todas las categorías
                </div>
            </div>
            <section id="asesoria">
                <Asesoria />
            </section>



        </div>
    );
}