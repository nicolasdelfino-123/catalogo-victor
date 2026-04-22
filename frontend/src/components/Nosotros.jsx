import { useEffect } from "react";

export default function Nosotros() {
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, []);
    return (
        <section className="min-h-screen bg-[#0B0608] text-white px-6 pt-8 pb-20 flex items-center justify-center">
            <div className="max-w-4xl text-center">

                <h1 className="text-3xl md:text-5xl font-serif tracking-wide mb-10">
                    Quiénes somos
                </h1>

                <div className="space-y-6 text-gray-300 text-lg md:text-xl leading-relaxed">

                    <p>
                        En VJ Parfum&Decants somos apasionados por el mundo de las fragancias y creemos que cada perfume cuenta una historia distinta.
                    </p>

                    <p>
                        Nacimos con una idea clara: hacer que el universo de la perfumería —desde grandes diseñadores hasta exclusivas fragancias nicho— sea más accesible, cercano y real para todos.
                    </p>

                    <p>
                        Sabemos que elegir un perfume no es solo comprar un aroma. Es encontrar una esencia que te represente, que acompañe tus momentos y que deje huella.
                    </p>

                    <p>
                        Por eso trabajamos con decants: formatos prácticos que te permiten probar, descubrir y experimentar sin límites.
                    </p>

                    <p>
                        Seleccionamos cada fragancia con criterio, asegurando siempre productos 100% originales, para que vivas la experiencia del perfume como debe ser: auténtica.
                    </p>

                    <p>
                        Nos enfocamos en quienes disfrutan cambiar, explorar y construir su propia colección, sin reglas y sin quedarse con una sola opción.
                    </p>

                </div>

                <p className="mt-10 text-xl md:text-2xl font-serif text-amber-300">
                    En VJ no solo vendemos perfumes. <br />
                    <span className="text-white">Te ayudamos a encontrar el tuyo.</span>
                </p>

            </div>
        </section>
    );
}