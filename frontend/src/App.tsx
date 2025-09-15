// routes/AppRoutes.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// Lazy load components //
const UserHome = lazy(() => import("./user/Home"));
const Marketplace = lazy(() => import("./user/pages/Marketplace"));
const PaymentScriptLoader = lazy(() => import("./payments/PaymentScriptLoader"));

const Admin = lazy(() => import("./admin/Admin"));
 import Settings from "./admin/pages/Settings";
// import Payments from "./admin/pages/Payments";


const Loading = () => <div>Loading...</div>;

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

          {/* Admin Route */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/settings" element={<Settings />} />
          {/* <Route path="/admin/payments" element={<Payments/>} /> */}

          {/* Fallback */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;