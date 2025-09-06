import React from "react";
import { NavLink } from "react-router-dom";
import { useData } from "../../hooks/useData";
import { signOutFromGoogle } from "../utils/googleApi";

const Header: React.FC = () => {
    const { website_config } = useData();

    const handleLogout = () => {
        signOutFromGoogle();
        // You might want to redirect to a login page or the home page after logout.
        window.location.href = "/";
    };

    return (
        <>
            <nav className="admin-navbar">
                <div className="navbar-brand">
                <i className="fas fa-graduation-cap"></i>
                <span>{website_config?.site_name} Admin</span>
            </div>
            <div className="navbar-actions">
                <NavLink to="/admin" className="nav-link" end>
                    <i className="fas fa-cloud"></i>
                    <span>Drive Files</span>
                </NavLink>
                <NavLink to="/admin/settings" className="nav-link">
                    <i className="fas fa-cog"></i>
                    <span>Website Config</span>
                </NavLink>
                <NavLink to="/admin/payments" className="nav-link">
                    <i className="fas fa-credit-card"></i>
                    <span>Payments</span>
                </NavLink>
                <button onClick={handleLogout} className="btn-logout">
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Sign Out</span>
                </button>
            </div>
        </nav>
        </>
    );
};

export default Header;
