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
  MapPin,
  MapPinned,
  Package,
  Pill,
  RefreshCw,
  Rocket,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { api } from '../api';
import PageMeta from '../components/PageMeta';

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
    taskTypes: { medicine: 'Medicine run', groceries: 'Grocery run', books: 'Book pickup', delivery: 'Local delivery', errand: 'Neighborhood errand' },
    updated: 'Refreshes automatically',
    refreshedAt: 'Last updated',
    refreshNow: 'Refresh tasks now',
    seeAll: 'Sign in as a runner to respond',
    postedBy: 'Budget',
    postedAt: 'ago',
    respondToTask: 'Sign in to accept or make an offer',
    justNow: 'Just now',
    minutesAgo: (count) => `${count} min ago`,
    hoursAgo: (count) => `${count} hr ago`,
    daysAgo: (count) => `${count} day ago`,
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
      { icon: BadgeCheck, title: 'Get started as a runner', text: 'Create a runner account and complete the required profile details.', note: 'Build trust with your profile' },
      { icon: MapPinned, title: 'Find nearby tasks', text: 'Browse local requests and accept the jobs that fit your route.', note: 'You choose when to work' },
      { icon: Bike, title: 'Deliver and earn', text: 'Complete the task with OTP confirmation and receive the agreed payment.', note: 'Clear price before accepting' },
    ],
    trust: [
      { icon: BadgeCheck, title: 'Verified runners', text: 'Review runner ratings and completion history before you choose.' },
      { icon: ShieldCheck, title: 'OTP protection', text: 'Pickup and delivery are confirmed with secure verification.' },
      { icon: Sparkles, title: 'Safer handoffs', text: 'Photo proof helps make pickups, deliveries, and disputes clearer.' },
    ],
    faq: [
      { q: 'Can I post with only my mobile number and an OTP?', a: 'No. You need to complete the account registration form and sign in before posting a task. OTPs are used to confirm pickup and delivery, not to create an account.' },
      { q: 'Can runners accept tasks near my neighborhood?', a: 'Yes. Nearby tasks appear in the runner dashboard based on location and task limits.' },
      { q: 'What if a job is delayed or disputed?', a: 'Tasks can be reported, and admins can review the issue and take action.' },
      { q: 'How are delivery fees calculated in BDT (৳)?', a: 'Customers set a budget when posting. Runners can accept it or send an offer, and the final price is shown before the customer accepts.' },
    ],
    labels: {
      completedLabel: 'Completed deliveries',
      activeRunnersLabel: 'Active runner accounts',
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
    taskTypes: { medicine: 'ওষুধ আনা', groceries: 'বাজার করা', books: 'বই আনা', delivery: 'স্থানীয় ডেলিভারি', errand: 'এলাকার কাজ' },
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
    daysAgo: (count) => `${count} দিন আগে`,
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
      { icon: BadgeCheck, title: 'রানার হিসেবে শুরু করুন', text: 'রানার অ্যাকাউন্ট তৈরি করে প্রোফাইলের প্রয়োজনীয় তথ্য পূরণ করুন।', note: 'প্রোফাইলে আস্থা তৈরি করুন' },
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
      completedLabel: 'সম্পন্ন ডেলিভারি',
      activeRunnersLabel: 'সক্রিয় রানার অ্যাকাউন্ট',
    },
  },
};

function getTaskIcon(type = '') {
  if (type === 'medicine') return Pill;
  if (type === 'books') return BookOpen;
  if (type === 'groceries') return ShoppingCart;
  if (type === 'delivery') return Bike;
  return Package;
}

export default function Landing({ language = 'en', user = null }) {
  const t = content[language] || content.en;
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ completedDeliveries: null, activeRunners: null });
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
          setStats({
            completedDeliveries: Number.isFinite(response.stats?.completedDeliveries) ? response.stats.completedDeliveries : null,
            activeRunners: Number.isFinite(response.stats?.activeRunners) ? response.stats.activeRunners : null,
          });
          setLastUpdated(new Date());
        }
      } catch (_) {
        if (!ignore) {
          setTasks([]);
          setStats({ completedDeliveries: null, activeRunners: null });
        }
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
    <div className={`landing-page landing-hero-redesign ${language === 'bn' ? 'landing-page-bn' : ''}`}>
      <PageMeta
        title={language === 'bn' ? 'LocoMuv — ঢাকার স্থানীয় কাজ ও ডেলিভারি' : 'LocoMuv — Neighborhood Errands in Dhaka'}
        description={language === 'bn' ? 'ঢাকার গ্রাহক ও স্থানীয় রানারদের নিরাপদে যুক্ত করে ছোট কাজ ও ডেলিভারি সম্পন্ন করুন।' : 'Connect with trusted neighborhood runners in Dhaka for everyday errands and deliveries.'}
        lang={language === 'bn' ? 'bn' : 'en'}
      />
      <section className="landing-hero landing-hero-v2" aria-label="Hero">
        <div className="hero-v2-bg" aria-hidden="true">
          <div className="hero-v2-bg-base" />
          <div className="hero-v2-bg-dots" />
          <div className="hero-v2-bg-curve hero-v2-bg-curve-1" />
          <div className="hero-v2-bg-curve hero-v2-bg-curve-2" />
          <svg className="hero-v2-city-svg" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" focusable="false">
            <defs>
              <linearGradient id="heroSky" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00152D" />
                <stop offset="55%" stopColor="#002447" />
                <stop offset="100%" stopColor="#001B35" />
              </linearGradient>
              <linearGradient id="heroGlow" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#00D9FF" stopOpacity="0" />
                <stop offset="45%" stopColor="#159BFF" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#00D9FF" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="roadGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#001B35" stopOpacity="0" />
                <stop offset="35%" stopColor="#00D9FF" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#159BFF" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <g className="hero-city-buildings" fill="#021F38" opacity="0.95">
              <rect x="620" y="300" width="48" height="220" rx="4" />
              <rect x="676" y="250" width="64" height="270" rx="4" />
              <rect x="748" y="280" width="42" height="240" rx="4" />
              <rect x="798" y="210" width="70" height="310" rx="4" />
              <rect x="876" y="265" width="52" height="255" rx="4" />
              <rect x="936" y="230" width="58" height="290" rx="4" />
              <rect x="1002" y="285" width="46" height="235" rx="4" />
              <rect x="1056" y="245" width="66" height="275" rx="4" />
              <rect x="1130" y="270" width="54" height="250" rx="4" />
              <rect x="1192" y="220" width="72" height="300" rx="4" />
              <rect x="1272" y="290" width="60" height="230" rx="4" />
              <rect x="1340" y="260" width="80" height="260" rx="4" />
            </g>
            <g className="hero-city-windows" fill="#00D9FF" opacity="0.35">
              <rect x="700" y="270" width="6" height="10" rx="1" />
              <rect x="810" y="270" width="6" height="10" rx="1" />
              <rect x="920" y="270" width="6" height="10" rx="1" />
              <rect x="1030" y="270" width="6" height="10" rx="1" />
              <rect x="1140" y="270" width="6" height="10" rx="1" />
              <rect x="1250" y="270" width="6" height="10" rx="1" />
              <rect x="700" y="308" width="6" height="10" rx="1" />
              <rect x="810" y="308" width="6" height="10" rx="1" />
              <rect x="920" y="308" width="6" height="10" rx="1" />
              <rect x="1030" y="308" width="6" height="10" rx="1" />
              <rect x="1140" y="308" width="6" height="10" rx="1" />
              <rect x="1250" y="308" width="6" height="10" rx="1" />
              <rect x="640" y="320" width="5" height="9" rx="1" />
              <rect x="735" y="320" width="5" height="9" rx="1" />
              <rect x="830" y="320" width="5" height="9" rx="1" />
              <rect x="925" y="320" width="5" height="9" rx="1" />
              <rect x="1020" y="320" width="5" height="9" rx="1" />
              <rect x="1115" y="320" width="5" height="9" rx="1" />
              <rect x="1210" y="320" width="5" height="9" rx="1" />
              <rect x="1305" y="320" width="5" height="9" rx="1" />
            </g>
            <g className="hero-city-trees" fill="#013A2A" opacity="0.9">
              <ellipse cx="590" cy="410" rx="55" ry="35" />
              <ellipse cx="650" cy="420" rx="40" ry="28" />
              <ellipse cx="1225" cy="430" rx="50" ry="30" />
              <ellipse cx="1295" cy="418" rx="60" ry="34" />
            </g>
            <g className="hero-memorial" transform="translate(1085,235)" opacity="0.95">
              <polygon points="0,180 22,40 44,180" fill="#052B40" />
              <polygon points="14,180 36,20 58,180" fill="#06344D" />
              <polygon points="28,180 50,45 72,180" fill="#052B40" />
              <rect x="-10" y="180" width="100" height="10" rx="3" fill="#043047" />
            </g>
            <path d="M520 520 L860 360 L1440 360 L1440 520 Z" fill="#001B35" opacity="0.92" />
            <path d="M560 520 L900 372 L1440 372 L1440 392 L930 392 L620 520 Z" fill="url(#roadGlow)" />
            <path d="M760 520 L980 388 L1440 388" stroke="#00D9FF" strokeOpacity="0.18" strokeWidth="2" fill="none" />
            <rect x="620" y="220" width="820" height="300" fill="url(#heroGlow)" opacity="0.55" />
          </svg>
          <div className="hero-v2-bg-overlay" />
        </div>

        <div className="landing-hero-inner page-width">
          <div className="hero-copy hero-copy-v2">
            <div className="hero-trust-badge">
              <span className="hero-trust-badge-icon"><ShieldCheck size={14} /></span>
              <span>{language === 'bn' ? 'ঢাকার পাড়ায় নির্ভরযোগ্য সেবা' : 'TRUSTED BRANDS FOR DHAKA NEIGHBORHOODS'}</span>
            </div>
            <h1 className="hero-headline-v2">
              {language === 'bn' ? (
                <>
                  <span className="hero-line hero-line-white">প্রতিদিনের ব্যস্ততায়</span>
                  <span className="hero-line hero-line-white">স্থানীয় সহায়তা।</span>
                  <span className="hero-line hero-line-cyan">দ্রুত, নির্ভরযোগ্য,</span>
                  <span className="hero-line hero-line-cyan hero-line-underline">আপনার কাছেই।</span>
                </>
              ) : (
                <>
                  <span className="hero-line hero-line-white">Local help for the</span>
                  <span className="hero-line hero-line-white">everyday rush.</span>
                  <span className="hero-line hero-line-cyan">Fast, trusted, and</span>
                  <span className="hero-line hero-line-cyan hero-line-underline">close to home.</span>
                </>
              )}
            </h1>
            <p className="hero-subtext-v2">
              {language === 'bn'
                ? 'আজিমপুরে ওষুধ আনা থেকে ঢাকার নানা দৈনন্দিন কাজ—লোকোমুভ গ্রাহক ও বিশ্বস্ত পাড়ার রানারদের একসঙ্গে আনে।'
                : 'From medicine pickups in Azimpur to everyday errands across Dhaka, LocoMuv brings customers and trusted neighborhood runners together.'}
            </p>

            <div className="hero-actions hero-actions-v2">
              <Link to="/register" className="hero-btn hero-btn-primary">
                <Rocket size={18} aria-hidden="true" />
                <span>{language === 'bn' ? 'কাজ পোস্ট করুন' : 'Post a task'}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link to="/login" className="hero-btn hero-btn-secondary">
                <span>{language === 'bn' ? 'সাইন ইন' : 'Sign in'}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div className="hero-verify-v2">
              <span className="hero-verify-check"><Check size={14} strokeWidth={3} /></span>
              <span>{language === 'bn' ? 'OTP যাচাইকৃত পিকআপ ও ডেলিভারি' : 'OTP verified pickup and delivery'}</span>
            </div>
          </div>

          <div className="visual-shell visual-shell-v2">
            <div className="hero-live-map" aria-label={language === 'bn' ? 'লাইভ এরান্ড ম্যাপ' : 'Live errand map'}>
              <div className="hero-live-map-bg" aria-hidden="true">
                <div className="hero-map-grid-v2" />
                <div className="hero-map-glow hero-map-glow-a" />
                <div className="hero-map-glow hero-map-glow-b" />
                <svg className="hero-route-svg" viewBox="0 0 520 260" preserveAspectRatio="none">
                  <path className="hero-route-path hero-route-path-bg" d="M60 200 C140 120 220 230 300 150 S420 60 470 120" />
                  <path className="hero-route-path" d="M60 200 C140 120 220 230 300 150 S420 60 470 120" />
                </svg>
                <span className="hero-map-node hero-map-node-pickup"><Package size={15} /></span>
                <span className="hero-map-node hero-map-node-drop"><MapPin size={15} /></span>
                <span className="hero-map-runner"><Bike size={15} /></span>
                <span className="hero-map-ping hero-map-ping-1" />
                <span className="hero-map-ping hero-map-ping-2" />
                <span className="hero-map-ping hero-map-ping-3" />
              </div>
              <div className="hero-live-top">
                <span className="hero-live-badge"><i />{language === 'bn' ? 'লাইভ ভিউ' : 'Live view'}</span>
                <span className="hero-network-online"><b />{language === 'bn' ? 'অনলাইন' : 'Online'}</span>
              </div>
              <div className="hero-live-chip hero-live-chip-status">
                <Bike size={14} />
                <span>{language === 'bn' ? 'পণ্য পথে আছে' : 'Product on the way'}</span>
              </div>
              <div className="hero-live-chip hero-live-chip-pickup">
                <Package size={14} />
                <span>Azimpur · {language === 'bn' ? 'পিকআপ হয়েছে' : 'Picked up'}</span>
              </div>
              <div className="hero-live-chip hero-live-chip-drop">
                <MapPin size={14} />
                <span>Dhanmondi · {language === 'bn' ? 'ডেলিভারি চলছে' : 'Delivering'}</span>
              </div>
              <div className="hero-live-stats">
                <div><strong>12</strong><span>{language === 'bn' ? 'সক্রিয় রানার' : 'Active runners'}</span></div>
                <div><strong>4 min</strong><span>{language === 'bn' ? 'গড় ETA' : 'Avg ETA'}</span></div>
                <div><strong>98%</strong><span>{language === 'bn' ? 'সময়মতো' : 'On-time'}</span></div>
              </div>
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
        <div className="section-heading matched-errands-section-heading">
          <div>
            <span className="requests-kicker">{t.liveKicker}</span>
            <h2 id="recent-requests-title">{t.liveTitle}</h2>
          </div>
          <span className="live-indicator"><i />{t.live}</span>
        </div>
        <div className="matched-errands-section">
          <div className="matched-errands-grid" aria-live="polite">
            {tasksLoading ? (
              <div className="request-empty"><span className="request-loading-dot" />{language === 'bn' ? 'কাজ খোঁজা হচ্ছে…' : 'Loading customer errands…'}</div>
            ) : tasks.length ? tasks.map((task, index) => {
              const taskType = task.title;
              const Icon = getTaskIcon(undefined);
              const ageMinutes = task.minutesAgo || 0;
              const ageText = ageMinutes < 1 ? t.justNow : ageMinutes < 60 ? t.minutesAgo(ageMinutes) : ageMinutes < 1440 ? t.hoursAgo(Math.floor(ageMinutes / 60)) : t.daysAgo(Math.floor(ageMinutes / 1440));
              const taskHref = user ? '/dashboard#tasks' : '/login';
              return (
                <Link className="request-row task-link" to={taskHref} key={`${task.area}-${task.title}-${index}`} aria-label={`${taskType}, ${task.area}`}>
                  <span className="request-icon"><Icon size={19} /></span>
                  <span className="request-info">
                    <strong>{taskType}</strong>
                    <span className="request-route">{task.area} · ৳{Number(task.budget ?? task.estimatedPrice ?? 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')} · {ageText}</span>
                  </span>
                  <span className="request-end">
                    {!task.runnerId && <span className="request-status request-status-unassigned">{t.available}</span>}
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
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
          <div className="proof-card"><span className="proof-icon"><Package size={18} /></span><div><strong>{stats.completedDeliveries == null ? '—' : stats.completedDeliveries.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</strong><small>{t.labels.completedLabel}</small></div></div>
          <div className="proof-card"><span className="proof-icon"><Bike size={18} /></span><div><strong>{stats.activeRunners == null ? '—' : stats.activeRunners.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</strong><small>{t.labels.activeRunnersLabel}</small></div></div>
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
