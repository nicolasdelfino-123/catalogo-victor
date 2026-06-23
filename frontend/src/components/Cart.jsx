import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Context } from "../js/store/appContext.jsx";
import { Link, useNavigate, useLocation } from "react-router-dom";
import CouponBox from "./cart/CouponBox.jsx";
import { normalizeCouponCode, validateCoupon } from "../utils/coupons.js";


const API = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, "") || "";

// --- helpers ---
const normalizeImagePath = (u = "") => {
  if (!u) return "";
  if (u.startsWith("/admin/uploads/")) u = u.replace("/admin", "/public");
  if (u.startsWith("/uploads/")) u = `/public${u}`;
  return u;
};

const toAbsUrl = (u = "") => {
  u = normalizeImagePath(u);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/public/")) return `${API}${u}`;
  if (u.startsWith("/")) return u;
  return `${API}/${u}`;
};

const getTitle = (it) => {
  let base = String(it?.name ?? it?.product?.name ?? it?.title ?? "Producto");
  if (it.selectedFlavor) base += ` (${it.selectedFlavor})`;
  return base;
};

const getSelectedMl = (it) => {
  const raw = it?.selected_size_ml ?? it?.volume_ml ?? it?.product?.volume_ml;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
};

const normalizeScopeValue = (value = "") =>
  String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-AR");

const categoryMatchKeys = (value = "") => {
  const text = normalizeScopeValue(value);
  if (!text) return [];

  const keys = new Set([text]);
  if (/^\d+$/.test(text)) keys.add(`id:${text}`);

  const plain = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (plain.includes("mascul") || plain.includes("hombre")) keys.add("id:1");
  if (plain.includes("femen") || plain.includes("mujer")) keys.add("id:2");
  if (plain.includes("unisex")) keys.add("id:3");
  if (plain.includes("arabe")) keys.add("id:4");
  if (plain.includes("disen")) keys.add("id:5");
  if (plain.includes("nicho")) keys.add("id:6");
  if (plain.includes("combo")) keys.add("id:7");
  return [...keys];
};

const itemMatchesCouponScope = (item, coupon) => {
  const scopeType = coupon?.scope_type || "all";
  if (scopeType === "all") return true;

  const scopeValues = new Set(
    scopeType === "category"
      ? (coupon?.scope_values || []).flatMap(categoryMatchKeys)
      : (coupon?.scope_values || []).map(normalizeScopeValue).filter(Boolean)
  );
  if (scopeValues.size === 0) return false;

  if (scopeType === "brand") {
    return scopeValues.has(normalizeScopeValue(item?.brand || item?.product_brand || item?.marca || item?.product?.brand));
  }

  if (scopeType === "category") {
    const rawValues = [
      item?.category_id,
      item?.category_name,
      ...(Array.isArray(item?.category_ids) ? item.category_ids : []),
      ...(Array.isArray(item?.category_names) ? item.category_names : []),
    ];
    return rawValues.some((value) => categoryMatchKeys(value).some((key) => scopeValues.has(key)));
  }

  if (scopeType === "best_seller") {
    return Boolean(item?.is_best_seller || item?.product?.is_best_seller);
  }

  return false;
};

// BLOQUE WHATSAPP SEGURO A REPLICAR EN OTRAS APPS
const buildWhatsAppUrl = (phone, message) => {
  const encodedMessage = encodeURIComponent(message);
  const userAgent = navigator.userAgent || "";

  if (/android|iphone|ipad|ipod/i.test(userAgent)) {
    return `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
  }

  return `https://wa.me/${phone}?text=${encodedMessage}`;
};

const buildWhatsAppWebUrl = (phone, message) => {
  const encodedMessage = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}&type=phone_number&app_absent=0`;
};

const openWhatsAppFallbackUrl = (url) => {
  const whatsappWindow = window.open("about:blank", "_blank");
  if (whatsappWindow) {
    whatsappWindow.opener = null;
    whatsappWindow.location.href = url;
  } else {
    window.location.href = url;
  }
};

export default function Cart({ isOpen: controlledOpen, onClose: controlledOnClose }) {
  const { store, actions } = useContext(Context);
  const [showCheckout, setShowCheckout] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(false);
  const [whatsappOrderPrompt, setWhatsappOrderPrompt] = useState(null);
  const [couponCode, setCouponCode] = useState(() => {
    const saved = localStorage.getItem("customerData");
    if (!saved) return "";
    try {
      return JSON.parse(saved)?.coupon || "";
    } catch {
      return "";
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponStatus, setCouponStatus] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [customerData, setCustomerData] = useState(() => {
    const saved = localStorage.getItem("customerData");
    const defaults = { name: "", phone: "", zone: "", payment: "", coupon: "" };

    if (!saved) return defaults;

    try {
      return { ...defaults, ...JSON.parse(saved) };
    } catch {
      return defaults;
    }
  });

  const navigate = useNavigate();
  const location = useLocation();
  const isWholesale = location.pathname.startsWith("/mayorista");
  const pricePrefix = isWholesale ? "$" : "$";

  const getCartProduct = (item) => {
    const productId = item?.id ?? item?.product_id ?? item?.productId;
    return (store.products || []).find((product) => String(product.id) === String(productId)) || null;
  };


  const isRouteMode = controlledOpen === undefined && controlledOnClose === undefined;
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = isRouteMode ? internalOpen : !!controlledOpen;

  const close = () => {
    if (isRouteMode) {
      setInternalOpen(false);
      setTimeout(() => navigate(-1), 180);
    } else if (controlledOnClose) {
      controlledOnClose();
    }
  };

  // devuelve precio correcto según modo
  const getItemPrice = (item) => {
    const product = getCartProduct(item);
    const wholesalePrice = Number(item.price_wholesale ?? product?.price_wholesale);
    const retailPrice = Number(item.price ?? product?.price);

    if (isWholesale) {
      if (wholesalePrice > 0) return wholesalePrice;
      return null; // mayorista sin precio → consultar
    }
    return retailPrice > 0 ? retailPrice : null; // minorista sin precio o 0 → consultar
  };



  // ===============================
  // MENSAJE WHATSAPP
  // ===============================
  // ===============================
  // TOTAL DEL CARRITO (VISIBLE EN UI)
  // ===============================

  const total = (store.cart || []).reduce((sum, item) => {
    const price = getItemPrice(item);
    if (price === null) return sum; // si es "consultar" no suma
    return sum + price * (Number(item.quantity) || 0);
  }, 0);

  const buildCouponItem = (item) => {
    const product = getCartProduct(item);
    const productId = item.id || item.product_id || item.productId || product?.id;
    return {
      product_id: productId,
      id: productId,
      quantity: Number(item.quantity) || 0,
      price: getItemPrice(item) || 0,
      brand: item.brand || item.product_brand || item.marca || item.product?.brand || product?.brand || "",
      category_id: item.category_id || item.product?.category_id || product?.category_id || null,
      category_ids: item.category_ids || item.product?.category_ids || product?.category_ids || [],
      category_name: item.category_name || item.product?.category_name || product?.category_name || "",
      category_names: item.category_names || item.product?.category_names || product?.category_names || [],
      is_best_seller: Boolean(item.is_best_seller || item.product?.is_best_seller || product?.is_best_seller),
    };
  };

  const buildCouponItems = () => (store.cart || []).map(buildCouponItem);

  const couponTotals = appliedCoupon
    ? (() => {
      const subtotal = Math.round(total);
      const percent = Number(appliedCoupon.percent) || 0;
      const eligibleSubtotal = (appliedCoupon.scope_type && appliedCoupon.scope_type !== "all")
        ? Math.round(buildCouponItems().reduce((sum, item) => {
          if (!itemMatchesCouponScope(item, appliedCoupon)) return sum;
          return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
        }, 0))
        : subtotal;
      const discount = Math.round(eligibleSubtotal * percent / 100);
      return {
        ...appliedCoupon,
        subtotal,
        eligible_subtotal: eligibleSubtotal,
        discount,
        total: Math.max(0, subtotal - discount),
      };
    })()
    : null;
  const isScopedCoupon = couponTotals?.scope_type && couponTotals.scope_type !== "all";
  const finalTotal = couponTotals ? couponTotals.total : Math.round(total);

  const getItemCouponTotals = (item) => {
    if (!couponTotals || !isScopedCoupon) return null;
    const couponItem = buildCouponItem(item);
    if (!itemMatchesCouponScope(couponItem, couponTotals)) return null;

    const original = (Number(couponItem.price) || 0) * (Number(couponItem.quantity) || 0);
    if (original <= 0) return null;

    const discount = Math.round(original * (Number(couponTotals.percent) || 0) / 100);
    return {
      original,
      discount,
      total: Math.max(0, original - discount),
    };
  };

  const applyCoupon = async () => {
    const code = normalizeCouponCode(couponCode);
    if (!code) {
      setCouponStatus({ type: "error", message: "Ingresá un cupón" });
      return;
    }
    if (total <= 0) {
      setCouponStatus({ type: "error", message: "El cupón se aplica a productos con precio" });
      return;
    }

    setValidatingCoupon(true);
    setCouponStatus(null);
    try {
      const result = await validateCoupon({ code, subtotal: total, items: buildCouponItems() });
      if (!result.valid) {
        setAppliedCoupon(null);
        setCouponStatus({ type: "error", message: result.error || "Cupón inválido o inactivo" });
        return;
      }
      setCouponCode(result.code);
      setAppliedCoupon(result);
      setCustomerData(prev => ({ ...prev, coupon: result.code }));
      setCouponStatus({ type: "success", message: "Cupón aplicado" });
    } catch (error) {
      console.error("Error validando cupón:", error);
      setAppliedCoupon(null);
      setCouponStatus({ type: "error", message: "No se pudo validar el cupón" });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setCouponStatus(null);
    setCouponCode("");
    setCustomerData(prev => {
      const next = { ...prev, coupon: "" };
      localStorage.setItem("customerData", JSON.stringify(next));
      return next;
    });
  };


  const buildWhatsAppMessage = () => {
    if (!store.cart || store.cart.length === 0) return "";

    const isWholesale = window.location.pathname.startsWith("/mayorista");

    let message = isWholesale
      ? "Hola! Quiero hacer el siguiente pedido:\n*PEDIDO MAYORISTA*\n\n"
      : "Hola! Quiero hacer el siguiente pedido:\n\n";

    let total = 0;
    let hasUnknownPrice = false;

    store.cart.forEach((item) => {
      const name = item.name;
      const flavor = item.selectedFlavor ? ` (${item.selectedFlavor})` : "";
      const sizeMl = getSelectedMl(item);
      const size = sizeMl ? ` • ${sizeMl}ml` : "";
      const qty = Number(item.quantity) || 0;

      const wholesalePrice = Number(item.price_wholesale);
      const retailPrice = Number(item.price);

      const price = isWholesale
        ? (wholesalePrice > 0 ? wholesalePrice : null)
        : (retailPrice > 0 ? retailPrice : null);

      message += `• *${qty} x ${(name + flavor + size).trim()}*\n`;

      if (price !== null) {
        const subtotal = price * qty;
        total += subtotal;

        message += `   ${pricePrefix}${price.toLocaleString("es-AR")} c/u\n`;
        message += `   Subtotal: ${pricePrefix}${subtotal.toLocaleString("es-AR")}\n\n`;
      } else {
        hasUnknownPrice = true;
        message += `   Precio: Consultar\n\n`;
      }
    });

    if (hasUnknownPrice) {
      message += "*TOTAL:* Consultar\n\n";
    } else if (couponTotals) {
      if (isScopedCoupon) {
        message += `*Subtotal productos con cupón:* ${pricePrefix}${couponTotals.eligible_subtotal.toLocaleString("es-AR")}\n`;
      } else {
        message += `*Subtotal original:* ~${pricePrefix}${Math.round(total).toLocaleString("es-AR")}~\n`;
      }
      message += `*Cupón ${couponTotals.code} (${couponTotals.percent}% OFF):* -${pricePrefix}${couponTotals.discount.toLocaleString("es-AR")}\n`;
      message += `*TOTAL CON DESCUENTO:* ${pricePrefix}${couponTotals.total.toLocaleString("es-AR")}\n\n`;
    } else {
      message += `*TOTAL:* ${pricePrefix}${total.toLocaleString("es-AR")}\n\n`;
    }

    // 🚚 info de envío (PRO y simple)
    message += "🚚 Envío: a coordinar con el vendedor\n\n";

    message += "_Los precios y la disponibilidad serán confirmados por el vendedor al responder el pedido._\n\n";

    message += "Gracias!";


    return message; // ⚠️ IMPORTANTE: SIN encode
  };


  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerData(prev => ({ ...prev, [name]: value }));
  };

  const selectPayment = (method) => {
    setCustomerData(prev => ({ ...prev, payment: method }));
  };


  const sendOrder = async () => {
    if (sendingOrder) return;

    if (!store.cart || store.cart.length === 0) {
      alert("Tu carrito está vacío");
      return;
    }

    if (!customerData.name.trim() || !customerData.phone.trim() || !customerData.zone.trim() || !customerData.payment) {
      alert("Por favor completá tus datos");
      return;
    }

    localStorage.setItem("customerData", JSON.stringify({
      ...customerData,
      coupon: couponTotals?.code || ""
    }));

    const phone = "5493765031782"; // ⚠️ CAMBIAR POR EL NÚMERO DEL VENDEDOR

    const orderText = buildWhatsAppMessage();

    const extraData = `
Datos del cliente:

Nombre: ${customerData.name}
Teléfono: ${customerData.phone}
Localidad / Zona: ${customerData.zone}
Pago: ${customerData.payment}
${couponTotals ? `Cupón aplicado: ${couponTotals.code} (${couponTotals.percent}% OFF)` : ""}

`;

    const finalMessage = orderText.replace(
      "Gracias!",
      `${extraData}Gracias!`
    );


    // 🔹 Construir items del pedido
    const isWholesale = window.location.pathname.startsWith("/mayorista");

    const orderItems = store.cart.map(item => {
      const product = getCartProduct(item);
      const productId = item.id || item.product_id || item.productId || product?.id;
      return {
        product_id: productId,   // 👈 obligatorio
        quantity: item.quantity,
        price: isWholesale
          ? (Number(item.price_wholesale ?? product?.price_wholesale) > 0 ? Number(item.price_wholesale ?? product?.price_wholesale) : 0)
          : (Number(item.price ?? product?.price) > 0 ? Number(item.price ?? product?.price) : 0),
        selected_flavor: item.selectedFlavor || null,
        selected_size_ml: getSelectedMl(item),
        brand: item.brand || item.product_brand || item.marca || item.product?.brand || product?.brand || "",
        category_id: item.category_id || item.product?.category_id || product?.category_id || null,
        category_ids: item.category_ids || item.product?.category_ids || product?.category_ids || [],
        category_name: item.category_name || item.product?.category_name || product?.category_name || "",
        category_names: item.category_names || item.product?.category_names || product?.category_names || [],
        is_best_seller: Boolean(item.is_best_seller || item.product?.is_best_seller || product?.is_best_seller)
      };
    });

    if (window.gtag) {
      window.gtag("event", "solicito_pedido_whatsapp", {
        cliente: customerData.name || "sin_nombre",
        cantidad_productos: store.cart.length,
        total: finalTotal
      });
    }


    const whatsappUrl = buildWhatsAppUrl(phone, finalMessage);
    const whatsappFallbackUrl = buildWhatsAppWebUrl(phone, finalMessage);

    const redirectToWhatsApp = () => {
      if (whatsappUrl.startsWith("whatsapp://")) {
        window.location.href = whatsappUrl;
        return;
      }
      const opened = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = whatsappUrl;
      }
    };

    setSendingOrder(true);

    const saveOrder = fetch(`${API}/public/orders`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customer_first_name: customerData.name,
        customer_last_name: "",
        customer_phone: customerData.phone,
        shipping_address: {
          city: customerData.zone,
          label: customerData.zone,
          phone: customerData.phone
        },
        payment_method: customerData.payment,
        order_items: orderItems,
        total_amount: finalTotal,
        coupon_code: couponTotals?.code || null,
        billing_address: couponTotals ? { coupon: couponTotals } : {},
        status: "pendiente"
      })
    });

    setWhatsappOrderPrompt({
      fallbackUrl: whatsappFallbackUrl,
      status: "saving"
    });
    setShowCheckout(false);
    redirectToWhatsApp();

    try {
      const response = await saveOrder;
      if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
      setWhatsappOrderPrompt(prev => prev ? { ...prev, status: "saved" } : prev);
    } catch (err) {
      console.error("Error guardando pedido:", err);
      setWhatsappOrderPrompt(prev => prev
        ? { ...prev, status: "failed" }
        : { fallbackUrl: whatsappFallbackUrl, status: "failed" }
      );
    } finally {
      setSendingOrder(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && isOpen && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const closeBtnRef = useRef(null);
  useEffect(() => {
    if (isOpen && closeBtnRef.current) closeBtnRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    // 🚨 Solo una vez al montar el componente
    if (window.location.pathname.includes("thank-you")) {
      actions.resetCartAfterPayment?.();
    }

    // Si el carrito está vacío, asegúrate de reflejarlo en localStorage
    if (Array.isArray(store.cart) && store.cart.length === 0) {
      localStorage.setItem("cart", JSON.stringify([]));
    }
  }, []); // 👈 Solo se ejecuta una vez al montar




  if (!controlledOpen && !isRouteMode && controlledOpen !== false) return null;

  const DrawerContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 sm:p-5 border-b">
        <h2 id="cart-title" className="text-xl sm:text-2xl font-serif tracking-wide">
          Tu selección
        </h2>
        <button
          ref={closeBtnRef}
          onClick={close}
          aria-label="Cerrar carrito"
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
        {!store.cart || store.cart.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p className="text-base sm:text-lg">Tu carrito está vacío</p>
            <button
              onClick={() => (isRouteMode ? navigate("/") : close())}
              className="mt-4 w-full bg-[#232325] text-white px-6 py-3 rounded-lg font-serif tracking-wide hover:bg-black transition-colors"
            >
              Ver más productos
            </button>
          </div>
        ) : (
          <>
            {store.cart.map((item) => {
              const max = (item?.selectedFlavor && Array.isArray(item?.flavor_catalog))
                ? (item.flavor_catalog.find(f => f?.name === item.selectedFlavor)?.stock ?? (Number.isFinite(Number(item?.stock)) ? Number(item.stock) : 0))
                : (Number.isFinite(Number(item?.stock)) ? Number(item.stock) : 0);

              const atLimit = Number(item.quantity || 0) >= Number(max || 0);
              const itemCouponTotals = getItemCouponTotals(item);

              return (
                <div key={`${item.id}-${item.selectedFlavor || 'default'}-${getSelectedMl(item) || 'na'}`} className="bg-white border rounded-lg p-3 sm:p-4 shadow-sm">
                  <div className="flex gap-3">
                    <img
                      src={toAbsUrl(item?.image_url) || "/sin_imagen.jpg"}
                      alt={getTitle(item)}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        if (!e.currentTarget.src.endsWith("/sin_imagen.jpg")) {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/sin_imagen.jpg";
                        }
                      }}
                    />

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-medium text-sm sm:text-base leading-snug">
                            {getTitle(item)}
                          </h4>
                          <p className="text-gray-900 font-semibold">
                            {getItemPrice(item) !== null
                              ? `${pricePrefix}${getItemPrice(item).toLocaleString("es-AR")}`
                              : "Consultar"}
                          </p>
                          {getSelectedMl(item) && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Tamaño: {getSelectedMl(item)}ml
                            </p>
                          )}

                        </div>
                        <button
                          onClick={() => actions.removeFromCart(item.id, item.selectedFlavor, getSelectedMl(item))}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Eliminar producto"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              actions.updateCartQuantity(
                                item.id,
                                Math.max(1, (item.quantity || 1) - 1),
                                item.selectedFlavor,
                                getSelectedMl(item)
                              )
                            }
                            aria-label="Disminuir cantidad"
                            className="w-9 h-9 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg"
                          >
                            -
                          </button>
                          <span className="min-w-[36px] text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              const next = Math.min((item.quantity || 1) + 1, Number(max || 0));
                              actions.updateCartQuantity(item.id, next, item.selectedFlavor, getSelectedMl(item));
                            }}
                            aria-label="Aumentar cantidad"
                            disabled={atLimit}
                            title={atLimit ? "Sin stock disponible" : "Aumentar cantidad"}
                            className={`w-9 h-9 rounded flex items-center justify-center text-lg ${atLimit ? "bg-gray-100 opacity-50 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200"}`}
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right font-semibold">
                          {getItemPrice(item) !== null
                            ? itemCouponTotals
                              ? (
                                <>
                                  <span className="block text-xs font-normal text-gray-400 line-through">
                                    {pricePrefix}{itemCouponTotals.original.toLocaleString("es-AR")}
                                  </span>
                                  <span className="block text-emerald-700">
                                    {pricePrefix}{itemCouponTotals.total.toLocaleString("es-AR")}
                                  </span>
                                </>
                              )
                              : `${pricePrefix}${(getItemPrice(item) * Number(item.quantity || 0)).toLocaleString("es-AR")}`
                            : "Consultar"}
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Subtotal */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-gray-700">
            Subtotal <span className="text-sm text-gray-400">(sin envío)</span> :
          </span>
          <span className="font-semibold">
            {pricePrefix}{total.toLocaleString("es-AR")}
          </span>
        </div>

        {store.cart && store.cart.length > 0 && (
          <CouponBox
            code={couponCode}
            onCodeChange={(value) => {
              setCouponCode(normalizeCouponCode(value));
              if (appliedCoupon) setAppliedCoupon(null);
              if (couponStatus) setCouponStatus(null);
            }}
            onApply={applyCoupon}
            onClear={clearCoupon}
            appliedCoupon={couponTotals}
            status={couponStatus}
            loading={validatingCoupon}
            subtotal={total}
            pricePrefix={pricePrefix}
            scoped={isScopedCoupon}
          />
        )}




        {/* Nuestro local */}
        {/*  <div>
          <h3 className="font-semibold mb-2">Retiro en nuestro local</h3>
          <label className="flex items-start gap-3 bg-white border rounded-lg p-3 sm:p-4 shadow-sm">
            <input
              type="checkbox"
              checked={pickup}
              className="mt-1 size-4 cart-checkbox"
              onChange={(e) => {
                setPickup(e.target.checked);
                actions.setPickup(e.target.checked);
              }}
            />


            <div className="flex-1">
              <p className="text-sm sm:text-base">
                Local Zarpados - Velez Sarsfield 303
                <span className="block text-gray-500">
                  Lunes a viernes 10:30hs a 13:00hs | 16:00hs a 22:00hs
                  <br />
                  Sábado 13:00hs a 22:00hs | Domingo cerrado
                </span>
              </p>
            </div>
            <span className="text-green-600 font-semibold">Gratis</span>
          </label>
        </div> */}
      </div>

      {/* Footer Totales / Acciones */}
      {store.cart && store.cart.length > 0 && (
        <div className="border-t p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xl font-semibold">Total:</span>
            <span className="text-right text-2xl font-semibold text-gray-900 font-serif tracking-wide">
              {couponTotals && !isScopedCoupon && (
                <span className="block text-sm font-sans font-normal text-gray-400 line-through">
                  {pricePrefix}{Math.round(total).toLocaleString("es-AR")}
                </span>
              )}
              {pricePrefix}{finalTotal.toLocaleString("es-AR")}
            </span>
          </div>

          <button
            onClick={() => setShowCheckout(true)}

            className="w-full bg-[#232325] text-white py-3 rounded-lg font-serif tracking-wide hover:bg-black transition-colors"
          >
            📦 Solicitar Pedido por WhatsApp
          </button>


          <div className="mt-4 text-center">
            {isRouteMode ? (
              <Link to="/" className="text-gray-700 font-serif tracking-wide hover:text-gray-900 transition-colors">
                Ver más productos
              </Link>
            ) : (
              <button onClick={close} className="text-gray-700 font-serif tracking-wide hover:text-gray-900 transition-colors">
                Ver más productos
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (isRouteMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto">{DrawerContent}</div>
      </div>
    );
  }

  const modalUI = (
    <div className={`fixed inset-0 z-[100] ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-500 ease-out ${isOpen ? "opacity-100" : "opacity-0"
          }`}
        onClick={close}
      />
      <aside
        className={`
          absolute right-0 top-0
          h-screen w-full max-w-md md:max-w-lg
          bg-white shadow-2xl
          transform transition-transform duration-500 ease-out
          ${controlledOpen ? "translate-x-0" : "translate-x-full"}
          flex flex-col text-gray-900
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
      >
        {DrawerContent}
      </aside>
    </div>
  );



  return createPortal(
    <>
      {modalUI}

      {showCheckout && (
        <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center z-[200] overflow-y-auto px-4 py-4 sm:py-6">
          <div className="bg-white rounded-lg p-5 sm:p-6 w-full max-w-md shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <h2 className="text-2xl font-serif tracking-wide text-gray-900 mb-3 text-center">
              Datos para el pedido
            </h2>
            <div className="w-12 h-[2px] bg-gray-900 mb-6 mx-auto"></div>

            <p className="text-sm text-gray-500 font-serif tracking-wide mb-5">
              Guardamos tus datos para futuras compras.
            </p>

            <input
              type="text"
              name="name"
              placeholder="Nombre y Apellido"
              value={customerData.name}
              onChange={handleCustomerChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 font-serif tracking-wide focus:outline-none focus:border-gray-900"
            />

            <input
              type="tel"
              name="phone"
              placeholder="Teléfono"
              value={customerData.phone}
              onChange={handleCustomerChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 font-serif tracking-wide focus:outline-none focus:border-gray-900"
            />

            <input
              type="text"
              name="zone"
              placeholder="Zona / Localidad"
              value={customerData.zone}
              onChange={handleCustomerChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 font-serif tracking-wide focus:outline-none focus:border-gray-900"
            />

            <div className="mb-4">
              <p className="text-sm font-serif tracking-wide mb-3 text-gray-800">Forma de pago</p>

              <div className="space-y-2 text-sm">
                {["Envío dentro de Posadas", "Envío fuera de Posadas", "Retiro en puerta"].map(method => {
                  const selected = customerData.payment === method;

                  return (
                    <label
                      key={method}
                      className={`flex items-center gap-3 cursor-pointer border rounded-md px-3 py-2 transition
     ${selected
                          ? "bg-[#232325] text-white border-black shadow-sm"
                          : "bg-white hover:bg-gray-50 border-gray-300"}
      `}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={selected}
                        onChange={() => selectPayment(method)}
                        className="accent-gray-900"
                      />
                      {method}
                    </label>
                  );
                })}

              </div>
            </div>
            <p className="text-sm text-gray-500 font-serif tracking-wide mt-3 mb-5 text-center">
              📦 Envío disponible <br />
              <span className="italic">El costo se coordina con el vendedor.</span>
            </p>


            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCheckout(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-serif tracking-wide hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>

              <button
                onClick={sendOrder}
                disabled={sendingOrder}
                className="px-4 py-2 bg-[#232325] text-white rounded-lg font-serif tracking-wide hover:bg-black transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingOrder ? "Guardando..." : "Enviar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {whatsappOrderPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[210]">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-xl">
            <h2 className="text-xl font-serif tracking-wide text-gray-900 mb-3 text-center">
              {whatsappOrderPrompt.status === "failed"
                ? "Error al registrar el pedido"
                : "Pedido Registrado"}
            </h2>
            <p className="text-sm text-gray-500 font-serif tracking-wide mb-5 text-center">
              Si WhatsApp no se abrió, podés abrirlo de nuevo haciendo click en "Abrir WhatsApp".
            </p>
            {whatsappOrderPrompt.status === "saving" && (
              <p className="text-xs text-gray-500 font-serif tracking-wide mb-4 text-center">
                Registrando pedido...
              </p>
            )}
            {whatsappOrderPrompt.status === "failed" && (
              <p className="text-xs text-red-600 font-serif tracking-wide mb-4 text-center">
                Hubo un problema al registrar el pedido. Si no llegaste a enviarlo por WhatsApp, intentá nuevamente.
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {/*  <button
                onClick={() => {
                  actions.clearCart?.();
                  setWhatsappOrderPrompt(null);
                  setShowCheckout(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg font-serif tracking-wide hover:bg-gray-100 transition-colors"
              >
                Cerrar
              </button> */}
              <button
                onClick={() => openWhatsAppFallbackUrl(whatsappOrderPrompt.fallbackUrl)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-serif tracking-wide hover:bg-gray-100 transition-colors"
              >
                Abrir WhatsApp
              </button>
              <button
                onClick={() => {
                  actions.clearCart?.();
                  clearCoupon();
                  setWhatsappOrderPrompt(null);
                  setShowCheckout(false);
                }}
                className="px-4 py-2 bg-[#232325] text-white rounded-lg font-serif tracking-wide hover:bg-black transition-colors"
              >
                Ya envié el pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );

}
