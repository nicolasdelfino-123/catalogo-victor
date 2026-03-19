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

export default function Devoluciones() {

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-12">

            {/* CONTENIDO PRINCIPAL */}
            <div className="md:col-span-2">

                <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-wide text-gray-900 mb-10 border-b pb-4">
                    Cambios y devoluciones
                </h1>

                <div className="space-y-5 text-gray-700 leading-relaxed font-serif tracking-wide text-base md:text-[16px]">

                    <p>
                        En <strong>Shatha Perfumes</strong> trabajamos con fragancias y productos
                        de perfumería cuidadosamente seleccionados. Nuestro objetivo es que
                        cada cliente tenga una experiencia de compra clara, segura y satisfactoria.
                    </p>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            1. Condiciones generales
                        </h2>

                        <p>
                            Por razones de higiene y seguridad, los perfumes y productos de
                            cuidado personal no aceptan cambios ni devoluciones una vez que
                            han sido abiertos o utilizados.
                        </p>

                        <p>
                            Recomendamos revisar cuidadosamente el producto seleccionado antes
                            de confirmar el pedido para asegurarse de que corresponde a la
                            fragancia o presentación deseada.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            2. Productos dañados o errores en el pedido
                        </h2>

                        <p>
                            Si el producto recibido presenta daños visibles en el envase o si
                            se produjo un error en el armado del pedido, el cliente deberá
                            comunicarse con nuestro equipo dentro de las primeras 48 horas
                            posteriores a la recepción.
                        </p>

                        <p>
                            En estos casos evaluaremos la situación y ofreceremos una solución
                            adecuada, que podrá incluir el reemplazo del producto o la
                            correspondiente asistencia al cliente.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            3. Embalaje y envío
                        </h2>

                        <p>
                            Todos los pedidos son preparados con embalaje protector adecuado
                            para garantizar que los productos lleguen en óptimas condiciones.
                            Nuestro equipo verifica cuidadosamente cada paquete antes del envío.
                        </p>

                        <p>
                            Una vez entregado el pedido al servicio de transporte, la entrega
                            queda sujeta a los tiempos y condiciones del operador logístico.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            4. Atención al cliente
                        </h2>

                        <p>
                            Ante cualquier consulta sobre productos, pedidos o envíos, nuestro
                            equipo de atención estará disponible para brindarle asistencia
                            personalizada y resolver cualquier inquietud.
                        </p>

                        <p>
                            Puede comunicarse a través del correo electrónico:
                        </p>

                        <p className="font-medium">
                            contacto: <strong>xxxx@xxxx.com</strong>
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