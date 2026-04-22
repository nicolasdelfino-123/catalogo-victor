import { useEffect } from "react";

export default function QueEsDecant() {
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, []);
    return (
        <section className="
  md:min-h-screen
  bg-[#0B0608] 
  text-white 
  px-6 
  pt-10 md:pt-20 
  pb-20
  flex 
  items-start md:items-center 
  justify-center
">
            <div className="max-w-3xl text-center">

                <h1 className="text-3xl md:text-5xl font-serif tracking-wide mb-8">
                    ¿Qué es un decant?
                </h1>

                <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-6">
                    Un decant es una porción de perfume 100% original en formato pequeño, práctico y accesible, que te permite descubrir nuevas fragancias sin comprar el frasco completo.
                </p>

                <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-6">
                    En VJ Parfum&Decants transformamos la forma de vivir el perfume: explorá, probá y elegí sin límites.
                </p>

                <p className="text-xl md:text-2xl font-serif text-amber-300 mt-10">
                    No es solo perfume. Es identidad. Es presencia. <br />
                    <span className="text-white">Es LUJO al alcance de TODOS.</span>
                </p>

            </div>
        </section>
    );
}