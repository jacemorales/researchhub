// Header.tsx
import "../assets/admin.css";
import "../assets/config.css";
import { useState } from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="admin-navbar">
      <div className="navbar-brand">
        <i className="fas fa-graduation-cap"></i>
        <span>Research Hub Admin</span>
      </div>
      
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-toggle" 
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>

      {/* Desktop Navigation */}
      <div className="navbar-actions desktop-nav">
        <Link to="/admin" className="nav-link">
          <i className="fas fa-cloud"></i>
          <span>Drive Files</span>
        </Link>
        <Link to="/admin/settings" className="nav-link">
          <i className="fas fa-cog"></i>
          <span>Website Config</span>
        </Link>
        <Link to="/admin/payments" className="nav-link">
          <i className="fas fa-credit-card"></i>
          <span>Payments</span>
        </Link>
        <Link to="/user" className="btn-view-users">
          <i className="fas fa-users"></i> View Users
        </Link>
      </div>

      {/* Mobile Navigation Menu */}
      <div className={`mobile-nav ${isMenuOpen ? 'open' : ''}`}>
        <Link to="/admin" className="nav-link" onClick={() => setIsMenuOpen(false)}>
          <i className="fas fa-cloud"></i>
          <span>Drive Files</span>
        </Link>
        <Link to="/admin/settings" className="nav-link" onClick={() => setIsMenuOpen(false)}>
          <i className="fas fa-cog"></i>
          <span>Website Config</span>
        </Link>
        <Link to="/admin/payments" className="nav-link" onClick={() => setIsMenuOpen(false)}>
          <i className="fas fa-credit-card"></i>
          <span>Payments</span>
        </Link>
        <Link to="/user" className="btn-view-users" onClick={() => setIsMenuOpen(false)}>
          <i className="fas fa-users"></i> View Users
        </Link>
      </div>
    </nav>
  );
};

export default Header;