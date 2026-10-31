import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('parasync-theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('parasync-theme', theme);
  }, [theme]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      window.alert(error.message);
    }
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" aria-label="LocoMuv হোম">
          <img className="brand-logo" src="/locomuv-logo.png" alt="" />
          <span>Loco<b>Muv</b></span>
        </Link>
        <nav className="nav-actions" aria-label="প্রধান নেভিগেশন">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? 'ডার্ক থিম চালু করুন' : 'লাইট থিম চালু করুন'}
            title={theme === 'light' ? 'ডার্ক থিম' : 'লাইট থিম'}
          >
            {theme === 'light' ? '☾' : '☀'}
          </button>
          {user ? (
            <>
              <span className="nav-user"><span className="online-dot" />{user.name}</span>
              <Link to="/dashboard" className="nav-dashboard">ড্যাশবোর্ড</Link>
              <button className="button button-outline button-small" onClick={handleLogout}>লগআউট</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-login">লগইন</Link>
              <Link to="/register" className="button button-primary button-small">অ্যাকাউন্ট খুলুন <span aria-hidden="true">↗</span></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
