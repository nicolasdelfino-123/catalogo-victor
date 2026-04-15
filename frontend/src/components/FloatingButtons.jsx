import React from "react";
import { storeConfig } from "../config/storeConfig";
/**
 * Botonera flotante lateral (Instagram / WhatsApp)
 * - Aparece en TODAS las rutas (lo montamos en Layout.jsx)
 * - Tailwind ya está en tu proyecto, así que no necesitas CSS extra.
 * - En mobile se pega al borde derecho abajo; en desktop queda centrada a 1/3 de la altura.
 */
export default function FloatingButtons() {
    // EDITA estas URLs a las reales de tu cliente
    const IG_URL = storeConfig.contact.instagram;

    const mensaje = encodeURIComponent(
        storeConfig.contact.whatsappMessage
    );

    const WA_URL = `https://wa.me/${storeConfig.contact.whatsapp}?text=${mensaje}`;


    return (
        <>
            {/* Barra lateral derecha */}
            <div
                className="
          fixed z-[9999]
          right-3 sm:right-4
          bottom-11 sm:bottom-16
          flex flex-col gap-3
          pointer-events-none
        "
                aria-label="Accesos rápidos"
            >
                {/* Instagram */}
                <a
                    href={IG_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="
            pointer-events-auto
            group relative
            w-10 h-10 sm:w-14 sm:h-14
            rounded-full
            bg-black/70 backdrop-blur
            flex items-center justify-center
            shadow-xl
            hover:scale-105 active:scale-95 transition
            outline-none focus:ring-2 focus:ring-white/50
          "
                >
                    {/* ícono simple (SVG) */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                        className="w-6 h-6 sm:w-7 sm:h-7 text-white">
                        <path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zM12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10m0 2.2A2.8 2.8 0 1 0 14.8 12A2.8 2.8 0 0 0 12 9.2M17.25 6.75a1 1 0 1 1-1 1a1 1 0 0 1 1-1" />
                    </svg>

                    {/* Tooltip */}
                    <span className="
            absolute right-full mr-2 hidden sm:block
            whitespace-nowrap
            px-2 py-1 text-[12px] rounded-md
            bg-black/80 text-white
            opacity-0 translate-x-1
            group-hover:opacity-100 group-hover:translate-x-0
            transition
          ">
                        Instagram
                    </span>
                </a>

                {/* WhatsApp */}
                <a
                    href={WA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="
            pointer-events-auto
            group relative
            w-10 h-10 sm:w-14 sm:h-14
            rounded-full
            bg-green-600
            flex items-center justify-center
            shadow-xl
            hover:scale-105 active:scale-95 transition
            outline-none focus:ring-2 focus:ring-white/50
          "
                >
                    {/* ícono simple (SVG) */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                        className="w-6 h-6 sm:w-7 sm:h-7 text-white">
                        <path fill="currentColor" d="M20.5 3.5A10.5 10.5 0 0 0 4 17.1L3 21l4-1a10.5 10.5 0 0 0 16.5-8.5A10.4 10.4 0 0 0 20.5 3.5m-8.5 16a8.5 8.5 0 0 1-4.3-1.2l-.3-.2l-2.5.6l.7-2.4l-.2-.3A8.5 8.5 0 1 1 12 19.5m4.8-6.1c-.3-.1-1.7-.8-1.9-.9s-.4-.1-.6.1s-.7.9-.9 1.1s-.3.2-.6.1s-1.1-.4-2.1-1.3A7.6 7.6 0 0 1 9 10.7c-.2-.3 0-.4.1-.6l.3-.4l.2-.3c.1-.1.1-.2.2-.3s0-.3 0-.4s0-.3-.1-.4s-.6-1.5-.8-2s-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3a3 3 0 0 0-1 2.3a5.2 5.2 0 0 0 1.1 3.1a11.9 11.9 0 0 0 4.6 4.1a5.1 5.1 0 0 0 3.2 1h.7a2.8 2.8 0 0 0 2-1.3a2.3 2.3 0 0 0 .2-1.3s-.2-.1-.5-.2" />
                    </svg>

                    {/* Tooltip */}
                    <span className="
            absolute right-full mr-2 hidden sm:block
            whitespace-nowrap
            px-2 py-1 text-[12px] rounded-md
            bg-black/80 text-white
            opacity-0 translate-x-1
            group-hover:opacity-100 group-hover:translate-x-0
            transition
          ">
                        WhatsApp
                    </span>
                </a>
            </div>
        </>
    );
}
