import React from 'react';
import { NavLink } from 'react-router-dom';

interface AdminHeaderProps {
    onLogout: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onLogout }) => {
    const siteName = process.env.REACT_APP_SITE_NAME || 'Research Hub';

    return (
        <nav className="admin-navbar">
            <div className="navbar-brand">
                <i className="fas fa-graduation-cap"></i>
                <span>{siteName} Admin</span>
            </div>
            <div className="navbar-actions">
                <NavLink to="/admin" className="nav-link" end>
                    <i className="fas fa-cloud"></i>
                    <span>Drive Files</span>
                </NavLink>
                <NavLink to="/admin/config" className="nav-link">
                    <i className="fas fa-cog"></i>
                    <span>Website Config</span>
                </NavLink>
                <NavLink to="/admin/payments" className="nav-link">
                    <i className="fas fa-credit-card"></i>
                    <span>Payments</span>
                </NavLink>
                <button onClick={onLogout} className="btn-logout">
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Sign Out</span>
                </button>
            </div>
        </nav>
    );
};

export default AdminHeader;
