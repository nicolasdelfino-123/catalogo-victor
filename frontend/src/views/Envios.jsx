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

export default function Envios() {

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-12">

            {/* CONTENIDO PRINCIPAL */}
            <div className="md:col-span-2">

                <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-wide text-gray-900 mb-10 border-b pb-4">
                    Política de envíos
                </h1>

                <div className="space-y-5 text-gray-700 leading-relaxed font-serif tracking-wide text-base md:text-[16px]">

                    <p>
                        En <strong>Shatha Perfumes</strong> trabajamos para que cada pedido
                        llegue a destino de forma segura y en el menor tiempo posible.
                        Todos los envíos se preparan cuidadosamente para proteger los
                        productos durante el traslado.
                    </p>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            1. Modalidad de envío
                        </h2>

                        <p>
                            Realizamos envíos a través de servicios de correo y logística
                            disponibles en Argentina. Una vez confirmado el pedido y el
                            pago correspondiente, el paquete será preparado y despachado
                            dentro de los plazos habituales de procesamiento.
                        </p>

                        <p>
                            Cada pedido es embalado cuidadosamente para garantizar que
                            los perfumes y productos de perfumería lleguen en óptimas
                            condiciones.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            2. Tiempos de despacho
                        </h2>

                        <p>
                            Los pedidos suelen despacharse dentro de un plazo estimado
                            de <strong>24 a 72 horas hábiles</strong> una vez confirmada
                            la compra.
                        </p>

                        <p>
                            El tiempo total de entrega dependerá del servicio de correo
                            y de la ubicación del destino.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            3. Tiempos de entrega estimados
                        </h2>

                        <p>
                            Una vez despachado el pedido, los tiempos de entrega
                            estimados suelen ser:
                        </p>

                        <ul className="list-disc pl-5 space-y-1">
                            <li>Entre <strong>2 y 5 días hábiles</strong> para ciudades principales.</li>
                            <li>Entre <strong>3 y 7 días hábiles</strong> para otras localidades del país.</li>
                        </ul>

                        <p>
                            Estos tiempos pueden variar según el operador logístico
                            y la distancia del destino.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            4. Seguimiento del envío
                        </h2>

                        <p>
                            Una vez despachado el pedido, el cliente recibirá la información de seguimiento
                            correspondiente para rastrear el envío y conocer su estado hasta la entrega.
                        </p>

                        <p>
                            A través del número de seguimiento será posible consultar el progreso del
                            paquete y la fecha estimada de llegada proporcionada por el servicio de correo.
                        </p>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h2 className="text-xl font-serif font-semibold tracking-wide text-gray-900 mb-2">
                            5. Responsabilidad del transporte
                        </h2>

                        <p>
                            Una vez que el paquete es entregado al servicio de correo,
                            el transporte queda bajo responsabilidad del operador
                            logístico. Cualquier demora ocasionada durante el traslado
                            dependerá del servicio de envío correspondiente.
                        </p>

                        <p>
                            Ante cualquier consulta o inconveniente relacionado con
                            el envío, nuestro equipo de atención al cliente estará
                            disponible para brindar asistencia.
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