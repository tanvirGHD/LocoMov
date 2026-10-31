import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState('');
  const demoAccounts = import.meta.env.DEV ? [
    { role: 'গ্রাহক', email: 'customer@gmail.com', password: 'customer' },
    { role: 'রানার', email: 'runner@gmail.com', password: 'runner12' },
    { role: 'অ্যাডমিন', email: 'admin@gmail.com', password: 'admin123' },
  ] : [];

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <Link className="auth-back" to="/">← মূল পাতায় ফিরে যান</Link>
        <img className="auth-logo" src="/locomuv-logo.png" alt="LocoMuv" />
        <div className="eyebrow">আবার স্বাগতম</div>
        <h1>আপনার অ্যাকাউন্টে প্রবেশ করুন</h1>
        <p className="auth-intro">আপনার পাড়ার কাজগুলো অপেক্ষা করছে।</p>
        <form onSubmit={submit} className="auth-form">
          <label>ইমেইল ঠিকানা<input type="email" autoComplete="email" placeholder="আপনার ইমেইল" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>পাসওয়ার্ড<input type="password" autoComplete="current-password" placeholder="আপনার পাসওয়ার্ড" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? 'অপেক্ষা করুন...' : 'লগইন করুন'} <span aria-hidden="true">→</span></button>
        </form>
        {demoAccounts.length > 0 && <section className="demo-login" aria-label="ডেমো অ্যাকাউন্ট">
          <div><b>দ্রুত ডেমো লগইন</b><small>একটি role বেছে নিলে credential বসে যাবে</small></div>
          <div className="demo-login-options">
            {demoAccounts.map((account) => <button
              type="button"
              key={account.email}
              onClick={() => { setForm({ email: account.email, password: account.password }); setError(''); setSelectedDemo(account.role); }}
            >{account.role}</button>)}
          </div>
          <small className="demo-login-hint">
            {selectedDemo === 'অ্যাডমিন'
              ? 'এই credentials শুধু ফর্মে বসে; admin account আপনার database-এ আগে তৈরি থাকতে হবে। নিরাপদ setup নির্দেশনা README-তে আছে।'
              : 'এই credentials শুধু ফর্মে বসে; account না থাকলে local demo database seed করুন।'}
          </small>
        </section>}
        <p className="auth-switch">নতুন এখানে? <Link to="/register">অ্যাকাউন্ট খুলুন</Link></p>
        <div className="privacy-note"><span>♧</span> আপনার ব্যক্তিগত তথ্য সুরক্ষিত থাকে। NID নেওয়া হয় না।</div>
      </div>
    </section>
  );
}
