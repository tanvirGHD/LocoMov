import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card register-card">
        <Link className="auth-back" to="/">← মূল পাতায় ফিরে যান</Link>
        <img className="auth-logo" src="/locomuv-logo.png" alt="LocoMuv" />
        <div className="eyebrow">LocoMuv কমিউনিটিতে যোগ দিন</div>
        <h1>আপনি কীভাবে যুক্ত হবেন?</h1>
        <p className="auth-intro">অ্যাকাউন্ট তৈরি করতে শুধু প্রয়োজনীয় তথ্য দিন।</p>
        <form onSubmit={submit} className="auth-form">
          <div className="role-select" aria-label="অ্যাকাউন্টের ধরন">
            <button type="button" className={form.role === 'customer' ? 'role-option selected' : 'role-option'} onClick={() => setForm({ ...form, role: 'customer' })}>
              <span className="role-symbol">⌂</span><b>গ্রাহক</b><small>আমার একটি কাজ আছে</small>
            </button>
            <button type="button" className={form.role === 'runner' ? 'role-option selected' : 'role-option'} onClick={() => setForm({ ...form, role: 'runner' })}>
              <span className="role-symbol">⌁</span><b>রানার</b><small>আমি কাজ করতে চাই</small>
            </button>
          </div>
          <label>আপনার নাম<input autoComplete="name" placeholder="পুরো নাম" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength="2" maxLength="80" required /></label>
          <label>ইমেইল ঠিকানা<input type="email" autoComplete="email" placeholder="name@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>বাংলাদেশি মোবাইল নম্বর<input type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label>
          <label>পাসওয়ার্ড<input type="password" autoComplete="new-password" placeholder="কমপক্ষে ৮ অক্ষর" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength="8" maxLength="128" required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'নিরাপদ অ্যাকাউন্ট তৈরি করুন'} <span aria-hidden="true">→</span></button>
        </form>
        <p className="auth-switch">আগে থেকেই অ্যাকাউন্ট আছে? <Link to="/login">লগইন করুন</Link></p>
        <div className="privacy-note"><span>♧</span> কোনো NID নয়—আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ।</div>
      </div>
    </section>
  );
}
