import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/banner.css';
import './styles/notifications.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SupabaseProvider } from './context/SupabaseContext';
import { AdminNotificationsProvider } from './context/AdminNotificationsContext';
import { ToastSettingsProvider } from './context/ToastSettingsContext';
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute';
import { ThemeProvider } from './components/ThemeProvider';
import { ToastProvider } from './components/CustomToast';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { AccountPage } from './pages/AccountPage';
import { ContactPage } from './pages/ContactPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage';
import { CheckoutCancelPage } from './pages/CheckoutCancelPage';
import { CheckoutReturnPage } from './pages/CheckoutReturnPage';
import { CheckoutRedirectHandler } from './components/CheckoutRedirectHandler';
import { AuthCallback } from './pages/AuthCallback';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLogin } from './pages/admin/AdminLogin';
import { ProductList } from './pages/admin/ProductList';
import { InquiriesList } from './pages/admin/InquiriesList';
import { UserList } from './pages/admin/UserList';
import { OrdersList } from './pages/admin/OrdersList';
import { SettingsPage } from './pages/admin/SettingsPage';
import { CreateProduct } from './pages/admin/CreateProduct';
import { EditProduct } from './pages/admin/EditProduct';
import { StoreFront } from './pages/admin/StoreFront';
import { MailingList } from './pages/admin/MailingList';
import { ReviewsList } from './pages/admin/ReviewsList';
import TestLoginDebug from './components/TestLoginDebug';
import FixedLoginDebugPage from './pages/FixedLoginDebugPage';
import PasswordDebugPage from './pages/PasswordDebugPage';
import AdminUserDebugPage from './pages/AdminUserDebugPage';
import UserManagementDebugPage from './pages/UserManagementDebugPage';
import OrderDiagnosticPage from './pages/OrderDiagnosticPage';
import ReviewDebugPage from './pages/ReviewDebugPage';

// Component to conditionally render the footer
const AppLayout = () => {
  const location = useLocation();

  // Check if the current path is an admin path
  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <div id="layout-container" className="flex flex-col min-h-screen w-full">
      <div className="sticky-header-container">
        <AnnouncementBanner />
        <Navbar />
      </div>
      <main className="flex-grow">
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
            <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
            <Route path="/checkout/return" element={<CheckoutReturnPage />} />
            <Route path="/checkout/redirect" element={<CheckoutRedirectHandler />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/debug-login" element={<TestLoginDebug />} />
            <Route path="/fixed-login" element={<FixedLoginDebugPage />} />
            <Route path="/password-debug" element={<PasswordDebugPage />} />
            <Route path="/admin-user-debug" element={<AdminUserDebugPage />} />
            <Route path="/user-management-debug" element={<UserManagementDebugPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/order-diagnostic" element={<OrderDiagnosticPage />} />
            <Route path="/review-debug" element={<ReviewDebugPage />} />

            {/* TEMPORARY: Direct access to admin dashboard */}
            <Route path="/admin-access" element={
              <Navigate to="/admin/products" replace />
            } />

            {/* Protected Admin Routes */}
            <Route element={<ProtectedAdminRoute />}>
              <Route path="/admin" element={
                <AdminNotificationsProvider>
                  <AdminLayout />
                </AdminNotificationsProvider>
              }>
                <Route index element={<ProductList />} />
                <Route path="products" element={<ProductList />} />
                <Route path="orders" element={<OrdersList />} />
                <Route path="storefront" element={<StoreFront />} />
                <Route path="inquiries" element={<InquiriesList />} />
                <Route path="mailing-list" element={<MailingList />} />
                <Route path="users" element={<UserList />} />
                <Route path="reviews" element={<ReviewsList />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="products/new" element={<CreateProduct />} />
                <Route path="products/:id/edit" element={<EditProduct />} />
              </Route>
            </Route>
          </Routes>
        </div>
      </main>
      {/* Only render the Footer if not on an admin page */}
      {!isAdminPath && <Footer />}
    </div>
  );
};

export default function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <CartProvider>
          <ToastSettingsProvider>
            <ThemeProvider>
              <ToastProvider>
                <Router>
                  <ToastContainer
                    position="bottom-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                  />
                  <AppLayout />
                </Router>
              </ToastProvider>
            </ThemeProvider>
          </ToastSettingsProvider>
        </CartProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}