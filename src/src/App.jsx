
import { Routes, Route } from "react-router";

import ScrollToTop from "./components/ScrollToTop";

import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";

import Home from "./pages/store/Home";
import Products from "./pages/store/Products";
import ProductDetails from "./pages/store/ProductDetails";
import Cart from "./pages/store/Cart";
import Checkout from "./pages/store/Checkout";
import OrderSuccess from "./pages/store/OrderSuccess";
import TrackOrder from "./pages/store/TrackOrder";
import Contact from "./pages/store/Contact";
import NotFound from "./pages/store/NotFound";

import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminCategories from "./pages/admin/Categories";
import AdminBrands from "./pages/admin/Brands";
import AdminBanners from "./pages/admin/Banners";
import ProductVariants from "./pages/admin/ProductVariants";
import AdminMessages from "./pages/admin/Messages";
import ProtectedRoute from "./components/admin/ProtectedRoute";

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route
          path="/products/:id"
          element={<ProductDetails />}
        />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/track-order" element={<TrackOrder />} />
        <Route path="/order-success" element={<OrderSuccess />} />
      </Route>

      <Route path="/admin/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="products"
          element={<AdminProducts />}
        />
        <Route
          path="products/:id/variants"
          element={<ProductVariants />}
        />
        <Route path="orders" element={<AdminOrders />} />
        <Route
          path="categories"
          element={<AdminCategories />}
        />
        <Route path="brands" element={<AdminBrands />} />
        <Route path="banners" element={<AdminBanners />} />
        <Route path="messages" element={<AdminMessages />} />
      </Route>

      <Route element={<MainLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </>
  );
}
