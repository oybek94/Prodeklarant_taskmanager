import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { markArticleAsRead } from '../utils/articleStorage';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '@iconify/react';
import RichTextEditor from '../components/RichTextEditor';

// Google Drive linkini rasm URL'iga o'tkazish
const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return url;

  if (url.includes('drive.google.com/uc?export=view')) {
    return url;
  }

  let fileId = '';
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) {
    fileId = match1[1];
  }

  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) {
    fileId = match2[1];
  }

  if (fileId) {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  return url;
};

interface Material {
  id: number;
  title: string;
  content?: string;
  type: 'TEXT' | 'AUDIO' | 'VIDEO' | 'IMAGE';
  fileUrl?: string;
  durationMin?: number;
  orderIndex: number;
}

interface Step {
  id: number;
  title: string;
  description?: string;
  orderIndex: number;
  materials: Material[];
  exams?: Array<{
    id: number;
    title: string;
    description?: string;
  }>;
}

interface LessonStatus {
  id: number;
  title: string;
  orderIndex: number;
  status: 'NOT_STARTED' | 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  lastAttemptScore: number | null;
}

interface Stage {
  id: number;
  title: string;
  description?: string;
  orderIndex: number;
  steps: Step[];
}

interface Training {
  id: number;
  title: string;
  description?: string;
}

export default function TrainingStageDetail() {
  const { trainingId, stageId } = useParams<{ trainingId: string; stageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage | null>(null);
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonsStatus, setLessonsStatus] = useState<LessonStatus[]>([]);

  // Tahrirlash uchun state'lar
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Material tahrirlash uchun state'lar
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [editMaterialContent, setEditMaterialContent] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);

  // Faqat ADMIN uchun tahrirlash imkoniyati
  const canEdit = user?.role === 'ADMIN';

  useEffect(() => {
    if (trainingId && stageId) {
      fetchData();
      fetchLessonsStatus();

      // Mark article as read when user opens the article detail page
      // This uses the centralized localStorage utility for consistency
      const trainingIdNum = parseInt(trainingId);
      const stageIdNum = parseInt(stageId);

      if (!isNaN(trainingIdNum) && !isNaN(stageIdNum)) {
        markArticleAsRead(trainingIdNum, stageIdNum);
      }
    }
  }, [trainingId, stageId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Training ma'lumotlarini olish
      const trainingResponse = await apiClient.get(`/training/${trainingId}`);
      setTraining(trainingResponse.data);

      // Stage ma'lumotlarini topish
      const stageData = trainingResponse.data.stages?.find((s: Stage) => s.id === parseInt(stageId || '0'));
      if (stageData) {
        // Fetch exams for each step (lesson)
        const stageWithExams = {
          ...stageData,
          steps: await Promise.all(
            stageData.steps.map(async (step: Step) => {
              try {
                // Try to get exams for this lesson (step)
                const examsResponse = await apiClient.get(`/exams?lessonId=${step.id}`);
                const exams = Array.isArray(examsResponse.data) ? examsResponse.data : [];
                console.log(`Exams for lesson ${step.id}:`, exams);
                return {
                  ...step,
                  exams: exams,
                };
              } catch (error: any) {
                // If no exams endpoint or error, return step without exams
                console.warn(`Error fetching exams for lesson ${step.id}:`, error?.response?.data || error?.message);
                return {
                  ...step,
                  exams: [],
                };
              }
            })
          ),
        };
        setStage(stageWithExams);
      } else {
        alert('Bosqich topilmadi');
        navigate(`/training/${trainingId}/manage`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Ma\'lumotlarni yuklashda xatolik');
      navigate(`/training/${trainingId}/manage`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessonsStatus = async () => {
    try {
      const response = await apiClient.get(`/lessons/stage/${stageId}`);
      setLessonsStatus(response.data);
    } catch (error) {
      console.error('Error fetching lessons status:', error);
    }
  };

  const handleStartLesson = async (lessonId: number) => {
    try {
      await apiClient.post(`/lessons/${lessonId}/start`);
      fetchLessonsStatus();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleStartExam = async (examId: number) => {
    navigate(`/exam/${examId}`);
  };

  const getLessonStatus = (lessonId: number): LessonStatus | null => {
    return lessonsStatus.find(l => l.id === lessonId) || null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">✓ Tugallangan</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Jarayonda</span>;
      case 'AVAILABLE':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Mavjud</span>;
      case 'LOCKED':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">🔒 Qulflangan</span>;
      case 'FAILED':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">❌ Muvaffaqiyatsiz</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Boshlanmagan</span>;
    }
  };

  const handleMaterialComplete = async (materialId: number) => {
    try {
      await apiClient.post(`/training/${trainingId}/materials/${materialId}/complete`);
      alert('Material muvaffaqiyatli yakunlandi!');
      fetchData();
    } catch (error: any) {
      console.error('Error completing material:', error);
      if (error.response?.status === 400) {
        alert(error.response.data.error);
      } else {
        alert('Xatolik yuz berdi');
      }
    }
  };

  // Material tahrirlashni boshlash
  const handleStartEditMaterial = (material: Material) => {
    if (material.content) {
      setEditMaterialContent(material.content);
      setEditingMaterialId(material.id);
    }
  };

  // Material tahrirlashni bekor qilish
  const handleCancelEditMaterial = () => {
    setEditingMaterialId(null);
    setEditMaterialContent('');
  };

  // Material saqlash
  const handleSaveMaterial = async (materialId: number) => {
    if (!trainingId) return;

    try {
      setSavingMaterial(true);
      await apiClient.put(`/training/${trainingId}/materials/${materialId}`, {
        content: editMaterialContent,
      });

      // Ma'lumotlarni qayta yuklash
      await fetchData();
      setEditingMaterialId(null);
      setEditMaterialContent('');
      alert('Material muvaffaqiyatli saqlandi!');
    } catch (error: any) {
      console.error('Error saving material:', error);
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setSavingMaterial(false);
    }
  };

  // Tahrirlashni boshlash
  const handleStartEdit = () => {
    if (stage) {
      setEditTitle(stage.title || '');
      setEditDescription(stage.description || '');
      setIsEditing(true);
    }
  };

  // Tahrirlashni bekor qilish
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditDescription('');
  };

  // Saqlash
  const handleSaveEdit = async () => {
    if (!trainingId || !stageId) return;

    if (!editTitle.trim()) {
      alert('Sarlavha bo\'sh bo\'lishi mumkin emas!');
      return;
    }

    try {
      setSaving(true);
      await apiClient.put(`/training/${trainingId}/stages/${stageId}`, {
        title: editTitle.trim(),
        description: editDescription,
      });

      // Ma'lumotlarni qayta yuklash
      await fetchData();
      setIsEditing(false);
      alert('Ma\'lumotlar muvaffaqiyatli saqlandi!');
    } catch (error: any) {
      console.error('Error saving stage:', error);
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!stage || !training) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Maqola topilmadi</p>
          <button
            onClick={() => navigate(`/training/${trainingId}/manage`)}
            className="text-blue-600 mt-4 inline-block"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  // Barcha materiallarni to'plash
  const allMaterials: Material[] = [];
  stage.steps.forEach(step => {
    allMaterials.push(...step.materials);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">


      {/* Main Content Area */}
      <main className="overflow-y-auto min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 py-12">
          {/* Main Title Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">O'qitish Materiali</span>
              {canEdit && (
                <button
                  onClick={isEditing ? handleSaveEdit : handleStartEdit}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 ${isEditing
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Icon icon={isEditing ? 'lucide:save' : 'lucide:edit-3'} className="w-4 h-4" />
                  {isEditing ? (saving ? 'Saqlanmoqda...' : 'Saqlash') : 'Kontentni Tahrirlash'}
                </button>
              )}
            </div>

            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-transparent text-5xl font-black text-slate-900 dark:text-white border-b-2 border-indigo-600 focus:outline-none mb-8 pb-4"
              />
            ) : (
              <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-8 tracking-tight leading-tight">
                {stage.title}
              </h1>
            )}

            <div className="flex items-center gap-6 pb-12 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Icon icon="lucide:clock" className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-400">{allMaterials.length * 5} daqiqa o'qish</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Icon icon="lucide:layers" className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-400">{stage.steps.length} qadam</span>
              </div>
            </div>
          </div>

          {/* Reader Section */}
          <div className="space-y-16">
            {isEditing ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-widest">Maqola Kontenti (Rich Text)</h3>
                <RichTextEditor
                  content={editDescription}
                  onChange={setEditDescription}
                />
              </div>
            ) : (
              stage.description && (
                <div
                  className="tinymce-content"
                  dangerouslySetInnerHTML={{ __html: stage.description }}
                />
              )
            )}

            {/* Steps Rendering */}
            {stage.steps
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map(step => (
                <div key={step.id} className="relative pt-12">
                  <div className="flex items-center gap-4 mb-8">
                    <span className="flex-shrink-0 w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl">
                      {step.orderIndex}
                    </span>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">{step.title}</h2>
                  </div>

                  {step.description && (
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed italic border-l-4 border-slate-200 dark:border-slate-700 pl-6">
                      {step.description}
                    </p>
                  )}

                  <div className="space-y-12">
                    {step.materials.map(material => (
                      <div key={material.id} className="relative group">
                        {material.type === 'TEXT' && material.content && (
                          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:shadow-xl transition-all">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                                  <Icon icon="lucide:file-text" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{material.title || 'Maqola Materiali'}</h4>
                              </div>
                              {canEdit && (
                                <button
                                  onClick={() => handleStartEditMaterial(material)}
                                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                                >
                                  <Icon icon="lucide:maximize-2" className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {editingMaterialId === material.id ? (
                              <div className="space-y-4">
                                <RichTextEditor content={editMaterialContent} onChange={setEditMaterialContent} />
                                <div className="flex justify-end gap-2">
                                  <button onClick={handleCancelEditMaterial} className="px-4 py-2 text-sm font-bold text-slate-500">Bekor qilish</button>
                                  <button onClick={() => handleSaveMaterial(material.id)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">Saqlash</button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="tinymce-content"
                                dangerouslySetInnerHTML={{ __html: material.content }}
                              />
                            )}

                            <button
                              onClick={() => handleMaterialComplete(material.id)}
                              className="mt-8 w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                              <Icon icon="lucide:check-circle" className="w-6 h-6" />
                              Ushbu qismni o'qib bo'ldim
                            </button>
                          </div>
                        )}

                        {(material.type === 'VIDEO' || material.type === 'IMAGE' || material.type === 'AUDIO') && (
                          <div className="bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl group-hover:scale-[1.01] transition-all duration-500">
                            <div className="p-8 border-b border-white/10 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                                  <Icon icon={`lucide:${material.type === 'VIDEO' ? 'play-circle' : material.type === 'AUDIO' ? 'mic' : 'image'}`} className="w-5 h-5 text-white" />
                                </div>
                                <h4 className="font-extrabold text-white">{material.title}</h4>
                              </div>
                              <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{material.type} CONTENT</div>
                            </div>

                            <div className="bg-black/40">
                              {material.type === 'VIDEO' && material.fileUrl && (
                                <video src={material.fileUrl} controls className="w-full aspect-video" />
                              )}
                              {material.type === 'IMAGE' && material.fileUrl && (
                                <img src={convertGoogleDriveUrl(material.fileUrl)} alt={material.title} className="w-full object-contain max-h-[600px]" />
                              )}
                              {material.type === 'AUDIO' && material.fileUrl && (
                                <div className="p-12"><audio src={material.fileUrl} controls className="w-full" /></div>
                              )}
                            </div>

                            <div className="p-6 bg-white/5 backdrop-blur-md">
                              <button
                                onClick={() => handleMaterialComplete(material.id)}
                                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                              >
                                <Icon icon="lucide:check" className="w-5 h-5" />
                                Tugallash
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step Exams */}
                  {step.exams && step.exams.length > 0 && (
                    <div className="mt-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[40px] p-8 shadow-xl shadow-indigo-600/20">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-md">
                          <Icon icon="lucide:award" className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-white">Dars Imtihoni</h3>
                      </div>
                      <div className="space-y-4">
                        {step.exams.map(exam => (
                          <div key={exam.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 flex items-center justify-between gap-6">
                            <div>
                              <h4 className="text-xl font-bold text-white mb-2">{exam.title}</h4>
                              {exam.description && <p className="text-indigo-100/70 text-sm line-clamp-1">{exam.description}</p>}
                            </div>
                            <button
                              onClick={() => handleStartExam(exam.id)}
                              className="flex-shrink-0 px-8 py-3 bg-white text-indigo-600 rounded-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
                            >
                              Boshlash
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Footer Navigation */}
          <div className="mt-24 pt-12 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => navigate(`/training/${trainingId}`)}
              className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <Icon icon="lucide:chevron-left" className="w-5 h-5" />
              Oldingi bosqich
            </button>
            <div className="text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Progress</span>
              <div className="w-32 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 w-full animate-progress" />
              </div>
            </div>
            <button
              disabled
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold opacity-50 cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              Keyingi bosqich
              <Icon icon="lucide:chevron-right" className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

