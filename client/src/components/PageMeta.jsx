import { useEffect } from 'react';

function setMeta(attribute, key, value) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

export default function PageMeta({ title, description, image = '/locomuv-og.svg', lang = 'en' }) {
  useEffect(() => {
    document.title = title;
    document.documentElement.lang = lang;
    const absoluteImage = new URL(image, window.location.origin).href;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:image', absoluteImage);
    setMeta('property', 'og:url', window.location.href);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', absoluteImage);
  }, [description, image, lang, title]);

  return null;
}
