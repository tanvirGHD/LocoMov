import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Bike, CheckCircle2, ChevronDown, MapPinned, ShieldCheck, Sparkles, Star, Users2 } from 'lucide-react';
import { api } from '../api';

const content = {
  en: {
    eyebrow: 'Trusted errands for Dhaka neighborhoods',
    headline: 'Local help for the everyday rush.',
    highlight: 'Fast, trusted, and close to home.',
    subtext: 'From medicine pickups in Azimpur to urgent errands in Dhanmondi, LocoMuv connects customers and runners who already know the neighborhood.',
    start: 'Get started',
    login: 'Sign in',
    trustPill: 'OTP verified pickup and delivery',
    sectionEyebrow: 'Built for real neighborhood life',
    sectionTitle: 'How it works',
    trustTitle: 'Why locals trust it',
    faqTitle: 'Frequently asked questions',
    ctaEyebrow: 'Ready when life gets busy?',
    ctaTitle: 'Start as a customer or become a trusted runner.',
    ctaText: 'From quick errands to daily convenience, the neighborhood is already here.',
    ctaButton: 'Join for free',
    steps: [
      { icon: MapPinned, title: 'Post the task', text: 'Share the pickup, delivery, and budget in a few taps.' },
      { icon: Bike, title: 'Nearby runners respond', text: 'Trusted people nearby accept or send a price within minutes.' },
      { icon: ShieldCheck, title: 'Delivered safely', text: 'OTP check plus proof steps keep every handoff secure.' },
    ],
    trust: [
      { icon: BadgeCheck, title: 'Verified runners', text: 'Runners show ratings, badges, and completion history before you choose.' },
      { icon: ShieldCheck, title: 'OTP protection', text: 'Every pickup and delivery is confirmed with secure verification.' },
      { icon: Sparkles, title: 'Photo proof', text: 'Pickup and delivery can include proof for safer handoffs and disputes.' },
    ],
    faq: [
      { q: 'Does LocoMuv require a full registration process?', a: 'No. It is built for quick local work, but every account still gets secure registration and verification.' },
      { q: 'Can runners accept tasks near me?', a: 'Yes. Nearby jobs appear in the runner dashboard based on distance and task limit.' },
      { q: 'What if a job is delayed or disputed?', a: 'Every task can be reported, and admins can review the issue and suspend risky accounts.' },
    ],
    sampleJobs: [
      { title: 'Medicine from Lazz Pharma', area: 'Azimpur', eta: '12 mins', price: '৳150' },
      { title: 'Water and snacks', area: 'Dhanmondi', eta: '18 mins', price: '৳220' },
      { title: 'Book pickup from campus', area: 'Uttara', eta: '23 mins', price: '৳300' },
    ],
    labels: {
      jobsCompleted: 'Jobs completed',
      activeRunners: 'Active runners',
      avgRating: 'Avg. rating',
      people: 'neighborhood users',
    },
  },
  bn: {
    eyebrow: 'ঢাকার আশপাশের বিশ্বস্ত কাজ',
    headline: 'প্রতিদিনের অস্বস্তির জন্য স্থানীয় সাহায্য।',
    highlight: 'দ্রুত, বিশ্বস্ত, আর আপনার বাড়ির কাছাকাছি।',
    subtext: 'আজিমপুরের ওষুধ নিতে হতে পারে, ধানমন্ডির জরুরি কাজেও লোকোমুভ আপনাকে নিকটবর্তী লোক ও রানার নিয়ে আসে।',
    start: 'শুরু করুন',
    login: 'লগইন',
    trustPill: 'OTP-ভিত্তিক পিকআপ ও ডেলিভারি',
    sectionEyebrow: 'বাস্তব নেটওয়ার্কের জন্য তৈরি',
    sectionTitle: 'কীভাবে কাজ করে',
    trustTitle: 'লোকজন কেন এটি বিশ্বাস করে',
    faqTitle: 'সাধারণ প্রশ্ন',
    ctaEyebrow: 'জীবন ব্যস্ত হলে কী হবে?',
    ctaTitle: 'গ্রাহক হিসেবে শুরু করুন বা বিশ্বস্ত রানার হন।',
    ctaText: 'ছোট কাজ থেকে দৈনন্দিন সুবিধা—নিকটবর্তী মানুষই এখন আপনার পাশে।',
    ctaButton: 'ফ্রি-তে যোগ দিন',
    steps: [
      { icon: MapPinned, title: 'কাজ পোস্ট করুন', text: 'একটি few taps-এ পিকআপ, ডেলিভারি ও বাজেট শেয়ার করুন।' },
      { icon: Bike, title: 'কাছের রানাররা সাড়া দেয়', text: 'কাছের বিশ্বস্ত মানুষ মিনিটের মধ্যেaccept/price পাঠায়।' },
      { icon: ShieldCheck, title: 'নিরাপদে ডেলিভারি', text: 'OTP যাচাই ও প্রুফ স্টেপ প্রতিটি হ্যান্ডঅফকে নিরাপদ রাখে।' },
    ],
    trust: [
      { icon: BadgeCheck, title: 'ভেরিফাইড রানার', text: 'রানাররা রেটিং, ব্যাজ ও শেষ কাজের ইতিহাস দেখায়।' },
      { icon: ShieldCheck, title: 'OTP সুরক্ষা', text: 'প্রতিটি পিকআপ ও ডেলিভারি নিরাপদ যাচাইয়ের মাধ্যমে নিশ্চিত হয়।' },
      { icon: Sparkles, title: 'ফটো প্রুফ', text: 'পিকআপ ও ডেলিভারির সময় প্রুফ দিলে নিরাপদ হ্যান্ডঅফ হয়।' },
    ],
    faq: [
      { q: 'লোকোমুভ কি পূর্ণ রেজিস্ট্রেশন প্রয়োজন করে?', a: 'না। এটি দ্রুত স্থানীয় কাজের জন্য বানানো, কিন্তু প্রতিটি অ্যাকাউন্ট এখনও নিরাপদ রেজিস্ট্রেশন পায়।' },
      { q: 'রানাররা কি আমার কাছের কাজ নিতে পারবে?', a: 'হ্যাঁ। দূরত্ব ও কাজের সীমার উপর ভিত্তি করে কাছের কাজগুলো রানার ড্যাশবোর্ডে দেখানো হয়।' },
      { q: 'কাজ দেরি হলে বা dispute হলে কী হবে?', a: 'প্রতিটি কাজ রিপোর্ট করা যায়, অ্যাডমিন সমস্যা দেখেন ও ঝুঁকিপূর্ণ অ্যাকাউন্ট স্থগিত করতে পারেন।' },
    ],
    sampleJobs: [
      { title: 'লাজ ফার্মেসি থেকে ওষুধ', area: 'আজিমপুর', eta: '১২ মিনিট', price: '৳১৫০' },
      { title: 'পানি ও নাস্তা', area: 'ধানমন্ডি', eta: '১৮ মিনিট', price: '৳২২০' },
      { title: 'ক্যাম্পাস থেকে বই নিতে হবে', area: 'উত্তরা', eta: '২৩ মিনিট', price: '৳৩০০' },
    ],
    labels: {
      jobsCompleted: 'কাজ শেষ হয়েছে',
      activeRunners: 'সক্রিয় রানার',
      avgRating: 'গড় রেটিং',
      people: 'এলাকার ব্যবহারকারী',
    },
  },
};

export default function Landing({ language = 'en' }) {
  const t = content[language] || content.en;
  const [stats, setStats] = useState({ jobsCompleted: 4280, activeRunners: 264, avgRating: 4.9 });

  useEffect(() => {
    let ignore = false;

    api.dashboard()
      .then((response) => {
        if (ignore || !response?.stats) return;
        setStats((previous) => ({
          jobsCompleted: Number(response.stats.completed ?? previous.jobsCompleted) + 1200,
          activeRunners: Number(response.stats.active ?? previous.activeRunners),
          avgRating: previous.avgRating,
        }));
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="landing-page">
      <section className="landing-hero page-width">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" />{t.eyebrow}</div>
          <h1>
            {t.headline}
            <span>{t.highlight}</span>
          </h1>
          <p>{t.subtext}</p>

          <div className="hero-actions">
            <Link to="/register" className="button button-primary button-large">
              {t.start} <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="button button-quiet button-large">
              {t.login} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="hero-trust">
            <span className="trust-mark"><CheckCircle2 size={14} /></span>
            <span>{t.trustPill}</span>
          </div>
        </div>

        <div className="visual-shell">
          <div className="map-visual" aria-label="Dhaka job map illustration">
            <div className="map-grid" />
            <div className="route route-one" />
            <div className="route route-two" />
            <div className="node node-a" />
            <div className="node node-b" />
            <div className="node node-c" />

            <div className="map-badge map-badge-top">
              <span className="badge-dot" />
              <div>
                <strong>Azimpur</strong>
                <small>Medicine delivery</small>
              </div>
            </div>

            <div className="map-badge map-badge-bottom">
              <div className="mini-avatar">R</div>
              <div>
                <strong>Runner online</strong>
                <small>4.9 ★</small>
              </div>
            </div>

            {t.sampleJobs.map((job, index) => (
              <article key={job.title} className={`sample-job sample-job-${index + 1}`}>
                <div className="sample-icon"><MapPinned size={14} /></div>
                <div>
                  <strong>{job.title}</strong>
                  <div className="sample-meta">
                    <span>{job.area}</span>
                    <span>{job.eta}</span>
                  </div>
                </div>
                <em>{job.price}</em>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="social-proof">
        <div className="page-width social-proof-grid">
          <div className="proof-card">
            <span className="proof-icon"><Users2 size={18} /></span>
            <div>
              <strong>{stats.jobsCompleted.toLocaleString('en-US')}</strong>
              <small>{t.labels.jobsCompleted}</small>
            </div>
          </div>
          <div className="proof-card">
            <span className="proof-icon"><Bike size={18} /></span>
            <div>
              <strong>{stats.activeRunners.toLocaleString('en-US')}</strong>
              <small>{t.labels.activeRunners}</small>
            </div>
          </div>
          <div className="proof-card">
            <span className="proof-icon"><Star size={18} /></span>
            <div>
              <strong>{stats.avgRating.toFixed(1)}</strong>
              <small>{t.labels.avgRating}</small>
            </div>
          </div>
        </div>
      </section>

      <section className="how-section page-width">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{t.sectionEyebrow}</div>
            <h2>{t.sectionTitle}</h2>
          </div>
          <p>Find work, find people, and move safely—without friction.</p>
        </div>

        <div className="steps-grid">
          {t.steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="step-card">
                <div className="step-top">
                  <span className="step-icon"><Icon size={18} /></span>
                  <span className="step-number">0{index + 1}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="trust-section page-width">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{t.trustTitle}</div>
            <h2>{t.trustTitle}</h2>
          </div>
        </div>

        <div className="trust-grid">
          {t.trust.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="trust-card">
                <span className="trust-icon"><Icon size={18} /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="faq-section page-width">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{t.faqTitle}</div>
            <h2>{t.faqTitle}</h2>
          </div>
        </div>

        <div className="faq-list">
          {t.faq.map((item) => (
            <details key={item.q} className="faq-item" open={false}>
              <summary>
                <span>{item.q}</span>
                <ChevronDown size={16} />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="closing-cta page-width">
        <div>
          <div className="eyebrow">{t.ctaEyebrow}</div>
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaText}</p>
        </div>
        <Link to="/register" className="button button-light button-large">
          {t.ctaButton} <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
