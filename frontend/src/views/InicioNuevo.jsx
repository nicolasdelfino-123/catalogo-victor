import React, { useContext, useEffect } from "react";
import { Context } from "../js/store/appContext.jsx";
import ProductCardPerfumes from "../components/ui/cards/ProductCardPerfumes.jsx";
import HomeContact from "../components/home/HomeContact.jsx";

export default function InicioNuevo() {
    const { store, actions } = useContext(Context);

    useEffect(() => {
        if (actions?.fetchProducts) {
            actions.fetchProducts();
        }
    }, []);

    const ADDRESS = "Vélez Sarsfield 303, Las Varillas, Córdoba";
    const HOURS = "Lunes a Sábado 8:00–12:00 / 17:00–20:15";
    const IG_URL = "https://www.instagram.com/zarpados.vap/";
    const WA_URL = `https://wa.me/5493533497041?text=${encodeURIComponent(
        "Hola, quiero consultar por un perfume del catálogo"
    )}`;

    const MAP_EMBED =
        "https://www.google.com/maps?q=-31.8704952,-62.7228966&z=17&hl=es&output=embed";

    return (
        <div className="min-h-screen bg-gray-50">

            {/* HERO SIMPLE */}
            <section className="bg-gray-900 text-white py-20 text-center">
                <h1 className="text-4xl md:text-6xl font-bold mb-4">
                    Perfumes Árabes
                </h1>
                <p className="text-lg text-gray-300">
                    Catálogo actualizado • Pedidos por WhatsApp
                </p>
            </section>

            {/* PRODUCTOS */}
            <section className="max-w-7xl mx-auto px-2 sm:px-4 py-12">
                <h2 className="text-2xl font-bold text-center mb-8">
                    Productos destacados
                </h2>

                {store.loading ? (
                    <p className="text-center">Cargando...</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-6">
                        {(store.products || []).slice(0, 12).map(product => (
                            <ProductCardPerfumes key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </section>
            <HomeContact
                address={ADDRESS}
                hours={HOURS}
                igUrl={IG_URL}
                waUrl={WA_URL}
                mapEmbed={MAP_EMBED}
            />

        </div>
    );
}