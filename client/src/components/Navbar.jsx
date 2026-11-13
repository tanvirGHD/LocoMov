import { ArrowRightFromLine, ArrowUpRight, Bell, Globe2, LayoutDashboard, LogOut, ShieldCheck, UserCircle2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const translations = {
  en: {
    brand: 'LocoMuv home',
    dashboard: 'Dashboard',
    login: 'Login',
    register: 'Create account',
    logout: 'Logout',
    nav: 'Main navigation',
    language: 'English',
  },
  bn: {
    brand: 'লোকোমুভ হোম',
    dashboard: 'ড্যাশবোর্ড',
    login: 'লগইন',
    register: 'অ্যাকাউন্ট তৈরি',
    logout: 'লগআউট',
    nav: 'মেইন নেভিগেশন',
    language: 'বাংলা',
  },
};

export default function Navbar({ language = 'en', setLanguage }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const t = translations[language] || translations.en;
  const showLandingLinks = location.pathname === '/';

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await api.notifications();
      setNotifications(response.notifications || []);
    } catch (error) {
      // Ignore notification fetch failures in the navbar to avoid breaking the page.
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = window.setInterval(fetchNotifications, 15000);
    return () => window.clearInterval(timer);
  }, [user]);

  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const visibleNotifications = showAllNotifications ? notifications : notifications.slice(0, 3);

  useEffect(() => {
    if (!notifications.length) return undefined;
    const unreadItems = notifications.filter((item) => !item.readAt);
    if (unreadItems.length === 0) return undefined;

    const timeoutId = window.setTimeout(() => {
      unreadItems.forEach((item) => handleMarkRead(item._id));
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [notifications]);

  async function handleMarkRead(notificationId) {
    if (!notificationId) return;
    try {
      await api.markNotificationRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.markAllNotificationsRead();
      await fetchNotifications();
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      window.alert(error.message);
    }
  }

  function toggleLanguage() {
    setLanguage((current) => (current === 'en' ? 'bn' : 'en'));
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" aria-label={t.brand}>
          <span className="brand-logo-crop"><img className="brand-logo" src="/locomuv-logo.png" alt="" /></span>
          <span className="brand-wordmark">Loco<b>Muv</b></span>
        </Link>
        <nav className="nav-actions" aria-label={t.nav}>
          {showLandingLinks && <div className="landing-nav-links">
            <a href="#how-it-works">{language === 'bn' ? 'যেভাবে কাজ করে' : 'How it works'}</a>
            <a href="#trust">{language === 'bn' ? 'নিরাপত্তা' : 'Safety & trust'}</a>
            <a href="#errands">{language === 'bn' ? 'সাম্প্রতিক কাজ' : 'Recent errands'}</a>
            <a href="#faq">FAQ</a>
          </div>}
          <button type="button" className="language-switch" onClick={toggleLanguage} aria-label="Toggle language">
            <Globe2 size={15} />
            <span>{language === 'en' ? 'EN / বাংলা' : 'বাংলা / EN'}</span>
          </button>
          {user ? (
            <>
              <div className="notification-wrap">
                <button type="button" className="notification-bell" onClick={() => setShowNotifications((current) => !current)} aria-label="Notifications">
                  <Bell size={16} />
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </button>
                {showNotifications && <div className="notification-dropdown">
                  <div className="notification-header">
                    <strong>Notifications</strong>
                    {unreadCount > 0 && <button type="button" className="text-button" onClick={handleMarkAllRead}>Mark all read</button>}
                  </div>
                  {notifications.length === 0 ? <div className="notification-empty">No notifications yet.</div> : (
                    <>
                      {visibleNotifications.map((item) => (
                        <div key={item._id} className={`notification-item ${item.readAt ? '' : 'unread'}`}>
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.message}</p>
                          </div>
                          {!item.readAt && <button type="button" className="text-button" onClick={() => handleMarkRead(item._id)}>Mark read</button>}
                        </div>
                      ))}
                      {notifications.length > 3 && (
                        <button type="button" className="notification-see-all" onClick={() => setShowAllNotifications((current) => !current)}>
                          {showAllNotifications ? 'Show recent 3' : 'See all'}
                        </button>
                      )}
                    </>
                  )}
                </div>}
              </div>
              <Link to="/dashboard" className="nav-dashboard" aria-label={t.dashboard} title={t.dashboard}><LayoutDashboard size={15} /> <span>{t.dashboard}</span></Link>

              <div className="nav-user-corner" title={`${user.name} · ${user.area || 'Neighborhood'}`}>
                <div className="nav-avatar-ring">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="nav-avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.nav-avatar-fallback');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="nav-avatar-fallback"
                    style={{ display: user.avatarUrl ? 'none' : 'flex' }}
                  >
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="nav-online-dot" title="Active" />
                </div>

                <div className="nav-user-text">
                  <span className="nav-user-name">{user.name}</span>
                  {user.role === 'admin' ? (
                    <span className="nav-admin-prominent-badge">
                      <ShieldCheck size={11} /> ADMIN
                    </span>
                  ) : (
                    <span className={`nav-user-role-badge role-${user.role}`}>
                      {user.role === 'runner'
                        ? (user.verificationStatus === 'pending' ? 'Runner (Pending)' : 'Verified Runner')
                        : 'Customer'}
                    </span>
                  )}
                </div>
              </div>

              <button className="nav-logout" onClick={handleLogout} type="button" aria-label={t.logout} title={t.logout}>
                <ArrowRightFromLine size={15} />
                <span>{t.logout}</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-login">{t.login}</Link>
              <Link to="/register" className="button button-primary button-small">
                {t.register} <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
