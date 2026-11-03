import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
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
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing language={language} />} />
          <Route path="/dashboard" element={<Protected language={language}><Suspense fallback={<div className="loading-screen">Loading dashboard...</div>}><Home language={language} /></Suspense></Protected>} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login language={language} />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register language={language} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <Link to="/" className="brand footer-brand"><img className="brand-logo" src="/locomuv-logo.png" alt="" /><span>Loco<b>Muv</b></span></Link>
          <p>For your neighborhood, by your neighborhood.</p>
          <span>© 2026 LocoMuv · Safe, together</span>
        </div>
      </footer>
    </div>
  );
}
