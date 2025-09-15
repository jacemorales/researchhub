import "../assets/admin.css";
import "../assets/config.css";



const Header = () => {
  return (
    <nav className="admin-navbar">
      <div className="navbar-brand">
        <i className="fas fa-graduation-cap"></i>
        <span>Research Hub Admin</span>
      </div>
      <div className="navbar-actions">
        <a href="/admin" className="nav-link">
          <i className="fas fa-cloud"></i>
          <span>Drive Files</span>
        </a>
        <a href="/admin/settings" className="nav-link">
          <i className="fas fa-cog"></i>
          <span>Website Config</span>
        </a>
        <a href="/admin/payments" className="nav-link">
          <i className="fas fa-credit-card"></i>
          <span>Payments</span>
        </a>
        <a href="/user" className="btn-view-users">
          <i className="fas fa-users"></i> View Users
        </a>
      </div>
    </nav>
  );
};

export default Header;