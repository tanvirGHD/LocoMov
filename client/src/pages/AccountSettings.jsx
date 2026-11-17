import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AccountSettings({ language = 'en' }) {
  const isBn = language === 'bn';
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState('profile');
  const [kind, setKind] = useState('email');
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const T = {
    en: {
      title: 'Account settings',
      subtitle: 'Manage your personal information and security.',
      back: 'Back to dashboard',
      profile: 'Profile & Contact',
      security: 'Security & Password',
      changeEmail: 'Change email or phone',
      emailKind: 'Email',
      phoneKind: 'Phone',
      newValue: kind => (kind === 'email' ? 'New email' : 'New phone'),
      sendCode: 'Send verification code',
      verifyCode: 'Verify and update',
      codeLabel: 'Verification code',
      codeInput: '6-digit code',
      changePassword: 'Change password',
      currentPass: 'Current password',
      newPass: 'New password',
      updatePass: 'Update password',
      min8: 'Minimum 8 characters',
      sending: 'Sending...',
      verifying: 'Verifying...',
      updating: 'Updating...',
      success: 'Updated successfully.',
      securityNotice: 'Changing your password will sign you out of all other devices.',
    },
    bn: {
      title: 'অ্যাকাউন্ট সেটিংস',
      subtitle: 'আপনার ব্যক্তিগত তথ্য ও নিরাপত্তা ব্যবস্থাপনা করুন।',
      back: 'ড্যাশবোর্ডে ফিরুন',
      profile: 'প্রোফাইল ও যোগাযোগ',
      security: 'নিরাপত্তা ও পাসওয়ার্ড',
      changeEmail: 'ইমেইল বা ফোন পরিবর্তন',
      emailKind: 'ইমেইল',
      phoneKind: 'ফোন',
      newValue: kind => (kind === 'email' ? 'নতুন ইমেইল' : 'নতুন ফোন'),
      sendCode: 'যাচাই কোড পাঠান',
      verifyCode: 'যাচাই ও আপডেট করুন',
      codeLabel: 'যাচাই কোড',
      codeInput: '৬ ডিজিটের কোড',
      changePassword: 'পাসওয়ার্ড পরিবর্তন',
      currentPass: 'পূর্বের পাসওয়ার্ড',
      newPass: 'নতুন পাসওয়ার্ড',
      updatePass: 'পাসওয়ার্ড আপডেট করুন',
      min8: 'কমপক্ষে ৮ অক্ষর',
      sending: 'পাঠানো হচ্ছে...',
      verifying: 'যাচাই করা হচ্ছে...',
      updating: 'আপডেট করা হচ্ছে...',
      success: 'সফলভাবে আপডেট করা হয়েছে।',
      securityNotice: 'পাসওয়ার্ড পরিবর্তন করলে সকল ডিভাইসে সাইন আউট হয়ে যাবে।',
    },
  }[language];

  async function sendCode(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await api.sendAccountChangeCode({ kind, value });
      setSent(true); setNotice(result.message);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function verifyCode(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api.verifyAccountChange({ kind, value, code });
      setNotice(result.message); await logout(); navigate('/login');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function changePassword(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api.updatePassword({ currentPassword, newPassword });
      setNotice(result.message); await logout(); navigate('/login');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <section className="settings-page">
      <div className="settings-container">
        <Link className="settings-back" to="/dashboard">
          <ArrowRight size={14} /> {T.back}
        </Link>

        <div className="settings-header">
          <div className="settings-badge"><ShieldCheck size={16} className="text-cyan-400 inline mr-1" /></div>
          <h1>{T.title}</h1>
          <p>{T.subtitle}</p>
        </div>

        <div className="settings-nav">
          <button type="button" className={`settings-nav-item ${section === 'profile' ? 'active' : ''}`} onClick={() => setSection('profile')}>
            <Mail size={15} /> {T.profile}
          </button>
          <button type="button" className={`settings-nav-item ${section === 'security' ? 'active' : ''}`} onClick={() => setSection('security')}>
            <Lock size={15} /> {T.security}
          </button>
        </div>

        {section === 'profile' && (
          <div className="settings-card">
            <h2>{T.changeEmail}</h2>
            <p className="settings-desc">Your new address will be verified with a code before it is saved.</p>
            <form className="settings-form" onSubmit={sent ? verifyCode : sendCode}>
              <div className="settings-field">
                <label>{T.emailKind}<select value={kind} onChange={(e) => { setKind(e.target.value); setSent(false); }}>
                  <option value="email">{T.emailKind}</option>
                  <option value="phone">{T.phoneKind}</option>
                </select></label>
              </div>
              <div className="settings-field">
                <label>{T.newValue(kind)}
                  <input value={value} onChange={(e) => setValue(e.target.value)} required />
                </label>
              </div>
              {sent && (
                <div className="settings-field">
                  <label>{T.codeLabel}<input inputMode="numeric" maxLength="6" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder={T.codeInput} required /></label>
                </div>
              )}
              {error && <p className="settings-error" role="alert">{error}</p>}
              {notice && <p className="settings-success" role="status">{notice}</p>}
              <button className="button button-primary button-full" disabled={busy}>{busy ? (sent ? T.verifying : T.sending) : (sent ? T.verifyCode : T.sendCode)}</button>
            </form>
          </div>
        )}

        {section === 'security' && (
          <div className="settings-card">
            <h2>{T.changePassword}</h2>
            <p className="settings-desc security-notice">{T.securityNotice}</p>
            <form className="settings-form" onSubmit={changePassword}>
              <div className="settings-field">
                <label>{T.currentPass}<input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label>
              </div>
              <div className="settings-field">
                <label>{T.newPass}<input type="password" minLength="8" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label>
              </div>
              {error && <p className="settings-error" role="alert">{error}</p>}
              {notice && <p className="settings-success" role="status">{notice}</p>}
              <button className="button button-primary button-full" disabled={busy}>{busy ? T.updating : T.updatePass}</button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
