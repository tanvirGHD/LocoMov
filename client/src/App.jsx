import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './context/AuthContext';

const Home = lazy(() => import('./pages/Home'));

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">LocoMuv খুলছে...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <div className="site-shell">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
          <Route path="/dashboard" element={<Protected><Suspense fallback={<div className="loading-screen">ড্যাশবোর্ড খুলছে...</div>}><Home /></Suspense></Protected>} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <Link to="/" className="brand footer-brand"><img className="brand-logo" src="/locomuv-logo.png" alt="" /><span>Loco<b>Muv</b></span></Link>
          <p>নিজের এলাকার মানুষের জন্য, নিজের এলাকার মানুষের সাথে।</p>
          <span>© ২০২৬ LocoMuv · নিরাপদে, একসাথে</span>
        </div>
      </footer>
    </div>
  );
}
