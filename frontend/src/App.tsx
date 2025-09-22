// routes/AppRoutes.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// Lazy load components //
const UserHome = lazy(() => import("./user/Home"));
const Marketplace = lazy(() => import("./user/pages/Marketplace"));
const PaymentScriptLoader = lazy(() => import("./payments/PaymentScriptLoader"));

const Admin = lazy(() => import("./admin/Admin"));
const AdminLogin = lazy(() => import("./admin/pages/Login"));
const ProtectedRoute = lazy(() => import("./admin/components/ProtectedRoute"));
const Settings = lazy(() => import("./admin/pages/Settings"));
const Payments = lazy(() => import("./admin/pages/Payments"));



import Loading from './hooks/Loading';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/user" replace />} />

          {/* User Routes */}
          <Route path="/user" element={<UserHome />} />
          <Route path="/user/marketplace" element={<Marketplace />} />

          {/* Payment Route */}
          <Route path="/payments/*" element={<PaymentScriptLoader />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/admin/payments" element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          } />

          {/* Fallback - Redirect to user page */}
          <Route path="*" element={<Navigate to="/user" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;