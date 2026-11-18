import { useEffect, useState } from 'react';

export default function Turnstile({ onToken }) {
  const [siteKey, setSiteKey] = useState('');
  const [container] = useState(() => `turnstile-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || 'https://locomov-server.onrender.com';
    fetch(`${API_BASE}/api/auth/config`).then((response) => response.json()).then((data) => setSiteKey(data.turnstileSiteKey || '')).catch(() => {});
  }, []);
  useEffect(() => {
    if (!siteKey) { onToken(''); return; }
    let widgetId;
    const render = () => {
      if (window.turnstile && document.getElementById(container)) {
        widgetId = window.turnstile.render(`#${container}`, { sitekey: siteKey, callback: onToken, 'expired-callback': () => onToken('') });
      }
    };
    if (window.turnstile) render();
    else {
      let script = document.querySelector('script[data-turnstile]');
      if (!script) {
        script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true; script.defer = true; script.dataset.turnstile = 'true'; document.head.appendChild(script);
      }
      script.addEventListener('load', render, { once: true });
    }
    return () => { if (widgetId && window.turnstile) window.turnstile.remove(widgetId); };
  }, [siteKey, container, onToken]);
  return siteKey ? <div id={container} className="turnstile-widget" /> : null;
}
