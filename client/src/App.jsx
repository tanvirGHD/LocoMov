import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './context/AuthContext';

const Home = lazy(() => import('./pages/Home'));

function Protected({ children, language }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading LocoMuv...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  const [language, setLanguage] = useState('en');

  return (
    <div className="site-shell">
      <Navbar language={language} setLanguage={setLanguage} />
      <main>
        <Routes>
          <Route path="/" element={<Landing language={language} user={user} />} />
          <Route path="/dashboard" element={<Protected language={language}><Suspense fallback={<div className="loading-screen">Loading dashboard...</div>}><Home language={language} /></Suspense></Protected>} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login language={language} />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register language={language} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner footer-inner-polished">
          <div className="footer-top">
            <div className="footer-brand-block">
              <Link to="/" className="brand footer-brand"><span className="footer-map-mark"><MapPin size={19} fill="currentColor" /></span><span>Loco<b>Muv</b></span></Link>
              <p>Hyper-local errand matching, connecting Dhaka neighbors for fast, reliable daily pick-ups and deliveries.</p>
              <div className="footer-socials" aria-label="Social media">
                <span className="footer-social-icon footer-facebook" role="img" aria-label="Facebook">f</span>
                <span className="footer-social-icon footer-instagram" role="img" aria-label="Instagram">◎</span>
                <span className="footer-social-icon footer-linkedin" role="img" aria-label="LinkedIn">in</span>
              </div>
            </div>
            <nav className="footer-column" aria-label="Platform links">
              <h3>Platform</h3>
              <Link to="/#how-it-works">How it works</Link>
              <Link to="/#errands">Live errands</Link>
              <Link to="/#trust">Trust &amp; safety</Link>
              <Link to="/#faq">FAQs</Link>
            </nav>
            <div className="footer-column">
              <h3>Neighborhoods</h3>
              <span>Azimpur &amp; DU</span>
              <span>Dhanmondi &amp; Green Rd</span>
              <span>Uttara &amp; Airport Rd</span>
              <span>Mirpur &amp; Farmgate</span>
            </div>
            <div className="footer-column footer-hubs">
              <h3>Active Dhaka hubs</h3>
              <div className="footer-hub-list">
                {['Azimpur', 'Dhanmondi', 'Nilkhet', 'Uttara', 'Mirpur', 'DU Campus', 'Gulshan'].map((hub) => <span className="footer-hub-chip" key={hub}>{hub}</span>)}
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>For your neighborhood, by your neighborhood.</p>
            <span>© 2026 LocoMuv. Safe, trusted, together.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
