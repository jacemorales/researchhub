import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./components/Header";
import "./assets/css/config.css";
import "./assets/css/admin.css";

const AdminLayout: React.FC = () => {
    return (
        <div className="admin-container">
            <Header />
            <main className="admin-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
