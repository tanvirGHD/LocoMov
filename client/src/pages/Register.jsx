import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const content = {
  en: {
    back: '← Back to home',
    eyebrow: 'Join the LocoMuv community',
    title: 'How do you want to join?',
    intro: 'Just share a few details to create your account.',
    customer: 'Customer',
    customerDesc: 'I need a task done',
    runner: 'Runner',
    runnerDesc: 'I want to take jobs',
    name: 'Your name',
    namePlaceholder: 'Full name',
    email: 'Email address',
    emailPlaceholder: 'name@example.com',
    phone: 'Bangladeshi mobile number',
    phonePlaceholder: '01XXXXXXXXX',
    password: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submitBusy: 'Creating your account...',
    submit: 'Create a secure account',
    loginPrompt: 'Already have an account?',
    loginAction: 'Log in',
    privacy: 'No NID needed—your privacy matters to us.'
  },
  bn: {
    back: '← হোমে ফিরুন',
    eyebrow: 'লোকোমুভ কমিউনিটিতে যোগ দিন',
    title: 'কীভাবে যোগ দিতে চান?',
    intro: 'অ্যাকাউন্ট তৈরি করতে কিছু তথ্য শেয়ার করুন।',
    customer: 'গ্রাহক',
    customerDesc: 'আমার কাজ হয়ে যাবে',
    runner: 'রানার',
    runnerDesc: 'আমি কাজ নিতে চাই',
    name: 'আপনার নাম',
    namePlaceholder: 'পুরো নাম',
    email: 'ইমেইল ঠিকানা',
    emailPlaceholder: 'name@example.com',
    phone: 'বাংলাদেশের মোবাইল নাম্বার',
    phonePlaceholder: '01XXXXXXXXX',
    password: 'পাসওয়ার্ড',
    passwordPlaceholder: 'কমপক্ষে ৮ অক্ষর',
    showPassword: 'পাসওয়ার্ড দেখান',
    hidePassword: 'পাসওয়ার্ড লুকান',
    submitBusy: 'অ্যাকাউন্ট তৈরি হচ্ছে...',
    submit: 'নিরাপদ অ্যাকাউন্ট তৈরি করুন',
    loginPrompt: 'ইতিমধ্যেই অ্যাকাউন্ট আছে?',
    loginAction: 'লগইন',
    privacy: 'NID লাগে না—আপনার গোপনীয়তা আমাদের জন্য গুরুত্বপূর্ণ।'
  }
};

export default function Register({ language = 'en' }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const t = content[language] || content.en;

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
        <Link className="auth-back" to="/">{t.back}</Link>
        <img className="auth-logo" src="/locomuv-logo.png" alt="LocoMuv" />
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="auth-intro">{t.intro}</p>
        <form onSubmit={submit} className="auth-form">
          <div className="role-select" aria-label="Account type">
            <button type="button" className={form.role === 'customer' ? 'role-option selected' : 'role-option'} onClick={() => setForm({ ...form, role: 'customer' })}>
              <span className="role-symbol">⌂</span><b>{t.customer}</b><small>{t.customerDesc}</small>
            </button>
            <button type="button" className={form.role === 'runner' ? 'role-option selected' : 'role-option'} onClick={() => setForm({ ...form, role: 'runner' })}>
              <span className="role-symbol">⌁</span><b>{t.runner}</b><small>{t.runnerDesc}</small>
            </button>
          </div>
          <label>{t.name}<input autoComplete="name" placeholder={t.namePlaceholder} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength="2" maxLength="80" required /></label>
          <label>{t.email}<input type="email" autoComplete="email" placeholder={t.emailPlaceholder} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>{t.phone}<input type="tel" autoComplete="tel" placeholder={t.phonePlaceholder} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label>
          <label>{t.password}
            <span className="password-field">
              <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder={t.passwordPlaceholder} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength="8" maxLength="128" required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? t.hidePassword : t.showPassword}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? t.submitBusy : t.submit} <span aria-hidden="true">→</span></button>
        </form>
        <p className="auth-switch">{t.loginPrompt} <Link to="/login">{t.loginAction}</Link></p>
        <div className="privacy-note"><span>♧</span> {t.privacy}</div>
      </div>
    </section>
  );
}
