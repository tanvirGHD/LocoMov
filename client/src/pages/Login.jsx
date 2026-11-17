import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Turnstile from '../components/Turnstile';

const content = {
  en: {
    back: '← Back to home',
    eyebrow: 'Welcome back',
    title: 'Sign in to your account',
    intro: 'Your neighborhood jobs are waiting for you.',
    email: 'Email address',
    emailPlaceholder: 'Your email',
    password: 'Password',
    passwordPlaceholder: 'Your password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    login: 'Log in',
    loginBusy: 'Please wait...',
    resendCode: 'Resend code',
    resendBusy: 'Sending...',
    codeSent: 'A 6-digit code has been sent to your email.',
    demoTitle: 'Quick demo login',
    demoSub: 'Choose a role and the credentials will fill in',
    adminInfo: 'These credentials are only prefilled; the admin account must exist in your database. Setup guidance is in the README.',
    genericInfo: 'These credentials are only prefilled; if the account does not exist, seed the local demo database.',
    registerPrompt: 'New here?',
    registerAction: 'Create account',
    privacy: 'Your personal information stays protected. No NID is required.'
  },
  bn: {
    back: '← হোমে ফিরুন',
    eyebrow: 'ফিরে আসুন',
    title: 'আপনার অ্যাকাউন্টে লগইন করুন',
    intro: 'আপনার এলাকার কাজগুলো এখনই অপেক্ষা করছে।',
    email: 'ইমেইল ঠিকানা',
    emailPlaceholder: 'আপনার ইমেইল',
    password: 'পাসওয়ার্ড',
    passwordPlaceholder: 'আপনার পাসওয়ার্ড',
    showPassword: 'পাসওয়ার্ড দেখান',
    hidePassword: 'পাসওয়ার্ড লুকান',
    login: 'লগইন',
    loginBusy: 'একটু অপেক্ষা করুন...',
    resendCode: 'কোড আবার পাঠান',
    resendBusy: 'পাঠানো হচ্ছে...',
    codeSent: 'একটি ৬-ডিজিট কোড আপনার ইমেইলে পাঠানো হয়েছে।',
    demoTitle: 'দ্রুত ডেমো লগইন',
    demoSub: 'ভূমিকা বেছে নিন—ক্রেডেনশিয়ালস স্বয়ংক্রিয়ভাবে পূরণ হবে',
    adminInfo: 'এই ক্রেডেনশিয়ালস শুধু প্রিফিল্ড করা; অ্যাডমিন অ্যাকাউন্ট আপনার ডাটাবেসে থাকতে হবে। সেটআপ গাইড README-এ আছে।',
    genericInfo: 'এই ক্রেডেনশিয়ালস শুধু প্রিফিল্ড করা; অ্যাকাউন্ট না থাকলে লোকাল ডেমো ডাটাবেসে সিড দিন।',
    registerPrompt: 'নতুন?',
    registerAction: 'অ্যাকাউন্ট তৈরি',
    privacy: 'আপনার ব্যক্তিগত তথ্য সুরক্ষিত থাকবে। NID লাগে না।'
  }
};

export default function Login({ language = 'en' }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [rememberAllowed, setRememberAllowed] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [forgotMode, setForgotMode] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const t = content[language] || content.en;
  const demoAccounts = import.meta.env.DEV ? [
    { role: 'Customer', email: import.meta.env.VITE_DEV_DEMO_CUSTOMER_EMAIL, password: import.meta.env.VITE_DEV_DEMO_CUSTOMER_PASSWORD },
    { role: 'Runner', email: import.meta.env.VITE_DEV_DEMO_RUNNER_EMAIL, password: import.meta.env.VITE_DEV_DEMO_RUNNER_PASSWORD },
  ].filter((account) => account.email && account.password) : [];

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login({ ...form, turnstileToken, rememberDevice });
      const role = result.user?.role || 'customer';
      const dashboardPath = ['admin', 'super_admin', 'sub_admin'].includes(role) ? '/adminDashboard' : role === 'runner' ? '/runnerDashboard' : '/customerDashboard';
      const taskId = new URLSearchParams(location.search).get('taskId');
      navigate(taskId ? `${dashboardPath}?taskId=${encodeURIComponent(taskId)}#tasks` : dashboardPath);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestReset(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (forgotMode === 'request') { await api.forgotPassword({ email: form.email, turnstileToken }); setForgotMode('reset'); setError('If an account exists, a verification code has been sent.'); }
      else { const result = await api.resetPassword({ email: form.email, code, password: forgotPassword }); setError(result.message); setForgotMode(''); }
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <Link className="auth-back" to="/">{t.back}</Link>
        <img className="auth-logo" src="/locomuv-logo.png" alt="LocoMuv" />
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="auth-intro">{t.intro}</p>
        {!forgotMode && <form onSubmit={submit} className="auth-form">
          <label>{t.email}<input type="email" autoComplete="email" placeholder={t.emailPlaceholder} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>{t.password}
            <span className="password-field">
              <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={t.passwordPlaceholder} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? t.hidePassword : t.showPassword}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>
          <Turnstile onToken={setTurnstileToken} />
          {rememberAllowed && <label className="auth-checkbox"><input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} /> Remember this device for 30 days</label>}
          <button type="button" className="text-button" onClick={() => setForgotMode('request')}>Forgot password?</button>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? t.loginBusy : t.login} <span aria-hidden="true">→</span></button>
        </form>}
        {forgotMode && <form onSubmit={requestReset} className="auth-form"><p>Enter your email. If an account exists, we will send a verification code.</p><label>{t.email}<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>{forgotMode === 'reset' && <><label>Verification code<input inputMode="numeric" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required /></label><label>New password<input type="password" minLength="8" value={forgotPassword} onChange={(event) => setForgotPassword(event.target.value)} required /></label></>}<Turnstile onToken={setTurnstileToken} />{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-full" disabled={busy}>{forgotMode === 'request' ? 'Send code' : 'Reset password'}</button><button type="button" className="text-button" onClick={() => { setForgotMode(''); setError(''); }}>Back to sign in</button></form>}
        {demoAccounts.length > 0 && <section className="demo-login" aria-label="Demo account">
          <div><b>{t.demoTitle}</b><small>{t.demoSub}</small></div>
          <div className="demo-login-options">
            {demoAccounts.map((account) => <button
              type="button"
              key={account.email}
              onClick={() => { setForm({ email: account.email, password: account.password }); setError(''); setSelectedDemo(account.role); }}
            >{account.role}</button>)}
          </div>
          <small className="demo-login-hint">
            {selectedDemo === 'Admin'
              ? t.adminInfo
              : t.genericInfo}
          </small>
        </section>}
        <p className="auth-switch">{t.registerPrompt} <Link to="/register">{t.registerAction}</Link></p>
        <div className="privacy-note"><span>♧</span> {t.privacy}</div>
      </div>
    </section>
  );
}
