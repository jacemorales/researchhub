import React from 'react';
import { NavLink } from 'react-router-dom';

const Header: React.FC = () => {
    return (
        <nav className="admin-navbar">
            <div className="navbar-brand">
                <i className="fas fa-graduation-cap"></i>
                <span>Admin Panel</span>
            </div>
            <div className="navbar-actions">
                <NavLink to="/admin/home" className="nav-link">
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
                <button className="btn-logout">
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Sign Out</span>
                </button>
            </div>
        </nav>
    );
};

export default Header;
