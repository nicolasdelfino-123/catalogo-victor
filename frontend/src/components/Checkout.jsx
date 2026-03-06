// src/components/Checkout.jsx
import React, { useState, useContext, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Context } from '../js/store/appContext'
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react'
import logo from '@/assets/mp-logo1.png';


const provincesAR = [
    "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos",
    "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén",
    "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
    "Santiago del Estero", "Tierra del Fuego", "Tucumán", "Ciudad Autónoma de Buenos Aires"
]

// URL base del backend
const API = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, "") || ""

// Normaliza paths viejos
const normalizeImagePath = (u = "") => {
    if (!u) return ""
    if (u.startsWith("/admin/uploads/")) u = u.replace("/admin", "/public")
    if (u.startsWith("/uploads/")) u = `/public${u}`
    return u
}

// URL absoluta segura
const toAbsUrl = (u = "") => {
    u = normalizeImagePath(u)
    if (!u) return ""
    if (/^https?:\/\//i.test(u)) return u
    if (u.startsWith("/public/")) return `${API}${u}`
    if (u.startsWith("/")) return u
    if (!u.includes("/")) return `/${u}`
    return `${API}/${u}`
}

const Checkout = () => {
    const { store, actions } = useContext(Context)
    const navigate = useNavigate()

    // 🔥 Al montar, rehidrata carrito desde localStorage (por si recargó o volvió del pago)
    useEffect(() => {
        actions.hydrateCart?.();
    }, []);

    // 🧩 Detectar estado de pago (approved / rejected / pending)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get("status");

        if (status) {


            if (status === "approved") {

                actions.clearCart();
            } else {

                actions.hydrateCart?.();
            }

            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // === MP init ===
    useEffect(() => {
        try {
            const pk = import.meta.env.VITE_MP_PUBLIC_KEY
            if (!pk) {
                console.error('Falta VITE_MP_PUBLIC_KEY en el .env del frontend')
                alert('Configura VITE_MP_PUBLIC_KEY en el frontend (.env)')
                return
            }
            initMercadoPago(pk, { locale: 'es-AR' })
        } catch (err) {
            console.error('Error inicializando MercadoPago:', err)
        }
    }, [])

    // Traer direcciones guardadas
    useEffect(() => {
        if (!store.billingAddress || !store.shippingAddress) {
            actions.fetchUserAddresses?.().catch(() => { })
        }
    }, [])

    useEffect(() => {
        const savedPickup = localStorage.getItem("pickup");
        const storePickup = store.pickup;
        if (savedPickup === "true" || storePickup === true) {
            setPickup(true);
            actions.setPickup(true);
        }
    }, [store.pickup]);


    // Helpers de nombre del user (fallbacks)
    const userFirstName = useMemo(
        () => (store.user?.name || '').split(' ')[0] || '',
        [store.user]
    )
    const userLastName = useMemo(
        () => (store.user?.name || '').split(' ').slice(1).join(' ') || '',
        [store.user]
    )

    // Preferencias iniciales: si hay shipping guardado, úsalo como base;
    // si hay billing guardado, úsalo; si no, fallback a user.
    const initialBillingName = store.billingAddress?.name
        || store.shippingAddress?.name
        || userFirstName
    const initialBillingLast = store.billingAddress?.lastname
        || store.shippingAddress?.lastname
        || userLastName
    const initialBillingEmail = store.billingAddress?.email
        || store.shippingAddress?.email
        || store.user?.email
        || ''

    const [billing, setBilling] = useState({
        firstName: initialBillingName,
        lastName: initialBillingLast,
        email: initialBillingEmail,
        phone: store.billingAddress?.phone || store.shippingAddress?.phone || '',
        address: store.billingAddress?.address || store.shippingAddress?.address || '',
        apartment: store.billingAddress?.apartment || store.shippingAddress?.apartment || '',
        city: store.billingAddress?.city || store.shippingAddress?.city || '',
        province: store.billingAddress?.province || store.shippingAddress?.province || 'Córdoba',
        zipCode: store.billingAddress?.postalCode || store.shippingAddress?.postalCode || '',
        country: store.billingAddress?.country || store.shippingAddress?.country || 'Argentina',
        dni: store.dni || store.billingAddress?.dni || store.shippingAddress?.dni || '',
        newsletter: false,
        comment: ''

    })

    const [shippingDifferent, setShippingDifferent] = useState(false)
    const [pickup, setPickup] = useState(false)



    const initialShippingName = store.shippingAddress?.name || initialBillingName
    const initialShippingLast = store.shippingAddress?.lastname || initialBillingLast
    const initialShippingEmail = store.shippingAddress?.email || initialBillingEmail

    const [shipping, setShipping] = useState({
        firstName: initialShippingName,
        lastName: initialShippingLast,
        email: initialShippingEmail,
        phone: store.shippingAddress?.phone || '',
        address: store.shippingAddress?.address || '',
        apartment: store.shippingAddress?.apartment || '',
        city: store.shippingAddress?.city || '',
        province: store.shippingAddress?.province || 'Córdoba',
        zipCode: store.shippingAddress?.postalCode || '',
        country: store.shippingAddress?.country || 'Argentina',
        dni: store.dni || store.shippingAddress?.dni || ''
    })

    // Cuando llegan/actualizan direcciones en store, refrescamos también nombre/apellido/email
    useEffect(() => {
        if (store.billingAddress || store.user) {
            setBilling(prev => ({
                ...prev,
                firstName: prev.firstName || store.billingAddress?.name || userFirstName,
                lastName: prev.lastName || store.billingAddress?.lastname || userLastName,
                email: prev.email || store.billingAddress?.email || store.user?.email || '',
                phone: prev.phone || store.billingAddress?.phone || '',
                address: prev.address || store.billingAddress?.address || '',
                apartment: prev.apartment || store.billingAddress?.apartment || '',
                city: prev.city || store.billingAddress?.city || '',
                province: prev.province || store.billingAddress?.province || 'Córdoba',
                zipCode: prev.zipCode || store.billingAddress?.postalCode || '',
                country: prev.country || store.billingAddress?.country || 'Argentina',
                dni: prev.dni || store.dni || store.billingAddress?.dni || ''
            }))
        }
    }, [store.billingAddress, store.user, store.dni, userFirstName, userLastName])

    useEffect(() => {
        if (store.shippingAddress || store.user) {
            setShipping(prev => ({
                ...prev,
                firstName: prev.firstName || store.shippingAddress?.name || userFirstName,
                lastName: prev.lastName || store.shippingAddress?.lastname || userLastName,
                email: prev.email || store.shippingAddress?.email || store.user?.email || '',
                phone: prev.phone || store.shippingAddress?.phone || '',
                address: prev.address || store.shippingAddress?.address || '',
                apartment: prev.apartment || store.shippingAddress?.apartment || '',
                city: prev.city || store.shippingAddress?.city || '',
                province: prev.province || store.shippingAddress?.province || 'Córdoba',
                zipCode: prev.zipCode || store.shippingAddress?.postalCode || '',
                country: prev.country || store.shippingAddress?.country || 'Argentina',
                dni: prev.dni || store.dni || store.shippingAddress?.dni || ''
            }))
        }
    }, [store.shippingAddress, store.user, store.dni, userFirstName, userLastName])

    // Manejo inputs
    const handleBillingChange = (e) => {
        const { name, value, type, checked } = e.target
        setBilling(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }
    const handleShippingChange = (e) => {
        const { name, value } = e.target
        setShipping(prev => ({ ...prev, [name]: value }))
    }

    const [preferenceId, setPreferenceId] = useState(null)
    const [loading, setLoading] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('')

    // Totales
    const subtotal = store.cart?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
    // 🚚 Aseguramos que pickup sea falso si no está marcado explícitamente
    // 🚚 Sincroniza pickup entre store y localStorage
    useEffect(() => {
        const storedPickup = localStorage.getItem("pickup");
        if (storedPickup === "true" || store.pickup === true) {
            setPickup(true);
            actions.setPickup(true);
        } else {
            setPickup(false);
            actions.setPickup(false);
            localStorage.removeItem("pickup");
        }
    }, [store.pickup]);




    // Normalizamos la ciudad para evitar mayúsculas/minúsculas
    // Normalizamos la ciudad
    const billingCity = (billing.city || "").trim().toLowerCase();

    // 🚚 Costo de envío
    let shippingCost = 5000;

    if (pickup) {
        // Caso 1: retiro en tienda
        shippingCost = 0;
    } else if (billingCity.includes("las varillas")) {
        // Caso 2: vive en Las Varillas (envío gratis)
        shippingCost = 0;
    }


    const total = subtotal + shippingCost;


    // Validaciones mínimas
    const billingValid =
        billing.email &&
        billing.firstName &&
        billing.lastName &&
        billing.phone &&
        billing.address &&
        billing.city &&
        billing.province &&
        billing.zipCode &&
        billing.country &&
        billing.dni

    const shippingValid = !shippingDifferent || (
        shipping.firstName &&
        shipping.lastName &&
        shipping.phone &&
        shipping.address &&
        shipping.city &&
        shipping.province &&
        shipping.zipCode &&
        shipping.country &&
        shipping.dni
    )

    /* const isFormValid = () => billingValid && shippingValid && paymentMethod === 'mercadopago' */

    const isFormValid = () => billingValid && shippingValid


    const createPreference = async () => {
        setLoading(true)
        try {
            if (!store.cart || store.cart.length === 0) {
                throw new Error('El carrito está vacío')
            }

            // Armamos items con IDs numéricos (product.id real)
            const items = store.cart.map((item) => {
                const qty = Math.max(1, parseInt(item.quantity || 1, 10))
                const price = Number(item.price)
                if (!Number.isFinite(price) || price <= 0) {
                    throw new Error(`Precio inválido para ${item.name}`)
                }
                const productId = item.product_id ?? item.id
                if (!productId) {
                    throw new Error(`Falta product_id para ${item.name}`)
                }
                return {
                    id: String(productId),          // ⚠️ numérico (texto)
                    title: item.name,
                    quantity: qty,
                    unit_price: price,
                    selected_flavor: item.selectedFlavor || null, // 👈 NUEVO: envía el sabor elegido
                    selected_size_ml: item.selected_size_ml ?? item.volume_ml ?? item.product?.volume_ml ?? null,
                }
            })

            // Mail del checkout (PRIORIDAD de asociación)
            const formEmail = (billing.email || '').trim().toLowerCase()

            // ✅ Agregamos costo de envío como ítem adicional si corresponde
            if (shippingCost > 0) {
                items.push({
                    id: "envio",
                    title: "Costo de envío",
                    quantity: 1,
                    unit_price: shippingCost,
                })
            }

            // Payload para el backend
            const preferenceData = {

                items,
                payer: {
                    email: formEmail,
                    name: billing.firstName,
                    surname: billing.lastName,
                    identification: billing.dni
                        ? { type: 'DNI', number: String(billing.dni) }
                        : undefined,
                    phone: billing.phone
                        ? { area_code: '', number: String(billing.phone) }
                        : undefined,
                    address: billing.address
                        ? {
                            street_name: billing.address,
                            zip_code: billing.zipCode,
                            apartment: billing.apartment || "",
                            city: billing.city || "",
                            province: billing.province || "",
                            country: billing.country || "Argentina",
                        }
                        : undefined

                },
                form_email: formEmail,
                billing_address: billing,
                pickup: pickup,
                shipping_address: {
                    mode: pickup ? "pickup" : "delivery",
                    label: pickup
                        ? "Retiro en local"
                        : billingCity.includes("las varillas")
                            ? "Envío a domicilio (Las Varillas - Gratis)"
                            : "Envío a domicilio (Gratis)",
                    address: billing.address,
                    apartment: billing.apartment || "",
                    city: billing.city || "Las Varillas",
                    province: billing.province || "Córdoba",
                    country: billing.country || "Argentina",
                    postalCode: billing.zipCode || "",
                    phone: billing.phone || "",
                    dni: billing.dni || "",
                    email: billing.email || "",
                    firstName: billing.firstName || "",
                    lastName: billing.lastName || "",
                    cost: shippingCost || 0,
                },




                comment: billing.comment || "",

            }






            const token = localStorage.getItem('token')
            const headers = token
                ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                : { 'Content-Type': 'application/json' }

            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/mercadopago/create-preference`,
                { method: 'POST', headers, body: JSON.stringify(preferenceData) }
            )

            if (!response.ok) {
                const errorText = await response.text()
                let errorData = null
                try { errorData = JSON.parse(errorText) } catch { errorData = { raw: errorText } }
                console.error("MP preference error payload:", errorData)
                const visible = errorData?.reason || errorData?.error || `Error HTTP ${response.status}`
                alert(`Error al crear la preferencia de pago:\n${visible}`)
                return
            }

            const data = await response.json()
            if (data.preference_id) {
                setPreferenceId(data.preference_id)
            } else {
                throw new Error('No se recibió preference_id en la respuesta')
            }
        } catch (error) {
            console.error('Error creating preference:', error)
            alert(`Error al crear la preferencia de pago: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }


    if (!store.cart || store.cart.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Tu carrito está vacío</h2>
                    <p className="text-gray-600 mb-6">Agrega productos para continuar con la compra</p>
                    <button
                        onClick={() => navigate('/inicio')}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Ir a la tienda
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Finalizar Compra</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* COLUMN IZQ: Formulario */}
                <form className="space-y-6">

                    {/* Detalles de facturación */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">Detalles de envío</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={billing.firstName}
                                    onChange={handleBillingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={billing.lastName}
                                    onChange={handleBillingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">País *</label>
                            <select
                                name="country"
                                value={billing.country}
                                onChange={handleBillingChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="Argentina">Argentina</option>
                            </select>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
                            <input
                                type="text"
                                name="address"
                                value={billing.address}
                                onChange={handleBillingChange}
                                placeholder="Calle y número"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                required
                            />
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Piso, departamento, etc. (opcional)</label>
                            <input
                                type="text"
                                name="apartment"
                                value={billing.apartment}
                                onChange={handleBillingChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={billing.city}
                                    onChange={handleBillingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Envíos <span className="font-semibold text-green-600">gratis</span> en Las Varillas
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provincia *</label>
                                <select
                                    name="province"
                                    value={billing.province}
                                    onChange={handleBillingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                >
                                    {provincesAR.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Código postal *</label>
                                <input
                                    type="text"
                                    name="zipCode"
                                    value={billing.zipCode}
                                    onChange={handleBillingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        window.open("https://www.correoargentino.com.ar/formularios/cpa", "_blank")
                                    }
                                    className="mt-2 text-sm text-gray-500 underline hover:text-gray-700"
                                >
                                    No sé mi código postal
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={billing.phone}
                                    onChange={handleBillingChange}
                                    placeholder="+549..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de correo electrónico *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={billing.email}
                                    onChange={handleBillingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">DNI *</label>
                                <input
                                    type="text"
                                    name="dni"
                                    value={billing.dni}
                                    onChange={handleBillingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                        </div>
                        {/* 🔽 Campo de comentarios — visible siempre */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Comentarios o indicaciones (opcional)
                            </label>
                            <textarea
                                name="comment"
                                value={billing.comment}
                                onChange={handleBillingChange}
                                placeholder="Ejemplo: llamar antes de entregar, envolver para regalo..."
                                rows={3}
                                maxLength={5000}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 resize-y"
                            />
                            <p className="text-xs text-gray-500 mt-1 text-right">
                                {billing.comment.length}/5000
                            </p>
                        </div>
                        {/* 🔽 Checkbox de retiro en local */}
                        <div className="mt-4">
                            <label className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                                <input
                                    type="checkbox"
                                    checked={pickup}
                                    onChange={(e) => {
                                        setPickup(e.target.checked);
                                        actions.setPickup(e.target.checked);
                                        localStorage.setItem("pickup", e.target.checked);
                                    }}
                                    className="mt-1 size-4 checkout-checkbox"
                                />

                                <div>
                                    <p className="font-medium">Retiro en nuestro local (GRATIS)</p>
                                    <p className="text-sm text-gray-600">
                                        Vélez Sarsfield 303, Las Varillas<br />
                                        Lunes a Sábados 08:00 – 12:00 | 17:00 – 20:15<br />

                                    </p>
                                </div>
                            </label>
                        </div>



                        {/* <div className="mt-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    name="newsletter"
                                    checked={billing.newsletter}
                                    onChange={handleBillingChange}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Deseo inscribirme para recibir actualizaciones y noticias por correo electrónico (opcional)
                                </span>
                            </label>
                        </div> */}

                        {/*  <div className="mt-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    checked={shippingDifferent}
                                    onChange={(e) => setShippingDifferent(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">¿Enviar a una dirección diferente?</span>
                            </label>
                        </div> */}
                    </div>

                    {/* Dirección de envío (si es diferente) */}
                    {shippingDifferent && (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-4">Dirección de entrega (envío)</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={shipping.firstName}
                                        onChange={handleShippingChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={shipping.lastName}
                                        onChange={handleShippingChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">País *</label>
                                <select
                                    name="country"
                                    value={shipping.country}
                                    onChange={handleShippingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="Argentina">Argentina</option>
                                </select>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={shipping.address}
                                    onChange={handleShippingChange}
                                    placeholder="Calle y número"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Piso, departamento, etc. (opcional)</label>
                                <input
                                    type="text"
                                    name="apartment"
                                    value={shipping.apartment}
                                    onChange={handleShippingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={shipping.city}
                                        onChange={handleShippingChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Provincia *</label>
                                    <select
                                        name="province"
                                        value={shipping.province}
                                        onChange={handleShippingChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        {provincesAR.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Código postal *</label>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        value={shipping.zipCode}
                                        onChange={handleShippingChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={shipping.phone}
                                        onChange={handleShippingChange}
                                        placeholder="+549..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de correo electrónico *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={shipping.email}
                                        onChange={handleShippingChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI *</label>
                                    <input
                                        type="text"
                                        name="dni"
                                        value={shipping.dni}
                                        onChange={handleShippingChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                        required
                                    />
                                </div>

                            </div>

                        </div>

                    )}
                </form>
                {/* COLUMN DER: Resumen + Pago */}
                <div className="space-y-6">
                    {/* Resumen */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">Resumen del pedido</h2>

                        <div className="space-y-4">
                            {store.cart.map((item) => (
                                <div key={item.id} className="flex items-center justify-between py-2 border-b">
                                    <div className="flex items-center space-x-3">
                                        <img
                                            src={toAbsUrl(item?.image_url) || "/sin_imagen.jpg"}
                                            alt={item?.name || "Producto"}
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 rounded bg-gray-100 object-contain"
                                            loading="lazy"
                                            decoding="async"
                                            onError={(e) => {
                                                if (!e.currentTarget.src.endsWith("/sin_imagen.jpg")) {
                                                    e.currentTarget.onerror = null
                                                    e.currentTarget.src = "/sin_imagen.jpg"
                                                }
                                            }}
                                        />
                                        <div>
                                            <p className="font-medium text-sm">
                                                {item.name}
                                                {item.selectedFlavor ? ` (${item.selectedFlavor})` : ""}
                                            </p>
                                            <p className="text-gray-600 text-sm">Cantidad: {item.quantity}</p>
                                        </div>
                                    </div>
                                    <p className="font-semibold">${(item.price * item.quantity).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-4 mt-4 space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>${subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Envío:</span>
                                <span className={shippingCost === 0 ? "text-green-600" : ""}>
                                    {shippingCost === 0 ? "Gratis" : `$${shippingCost.toLocaleString()}`}
                                </span>
                            </div>


                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                                <span>Total:</span>
                                <span>${total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pago */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-4">Método de pago</h3>
                            {/* 🔥 BLOQUE PARA BOTÓN LILA (Formulario incompleto) */}
                            {(!billingValid || !shippingValid) && (
                                <button
                                    type="button"
                                    onClick={() => document.querySelector("form")?.reportValidity()}
                                    className="w-full py-3 px-4 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors mb-4"
                                >
                                    Realizar el pago
                                </button>
                            )}

                            {/* 🔵 ESTE BLOQUE ES MP — LO VAS A COMENTAR */}
                            {/*  <div className="border border-gray-200 rounded-lg p-4">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={paymentMethod === 'mercadopago'}
                                        onChange={(e) => setPaymentMethod(e.target.checked ? 'mercadopago' : '')}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <div className="ml-3 flex items-center">
                                        <img
                                            src={logo}
                                            alt="MercadoPago"
                                            className="h-12 w-auto mr-3"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-900">Pagar con MercadoPago</span>
                                            <p className="text-sm text-gray-500">Tarjetas de crédito, débito y efectivo</p>
                                        </div>
                                    </div>
                                </label>
                            </div> */}
                        </div>
                        {/* 
                        {!preferenceId ? (
                            <button
                                type="submit"
                                onClick={(e) => {
                                    e.preventDefault(); // prevenimos submit por defecto
                                    if (document.querySelector("form")?.checkValidity()) {
                                        createPreference();
                                    } else {
                                        // esto fuerza al navegador a mostrar los mensajes "Completa este campo"
                                        document.querySelector("form")?.reportValidity();
                                    }
                                }}
                                className="w-full py-3 px-4 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                            >
                                {loading ? 'Procesando...' : 'Continuar al pago'}
                            </button>


                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600 text-center">
                                    Haz clic en "Pagar" para continuar con Mercado Pago
                                </p>
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <Wallet
                                        initialization={{
                                            preferenceId: preferenceId,
                                            redirectMode: 'self'
                                        }}
                                        customization={{ texts: { valueProp: 'smart_option' } }}

                                        onError={(error) => console.error('Wallet error:', error)}
                                    />
                                </div>
                            </div>

                        )} */}
                        {/* NUEVO BLOQUE DE FLUJO DE PAGO */}
                        {/*  {!billingValid || !shippingValid ? (
                            // 1️⃣ FORMULARIO INCOMPLETO → SEGUE BOTÓN LILA
                            <button
                                type="button"
                                onClick={() => document.querySelector("form")?.reportValidity()}
                                className="w-full py-3 px-4 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                            >
                                Realizar el pago
                            </button>
                        ) : (
                            // 2️⃣ FORMULARIO COMPLETO → MOSTRAR TRANSFERENCIA DIRECTAMENTE
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <h3 className="font-semibold mb-2">Transferencia bancaria</h3>
                                <p><strong>Billetera:</strong> Mercado Pago</p>
                                <p><strong>CBU:</strong> 0000003100051605692604</p>
                                <p><strong>Alias:</strong> pladur.mp</p>
                                <p><strong>Titular:</strong> Mauricio Fiuri</p>

                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("transfer")}
                                    className="mt-4 w-full py-3 px-4 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
                                >
                                    Confirmar compra
                                </button>
                            </div>
                        )}
 */}


                        {billingValid && shippingValid && (
                            <div className="border border-gray-200 rounded-lg p-4 mt-4 bg-gray-50">

                                <h3 className="font-semibold mb-2">Transferencia bancaria</h3>

                                {/* Datos bancarios */}
                                <p><strong>Billetera:</strong> Mercado Pago</p>
                                <p><strong>CBU:</strong> 0000003100051605692604</p>
                                <p><strong>Alias:</strong> pladur.mp</p>
                                <p><strong>Titular:</strong> Mauricio Fiuri</p>

                                <p className="mt-2 text-sm text-gray-500">
                                    Cuando finalices la transferencia, presioná el botón <strong>‘Confirmar compra’</strong> para registrar tu pedido y ver el estado del mismo.
                                </p>

                                <div className="mt-2 flex gap-3">
                                    {/*   <a
                                        href="mailto:zarpado.vap@gmail.com?subject=Comprobante%20de%20transferencia&body=Hola,%20adjunto%20mi%20comprobante%20de%20pago."
                                        className="text-purple-600 underline"
                                    >
                                        📧 Enviar por email
                                    </a>

                                    <a
                                        href="https://wa.me/5493533497041?text=Hola!%20Te%20envío%20el%20comprobante%20de%20mi%20pedido%20realizado%20en%20Zarpados."
                                        className="text-green-600 underline"
                                    >
                                        💬 Enviar por WhatsApp
                                    </a> */}
                                </div>

                                {/* Setea método automáticamente */}
                                {paymentMethod !== 'transfer' && setPaymentMethod('transfer')}

                                {/* BOTÓN ORIGINAL, SIN CAMBIAR LÓGICA */}
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={async (e) => {
                                        e.preventDefault();

                                        const form = document.querySelector("form");
                                        if (!form?.checkValidity()) {
                                            form.reportValidity();
                                            return;
                                        }

                                        if (!store.cart || store.cart.length === 0) {
                                            alert("Tu carrito está vacío");
                                            return;
                                        }

                                        setLoading(true);

                                        try {
                                            const items = store.cart.map((item) => ({
                                                id: String(item.product_id ?? item.id),
                                                title: item.name,
                                                quantity: Math.max(1, parseInt(item.quantity || 1)),
                                                unit_price: Number(item.price),
                                                selected_flavor: item.selectedFlavor || null,
                                                selected_size_ml: item.selected_size_ml ?? item.volume_ml ?? item.product?.volume_ml ?? null,
                                            }));

                                            const payload = {
                                                user_id: store.user?.id || null,
                                                total_amount: subtotal + shippingCost,
                                                payment_method: "transferencia",

                                                billing_address: {
                                                    firstName: billing.firstName,
                                                    lastName: billing.lastName,
                                                    email: billing.email,
                                                    phone: billing.phone,
                                                    address: billing.address,
                                                    apartment: billing.apartment || "",
                                                    city: billing.city,
                                                    province: billing.province,
                                                    country: billing.country,
                                                    postalCode: billing.zipCode || "",
                                                    dni: billing.dni,
                                                    comment: billing.comment || "",
                                                },

                                                shipping_address: {
                                                    mode: pickup ? "pickup" : "delivery",
                                                    label: pickup
                                                        ? "Retiro en local"
                                                        : billingCity.includes("las varillas")
                                                            ? "Envío a domicilio (Las Varillas - Gratis)"
                                                            : "Envío a domicilio (Gratis)",
                                                    address: billing.address,
                                                    apartment: billing.apartment || "",
                                                    city: billing.city || "Las Varillas",
                                                    province: billing.province || "Córdoba",
                                                    country: billing.country || "Argentina",
                                                    postalCode: billing.zipCode || "",
                                                    phone: billing.phone || "",
                                                    dni: billing.dni || "",
                                                    email: billing.email || "",
                                                    firstName: billing.firstName || "",
                                                    lastName: billing.lastName || "",
                                                    cost: shippingCost || 0,
                                                },

                                                comment: billing.comment || "",
                                                items,
                                            };

                                            const token = localStorage.getItem("token");
                                            const res = await fetch(`${API}/api/mercadopago/manual-order`, {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json",
                                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                                },
                                                body: JSON.stringify(payload),
                                            });

                                            if (!res.ok) throw new Error("Error creando orden manual");
                                            const data = await res.json();

                                            actions.addOrUpdateOrder(data);
                                            if (!data.order_id) throw new Error("Falta order_id en la respuesta del backend");

                                            actions.clearCart();

                                            navigate(
                                                `/thank-you-transfer?status=approved&order_id=${data.order_id}&token=${data.token || ""}`
                                            );

                                        } catch (err) {
                                            console.error(err);
                                            alert("Hubo un error al registrar tu pedido.");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="mt-4 w-full py-3 px-4 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors flex justify-center items-center gap-2"
                                >
                                    {loading ? "Procesando..." : "Confirmar compra (Transferencia)"}
                                </button>

                            </div>
                        )}




                    </div>
                </div>
            </div >
        </div >

    )
}

export default Checkout
