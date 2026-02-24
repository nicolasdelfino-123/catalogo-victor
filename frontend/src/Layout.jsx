import React, { useContext, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import injectContext, { Context } from "./js/store/appContext.jsx";
import { setWholesaleMode } from "./utils/wholesaleMode.js";



// Vistas
import Inicio from "./views/InicioNuevo.jsx";
import ProductDetail from "./views/ProductDetail.jsx";
import Login from "./views/Login.jsx";
import Register from "./views/Register.jsx";
import SetupPassword from "./views/SetupPassword.jsx";
import ResetPassword from "./views/ResetPassword.jsx";
import Logout from "./views/Logout.jsx";
import Mayorista from "./views/Mayorista.jsx";
import ThankYou from "./views/ThankYou.jsx";

// Componentes
import Cart from "./components/Cart.jsx";
import ProductGrid from "./components/ProductGrid.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import NewToast from "./components/NewToast.jsx";
import FloatingButtons from "./components/FloatingButtons.jsx";

// Admin & Cuenta
import AdminProducts from "./views/AdminProducts.jsx";
import LoginAdmin from "./views/LoginAdmin.jsx";
import AccountLayout from "./views/AccountLayout.jsx";
import Dashboard from "./views/Dashboard.jsx";
import OrderListPage from "./views/OrderListPage.jsx";
import OrderDetailPage from "./views/OrderDetailPage.jsx";
import AddressesPage from "./views/AddressesPage.jsx";
import AccountDetailsPage from "./views/AccountDetailsPage.jsx";

// Otros
import Checkout from "./components/Checkout.jsx";
import CheckoutSuccess from "./views/CheckoutSuccess.jsx";
import CheckoutFailure from "./views/CheckoutFailure.jsx";
import CheckoutPending from "./views/CheckoutPending.jsx";
import AdminPedidos from "./views/AdminPedidos.jsx";
import Devoluciones from "./views/Devoluciones.jsx";
import Envios from "./views/Envios.jsx";
import AvisoLegal from "./views/AvisoLegal.jsx";
import ThankYouTransfer from "./components/ThankYouTransfer.jsx";

// Spinner inicio
import Spinner from "./components/Spinner.jsx";
import heroBg from '@/assets/hero-bg.png';
import banner1 from '@/assets/banner-1.png';
import recargables from '@/assets/recargables.png';
import celu from '@/assets/celu.png';
import desechables from '@/assets/desechables.png';
import perfumes from '@/assets/perfumes.png';
import accesorios from '@/assets/accesorios.png';
import liquidos from '@/assets/liquidos.png';
import InicioNuevo from "./views/InicioNuevo.jsx";


// ===============================
// Spinner con fade suave
// ===============================
const InicioWithSpinner = ({ images }) => {
  const [showPage, setShowPage] = useState(false);

  return (
    <>
      <Spinner images={images} minDelay={800} onLoadComplete={() => setShowPage(true)} />
      <div className={showPage ? 'opacity-100' : 'opacity-0'}
        style={{ transition: 'opacity 3s ease-in-out' }}>
        <Inicio />
      </div>
    </>
  );
};


// ===============================
// Observa la URL y activa modo mayorista
// ===============================


const ModeWatcher = () => {
  const location = useLocation();

  useEffect(() => {
    const isWholesale = location.pathname.startsWith("/mayorista");

    setWholesaleMode(isWholesale);

    // 👇 AGREGAR ESTA LÍNEA
    window.dispatchEvent(new Event("wholesaleModeChanged"));

  }, [location.pathname]);

  return null;
};




const Layout = () => {
  const { store, actions } = useContext(Context);

  const inicioImages = [
    heroBg, banner1, recargables, celu,
    desechables, perfumes, accesorios, liquidos
  ];

  // ===============================
  // Inicialización global app
  // ===============================
  useEffect(() => {
    const init = async () => {

      // mantiene modo mayorista al recargar
      actions.hydrateWholesaleMode?.();

      const skipHydrate = window.location.pathname.includes("thank-you");

      if (!skipHydrate) {
        actions.hydrateCart?.();
      }

      await actions.hydrateSession?.();
      await actions.fetchCategoriesFromAPI?.();

      if (!store.products || store.products.length === 0) {
        await actions.fetchProducts?.();
      }
    };

    init();
  }, [actions]);


  return (
    <div>
      <BrowserRouter>

        {/* 🔥 Detecta si estamos en /mayorista */}
        <ModeWatcher />

        <FloatingButtons />
        <Header />

        <Routes>

          {/* Inicio */}
          {/*       <Route path="/" element={<InicioWithSpinner images={inicioImages} />} /> */}
          <Route path="/" element={<InicioNuevo images={inicioImages} />} />
          {/*     <Route path="/inicio" element={<InicioWithSpinner images={inicioImages} />} /> */}
          <Route path="/inicio" element={<InicioNuevo />} />

          {/* Productos */}
          <Route path="/products" element={<ProductGrid />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/categoria/:slug" element={<ProductGrid />} />

          {/* 🔥 RUTA BASE MAYORISTA (CLAVE) */}
          {/* Mayorista landing */}
          <Route path="/mayorista" element={<Mayorista />} />

          {/* Mayorista inicio */}
          <Route path="/mayorista/inicio" element={<InicioWithSpinner images={inicioImages} />} />

          {/* Mayorista productos */}
          <Route path="/mayorista/products" element={<ProductGrid />} />

          <Route path="/mayorista/product/:id" element={<ProductDetail />} />

          <Route path="/mayorista/categoria/:slug" element={<ProductGrid key="mayorista" />} />


          <Route path="/categoria/:slug" element={<ProductGrid key="minorista" />} />





          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/setup-password" element={<SetupPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/logout" element={<Logout />} />

          {/* Carrito y checkout */}
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/failure" element={<CheckoutFailure />} />
          <Route path="/checkout/pending" element={<CheckoutPending />} />

          {/* Admin */}
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/login" element={<LoginAdmin />} />
          <Route path="/admin/pedidos" element={<AdminPedidos />} />

          {/* Otros */}
          <Route path="/devoluciones" element={<Devoluciones />} />
          <Route path="/envios" element={<Envios />} />
          <Route path="/aviso-legal" element={<AvisoLegal />} />
          <Route path="/thank-you-transfer" element={<ThankYouTransfer />} />

          {/* Cuenta */}
          <Route path="/cuenta" element={<AccountLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="pedidos" element={<OrderListPage />} />
            <Route path="pedidos/:orderId" element={<OrderDetailPage />} />
            <Route path="direcciones" element={<AddressesPage />} />
            <Route path="detalles" element={<AccountDetailsPage />} />
            <Route path="cerrar" element={<Logout />} />
          </Route>

          {/* pagos */}
          <Route path="/pago/exitoso" element={<ThankYou />} />
          <Route path="/pago/fallido" element={<ThankYou />} />
          <Route path="/pago/pendiente" element={<ThankYou />} />
          <Route path="/thank-you" element={<ThankYou />} />

        </Routes>

        <Footer />

      </BrowserRouter>

      <NewToast toast={store.toast} onClose={() => actions.hideToast()} />
    </div>
  );
};

export default injectContext(Layout);
