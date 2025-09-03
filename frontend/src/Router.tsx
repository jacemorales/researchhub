import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import UserLayout from './user/UserLayout';
import AdminLayout from './admin/AdminLayout';

// User Pages
import Home from './user/Home';
import Marketplace from './user/pages/Marketplace';

// Admin Pages
import AdminDashboard from './admin/pages/Dashboard';
import PaymentsPage from './admin/pages/PaymentsPage';
import WebsiteConfigPage from './admin/pages/WebsiteConfigPage';

const NotFound = () => <h1>404 - Not Found</h1>;

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/user" replace />} />

                {/* User Routes */}
                <Route path="/user" element={<UserLayout />}>
                    <Route index element={<Home />} />
                    <Route path="marketplace" element={<Marketplace />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="payments" element={<PaymentsPage />} />
                    <Route path="config" element={<WebsiteConfigPage />} />
                </Route>

                {/* 404 Not Found Route */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;
