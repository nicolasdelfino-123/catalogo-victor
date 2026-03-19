import { Link } from "react-router-dom";
import { useEffect } from "react";
import { withWholesale } from "../utils/navigation.js";


const FOOTER_CATEGORIES = [
    { label: "Perfumes Masculinos", slug: "perfumes-masculinos" },
    { label: "Femeninos", slug: "femeninos" },
    { label: "Unisex", slug: "unisex" },
    { label: "Cremas", slug: "cremas" },
    { label: "Body Splash Victoria Secret", slug: "body-splash-victoria-secret" },
];

export default function AvisoLegal() {

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-12">

            {/* CONTENIDO PRINCIPAL */}
            <div className="md:col-span-2">

                <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-wide text-gray-900 mb-10 border-b pb-4">
                    Aviso legal y política de privacidad
                </h1>

                <div className="space-y-5 text-gray-700 leading-relaxed font-serif tracking-wide text-base md:text-[16px]">

                    <p>
                        En <strong>Shatha Perfumes</strong> valoramos la confianza de nuestros clientes y
                        respetamos la privacidad de quienes visitan nuestro sitio web. Este documento
                        describe cómo recopilamos, utilizamos y protegemos la información proporcionada
                        a través de nuestra plataforma digital.
                    </p>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            1. Identificación del titular
                        </h2>

                        <p>
                            El presente sitio web pertenece a <strong>Shatha Perfumes</strong>, tienda
                            dedicada a la comercialización de fragancias y productos de perfumería.
                        </p>

                        <p>
                            Para consultas relacionadas con pedidos, productos o funcionamiento del sitio,
                            puede comunicarse a través del siguiente correo electrónico:
                        </p>

                        <p className="font-medium">
                            contacto: <strong>xxxx@xxxx.com</strong>
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            2. Protección de datos personales
                        </h2>

                        <p>
                            En cumplimiento de la <strong>Ley Nº 25.326 de Protección de Datos Personales
                                de la República Argentina</strong>, la información proporcionada por los usuarios
                            será tratada con estricta confidencialidad.
                        </p>

                        <p>
                            Los datos podrán utilizarse únicamente para:
                        </p>

                        <ul className="list-disc pl-5 space-y-1">
                            <li>gestión de pedidos</li>
                            <li>atención al cliente</li>
                            <li>coordinación de envíos</li>
                            <li>comunicaciones relacionadas con compras</li>
                        </ul>

                        <p>
                            Bajo ninguna circunstancia los datos personales serán vendidos o cedidos a terceros,
                            salvo obligación legal.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            3. Derechos del usuario
                        </h2>

                        <p>
                            El usuario podrá solicitar en cualquier momento el acceso, rectificación o
                            eliminación de sus datos personales enviando un correo a:
                        </p>

                        <p className="font-medium">
                            <strong>xxxx@xxxx.com</strong>
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            4. Información de productos
                        </h2>

                        <p>
                            Las imágenes, descripciones y características de los productos publicados
                            en este sitio tienen carácter informativo. Las presentaciones, precios y
                            disponibilidad pueden variar sin previo aviso.
                        </p>

                        <p>
                            Las fragancias comercializadas pertenecen a sus respectivas marcas registradas
                            y son utilizadas únicamente con fines descriptivos e informativos.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            5. Propiedad intelectual
                        </h2>

                        <p>
                            El diseño del sitio, su estructura, textos, imágenes y contenido están protegidos
                            por la legislación de propiedad intelectual vigente. Queda prohibida la reproducción
                            total o parcial sin autorización previa.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            6. Modificaciones
                        </h2>

                        <p>
                            Shatha Perfumes se reserva el derecho de actualizar o modificar este aviso legal
                            y las políticas de privacidad en cualquier momento con el objetivo de mantener
                            la información actualizada conforme a la legislación vigente.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            7. Legislación aplicable
                        </h2>

                        <p>
                            Este sitio web se rige por las leyes de la <strong>República Argentina</strong>.
                            Cualquier controversia derivada del uso del sitio será resuelta por los tribunales
                            competentes del país.
                        </p>
                    </section>

                    <p className="text-sm text-gray-500 italic pt-6">
                        Última actualización:{" "}
                        {new Date().toLocaleDateString("es-AR", {
                            year: "numeric",
                            month: "long"
                        })}
                    </p>

                </div>
            </div>

            {/* SIDEBAR */}
            <aside className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">

                <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-5 border-b pb-3">
                    Categorías
                </h2>

                <ul className="divide-y divide-gray-100">

                    {FOOTER_CATEGORIES.map((cat) => (
                        <li key={cat.slug}>
                            <Link
                                to={withWholesale(`/categoria/${cat.slug}`)}
                                className="block py-3 text-gray-700 font-serif hover:text-black transition-colors"
                            >
                                {cat.label}
                            </Link>
                        </li>
                    ))}

                </ul>

            </aside>

        </div>
    );
}