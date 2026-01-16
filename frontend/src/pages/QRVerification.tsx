import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface QRVerificationData {
  vehiclePlate: string | null;
  status: string;
  verificationDate: string | null;
  documents: Array<{
    id: number;
    name: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    description: string | null;
    createdAt: string;
  }>;
}

const QRVerification = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<QRVerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'uz' | 'ru'>('uz');

  const t = {
    uz: {
      loading: 'Yuklanmoqda...',
      error: 'Xatolik',
      tokenNotFound: 'Token topilmadi yoki noto\'g\'ri',
      loadError: 'Ma\'lumotlarni yuklashda xatolik yuz berdi',
      tokenInvalid: 'QR kod noto\'g\'ri yoki eskirgan bo\'lishi mumkin',
      statusTitle: '✔ HUJJATLAR TEKSHIRILDI',
      statusSubtitle: 'Barcha jarayonlar yakunlangan',
      verified: 'Tekshirildi:',
      order: 'Buyurtma',
      documents: 'Hujjatlar',
      noDocuments: 'Hujjatlar yo\'q',
      fileName: 'Fayl nomi',
      actions: 'Harakatlar',
      view: 'Ko\'rish',
      download: 'Yuklab olish',
      share: 'Ulashish',
      linkCopied: 'Link nusxalandi',
      updated: 'Yangilangan:',
      footer1: '🔐 Maʼlumotlar Prodeklarant tizimidan',
      footer2: 'Avtomatik generatsiya qilingan',
    },
    ru: {
      loading: 'Загрузка...',
      error: 'Ошибка',
      tokenNotFound: 'Токен не найден или неверный',
      loadError: 'Ошибка при загрузке данных',
      tokenInvalid: 'QR-код может быть неверным или устаревшим',
      statusTitle: '✔ ДОКУМЕНТЫ ПРОВЕРЕНЫ',
      statusSubtitle: 'Все процессы завершены',
      verified: 'Проверено:',
      order: 'Заказ',
      documents: 'Документы',
      noDocuments: 'Документы отсутствуют',
      fileName: 'Имя файла',
      actions: 'Действия',
      view: 'Просмотр',
      download: 'Скачать',
      share: 'Поделиться',
      linkCopied: 'Ссылка скопирована',
      updated: 'Обновлено:',
      footer1: '🔐 Данные из системы Prodeklarant',
      footer2: 'Автоматически сгенерировано',
    },
  };

  useEffect(() => {
    if (token) {
      loadVerificationData();
    }
  }, [token]);

  const loadVerificationData = async () => {
    try {
      setLoading(true);
      setError(null);
      // QR endpoint is public and mounted at /q (not /api/q)
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');
      const response = await axios.get(`${apiBaseUrl}/q/${token}`);
      setData(response.data);
    } catch (err: any) {
      console.error('Error loading QR verification data:', err);
      if (err.response?.status === 404) {
        setError('NOT_FOUND');
      } else {
        setError('LOAD_ERROR');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFullFileUrl = (fileUrl: string) => {
    // If fileUrl is already a full URL (starts with http:// or https://), return as is
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    // Otherwise, prepend the API base URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');
    return `${apiBaseUrl}${fileUrl}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} · ${hours}:${minutes}`;
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return '🖼️';
    return '📎';
  };

  const isImageFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  };

  const formatFileName = (fileName: string) => {
    // Remove file extension
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName;
    return fileName.substring(0, lastDotIndex);
  };

  const DocumentThumbnail = ({ doc }: { doc: QRVerificationData['documents'][0] }) => {
    const [imageError, setImageError] = useState(false);
    
    if (isImageFile(doc.name) && !imageError) {
      return (
        <div className="flex-shrink-0 w-10 h-10 rounded border border-gray-200 overflow-hidden bg-gray-100">
          <img
            src={getFullFileUrl(doc.fileUrl)}
            alt={doc.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }
    
    return (
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
        <div className="text-base">{getFileIcon(doc.name)}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-gray-600">{t[language].loading}</div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error === 'NOT_FOUND' ? t[language].tokenNotFound : error === 'LOAD_ERROR' ? t[language].loadError : error;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-8 text-center">
          <div className="text-red-600 text-xl font-semibold mb-4">{t[language].error}</div>
          <div className="text-gray-700 mb-6">{errorMessage}</div>
          <div className="text-sm text-gray-500">{t[language].tokenInvalid}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: '#f9fafb', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div className="max-w-md md:max-w-4xl mx-auto p-4">
        {/* LOGO AND LANGUAGE SELECTOR */}
        <div className="flex items-center justify-between mb-3">
          <img 
            src="/logo.png" 
            alt="PRO DEKLARANT" 
            className="h-8 object-contain"
            onError={(e) => {
              // Fallback if logo doesn't exist
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="flex gap-2 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setLanguage('uz')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                language === 'uz'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              O'Z
            </button>
            <button
              onClick={() => setLanguage('ru')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                language === 'ru'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              RU
            </button>
          </div>
        </div>

        {/* STATUS CARD */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-4">
          <h1 className="m-0 text-green-600 text-xl font-semibold">{t[language].statusTitle}</h1>
          <p className="mt-1.5 mb-0 text-sm" style={{ color: '#065f46' }}>{t[language].statusSubtitle}</p>
          {data.verificationDate && (
            <p className="mt-1.5 mb-0 text-sm" style={{ color: '#065f46' }}>
              {t[language].verified} {formatDate(data.verificationDate)}
            </p>
          )}
        </div>

        {/* VEHICLE PLATE CARD */}
        {data.vehiclePlate && (
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 mb-3.5">
            <div className="text-sm text-gray-500 mb-1.5">{t[language].order}</div>
            <div className="text-base font-semibold">{data.vehiclePlate}</div>
          </div>
        )}

        {/* DOCUMENTS SECTION */}
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-2 font-medium">{t[language].documents}</div>
          
          {data.documents.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-gray-400 italic text-sm">{t[language].noDocuments}</div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-12"></th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t[language].fileName}</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">{t[language].actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2">
                          <DocumentThumbnail doc={doc} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-sm text-gray-900">{formatFileName(doc.name)}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1.5 justify-end">
                            <a
                              href={getFullFileUrl(doc.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-colors no-underline min-w-[36px] sm:min-w-auto"
                              title={t[language].view}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="hidden sm:inline">{t[language].view}</span>
                            </a>
                            <a
                              href={getFullFileUrl(doc.fileUrl)}
                              download
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded hover:bg-green-100 hover:border-green-300 transition-colors no-underline min-w-[36px] sm:min-w-auto"
                              title={t[language].download}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span className="hidden sm:inline">{t[language].download}</span>
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(getFullFileUrl(doc.fileUrl));
                                alert(t[language].linkCopied);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 hover:border-purple-300 transition-colors cursor-pointer min-w-[36px] sm:min-w-auto"
                              title={t[language].share}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                              <span className="hidden sm:inline">{t[language].share}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="text-center text-xs text-gray-500 mt-5">
          {t[language].footer1}<br />
          {t[language].footer2}
        </div>
      </div>
    </div>
  );
};

export default QRVerification;
