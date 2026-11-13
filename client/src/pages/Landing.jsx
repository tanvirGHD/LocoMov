import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  MapPinned,
  Package,
  Pill,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Zap,
} from 'lucide-react';
import { api } from '../api';

const content = {
  en: {
    eyebrow: 'Trusted errands for Dhaka neighborhoods',
    headline: 'Local help for the everyday rush.',
    highlight: 'Fast, trusted, and close to home.',
    subtext: 'From medicine pickups in Azimpur to everyday errands across Dhaka, LocoMuv brings customers and trusted neighborhood runners together.',
    start: 'Post a task',
    login: 'Sign in',
    trustPill: 'OTP verified pickup and delivery',
    liveKicker: 'Fresh customer requests',
    liveTitle: 'Latest neighborhood errands',
    live: 'Live updates',
    networkTitle: 'Dhaka’s neighborhood network',
    networkPickup: 'Local pickup',
    networkDelivery: 'Doorstep delivery',
    networkVerified: 'OTP-verified handoff',
    available: 'Available',
    assigned: 'Assigned',
    noTasks: 'No open errands right now',
    noTasksText: 'New customer posts will appear here as soon as they are published.',
    updated: 'Refreshes automatically',
    refreshedAt: 'Last updated',
    refreshNow: 'Refresh tasks now',
    seeAll: 'Sign in as a runner to respond',
    postedBy: 'Posted by',
    postedAt: 'Posted',
    respondToTask: 'Sign in to accept or make an offer',
    justNow: 'Just now',
    minutesAgo: (count) => `${count} min ago`,
    hoursAgo: (count) => `${count} hr ago`,
    sectionEyebrow: 'Built for real neighborhood life',
    sectionTitle: 'How it works',
    sectionText: 'Find work, find people, and move safely without friction.',
    customerMode: 'I need an errand done',
    runnerMode: 'I want to earn as a runner',
    trustTitle: 'Why locals trust LocoMuv',
    faqTitle: 'Frequently Asked Questions',
    faqEyebrow: 'GOT QUESTIONS?',
    ctaEyebrow: 'Ready when life gets busy?',
    ctaTitle: 'Start as a customer or become a trusted runner.',
    ctaText: 'From quick errands to daily convenience, your neighborhood is already here.',
    ctaButton: 'Join for free',
    ctaPost: 'Post your first task',
    ctaRunner: 'Apply as a runner',
    steps: [
      { icon: MapPinned, title: 'Post your task', text: 'Share what you need, add pickup and delivery locations, and set your budget.', note: 'Takes only a few minutes' },
      { icon: Bike, title: 'Choose a nearby runner', text: 'Nearby runners can accept the task or send you an offer to review.', note: 'Compare offers before choosing' },
      { icon: ShieldCheck, title: 'Receive it safely', text: 'Track the delivery and confirm handoff with the secure OTP.', note: 'OTP-confirmed handoff' },
    ],
    runnerSteps: [
      { icon: BadgeCheck, title: 'Get verified', text: 'Create a runner account and submit the required identity information.', note: 'Build trust with your profile' },
      { icon: MapPinned, title: 'Find nearby tasks', text: 'Browse local requests and accept the jobs that fit your route.', note: 'You choose when to work' },
      { icon: Bike, title: 'Deliver and earn', text: 'Complete the task with OTP confirmation and receive the agreed payment.', note: 'Clear price before accepting' },
    ],
    trust: [
      { icon: BadgeCheck, title: 'Verified runners', text: 'Review runner ratings and completion history before you choose.' },
      { icon: ShieldCheck, title: 'OTP protection', text: 'Pickup and delivery are confirmed with secure verification.' },
      { icon: Sparkles, title: 'Safer handoffs', text: 'Photo proof helps make pickups, deliveries, and disputes clearer.' },
    ],
    faq: [
      { q: 'Does LocoMuv require a full registration process?', a: 'No! You can post an errand immediately with just your mobile phone number and OTP login. Full registration is only required if you apply to become an active earning runner.' },
      { q: 'Can runners accept tasks near my neighborhood?', a: 'Yes. Nearby tasks appear in the runner dashboard based on location and task limits.' },
      { q: 'What if a job is delayed or disputed?', a: 'Tasks can be reported, and admins can review the issue and take action.' },
      { q: 'How are delivery fees calculated in BDT (৳)?', a: 'Customers set a budget when posting. Runners can accept it or send an offer, and the final price is shown before the customer accepts.' },
    ],
    labels: {
      localValue: 'Dhaka', localLabel: 'Built for local neighborhoods',
      safetyValue: '4-digit OTP', safetyLabel: 'Verified pickup and delivery',
      liveValue: '12 sec', liveLabel: 'Live task refresh',
    },
  },
  bn: {
    eyebrow: 'ঢাকার পাড়ায় পাড়ায় নির্ভরযোগ্য কাজ',
    headline: 'প্রতিদিনের ব্যস্ততায় পাশে স্থানীয় সহায়তা।',
    highlight: 'দ্রুত, নির্ভরযোগ্য, আপনার কাছেই।',
    subtext: 'আজিমপুরে ওষুধ আনা থেকে ঢাকার নানা দৈনন্দিন কাজ—লোকোমুভ গ্রাহক ও কাছের রানারদের একসঙ্গে আনে।',
    start: 'কাজ পোস্ট করুন',
    login: 'সাইন ইন',
    trustPill: 'OTP যাচাইসহ নিরাপদ পিকআপ ও ডেলিভারি',
    liveKicker: 'গ্রাহকের নতুন কাজ',
    liveTitle: 'এলাকার সাম্প্রতিক কাজ',
    live: 'লাইভ আপডেট',
    networkTitle: 'ঢাকার পাড়ার সংযুক্ত নেটওয়ার্ক',
    networkPickup: 'এলাকার পিকআপ',
    networkDelivery: 'বাসায় ডেলিভারি',
    networkVerified: 'OTP যাচাইকৃত হস্তান্তর',
    available: 'রানার খুঁজছে',
    assigned: 'রানার পেয়েছে',
    noTasks: 'এই মুহূর্তে কোনো খোলা কাজ নেই',
    noTasksText: 'গ্রাহক নতুন কাজ পোস্ট করলেই এখানে দেখা যাবে।',
    updated: 'স্বয়ংক্রিয়ভাবে আপডেট হয়',
    refreshedAt: 'সর্বশেষ আপডেট',
    refreshNow: 'কাজের তালিকা আপডেট করুন',
    seeAll: 'সাড়া দিতে রানার হিসেবে সাইন ইন করুন',
    postedBy: 'পোস্ট করেছেন',
    postedAt: 'পোস্টের তারিখ',
    respondToTask: 'গ্রহণ বা অফার দিতে সাইন ইন করুন',
    justNow: 'এইমাত্র',
    minutesAgo: (count) => `${count} মিনিট আগে`,
    hoursAgo: (count) => `${count} ঘণ্টা আগে`,
    sectionEyebrow: 'আপনার এলাকার জন্য তৈরি',
    sectionTitle: 'যেভাবে কাজ করে',
    sectionText: 'সহজে কাজ খুঁজুন, মানুষের সঙ্গে যুক্ত হোন, নিরাপদে ডেলিভারি দিন।',
    customerMode: 'আমার কাজ করাতে চাই',
    runnerMode: 'রানার হিসেবে আয় করতে চাই',
    trustTitle: 'লোকোমুভে মানুষ কেন ভরসা করে',
    faqTitle: 'সাধারণ প্রশ্ন',
    ctaEyebrow: 'ব্যস্ত দিনে পাশে আছে লোকোমুভ',
    ctaTitle: 'গ্রাহক হিসেবে শুরু করুন, অথবা নির্ভরযোগ্য রানার হোন।',
    ctaText: 'ছোটখাটো কাজ থেকে প্রতিদিনের সুবিধা—আপনার এলাকার মানুষই আছে পাশে।',
    ctaButton: 'বিনামূল্যে যোগ দিন',
    ctaPost: 'প্রথম কাজটি পোস্ট করুন',
    ctaRunner: 'রানার হিসেবে আবেদন করুন',
    steps: [
      { icon: MapPinned, title: 'কাজ পোস্ট করুন', text: 'কয়েকটি ধাপে পিকআপ, ডেলিভারি ও বাজেট জানান।', note: 'কয়েক মিনিটেই পোস্ট করুন' },
      { icon: Bike, title: 'কাছের রানার সাড়া দেবেন', text: 'কাছের রানার কাজটি নিতে বা দাম জানাতে পারবেন।', note: 'অফার দেখে রানার বাছুন' },
      { icon: ShieldCheck, title: 'নিরাপদে ডেলিভারি', text: 'OTP যাচাই ও প্রমাণের মাধ্যমে হস্তান্তর নিরাপদ থাকে।', note: 'OTP-তে নিশ্চিত হস্তান্তর' },
    ],
    runnerSteps: [
      { icon: BadgeCheck, title: 'যাচাইকৃত রানার হোন', text: 'রানার অ্যাকাউন্ট তৈরি করে প্রয়োজনীয় পরিচয়পত্র জমা দিন।', note: 'প্রোফাইলে আস্থা তৈরি করুন' },
      { icon: MapPinned, title: 'কাছের কাজ খুঁজুন', text: 'নিজের এলাকার কাজ দেখুন এবং সুবিধামতো কাজ গ্রহণ করুন।', note: 'নিজের সময়ে কাজ করুন' },
      { icon: Bike, title: 'ডেলিভারি দিয়ে আয় করুন', text: 'OTP দিয়ে কাজ সম্পন্ন করুন এবং সম্মত পারিশ্রমিক পান।', note: 'গ্রহণের আগেই দাম দেখুন' },
    ],
    trust: [
      { icon: BadgeCheck, title: 'যাচাইকৃত রানার', text: 'রানার বেছে নেওয়ার আগে রেটিং ও কাজের ইতিহাস দেখুন।' },
      { icon: ShieldCheck, title: 'OTP সুরক্ষা', text: 'পিকআপ ও ডেলিভারি নিরাপদ OTP দিয়ে নিশ্চিত হয়।' },
      { icon: Sparkles, title: 'নিরাপদ হস্তান্তর', text: 'ছবির প্রমাণে পিকআপ, ডেলিভারি ও অভিযোগ পরিষ্কার থাকে।' },
    ],
    faq: [
      { q: 'কাজ পোস্ট করতে কি অ্যাকাউন্ট লাগবে?', a: 'হ্যাঁ। কাজ পোস্ট, রানারের সঙ্গে যোগাযোগ এবং ডেলিভারি দেখতে নিরাপদ অ্যাকাউন্ট দরকার।' },
      { q: 'রানাররা কি কাছের কাজ দেখতে পাবেন?', a: 'হ্যাঁ। অবস্থান ও কাজের সীমা অনুযায়ী রানার ড্যাশবোর্ডে কাছের কাজ দেখা যায়।' },
      { q: 'কাজে দেরি বা কোনো অভিযোগ হলে কী করব?', a: 'কাজের বিষয়ে রিপোর্ট করা যায়, অ্যাডমিন বিষয়টি পর্যালোচনা করে ব্যবস্থা নিতে পারেন।' },
      { q: 'ডেলিভারি ফি কীভাবে ঠিক হয়?', a: 'গ্রাহক কাজ পোস্ট করার সময় বাজেট দেন। রানার সেই বাজেট গ্রহণ করতে বা অফার পাঠাতে পারেন; গ্রাহক গ্রহণের আগে চূড়ান্ত দাম দেখা যায়।' },
    ],
    labels: {
      localValue: 'ঢাকা', localLabel: 'স্থানীয় এলাকার জন্য তৈরি',
      safetyValue: '৪-ডিজিট OTP', safetyLabel: 'যাচাইকৃত পিকআপ ও ডেলিভারি',
      liveValue: '১২ সেকেন্ড', liveLabel: 'লাইভ কাজের আপডেট',
    },
  },
};

function getTaskIcon(title = '') {
  const value = title.toLowerCase();
  if (/medicine|pharma|ওষুধ|ফার্মেসি/.test(value)) return Pill;
  if (/book|campus|বই|ক্যাম্পাস/.test(value)) return BookOpen;
  if (/water|snack|grocery|market|পানি|নাস্তা|বাজার/.test(value)) return ShoppingCart;
  return Package;
}

function formatPrice(price, language) {
  const locale = language === 'bn' ? 'bn-BD' : 'en-US';
  return `৳ ${Number(price || 0).toLocaleString(locale)}`;
}

function formatTaskDate(date, language) {
  const locale = language === 'bn' ? 'bn-BD' : 'en-US';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
}

export default function Landing({ language = 'en', user = null }) {
  const t = content[language] || content.en;
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [howMode, setHowMode] = useState('customer');
  const steps = howMode === 'runner' ? t.runnerSteps : t.steps;

  useEffect(() => {
    let ignore = false;
    const fetchTasks = async () => {
      if (!ignore) setRefreshing(true);
      try {
        const response = await api.publicTasks();
        if (!ignore) {
          setTasks(Array.isArray(response.tasks) ? response.tasks : []);
          setLastUpdated(new Date());
        }
      } catch (_) {
        if (!ignore) setTasks([]);
      } finally {
        if (!ignore) {
          setTasksLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchTasks();
    const timer = window.setInterval(fetchTasks, 12000);
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [refreshVersion]);

  return (
    <div className={`landing-page ${language === 'bn' ? 'landing-page-bn' : ''}`}>
      <section className="landing-hero page-width">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" />{t.eyebrow}</div>
          <h1>{t.headline}<span>{t.highlight}</span></h1>
          <p>{t.subtext}</p>

          <div className="hero-actions">
            <Link to="/register" className="button button-primary button-large">{t.start}<ArrowRight size={16} /></Link>
            <Link to="/login" className="button button-quiet button-large">{t.login}<ArrowRight size={16} /></Link>
          </div>

          <div className="hero-trust">
            <span className="trust-mark"><Check size={14} strokeWidth={3} /></span>
            <span>{t.trustPill}</span>
          </div>
        </div>

        <div className="visual-shell">
          <div className="hero-network-card" aria-label={t.networkTitle}>
            <div className="hero-network-heading"><span><MapPinned size={16} />{t.networkTitle}</span><i><b />Dhaka</i></div>
            <div className="requests-map hero-network-map" aria-hidden="true">
              <div className="requests-map-grid" />
              <svg viewBox="0 0 520 130" preserveAspectRatio="none"><path d="M20 96 C120 24 190 114 282 55 S420 23 500 72" /></svg>
              <span className="map-point map-point-a"><MapPinned size={15} /></span>
              <span className="map-point map-point-b"><Bike size={17} /></span>
              <span className="map-area-label map-area-left">Azimpur</span>
              <span className="map-area-label map-area-right">Dhanmondi</span>
            </div>
            <div className="hero-network-features">
              <span><MapPinned size={15} />{t.networkPickup}</span>
              <span><Bike size={15} />{t.networkDelivery}</span>
              <span><ShieldCheck size={15} />{t.networkVerified}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="how-section page-width" id="how-it-works">
        <div className="section-heading">
          <div><div className="eyebrow">{t.sectionEyebrow}</div><h2>{t.sectionTitle}</h2></div>
          <p>{t.sectionText}</p>
        </div>
        <div className="how-mode-switch" role="tablist" aria-label={t.sectionTitle}>
          <button type="button" role="tab" aria-selected={howMode === 'customer'} className={howMode === 'customer' ? 'active' : ''} onClick={() => setHowMode('customer')}>{t.customerMode}</button>
          <button type="button" role="tab" aria-selected={howMode === 'runner'} className={howMode === 'runner' ? 'active runner-active' : ''} onClick={() => setHowMode('runner')}>{t.runnerMode}</button>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return <article key={`${howMode}-${step.title}`} className={`step-card ${howMode === 'runner' ? 'runner-step-card' : ''}`}><div className="step-top"><span className="step-icon"><Icon size={18} /></span><span className="step-number">0{index + 1}</span></div><h3>{step.title}</h3><p>{step.text}</p><div className="step-note">{step.note}<ArrowRight size={13} /></div></article>;
          })}
        </div>
      </section>

      <section className="trust-section page-width" id="trust">
        <div className="section-heading"><div><div className="eyebrow">{t.trustTitle}</div><h2>{t.trustTitle}</h2></div></div>
        <div className="trust-grid">
          {t.trust.map((item) => {
            const Icon = item.icon;
            return <article key={item.title} className="trust-card"><span className="trust-icon"><Icon size={18} /></span><h3>{item.title}</h3><p>{item.text}</p></article>;
          })}
        </div>
      </section>

      <section className="community-showcase page-width" id="errands" aria-labelledby="recent-requests-title">
        <div className="matched-errands-section">
          <div className="matched-errands-heading">
            <div><span className="requests-kicker">{t.liveKicker}</span><h2 id="recent-requests-title">{t.liveTitle}</h2></div>
            <span className="live-indicator"><i />{t.live}</span>
          </div>
          <div className="matched-errands-grid" aria-live="polite">
            {tasksLoading ? (
              <div className="request-empty"><span className="request-loading-dot" />{language === 'bn' ? 'কাজ খোঁজা হচ্ছে…' : 'Loading customer errands…'}</div>
            ) : tasks.length ? tasks.map((task) => {
              const Icon = getTaskIcon(task.title);
              const taskHref = user?.role === 'runner'
                ? `/dashboard?taskId=${encodeURIComponent(task.id)}#tasks`
                : user ? '/dashboard#tasks' : `/login?taskId=${encodeURIComponent(task.id)}`;
              return (
                <Link className="request-row task-link" to={taskHref} key={task.id} aria-label={`${task.title}. ${t.respondToTask}`}>
                  <span className="request-icon"><Icon size={19} /></span>
                  <span className="request-info">
                    <strong title={task.title}>{task.title}</strong>
                    <span className="request-route">{task.pickupArea} <ArrowRight size={11} /> {task.deliveryArea}</span>
                    <span className="request-posted">{t.postedBy} {task.customerName || (language === 'bn' ? 'গ্রাহক' : 'Customer')} <i /> {t.postedAt} {formatTaskDate(task.createdAt, language)}</span>
                  </span>
                  <span className="request-price"><strong>{formatPrice(task.price, language)}</strong><span className="is-available">{t.available}</span></span>
                </Link>
              );
            }) : (
              <div className="request-empty"><span className="request-empty-icon"><Package size={19} /></span><div><strong>{t.noTasks}</strong><span>{t.noTasksText}</span></div></div>
            )}
          </div>
          <div className="matched-errands-footer">
            <span><Clock3 size={13} />{lastUpdated ? `${t.refreshedAt} ${new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(lastUpdated)}` : t.updated}</span>
            <Link to={user ? '/dashboard#tasks' : '/login'}>{t.seeAll}<ArrowRight size={13} /></Link>
            <button type="button" className="request-refresh-button" onClick={() => setRefreshVersion((value) => value + 1)} disabled={refreshing} aria-label={t.refreshNow} title={t.refreshNow}><RefreshCw size={14} className={refreshing ? 'is-spinning' : ''} /></button>
          </div>
        </div>
        <div className="social-proof-grid">
          <div className="proof-card"><span className="proof-icon"><MapPinned size={18} /></span><div><strong>{t.labels.localValue}</strong><small>{t.labels.localLabel}</small></div></div>
          <div className="proof-card"><span className="proof-icon"><ShieldCheck size={18} /></span><div><strong>{t.labels.safetyValue}</strong><small>{t.labels.safetyLabel}</small></div></div>
          <div className="proof-card"><span className="proof-icon"><RefreshCw size={18} /></span><div><strong>{t.labels.liveValue}</strong><small>{t.labels.liveLabel}</small></div></div>
        </div>
      </section>

      <section className="faq-section page-width" id="faq">
        <header className="faq-heading">
          <div className="faq-heading-content">
            <div className="eyebrow">{t.faqEyebrow || 'GOT QUESTIONS?'}</div>
            <h2>{t.faqTitle}</h2>
          </div>
        </header>
        <div className="faq-list">
          {t.faq.map((item, index) => <details key={item.q} className="faq-item" open={index === 0}><summary><span>{item.q}</span><ChevronDown size={18} /></summary><p>{item.a}</p></details>)}
        </div>
      </section>

      <section className="closing-cta page-width">
        <div><div className="eyebrow"><Zap size={14} />{t.ctaEyebrow}</div><h2>{t.ctaTitle}</h2><p>{t.ctaText}</p></div>
        <div className="closing-actions">
          <Link to="/register" className="button button-light button-large">{t.ctaPost}<ArrowRight size={16} /></Link>
          <Link to="/register" className="button runner-cta button-large"><Bike size={16} />{t.ctaRunner}</Link>
        </div>
      </section>
    </div>
  );
}
