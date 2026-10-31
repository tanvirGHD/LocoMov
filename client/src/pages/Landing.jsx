import { Link } from 'react-router-dom';

const steps = [
  { number: '০১', icon: '✳', title: 'কাজটি পোস্ট করুন', text: 'কী আনাতে বা করাতে চান, কোথা থেকে কোথায়—কয়েক মুহূর্তেই জানিয়ে দিন।' },
  { number: '০২', icon: '⌁', title: 'সঠিক মানুষটি খুঁজুন', text: 'কাছাকাছি থাকা রানাররা কাজটি নিতে পারবেন বা নিজেদের প্রস্তাব পাঠাবেন।' },
  { number: '০৩', icon: '✓', title: 'নিরাপদে সম্পন্ন করুন', text: 'দুই ধাপের OTP যাচাইয়ে পিকআপ এবং ডেলিভারি—দুটিই নিশ্চিত করুন।' },
];

export default function Landing() {
  return (
    <div className="landing-page">
      <section className="hero-section page-width">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" />আপনার পাশের মানুষের শক্তিতে</div>
          <h1>পাড়ার কাজ,<br /><span>পাড়ার মানুষের</span> সাথে।</h1>
          <p>ওষুধ আনানো থেকে জরুরি ছোটখাটো কাজ—আপনার এলাকার নির্ভরযোগ্য মানুষের সঙ্গে কাজটি ভাগ করে নিন। আর পথে থাকলেই উপার্জন করুন।</p>
          <div className="hero-actions">
            <Link to="/register" className="button button-primary button-large">শুরু করুন <span aria-hidden="true">↗</span></Link>
            <Link to="/login" className="button button-quiet button-large">অ্যাকাউন্টে প্রবেশ <span aria-hidden="true">→</span></Link>
          </div>
          <div className="hero-trust"><span className="trust-mark">✓</span><span>দুই ধাপের OTP-তে নিশ্চিত পিকআপ ও ডেলিভারি</span></div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo">
            <img
              src="https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1400&q=85"
              alt="শহরের রাস্তায় ডেলিভারি সাইকেল চালাচ্ছেন একজন রানার"
              loading="eager"
            />
            <div className="photo-caption"><span className="photo-caption-mark">01</span><span><b>আপনার কাছের মানুষ</b><small>স্থানীয় কাজ, স্থানীয় রানার</small></span></div>
          </div>
        </div>
      </section>

      <section className="stats-strip">
        <div className="page-width stats-grid">
          <div><b>স্থানীয়</b><span>পাড়ার মধ্যেই কাজের সংযোগ</span></div>
          <div><b>২ ধাপ</b><span>পিকআপ ও ডেলিভারিতে OTP</span></div>
          <div><b>সুস্পষ্ট</b><span>কাজ শুরুর আগেই বাজেট দেখুন</span></div>
          <div><b>গোপনীয়</b><span>অপ্রয়োজনীয় NID সংগ্রহ নয়</span></div>
        </div>
      </section>

      <section className="how-section page-width">
        <div className="section-heading">
          <div><div className="eyebrow">সহজ, স্থানীয়, নির্ভরযোগ্য</div><h2>একটি কাজ। তিনটি সহজ ধাপ।</h2></div>
          <p>ছোট কাজগুলোও সহজ হলে<br />প্রতিদিনটা একটু ভালো কাটে।</p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => <article className="step-card" key={step.number}>
            <div className="step-top"><span className="step-icon">{step.icon}</span><span className="step-number">{step.number}</span></div>
            <h3>{step.title}</h3><p>{step.text}</p>
          </article>)}
        </div>
      </section>

      <section className="closing-cta page-width">
        <div><div className="eyebrow">পাড়া থেকেই শুরু হোক</div><h2>আপনার পাড়াকে আরও কাছের করে তুলুন।</h2><p>আজই গ্রাহক বা রানার হিসেবে যোগ দিন।</p></div>
        <Link to="/register" className="button button-light button-large">এখনই যোগ দিন <span aria-hidden="true">↗</span></Link>
      </section>
    </div>
  );
}
