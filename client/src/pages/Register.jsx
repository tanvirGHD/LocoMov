import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Camera,
  Upload,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Crosshair,
  Lock,
  HeartHandshake
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const content = {
  en: {
    back: '← Back to home',
    eyebrow: 'Verified Community & Safety',
    title: 'Create Your Account',
    intro: 'Join the LocoMuv neighborhood network with your genuine information.',
    customer: 'Customer',
    customerDesc: 'I need items delivered or tasks done',
    runner: 'Runner',
    runnerDesc: 'I want to accept tasks & earn money',

    // Photo
    photoTitle: 'Profile Photo',
    photoRequired: 'Real Photo Required',
    photoHint: 'Please upload a clear, front-facing photo of yourself to keep the platform safe.',
    takeSelfie: 'Take Selfie',
    uploadPhoto: 'Upload File',
    changePhoto: 'Change',
    removePhoto: 'Remove',
    cameraActive: 'Look at the camera and snap your selfie.',
    snapPhoto: 'Capture Photo',
    cancelCamera: 'Cancel',

    // Personal details
    name: 'Full Name',
    namePlaceholder: 'Your full name',
    email: 'Email Address',
    emailPlaceholder: 'name@example.com',
    phone: 'Mobile Number',
    phonePlaceholder: '01XXXXXXXXX',
    phoneHint: 'Bangladeshi mobile number',
    age: 'Age',
    agePlaceholder: 'e.g. 24',
    ageNotice: 'Must be 18 or older',

    // Location
    areaLabel: 'Area / Location',
    areaPlaceholder: 'Select your current living area',
    areaDetailPlaceholder: 'Road, house/building, or sector details',
    detectLocation: 'Detect GPS',
    detectingLocation: 'Locating...',
    locationDetected: 'GPS Attached',

    // Security & Password
    password: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    passwordsMatch: 'Passwords match',
    passwordsMismatch: 'Passwords do not match',
    strengthWeak: 'Weak password',
    strengthMedium: 'Medium',
    strengthStrong: 'Strong',
    strengthVeryStrong: 'Very strong',
    reqLength: '8+ chars',
    reqUpperLower: 'Upper & lowercase',
    reqNumber: 'At least 1 number',

    // Extra security
    emergencyLabel: 'Emergency Contact (Optional)',
    emergencyPlaceholder: 'Close contact phone (01XXXXXXXXX)',

    // Safety pledge
    safetyPledge: 'I confirm this is my real photo and personal details are genuine. I agree to LocoMuv community rules.',

    // Submit
    submit: 'Create Secure Account',
    submitBusy: 'Creating account...',
    loginPrompt: 'Already have an account?',
    loginAction: 'Sign in',
    trustNote: '256-bit encrypted data protection · Strict identity moderation',
  },
  bn: {
    back: '← হোমে ফিরুন',
    eyebrow: 'ভেরিফায়েড কমিউনিটি ও নিরাপত্তা',
    title: 'অ্যাকাউন্ট তৈরি করুন',
    intro: 'সঠিক তথ্য প্রদান করে লোকোমুভ নেইবারহুড নেটওয়ার্কে যুক্ত হোন।',
    customer: 'গ্রাহক (Customer)',
    customerDesc: 'কাজ বা পার্সেল পাঠাতে চাই',
    runner: 'রানার (Runner)',
    runnerDesc: 'কাজ নিয়ে আয় করতে চাই',

    // Photo
    photoTitle: 'প্রোফাইল ছবি',
    photoRequired: 'বাস্তব ছবি আবশ্যক',
    photoHint: 'আপনার নিজের একটি স্পষ্ট মুখাবয়বের ছবি দিন। কার্টুন বা ভুয়া ছবি গ্রহণযোগ্য নয়।',
    takeSelfie: 'সেলফি তুলুন',
    uploadPhoto: 'ছবি আপলোড',
    changePhoto: 'পরিবর্তন',
    removePhoto: 'মুছুন',
    cameraActive: 'ক্যামেরার দিকে তাকিয়ে সেলফি তুলুন।',
    snapPhoto: 'ছবি তুলুন',
    cancelCamera: 'বাতিল',

    // Personal details
    name: 'পুরো নাম',
    namePlaceholder: 'আপনার পুরো নাম',
    email: 'ইমেইল ঠিকানা',
    emailPlaceholder: 'name@example.com',
    phone: 'মোবাইল নাম্বার',
    phonePlaceholder: '01XXXXXXXXX',
    phoneHint: 'বাংলাদেশের মোবাইল নাম্বার',
    age: 'বয়স',
    agePlaceholder: 'যেমনঃ ২৪',
    ageNotice: 'কমপক্ষে ১৮ বছর হতে হবে',

    // Location
    areaLabel: 'বর্তমান এলাকা / বসবাসের স্থান',
    areaPlaceholder: 'আপনার এলাকা নির্বাচন করুন',
    areaDetailPlaceholder: 'রোড, বাসা বা পরিচিত স্থান',
    detectLocation: 'জিপিএস শনাক্ত',
    detectingLocation: 'শনাক্ত হচ্ছে...',
    locationDetected: 'জিপিএস সংযুক্ত',

    // Security & Password
    password: 'পাসওয়ার্ড',
    passwordPlaceholder: 'কমপক্ষে ৮ অক্ষর',
    confirmPassword: 'পাসওয়ার্ড নিশ্চিত করুন',
    confirmPasswordPlaceholder: 'পুনরায় পাসওয়ার্ড লিখুন',
    showPassword: 'পাসওয়ার্ড দেখান',
    hidePassword: 'পাসওয়ার্ড লুকান',
    passwordsMatch: 'পাসওয়ার্ড মিলেছে',
    passwordsMismatch: 'পাসওয়ার্ড মিলছে না',
    strengthWeak: 'দুর্বল',
    strengthMedium: 'মোটামুটি',
    strengthStrong: 'শক্তিশালী',
    strengthVeryStrong: 'অত্যন্ত শক্তিশালী',
    reqLength: '৮+ অক্ষর',
    reqUpperLower: 'বড় ও ছোট হাতের',
    reqNumber: 'সংখ্যা থাকতে হবে',

    // Extra security
    emergencyLabel: 'জরুরি যোগাযোগের নাম্বার (ঐচ্ছিক)',
    emergencyPlaceholder: 'নিকটজনের নাম্বার (01XXXXXXXXX)',

    // Safety pledge
    safetyPledge: 'আমি নিশ্চিত করছি যে ছবিটি আমার নিজের এবং প্রদত্ত তথ্য সঠিক। আমি লোকোমুভের নিয়ম মানতে সম্মত।',

    // Submit
    submit: 'নিরাপদ অ্যাকাউন্ট খুলুন',
    submitBusy: 'অ্যাকাউন্ট তৈরি হচ্ছে...',
    loginPrompt: 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
    loginAction: 'লগইন করুন',
    trustNote: '২৫৬-বিট এনক্রিপ্টেড ডাটা সুরক্ষা · কঠোর মডারেশন',
  }
};

const POPULAR_AREAS = [
  'Dhanmondi, Dhaka',
  'Gulshan 1, Dhaka',
  'Gulshan 2, Dhaka',
  'Banani, Dhaka',
  'Uttara, Dhaka',
  'Mirpur, Dhaka',
  'Mohammadpur, Dhaka',
  'Mohakhali, Dhaka',
  'Badda / Hatirjheel, Dhaka',
  'Bashundhara R/A, Dhaka',
  'Motijheel / Dilkusha, Dhaka',
  'Old Dhaka (Puran Dhaka)',
  'Khilgaon / Malibagh, Dhaka',
  'Tejgaon, Dhaka',
  'Lalmatia, Dhaka',
  'Chittagong (Agrabad / GEC)',
  'Sylhet City',
  'Rajshahi City',
  'Khulna City',
  'Other Area / Outside Dhaka',
];

export default function Register({ language = 'en' }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const t = content[language] || content.en;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    selectedArea: '',
    customAreaDetail: '',
    age: '',
    emergencyContact: '',
    safetyPledge: false,
  });

  // Avatar state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [capturedDataUrl, setCapturedDataUrl] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Location detection
  const [coords, setCoords] = useState(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Password strength calculation
  const password = form.password;
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let strengthScore = 0;
  if (hasLength) strengthScore++;
  if (hasUpper && hasLower) strengthScore++;
  if (hasNumber) strengthScore++;
  if (hasSpecial) strengthScore++;

  const isPasswordMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const isPasswordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  // Handle Photo File Upload
  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be smaller than 5 MB.');
      return;
    }

    setError('');
    setPhotoFile(file);
    setCapturedDataUrl('');
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    closeCamera();
  }

  // Handle Camera / Live Selfie
  async function startCamera() {
    setCameraError('');
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setCameraError('Camera access not permitted. Please upload a photo file instead.');
      setIsCameraOpen(false);
    }
  }

  function snapPhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    const video = videoRef.current;
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 480, 480);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedDataUrl(dataUrl);
    setPhotoPreview(dataUrl);
    setPhotoFile(null);
    closeCamera();
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview('');
    setCapturedDataUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    closeCamera();
  }

  // GPS Location Detection
  function detectLocation() {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    setGpsStatus('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setDetectingGps(false);
        setGpsStatus(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        if (!form.selectedArea) {
          setForm((prev) => ({ ...prev, selectedArea: 'Dhanmondi, Dhaka' }));
        }
      },
      (err) => {
        setDetectingGps(false);
        setGpsStatus('Could not detect GPS. Please pick your area.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Form Submit
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!photoFile && !capturedDataUrl) {
      setError('A real profile photo of yourself is required to register.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!hasUpper || !hasLower || !hasNumber) {
      setError('Password must contain uppercase, lowercase letters, and at least one number.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    const ageNum = parseInt(form.age, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      setError('You must be at least 18 years old to join LocoMuv.');
      return;
    }

    const fullArea = [form.selectedArea, form.customAreaDetail].filter(Boolean).join(' - ').trim();
    if (!fullArea || fullArea.length < 2) {
      setError('Please provide your current living area or neighborhood.');
      return;
    }

    if (!form.safetyPledge) {
      setError('Please agree to the Community Safety Pledge.');
      return;
    }

    setBusy(true);

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('email', form.email.trim());
      formData.append('phone', form.phone.trim());
      formData.append('password', form.password);
      formData.append('role', form.role);
      formData.append('area', fullArea);
      formData.append('age', ageNum.toString());
      if (form.emergencyContact.trim()) {
        formData.append('emergencyContact', form.emergencyContact.trim());
      }
      if (coords) {
        formData.append('locationCoordinates', JSON.stringify(coords));
      }

      if (photoFile) {
        formData.append('avatar', photoFile);
      } else if (capturedDataUrl) {
        formData.append('avatarDataUrl', capturedDataUrl);
      }

      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to create account. Please check your information.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reg-minimal-page">
      <div className="reg-minimal-card">
        {/* TOP BAR */}
        <div className="reg-top-bar">
          <Link className="reg-back-link" to="/">{t.back}</Link>
          <div className="reg-safety-pill">
            <ShieldCheck size={14} className="text-emerald-600 inline" />
            <span>{t.eyebrow}</span>
          </div>
        </div>

        {/* HEADER */}
        <div className="reg-header">
          <img className="reg-brand-logo" src="/locomuv-logo.png" alt="LocoMuv" />
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>

        {/* MAIN 2-COLUMN FORM */}
        <form onSubmit={handleSubmit} className="reg-form" noValidate>
          <div className="reg-grid-layout">
            {/* ================= LEFT COLUMN ================= */}
            <div className="reg-column">
              {/* ROLE SELECTOR */}
              <div className="reg-block">
                <span className="reg-block-label">Account Role</span>
                <div className="reg-role-switch">
                  <button
                    type="button"
                    className={`reg-role-btn ${form.role === 'customer' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, role: 'customer' })}
                  >
                    <span className="reg-role-symbol">⌂</span>
                    <div className="reg-role-desc">
                      <b>{t.customer}</b>
                      <small>{t.customerDesc}</small>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`reg-role-btn ${form.role === 'runner' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, role: 'runner' })}
                  >
                    <span className="reg-role-symbol">⌁</span>
                    <div className="reg-role-desc">
                      <b>{t.runner}</b>
                      <small>{t.runnerDesc}</small>
                    </div>
                  </button>
                </div>
              </div>

              {/* PROFILE PHOTO */}
              <div className="reg-block">
                <div className="reg-block-header">
                  <span className="reg-block-label">{t.photoTitle}</span>
                  <span className="reg-tag-required">{t.photoRequired}</span>
                </div>
                <p className="reg-subtext">{t.photoHint}</p>

                <div className="reg-avatar-row">
                  <div className="reg-avatar-circle">
                    {photoPreview ? (
                      <div className="reg-avatar-has-img">
                        <img src={photoPreview} alt="Preview" />
                        <button
                          type="button"
                          className="reg-avatar-del"
                          onClick={clearPhoto}
                          title={t.removePhoto}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="reg-avatar-empty">
                        <User size={38} />
                      </div>
                    )}
                  </div>

                  <div className="reg-avatar-btns">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="reg-btn-quiet"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={15} />
                      <span>{photoPreview ? t.changePhoto : t.uploadPhoto}</span>
                    </button>
                    <button
                      type="button"
                      className="reg-btn-quiet"
                      onClick={startCamera}
                    >
                      <Camera size={15} />
                      <span>{t.takeSelfie}</span>
                    </button>
                  </div>
                </div>

                {/* CAMERA MODAL */}
                {isCameraOpen && (
                  <div className="reg-camera-modal">
                    <div className="reg-camera-box">
                      <div className="reg-camera-header">
                        <strong>{t.takeSelfie}</strong>
                        <button type="button" onClick={closeCamera} className="text-button"><X size={18} /></button>
                      </div>
                      <p className="reg-camera-desc">{t.cameraActive}</p>
                      <div className="reg-camera-preview">
                        <video ref={videoRef} autoPlay playsInline muted />
                        <div className="reg-camera-ring" />
                      </div>
                      <div className="reg-camera-actions">
                        <button type="button" className="button button-primary" onClick={snapPhoto}>
                          <Camera size={15} /> {t.snapPhoto}
                        </button>
                        <button type="button" className="button button-outline" onClick={closeCamera}>
                          {t.cancelCamera}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {cameraError && <p className="reg-field-error">{cameraError}</p>}
              </div>

              {/* LIVING LOCATION */}
              <div className="reg-block">
                <div className="reg-block-header">
                  <span className="reg-block-label">{t.areaLabel}</span>
                  <button
                    type="button"
                    className="reg-gps-btn"
                    onClick={detectLocation}
                    disabled={detectingGps}
                  >
                    <Crosshair size={13} className={detectingGps ? 'animate-spin' : ''} />
                    <span>{detectingGps ? t.detectingLocation : t.detectLocation}</span>
                  </button>
                </div>

                <div className="reg-inputs-stack">
                  <div className="reg-field-group">
                    <span className="reg-input-caption"><MapPin size={13} /> Neighborhood / City Area</span>
                    <select
                      value={form.selectedArea}
                      onChange={(e) => setForm({ ...form, selectedArea: e.target.value })}
                      className="reg-input"
                      required
                    >
                      <option value="">{t.areaPlaceholder}</option>
                      {POPULAR_AREAS.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>

                  <div className="reg-field-group">
                    <span className="reg-input-caption">Street, Sector, or Flat Details</span>
                    <input
                      type="text"
                      className="reg-input"
                      placeholder={t.areaDetailPlaceholder}
                      value={form.customAreaDetail}
                      onChange={(e) => setForm({ ...form, customAreaDetail: e.target.value })}
                      maxLength="80"
                    />
                  </div>
                </div>

                {gpsStatus && (
                  <div className="reg-gps-badge">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>{gpsStatus}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ================= RIGHT COLUMN ================= */}
            <div className="reg-column">
              {/* PERSONAL INFORMATION */}
              <div className="reg-block">
                <span className="reg-block-label">Personal Details</span>

                <div className="reg-row-2">
                  <div className="reg-field-group">
                    <span className="reg-input-caption"><User size={13} /> {t.name}</span>
                    <input
                      type="text"
                      className="reg-input"
                      autoComplete="name"
                      placeholder={t.namePlaceholder}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      minLength="2"
                      maxLength="80"
                      required
                    />
                  </div>

                  <div className="reg-field-group">
                    <span className="reg-input-caption"><Calendar size={13} /> {t.age}</span>
                    <input
                      type="number"
                      className="reg-input"
                      min="18"
                      max="120"
                      placeholder={t.agePlaceholder}
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="reg-row-2 mt-3">
                  <div className="reg-field-group">
                    <span className="reg-input-caption"><Phone size={13} /> {t.phone}</span>
                    <div className="reg-phone-wrapper">
                      <span className="reg-phone-prefix">+88</span>
                      <input
                        type="tel"
                        className="reg-input reg-phone-field"
                        autoComplete="tel"
                        placeholder={t.phonePlaceholder}
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="reg-field-group">
                    <span className="reg-input-caption"><Mail size={13} /> {t.email}</span>
                    <input
                      type="email"
                      className="reg-input"
                      autoComplete="email"
                      placeholder={t.emailPlaceholder}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* PASSWORD & SECURITY */}
              <div className="reg-block">
                <span className="reg-block-label">Password & Security</span>

                <div className="reg-row-2">
                  <div className="reg-field-group">
                    <span className="reg-input-caption"><Lock size={13} /> {t.password}</span>
                    <div className="reg-password-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="reg-input reg-pwd-field"
                        autoComplete="new-password"
                        placeholder={t.passwordPlaceholder}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        minLength="8"
                        maxLength="128"
                        required
                      />
                      <button
                        type="button"
                        className="reg-pwd-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t.hidePassword : t.showPassword}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="reg-field-group">
                    <span className="reg-input-caption"><Lock size={13} /> {t.confirmPassword}</span>
                    <div className="reg-password-wrapper">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="reg-input reg-pwd-field"
                        autoComplete="new-password"
                        placeholder={t.confirmPasswordPlaceholder}
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        minLength="8"
                        maxLength="128"
                        required
                      />
                      <button
                        type="button"
                        className="reg-pwd-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? t.hidePassword : t.showPassword}
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* STRENGTH INDICATOR */}
                {form.password && (
                  <div className="reg-strength-box">
                    <div className="reg-strength-meter">
                      <span className={`reg-meter-bar ${strengthScore >= 1 ? 'bar-1' : ''}`} />
                      <span className={`reg-meter-bar ${strengthScore >= 2 ? 'bar-2' : ''}`} />
                      <span className={`reg-meter-bar ${strengthScore >= 3 ? 'bar-3' : ''}`} />
                      <span className={`reg-meter-bar ${strengthScore >= 4 ? 'bar-4' : ''}`} />
                    </div>
                    <div className="reg-strength-labels">
                      <span className="reg-strength-level">
                        {strengthScore <= 1 && <span className="text-danger">{t.strengthWeak}</span>}
                        {strengthScore === 2 && <span className="text-warning">{t.strengthMedium}</span>}
                        {strengthScore === 3 && <span className="text-info">{t.strengthStrong}</span>}
                        {strengthScore >= 4 && <span className="text-success">{t.strengthVeryStrong}</span>}
                      </span>
                      <div className="reg-strength-rules">
                        <span className={hasLength ? 'valid' : ''}>8+ chars</span> · 
                        <span className={hasUpper && hasLower ? 'valid' : ''}> A-z</span> · 
                        <span className={hasNumber ? 'valid' : ''}> 0-9</span>
                      </div>
                    </div>
                  </div>
                )}

                {isPasswordMatch && (
                  <span className="reg-match-note success"><CheckCircle2 size={12} /> {t.passwordsMatch}</span>
                )}
                {isPasswordMismatch && (
                  <span className="reg-match-note error"><AlertCircle size={12} /> {t.passwordsMismatch}</span>
                )}
              </div>

              {/* EMERGENCY & SAFETY */}
              <div className="reg-block">
                <span className="reg-block-label">Safety & Verification</span>

                <div className="reg-field-group">
                  <span className="reg-input-caption"><HeartHandshake size={13} /> {t.emergencyLabel}</span>
                  <input
                    type="tel"
                    className="reg-input"
                    placeholder={t.emergencyPlaceholder}
                    value={form.emergencyContact}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                    maxLength="20"
                  />
                </div>

                <div className="reg-pledge-check">
                  <label className="reg-checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.safetyPledge}
                      onChange={(e) => setForm({ ...form, safetyPledge: e.target.checked })}
                      required
                    />
                    <span>{t.safetyPledge}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="reg-error-box" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="reg-submit-wrap">
            <button
              type="submit"
              className="reg-submit-button"
              disabled={busy}
            >
              {busy ? (
                <>
                  <RefreshCw size={16} className="animate-spin inline mr-2" />
                  {t.submitBusy}
                </>
              ) : (
                <>
                  <ShieldCheck size={17} />
                  <span>{t.submit}</span>
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* FOOTER SWITCH */}
        <p className="reg-bottom-switch">
          {t.loginPrompt} <Link to="/login">{t.loginAction}</Link>
        </p>

        <div className="reg-trust-footer">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>{t.trustNote}</span>
        </div>
      </div>
    </section>
  );
}
