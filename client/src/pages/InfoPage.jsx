import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta';

const content = {
  en: {
    privacy: {
      title: 'Privacy Policy',
      description: 'How LocoMuv uses account, task, location, and service data.',
      intro: 'This page explains the information LocoMuv uses to connect customers with neighborhood runners and complete local tasks.',
      sections: [
        ['Information you provide', 'We store account details such as your name, email, phone number, area, and password hash. You may also provide a profile image, age, emergency contact, task descriptions, pickup and delivery details, reviews, and messages.'],
        ['How we use it', 'We use this information to manage accounts, match tasks with runners, support conversations, confirm pickup and delivery, handle reports, and keep the service safe.'],
        ['Location and visibility', 'Task locations are used to arrange delivery in the relevant task flow. Public previews show limited information and do not expose sensitive personal details.'],
        ['Security', 'We take reasonable steps to protect your data. No online service can guarantee absolute security.'],
        ['Your choices', 'You can update account details and contact support for help regarding your account or data.'],
      ],
    },
    terms: {
      title: 'Terms of Service',
      description: 'Terms for using LocoMuv to post and complete neighborhood tasks.',
      intro: 'By using LocoMuv, you agree to use the service responsibly and provide accurate information needed to arrange tasks.',
      sections: [
        ['Accounts', 'Keep your sign-in details private and use an account that belongs to you. You are responsible for activity carried out through your account.'],
        ['Posting and accepting tasks', 'Customers should describe lawful tasks clearly and set a budget. Runners may accept tasks or submit offers based on the task details.'],
        ['Safe handoffs', 'Use the in-app task flow to coordinate. Share verification codes only with the correct person at handoff.'],
        ['Reports and account action', 'Use report options for task or safety issues. LocoMuv may review reports and restrict misuse.'],
        ['Service availability', 'LocoMuv helps connect customers and runners. Availability and outcomes depend on users completing each task.'],
      ],
    },
    contact: {
      title: 'Support & Contact',
      description: 'Contact LocoMuv support for help with tasks, accounts, or safety concerns.',
      intro: 'Need help? Reach out to our support team — we will contact you as soon as possible.',
      whatsapp: '+8801744202105',
      whatsappLabel: 'WhatsApp (message only)',
      email: 'tanvirdev105@gmail.com',
      emailLabel: 'Email',
      responseNote: 'We will contact you as soon as possible.',
      sections: [
        ['Task or delivery issue', 'Sign in, open the relevant task, and use the report/issue option so our team can review the correct context.'],
        ['Chat or safety concern', 'Open the relevant conversation and use its report option. For immediate danger, contact local emergency services.'],
        ['Account access', 'If you cannot sign in, check your account details on the sign-in page or contact support using the options above.'],
      ],
    },
  },
  bn: {
    privacy: {
      title: 'গোপনীয়তা নীতি',
      description: 'LocoMuv কীভাবে অ্যাকাউন্ট, কাজ ও সেবার তথ্য ব্যবহার করে।',
      intro: 'গ্রাহক ও এলাকার রানারদের সংযুক্ত করে কাজ সম্পন্ন করতে LocoMuv কী তথ্য ব্যবহার করে তা এখানে জানানো হয়েছে।',
      sections: [
        ['আপনার দেওয়া তথ্য', 'নাম, ইমেইল, ফোন, এলাকা ও অ্যাকাউন্ট সংক্রান্ত তথ্য সংরক্ষণ করা হতে পারে। এছাড়া প্রোফাইল ছবি, কাজের বিবরণ, রিভিউ ও মেসেজ দিতে পারেন।'],
        ['তথ্য ব্যবহারের কারণ', 'অ্যাকাউন্ট পরিচালনা, কাজের সমন্বয়, যোগাযোগ, রিপোর্ট হ্যান্ডলিং এবং সেবার নিরাপত্তা বজায় রাখতে তথ্য ব্যবহার করা হয়।'],
        ['লোকেশন ও দৃশ্যমানতা', 'ডেলিভারি সমন্বয়ের জন্য প্রয়োজনীয় লোকেশন তথ্য ব্যবহৃত হয়। পাবলিক প্রিভিউতে সীমিত তথ্য দেখানো হয়।'],
        ['নিরাপত্তা', 'আপনার তথ্য সুরক্ষায় যুক্তিসঙ্গত ব্যবস্থা নেওয়া হয়। তবে কোনো অনলাইন সেবাই সম্পূর্ণ নিরাপত্তার নিশ্চয়তা দিতে পারে না।'],
        ['আপনার পছন্দ', 'আপনি অ্যাকাউন্ট তথ্য আপডেট করতে পারেন এবং প্রয়োজনে সাপোর্টের সাথে যোগাযোগ করতে পারেন।'],
      ],
    },
    terms: {
      title: 'ব্যবহারের শর্তাবলি',
      description: 'LocoMuv ব্যবহারের শর্তাবলি।',
      intro: 'LocoMuv ব্যবহার করে আপনি দায়িত্বশীলভাবে সেবা ব্যবহার এবং সঠিক তথ্য দেওয়ার বিষয়ে সম্মত হন।',
      sections: [
        ['অ্যাকাউন্ট', 'নিজের অ্যাকাউন্ট ব্যবহার করুন এবং সাইন-ইন তথ্য গোপন রাখুন। অ্যাকাউন্টের কার্যক্রমের দায়িত্ব আপনার।'],
        ['কাজ পোস্ট ও গ্রহণ', 'গ্রাহককে বৈধ কাজ পরিষ্কারভাবে লিখতে হবে। রানার কাজ গ্রহণ বা অফার দিতে পারেন।'],
        ['নিরাপদ হস্তান্তর', 'ইন-অ্যাপ প্রক্রিয়া অনুসরণ করুন এবং যাচাইকরণ কোড সঠিক ব্যক্তির সাথে শেয়ার করুন।'],
        ['রিপোর্ট ও ব্যবস্থা', 'সমস্যা হলে রিপোর্ট অপশন ব্যবহার করুন। অপব্যবহারের ক্ষেত্রে ব্যবস্থা নেওয়া হতে পারে।'],
        ['সেবার প্রাপ্যতা', 'LocoMuv গ্রাহক ও রানারকে সংযুক্ত করে; কাজের ফলাফল সংশ্লিষ্ট ব্যবহারকারীর ওপর নির্ভর করে।'],
      ],
    },
    contact: {
      title: 'সাপোর্ট ও যোগাযোগ',
      description: 'কাজ, অ্যাকাউন্ট বা নিরাপত্তা বিষয়ে LocoMuv সাপোর্টের সাথে যোগাযোগ করুন।',
      intro: 'সাহায্য দরকার? আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন — আমরা যত দ্রুত সম্ভব যোগাযোগ করব।',
      whatsapp: '+8801744202105',
      whatsappLabel: 'হোয়াটসঅ্যাপ (শুধু মেসেজ)',
      email: 'tanvirdev105@gmail.com',
      emailLabel: 'ইমেইল',
      responseNote: 'আমরা যত দ্রুত সম্ভব যোগাযোগ করব।',
      sections: [
        ['কাজ বা ডেলিভারি সমস্যা', 'সাইন ইন করে সংশ্লিষ্ট কাজ খুলুন এবং Report issue ব্যবহার করুন, যাতে আমাদের টিম সঠিকভাবে সহায়তা করতে পারে।'],
        ['চ্যাট বা নিরাপত্তা', 'সংশ্লিষ্ট কথোপকথনের রিপোর্ট অপশন ব্যবহার করুন। তাৎক্ষণিক বিপদে স্থানীয় জরুরি সেবায় যোগাযোগ করুন।'],
        ['অ্যাকাউন্টে প্রবেশ', 'সাইন ইন করতে সমস্যা হলে সাইন-ইন/রেজিস্ট্রেশন পাতা দেখুন অথবা উপরের সাপোর্ট চ্যানেলে যোগাযোগ করুন।'],
      ],
    },
  },
};

export default function InfoPage({ type, language = 'en' }) {
  const page = (content[language] || content.en)[type] || content.en.contact;
  const isBn = language === 'bn';
  const waText = isBn
    ? 'হ্যালো, আমি LocoMuv থেকে জানতে চাচ্ছি।\nসমস্যা/প্রশ্ন: '
    : 'Hello, I want to know from LocoMuv.\nIssue/Question: ';
  const waLink = 'https://wa.me/8801744202105?text=' + encodeURIComponent(waText);

  return (
    <article className={`info-page page-width ${type === 'contact' ? 'contact-support-page' : ''}`}>
      <PageMeta title={`${page.title} | LocoMuv`} description={page.description} lang={isBn ? 'bn' : 'en'} />
      <header className="info-page-header">
        <Link to="/" className="info-back-link">← {isBn ? 'হোমে ফিরুন' : 'Back to home'}</Link>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
      </header>

      {type === 'contact' && (
        <section className="support-contact-wrap" aria-label="Support contact options">
          <div className="support-contact-cards">
            <a className="support-card support-card-whatsapp" href={waLink} target="_blank" rel="noopener noreferrer">
              <span className="support-card-label">{page.whatsappLabel}</span>
              <strong className="support-card-value">{page.whatsapp}</strong>
              <span className="support-card-note">WhatsApp</span>
            </a>
            <a className="support-card support-card-email" href={`mailto:${page.email}`}>
              <span className="support-card-label">{page.emailLabel}</span>
              <strong className="support-card-value">{page.email}</strong>
              <span className="support-card-note">Email</span>
            </a>
          </div>
          <p className="support-response-note">{page.responseNote}</p>
          <div className="support-help-note">
            <p>{isBn ? 'মেসেজে আপনার সমস্যা বা প্রশ্নটি লিখুন (যেমন: অ্যাকাউন্ট/টাস্ক/ডেলিভারি/পেমেন্ট সমস্যা, Task ID বা বিস্তারিত বিবরণ)।' : 'Please mention your problem or question in the message (e.g. account/task/delivery/payment issue, Task ID, or details).'}</p>
          </div>
        </section>
      )}

      <div className="info-sections">
        {page.sections.map(([heading, body]) => (
          <section className="info-section" key={heading}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
