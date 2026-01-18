import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';

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
      return <Icon icon="lucide:file-text" className="w-10 h-10 text-red-500" />;
    }
    // Excel (xls, xlsx)
    if (lowerType.includes('excel') || lowerType.includes('spreadsheet') || 
        lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
      return <Icon icon="lucide:file-spreadsheet" className="w-10 h-10 text-emerald-500" />;
    }
    // Word (doc, docx)
    if (lowerType.includes('word') || lowerType.includes('document') ||
        lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
      return <Icon icon="lucide:file-text" className="w-10 h-10 text-blue-500" />;
    }
    // JPG/JPEG
    if (lowerType.includes('jpeg') || lowerType.includes('jpg') ||
        lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      return <Icon icon="lucide:image" className="w-10 h-10 text-amber-500" />;
    }
    // PNG
    if (lowerType.includes('png') || lowerName.endsWith('.png')) {
      return <Icon icon="lucide:image" className="w-10 h-10 text-amber-500" />;
    }
    // PPT/PPTX
    if (lowerType.includes('powerpoint') || lowerType.includes('presentation') ||
        lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) {
      return <Icon icon="lucide:presentation" className="w-10 h-10 text-orange-500" />;
    }
    // RAR
    if (lowerType.includes('rar') || lowerName.endsWith('.rar')) {
      return <Icon icon="lucide:archive" className="w-10 h-10 text-gray-500" />;
    }
    // ZIP
    if (lowerType.includes('zip') || lowerName.endsWith('.zip')) {
      return <Icon icon="lucide:archive" className="w-10 h-10 text-gray-500" />;
    }
    // Rasm (boshqa formatlar)
    if (lowerType.includes('image') || lowerType.includes('gif') || lowerType.includes('webp') ||
        lowerName.match(/\.(gif|webp|bmp|svg)$/i)) {
      return <Icon icon="lucide:image" className="w-10 h-10 text-amber-500" />;
    }
    // Video
    if (lowerType.includes('video') || lowerName.match(/\.(mp4|avi|mov|wmv|flv|mkv)$/i)) {
      return <Icon icon="lucide:video" className="w-10 h-10 text-red-500" />;
    }
    // Audio
    if (lowerType.includes('audio') || lowerName.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return <Icon icon="lucide:music" className="w-10 h-10 text-purple-500" />;
    }
    // Boshqa fayllar (default)
    return <Icon icon="lucide:file" className="w-10 h-10 text-gray-500" />;
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
                        <Icon icon="lucide:download" className="w-5 h-5" />
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

