import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// User pages
import Home from "./user/Home";
import Marketplace from "./user/pages/Marketplace";
import PaymentScriptLoader from "./payments/PaymentScriptLoader";

// Admin pages
// import Home from "./admin/Home";
// import Settings from "./admin/pages/Settings";
// import Payments from "./admin/pages/Payments";

const NotFound = () => <h1>404 - Not Found</h1>;

const App = () => {
  return (
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
        {/* <Route path="/admin" element={<Home/>} /> */}
        {/* <Route path="/admin/settings" element={<Settings/>} /> */}
        {/* <Route path="/admin/payments" element={<Payments/>} /> */}

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
