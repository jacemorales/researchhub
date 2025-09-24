// Header.tsx
import "../assets/admin.css";
import "../assets/config.css";
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navLinks = [
    { to: "/admin", icon: "fas fa-cloud", text: "Drive Files" },
    { to: "/admin/settings", icon: "fas fa-cog", text: "Website Config" },
    { to: "/admin/payments", icon: "fas fa-credit-card", text: "Payments" },
  ];

  return (
    <nav className="admin-navbar">
      <div className="navbar-brand">
        <i className="fas fa-graduation-cap"></i>
        <span>Research Hub</span>
      </div>
      
      <div className="navbar-center desktop-nav">
        {navLinks.map(link => (
          <Link 
            key={link.to} 
            to={link.to} 
            className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
          >
            <i className={link.icon}></i>
            <span>{link.text}</span>
          </Link>
        ))}
      </div>

      <div className="navbar-actions desktop-nav">
        <Link to="/user" className="btn view-users">
          <i className="fas fa-users"></i>
          <span>View Site</span>
        </Link>
      </div>

      <button 
        className="mobile-menu-toggle" 
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>

      <div className={`mobile-nav ${isMenuOpen ? 'open' : ''}`}>
        <ul>
          {navLinks.map(link => (
            <li key={link.to}>
              <Link 
                to={link.to} 
                className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <i className={link.icon}></i>
                <span>{link.text}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link to="/user" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              <i className="fas fa-users"></i>
              <span>View Site</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Header;