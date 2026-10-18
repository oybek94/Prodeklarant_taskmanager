const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const TZ = 'Asia/Tashkent';

const parts = (d: Date) => {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), hh: p.hour === '24' ? '00' : p.hour, mm: p.minute };
};

/** "14 okt" (joriy yildan boshqa bo'lsa "14 okt 2025"). */
export function formatDate(iso: string): string {
  const p = parts(new Date(iso));
  const nowY = parts(new Date()).y;
  return `${p.d} ${MONTHS[p.m - 1]}${p.y !== nowY ? ` ${p.y}` : ''}`;
}

/** "14 okt, 12:05" */
export function formatDateTime(iso: string): string {
  const p = parts(new Date(iso));
  return `${formatDate(iso)}, ${p.hh}:${p.mm}`;
}

/** "12 daqiqa oldin", "2 soat oldin", aks holda sana. */
export function formatRelative(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'hozirgina';
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `${h} soat oldin`;
  return formatDate(iso);
}

export function fileExt(name: string, fileType: string): string {
  const m = /\.([a-z0-9]{2,5})$/i.exec(name);
  if (m) return m[1].toUpperCase();
  const t = /\/([a-z0-9]+)$/i.exec(fileType);
  return t ? t[1].toUpperCase().slice(0, 4) : 'FAYL';
}

export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;
