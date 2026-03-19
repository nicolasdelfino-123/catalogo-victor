import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { withWholesale } from '../utils/navigation.js'

import logofooter from "../assets/logofooter.png";

const phone = "5493533459552";
const message = encodeURIComponent(`Hola, tengo una consulta sobre el producto...`);
const link = `https://wa.me/${phone}?text=${message}`;


// En tu Footer.jsx — mini mapa label/slug para no volverte loco
const FOOTER_CATEGORIES = [
    { label: "Perfumes Masculinos", slug: "perfumes-masculinos" },
    { label: "Femeninos", slug: "femeninos" },
    { label: "Unisex", slug: "unisex" },
    { label: "Cremas", slug: "cremas" },
    { label: "Body Splash Victoria Secret", slug: "body-splash-victoria-secret" },
];

const Footer = () => {
    const navigate = useNavigate();
    return (
        <div>
            <footer className="bg-[#0b0b0d] text-gray-300 py-12 font-serif">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
                        <div className="flex flex flex-col items-center">
                            <img
                                src={logofooter}
                                alt="Shatha"
                                className="h-56 mb-3 -mt-13 opacity-95"
                            />

                            <p className="text-gray-400 text-sm max-w-xs -mt-5 text-center">
                                Perfumes árabes originales en Argentina.
                            </p>
                        </div>


                        {/* 🟢 Productos */}
                        <div>
                            <h4 className="font-semibold mb-4 uppercase tracking-wider text-sm text-gray-200">Productos</h4>
                            <ul className="space-y-2 text-gray-400">
                                {FOOTER_CATEGORIES.map((c) => (
                                    <li key={c.slug}>
                                        <Link
                                            to={withWholesale(`/categoria/${c.slug}`)}
                                            state={{ fromFooter: true }}     // 👈 Marca que viene desde el footer
                                            className="relative hover:text-amber-300 transition-all duration-300 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1px] after:bg-amber-400 after:transition-all after:duration-300 hover:after:w-full"
                                        >
                                            {c.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4 uppercase tracking-wider text-sm text-gray-200">Información</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>
                                    <Link
                                        to={withWholesale("/aviso-legal")}

                                        className="relative hover:text-amber-300 transition-all duration-300 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1px] after:bg-amber-400 after:transition-all after:duration-300 hover:after:w-full"
                                    >
                                        Aviso Legal
                                    </Link>
                                </li>
                                <li>
                                    <Link to={withWholesale("/envios")}
                                        className="relative hover:text-amber-300 transition-all duration-300 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1px] after:bg-amber-400 after:transition-all after:duration-300 hover:after:w-full">
                                        Envíos
                                    </Link>
                                </li>
                                <li>
                                    <Link to={withWholesale("/devoluciones")}
                                        className="relative hover:text-amber-300 transition-all duration-300 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1px] after:bg-amber-400 after:transition-all after:duration-300 hover:after:w-full">
                                        Devoluciones
                                    </Link>
                                </li>

                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4 uppercase tracking-wider text-sm text-gray-200">Contacto</h4>
                            <ul className="space-y-2 text-gray-300">
                                <li>
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative hover:text-amber-300 transition-all duration-300 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1px] after:bg-amber-400 after:transition-all after:duration-300 hover:after:w-full"
                                    >
                                        WhatsApp: +54 9 3533 45-9552
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="mailto:xxx@gmail.com"
                                        className="relative hover:text-amber-300 transition-all duration-300 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1px] after:bg-amber-400 after:transition-all after:duration-300 hover:after:w-full"
                                    >
                                        Email: email@gmail.com
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://www.instagram.com/shatha_oriental/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative hover:text-amber-300 transition-all duration-300 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1px] after:bg-amber-400 after:transition-all after:duration-300 hover:after:w-full"
                                    >
                                        Instagram: @shatha_oriental
                                    </a>
                                </li>
                            </ul>
                        </div>

                    </div>

                    <div className="border-t border-yellow-600/20 mt-8 pt-8 text-center text-gray-400 text-xs">
                        <p>
                            Copyright © <span
                                onDoubleClick={() => {
                                    navigate("/admin/login");
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="cursor-default select-none"
                            >
                                2026
                            </span> | Sitio web desarrollado por{" "}
                            <a
                                href="https://wa.me/5493534793366?text=Hola%2C%20vi%20tu%20web%20y%20quiero%20consultarte%20por%20una%20página"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-white transition-colors font-medium"
                            >
                                Nicolás Delfino
                            </a>.
                        </p>
                    </div>

                </div>
            </footer>
        </div>
    )
}

export default Footer
