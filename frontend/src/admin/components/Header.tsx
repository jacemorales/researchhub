import "../assets/css/admin.css";
import "../assets/css/config.css";
// 👇 DEFINE UserProfile HERE TOO — OR EXPORT/IMPORT FROM Admin.tsx
interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

interface HeaderProps {
  user: UserProfile | null; // ✅ Now TypeScript knows what UserProfile is
  onLogin: () => void;
  onLogout: () => void;
}

const Header = ({ user, onLogin, onLogout }: HeaderProps) => {
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
        <a href="/settings" className="nav-link">
          <i className="fas fa-cog"></i>
          <span>Website Config</span>
        </a>
        <a href="/payments" className="nav-link">
          <i className="fas fa-credit-card"></i>
          <span>Payments</span>
        </a>

        {!user ? (
          <button onClick={onLogin} className="btn-auth">
            <i className="fab fa-google"></i> Sign in
          </button>
        ) : (
          <button onClick={onLogout} className="btn-logout">
            <i className="fas fa-sign-out-alt"></i> Sign Out
          </button>
        )}
      </div>
    </nav>
  );
};

export default Header;