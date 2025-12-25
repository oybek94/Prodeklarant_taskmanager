import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import PdfIcon from '../assets/icons/pdf-icon.svg?react';
import ExcelIcon from '../assets/icons/excel-icon.svg?react';
import WordIcon from '../assets/icons/word-icon.svg?react';
import JpgIcon from '../assets/icons/jpg-icon.svg?react';
import PngIcon from '../assets/icons/png-icon.svg?react';
import PptIcon from '../assets/icons/ppt-icon.svg?react';
import RarIcon from '../assets/icons/rar-icon.svg?react';
import ZipIcon from '../assets/icons/zip-icon.svg?react';

interface ArchiveDocument {
  id: number;
  taskId: number;
  taskTitle: string;
  clientName: string;
  branchName: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  description?: string;
  archivedAt: string;
  uploadedBy: {
    id: number;
    name: string;
    email: string;
  };
}

const Archive = () => {
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [searchTerm, filterClient, filterBranch]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterClient) params.append('clientName', filterClient);
      if (filterBranch) params.append('branchName', filterBranch);

      const response = await apiClient.get(`/documents/archive?${params.toString()}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading archive documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (fileType: string, fileName?: string) => {
    const lowerType = fileType?.toLowerCase() || '';
    const lowerName = fileName?.toLowerCase() || '';
    
    // PDF
    if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
      return <PdfIcon className="w-10 h-10" />;
    }
    // Excel (xls, xlsx)
    if (lowerType.includes('excel') || lowerType.includes('spreadsheet') || 
        lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
      return <ExcelIcon className="w-10 h-10" />;
    }
    // Word (doc, docx)
    if (lowerType.includes('word') || lowerType.includes('document') ||
        lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
      return <WordIcon className="w-10 h-10" />;
    }
    // JPG/JPEG
    if (lowerType.includes('jpeg') || lowerType.includes('jpg') ||
        lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      return <JpgIcon className="w-10 h-10" />;
    }
    // PNG
    if (lowerType.includes('png') || lowerName.endsWith('.png')) {
      return <PngIcon className="w-10 h-10" />;
    }
    // PPT/PPTX
    if (lowerType.includes('powerpoint') || lowerType.includes('presentation') ||
        lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) {
      return <PptIcon className="w-10 h-10" />;
    }
    // RAR
    if (lowerType.includes('rar') || lowerName.endsWith('.rar')) {
      return <RarIcon className="w-10 h-10" />;
    }
    // ZIP
    if (lowerType.includes('zip') || lowerName.endsWith('.zip')) {
      return <ZipIcon className="w-10 h-10" />;
    }
    // Rasm (boshqa formatlar)
    if (lowerType.includes('image') || lowerType.includes('gif') || lowerType.includes('webp') ||
        lowerName.match(/\.(gif|webp|bmp|svg)$/i)) {
      return <JpgIcon className="w-10 h-10" />;
    }
    // Video
    if (lowerType.includes('video') || lowerName.match(/\.(mp4|avi|mov|wmv|flv|mkv)$/i)) {
      return (
        <div className="relative w-10 h-10">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="20" rx="1.5" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.5"/>
            <rect x="6" y="8" width="12" height="8" rx="1" fill="#EF4444"/>
            <polygon points="10,11 10,13 13,12" fill="white"/>
          </svg>
        </div>
      );
    }
    // Audio
    if (lowerType.includes('audio') || lowerName.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return (
        <div className="relative w-10 h-10">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="20" rx="1.5" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.5"/>
            <path d="M8 10v4c0 1.1.9 2 2 2s2-.9 2-2v-4" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M14 8v8c0 1.1.9 2 2 2s2-.9 2-2V8" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <circle cx="10" cy="10" r="1" fill="#9333EA"/>
            <circle cx="16" cy="12" r="1" fill="#9333EA"/>
          </svg>
        </div>
      );
    }
    // Boshqa fayllar (default)
    return (
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="20" rx="1.5" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1.5"/>
          <path d="M18 4v4h4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <path d="M18 4l4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <line x1="7" y1="11" x2="17" y2="11" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="7" y1="14" x2="17" y2="14" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="7" y1="17" x2="14" y2="17" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  };

  const downloadFile = (fileUrl: string, _fileName: string) => {
    // URL'ni to'g'ri qurish - baseURL'dan /api ni olib tashlaymiz
    const baseUrl = apiClient.defaults.baseURL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');
    const serverBaseUrl = baseUrl.replace('/api', '') || (import.meta.env.PROD ? '' : 'http://localhost:3001');
    
    const urlParts = fileUrl.split('/');
    const fileNamePart = urlParts[urlParts.length - 1];
    const path = urlParts.slice(0, -1).join('/');
    
    // Fayl nomini encode qilamiz
    const encodedFileName = encodeURIComponent(decodeURIComponent(fileNamePart));
    const url = `${serverBaseUrl}${path}/${encodedFileName}`;
    window.open(url, '_blank');
  };

  // Unique client va branch nomlarini olish
  const uniqueClients = Array.from(new Set(documents.map(d => d.clientName))).sort();
  const uniqueBranches = Array.from(new Set(documents.map(d => d.branchName))).sort();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Arxiv</h1>
        <p className="text-gray-600">Yakunlangan task'larning hujjatlari</p>
      </div>

      {/* Filterlar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qidirish
            </label>
            <input
              type="text"
              placeholder="Task nomi, hujjat nomi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client
            </label>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Barchasi</option>
              {uniqueClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filial
            </label>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Barchasi</option>
              {uniqueBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hujjatlar ro'yxati */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-600">Yuklanmoqda...</div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-500 text-lg">Hujjatlar topilmadi</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Hujjat</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Task</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Client</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Filial</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Hajm</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Yuklagan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Arxivga ko'chirilgan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0">
                          {getFileIcon(doc.fileType, doc.name)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{doc.name}</div>
                          {doc.description && (
                            <div className="text-sm text-gray-500">{doc.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">{doc.taskTitle}</div>
                      <div className="text-sm text-gray-500">ID: {doc.taskId}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{doc.clientName}</td>
                    <td className="py-3 px-4 text-gray-700">{doc.branchName}</td>
                    <td className="py-3 px-4 text-gray-600">{formatFileSize(doc.fileSize)}</td>
                    <td className="py-3 px-4">
                      <div className="text-gray-700">{doc.uploadedBy.name}</div>
                      <div className="text-sm text-gray-500">{doc.uploadedBy.email}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(doc.archivedAt).toLocaleDateString('uz-UZ', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => downloadFile(doc.fileUrl, doc.name)}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        title="Yuklab olish"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Archive;

