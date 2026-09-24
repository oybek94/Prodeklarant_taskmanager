import DOMPurify from 'dompurify';

// TinyMCE `media` plugini video'ni <iframe> qilib joylaydi. Iframe'ga faqat shu
// manbalardan ruxsat — aks holda ixtiyoriy sahifani (phishing, skript) ichiga
// o'rnatish mumkin bo'lardi.
const ALLOWED_IFRAME_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
]);

const isAllowedIframeSrc = (src: string): boolean => {
  try {
    const url = new URL(src, window.location.origin);
    return url.protocol === 'https:' && ALLOWED_IFRAME_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
};

const purifier = DOMPurify(window);

purifier.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe' && node instanceof Element) {
    if (!isAllowedIframeSrc(node.getAttribute('src') ?? '')) {
      node.parentNode?.removeChild(node);
    }
  }
});

// Yangi oynada ochiladigan havolalar ochuvchi sahifani boshqara olmasin (tabnabbing)
purifier.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Serverdan kelgan (TinyMCE'da yozilgan) HTML'ni `dangerouslySetInnerHTML` dan
 * oldin tozalaydi: <script>, on* hodisalar, javascript: havolalar, begona
 * iframe'lar olib tashlanadi; formatlash, jadval, rasm, video saqlanadi.
 */
export function sanitizeHtml(html: string): string {
  return purifier.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target'],
    // O'quv kontentida forma kerak emas — soxta "parolni kiriting" formasi bilan phishing'ni to'sadi
    FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select'],
  });
}
