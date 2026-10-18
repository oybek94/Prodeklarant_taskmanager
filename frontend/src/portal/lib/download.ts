import { portalApi } from './portalApi';

/** Content-Disposition'dan fayl nomi (filename*=UTF-8'' yoki filename=). */
export function fileNameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try { return decodeURIComponent(star[1]); } catch { /* quyidagiga tushadi */ }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : fallback;
}

/** Himoyalangan hujjatni token bilan olib, brauzerga saqlatadi (oddiy <a href> Authorization yubora olmaydi). */
export async function downloadPortalDocument(docId: string, fallbackName: string): Promise<void> {
  const res = await portalApi.get<Blob>(`/documents/${encodeURIComponent(docId)}/download`, { responseType: 'blob' });
  const name = fileNameFromDisposition(res.headers['content-disposition'] as string | undefined, fallbackName);
  const url = URL.createObjectURL(res.data);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
