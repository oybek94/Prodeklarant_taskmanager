import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface Task {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  hasPsr: boolean;
  comments?: string;
  snapshotDealAmount?: number;
  branch: {
    id: number;
    name: string;
  };
  stages: Array<{
    id: number;
    name: string;
    status: string;
    stageOrder: number;
    startedAt?: string;
    completedAt?: string;
    durationMin?: number;
  }>;
  documents: Array<{
    id: number;
    name: string;
    fileUrl: string;
    fileType: string;
    fileSize?: number;
    description?: string;
    createdAt: string;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  BOSHLANMAGAN: 'Boshlanmagan',
  JARAYONDA: 'Jarayonda',
  TAYYOR: 'Tayyor',
  TEKSHIRILGAN: 'Tekshirilgan',
  TOPSHIRILDI: 'Topshirildi',
  YAKUNLANDI: 'Yakunlandi',
};

const STATUS_COLORS: Record<string, string> = {
  BOSHLANMAGAN: 'bg-gray-100 text-gray-800',
  JARAYONDA: 'bg-blue-100 text-blue-800',
  TAYYOR: 'bg-yellow-100 text-yellow-800',
  TEKSHIRILGAN: 'bg-purple-100 text-purple-800',
  TOPSHIRILDI: 'bg-indigo-100 text-indigo-800',
  YAKUNLANDI: 'bg-green-100 text-green-800',
};

export default function ClientTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTaskDetail();
  }, [id]);

  const fetchTaskDetail = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('clientAccessToken');
      
      const response = await axios.get(`${API_BASE_URL}/client/tasks/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log('Task detail response:', response.data);
      console.log('Documents:', response.data.documents);
      setTask(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (fileType === 'application/pdf') {
      return (
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Ma\'lumot topilmadi'}</p>
          <button
            onClick={() => navigate('/client/tasks')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  const completedStages = task.stages.filter(s => s.status === 'TAYYOR').length;
  const totalStages = task.stages.length;
  const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/client/tasks')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <p className="text-sm text-gray-600 mt-1">#{task.id} • {task.branch.name}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-800'}`}>
              {STATUS_LABELS[task.status] || task.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Loyiha ma'lumotlari</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Yaratilgan</span>
                  <span className="font-medium text-gray-900">
                    {new Date(task.createdAt).toLocaleDateString('uz-UZ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Yangilangan</span>
                  <span className="font-medium text-gray-900">
                    {new Date(task.updatedAt).toLocaleDateString('uz-UZ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {task.snapshotDealAmount && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-600">Summa</span>
                    <span className="font-semibold text-green-600 text-lg">
                      ${Number(task.snapshotDealAmount).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">PSR</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${task.hasPsr ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {task.hasPsr ? 'Ha' : 'Yo\'q'}
                  </span>
                </div>

                {task.comments && (
                  <div className="py-3">
                    <span className="text-gray-600 block mb-2">Izoh</span>
                    <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{task.comments}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Hujjatlar ({task.documents?.length || 0})
              </h2>
              
              {!task.documents || task.documents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">Hujjatlar hali yuklanmagan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {task.documents.map(doc => (
                    <a
                      key={doc.id}
                      href={`${API_BASE_URL.replace('/api', '')}${doc.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition group"
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate group-hover:text-indigo-600">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString('uz-UZ')}</span>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-600 mt-1 truncate">{doc.description}</p>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stages */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Jarayonlar
              </h2>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {completedStages} / {totalStages} jarayon yakunlandi
                </p>
              </div>

              {/* Stages List */}
              <div className="space-y-3">
                {task.stages.map((stage, index) => (
                  <div key={stage.id} className="relative">
                    {index > 0 && (
                      <div className={`absolute top-0 left-4 w-0.5 h-3 -mt-3 ${stage.status === 'TAYYOR' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    )}
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${stage.status === 'TAYYOR' ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${stage.status === 'TAYYOR' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {stage.status === 'TAYYOR' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${stage.status === 'TAYYOR' ? 'text-green-900' : 'text-gray-700'}`}>
                          {stage.name}
                        </p>
                        {stage.completedAt && (
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(stage.completedAt).toLocaleDateString('uz-UZ')}
                          </p>
                        )}
                        {stage.durationMin && (
                          <p className="text-xs text-gray-600 mt-1">
                            {Math.floor(stage.durationMin / 60)}s {stage.durationMin % 60}d
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

