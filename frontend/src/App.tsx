import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// User pages
import Home from "./user/Home";
import Marketplace from "./user/pages/Marketplace";
import PaymentScriptLoader from "./payments/PaymentScriptLoader";

// Admin pages
import AdminLayout from "./admin/AdminLayout";
import AdminHome from "./admin/pages/Home";
import Settings from "./admin/pages/Settings";
import Payments from "./admin/pages/Payments";
import { DataProvider } from "./hooks/useData";


const NotFound = () => <h1>404 - Not Found</h1>;

const App = () => {
  return (
    <DataProvider>
        <BrowserRouter>
          <Routes>
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/user" replace />} />

            {/* User routes */}
            <Route path="/user" element={<Home />} />
            <Route path="/user/marketplace" element={<Marketplace />} />

            {/* Payment script route */}
            <Route path="/payments/*" element={<PaymentScriptLoader />} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminHome />} />
              <Route path="home" element={<AdminHome />} />
              <Route path="settings" element={<Settings />} />
              <Route path="payments" element={<Payments />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
    </DataProvider>
  );
};

export default App;
