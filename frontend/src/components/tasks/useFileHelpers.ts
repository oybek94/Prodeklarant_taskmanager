import toast from 'react-hot-toast';
// Tasks sahifasidagi fayl yuklab olish va ko'rish uchun helper hook

import apiClient from '../../lib/api';

/**
 * Faylni /api/secure-uploads orqali JWT token bilan yuklab olish
 * Foydalanuvchi login qilmagan bo'lsa fayl yuklanmaydi
 */
export const useFileHelpers = () => {
  const buildSecureUrl = (fileUrl: string): string => {
    const baseUrl =
      apiClient.defaults.baseURL ||
      (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');
    const baseOrigin = baseUrl.replace(/\/api$/, '');

    // /uploads/documents/file.pdf → documents/file.pdf
    const securePath = fileUrl.replace(/^\/uploads\//, '');
    const urlParts = securePath.split('/');
    const fileNamePart = urlParts[urlParts.length - 1];
    const encodedFileName = encodeURIComponent(decodeURIComponent(fileNamePart));
    const folderPath = urlParts.slice(0, -1).join('/');

    return `${baseOrigin}/api/secure-uploads/${folderPath}/${encodedFileName}`;
  };

  /**
   * Faylni yuklab olish (brauzerda ochmasdan)
   * @param fileUrl - DB'dagi fileUrl (masalan: /uploads/documents/file.pdf)
   * @param originalName - Asl fayl nomi (timestamp'siz)
   */
  const downloadFile = async (fileUrl: string, originalName?: string): Promise<void> => {
    const secureUrl = buildSecureUrl(fileUrl);
    const fileNameFromUrl = fileUrl.split('/').pop() || 'file';

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(secureUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error(`Fayl topilmadi (${response.status})`);

      const blob = await response.blob();
      downloadBlob(blob, originalName || fileNameFromUrl);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Faylni yuklab olishda xatolik yuz berdi');
    }
  };

  /**
   * Faylni ko'rish uchun blob URL yaratish
   * img/iframe src uchun — custom header yuborib bo'lmaydi,
   * shuning uchun avval fetch qilib blob URL yaratamiz
   * @returns blob URL yoki null (xato bo'lsa)
   */
  const getPreviewBlobUrl = async (fileUrl: string): Promise<string | null> => {
    const secureUrl = buildSecureUrl(fileUrl);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(secureUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error(`Fayl topilmadi (${response.status})`);

      const blob = await response.blob();
      return window.URL.createObjectURL(blob);
    } catch (error) {
      console.error('Preview error:', error);
      return null;
    }
  };

  /**
   * Blob'dan faylni yuklab olish — markazlashtirilgan utility.
   * createElement('a') → click → cleanup logikasini bitta joyda saqlash.
   * 
   * @param blob - Yuklab olinadigan Blob
   * @param filename - Fayl nomi (masalan: "sticker-123.png")
   */
  const downloadBlob = (blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  };

  return { downloadFile, downloadBlob, getPreviewBlobUrl, buildSecureUrl };
};
