import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import InfoPage from './pages/InfoPage';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AccountSettings from './pages/AccountSettings';
import { useAuth } from './context/AuthContext';

const Home = lazy(() => import('./pages/Home'));

function Protected({ children, language }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading LocoMuv...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  const [language, setLanguage] = useState(() => localStorage.getItem('locomuv-language') || 'en');
  const [adminView, setAdminView] = useState(false);
  const location = useLocation();
  useEffect(() => { localStorage.setItem('locomuv-language', language); }, [language]);

  const isDashboard = ['/customerDashboard', '/adminDashboard', '/runnerDashboard'].includes(location.pathname);

  return (
    <div className="site-shell">
      {!isDashboard && <Navbar language={language} setLanguage={setLanguage} hideProfile={adminView} />}
      <main>
        <Routes>
          <Route path="/" element={<Landing language={language} user={user} />} />
          <Route path="/dashboard" element={<Protected language={language}><Navigate to={user?.role && ['admin', 'super_admin', 'sub_admin'].includes(user.role) ? '/adminDashboard' : user?.role === 'runner' ? '/runnerDashboard' : '/customerDashboard'} replace /></Protected>} />
          <Route path="/customerDashboard" element={<Protected language={language}><Suspense fallback={<div className="loading-screen">Loading dashboard...</div>}><Home language={language} setLanguage={setLanguage} setAdminView={setAdminView} /></Suspense></Protected>} />
          <Route path="/adminDashboard" element={<Protected language={language}><Suspense fallback={<div className="loading-screen">Loading dashboard...</div>}><Home language={language} setLanguage={setLanguage} setAdminView={setAdminView} /></Suspense></Protected>} />
          <Route path="/runnerDashboard" element={<Protected language={language}><Suspense fallback={<div className="loading-screen">Loading dashboard...</div>}><Home language={language} setLanguage={setLanguage} setAdminView={setAdminView} /></Suspense></Protected>} />
          <Route path="/login" element={user ? <Navigate to={['admin', 'super_admin', 'sub_admin'].includes(user.role) ? '/adminDashboard' : user.role === 'runner' ? '/runnerDashboard' : '/customerDashboard'} replace /> : <Login language={language} />} />
          <Route path="/register" element={user ? <Navigate to={['admin', 'super_admin', 'sub_admin'].includes(user.role) ? '/adminDashboard' : user.role === 'runner' ? '/runnerDashboard' : '/customerDashboard'} replace /> : <Register language={language} />} />
          <Route path="/settings" element={<Protected language={language}><AccountSettings language={language} /></Protected>} />
          <Route path="/privacy" element={<InfoPage type="privacy" language={language} />} />
          <Route path="/terms" element={<InfoPage type="terms" language={language} />} />
          <Route path="/contact" element={<InfoPage type="contact" language={language} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner footer-inner-polished">
          <div className="footer-top">
            <div className="footer-brand-block">
              <Link to="/" className="brand footer-brand" aria-label="LocoMuv home">
                <span className="brand-logo-crop"><img className="brand-logo" src="/locomuv-logo.png" alt="LocoMuv" /></span>
                <span className="brand-wordmark">Loco<b>Muv</b></span>
              </Link>
              <p>{language === 'bn' ? 'ঢাকার পাড়ায় পাড়ায় দ্রুত ও নির্ভরযোগ্য দৈনন্দিন কাজের জন্য লোকাল এরান্ড ম্যাচিং।' : 'Hyper-local errand matching, connecting Dhaka neighbors for fast, reliable daily pick-ups and deliveries.'}</p>
              <div className="footer-socials footer-support-block">
                <span className="footer-support-title">{language === 'bn' ? 'সাপোর্ট' : 'Support'}</span>
                <a className="footer-support-link" href="https://wa.me/8801744202105?text=Hello%2C%20I%20want%20to%20know%20from%20LocoMuv.%0AIssue%2FQuestion%3A%20" target="_blank" rel="noopener noreferrer">{language === 'bn' ? 'হোয়াটসঅ্যাপ (শুধু মেসেজ): +8801744202105' : 'WhatsApp (message only): +8801744202105'}</a>
                <a className="footer-support-link" href="mailto:tanvirdev105@gmail.com">{language === 'bn' ? 'ইমেইল: tanvirdev105@gmail.com' : 'Email: tanvirdev105@gmail.com'}</a>
              </div>
            </div>
            <nav className="footer-column" aria-label={language === 'bn' ? 'প্ল্যাটফর্ম লিংক' : 'Platform links'}>
              <h3>{language === 'bn' ? 'প্ল্যাটফর্ম' : 'Platform'}</h3>
              <Link to="/#how-it-works">{language === 'bn' ? 'কীভাবে কাজ করে' : 'How it works'}</Link>
              <Link to="/#errands">{language === 'bn' ? 'লাইভ এরান্ড' : 'Live errands'}</Link>
              <Link to="/#trust">{language === 'bn' ? 'বিশ্বাস ও নিরাপত্তা' : 'Trust & safety'}</Link>
              <Link to="/#faq">{language === 'bn' ? 'সাধারণ প্রশ্ন' : 'FAQs'}</Link>
              <Link to="/privacy">{language === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}</Link>
              <Link to="/terms">{language === 'bn' ? 'ব্যবহারের শর্তাবলি' : 'Terms of Service'}</Link>
              <Link to="/contact">{language === 'bn' ? 'যোগাযোগ' : 'Contact'}</Link>
            </nav>
            <div className="footer-column">
              <h3>{language === 'bn' ? 'এলাকাসমূহ' : 'Neighborhoods'}</h3>
              <span>{language === 'bn' ? 'আজিমপুর ও ঢাবি' : 'Azimpur & DU'}</span>
              <span>{language === 'bn' ? 'ধানমন্ডি ও গ্রিন রোড' : 'Dhanmondi & Green Rd'}</span>
              <span>{language === 'bn' ? 'উত্তরা ও এয়ারপোর্ট রোড' : 'Uttara & Airport Rd'}</span>
              <span>{language === 'bn' ? 'মিরপুর ও ফার্মগেট' : 'Mirpur & Farmgate'}</span>
            </div>
            <div className="footer-column footer-hubs">
              <h3>{language === 'bn' ? 'ঢাকার সক্রিয় হাব' : 'Active Dhaka hubs'}</h3>
              <div className="footer-hub-list">
                {(language === 'bn' ? ['আজিমপুর', 'ধানমন্ডি', 'নিলক্ষেত', 'উত্তরা', 'মিরপুর', 'ঢাবি ক্যাম্পাস', 'গুলশান'] : ['Azimpur', 'Dhanmondi', 'Nilkhet', 'Uttara', 'Mirpur', 'DU Campus', 'Gulshan']).map((hub) => <span className="footer-hub-chip" key={hub}>{hub}</span>)}
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>{language === 'bn' ? 'আপনার পাড়ার জন্য, আপনার পাড়ার মানুষের দ্বারা।' : 'For your neighborhood, by your neighborhood.'}</p>
            <span>{language === 'bn' ? '© 2026 লোকোমুভ। নিরাপদ, বিশ্বস্ত, একসাথে।' : '© 2026 LocoMuv. Safe, trusted, together.'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
