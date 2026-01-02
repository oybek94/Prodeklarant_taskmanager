import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { markArticleAsRead } from '../utils/articleStorage';
import { useAuth } from '../contexts/AuthContext';

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
      const stageData = trainingResponse.data.stages?.find((s: Stage) => s.id === parseInt(stageId));
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
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(`/training/${trainingId}/manage`)}
            className="text-blue-600 hover:text-blue-800 inline-block"
          >
            ← Orqaga
          </button>
          {canEdit && !isEditing && (
            <button
              onClick={handleStartEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>✏️</span>
              Tahrirlash
            </button>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          {isEditing ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sarlavha:
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-2xl font-bold"
                placeholder="Sarlavha kiriting..."
              />
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{stage.title}</h1>
          )}
          {training.title && (
            <p className="text-sm text-gray-500 mb-4">Kurs: {training.title}</p>
          )}
          {!isEditing && stage.description && (
            <div 
              className="text-gray-700 leading-relaxed prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: stage.description }}
            />
          )}
        </div>
      </div>

      {/* Maqola kontenti */}
      <div className="bg-white rounded-lg shadow p-8">
        {/* Saqlash va bekor qilish tugmalari - faqat tahrirlash rejimida */}
        {canEdit && isEditing && (
          <div className="mb-6 flex justify-end gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Bekor qilish
            </button>
          </div>
        )}

        <article className="prose prose-lg max-w-none">
          {/* Stage description - tahrirlash yoki ko'rish rejimi */}
          {isEditing ? (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maqola matni:
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full min-h-[400px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="HTML yoki oddiy matn kiriting..."
              />
              <p className="mt-2 text-xs text-gray-500">
                HTML formatida kiriting. Masalan: &lt;p&gt;Matn&lt;/p&gt;
              </p>
            </div>
          ) : (
            stage.description && (
              <div 
                className="prose prose-lg max-w-none mb-8"
                dangerouslySetInnerHTML={{ __html: stage.description }}
              />
            )
          )}
          
          {/* Steps va Materiallar */}
          {stage.steps && stage.steps.length > 0 ? (
            <div className="space-y-8">
              {stage.steps
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((step, stepIndex) => (
                  <div key={step.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        {step.title && (
                          <h2 className="text-2xl font-semibold text-gray-900">
                            {step.title}
                          </h2>
                        )}
                        {(() => {
                          const lessonStatus = getLessonStatus(step.id);
                          return lessonStatus && (
                            <div className="mt-2 flex items-center gap-2">
                              {getStatusBadge(lessonStatus.status)}
                              {lessonStatus.lastAttemptScore !== null && (
                                <span className="text-sm text-gray-600">
                                  Oxirgi ball: {lessonStatus.lastAttemptScore}%
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      {(() => {
                        const lessonStatus = getLessonStatus(step.id);
                        const canStart = lessonStatus && (lessonStatus.status === 'AVAILABLE' || lessonStatus.status === 'IN_PROGRESS');
                        if (canStart) {
                          return (
                            <button
                              onClick={() => handleStartLesson(step.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Darsni boshlash
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {step.description && (
                      <div className="text-gray-700 whitespace-pre-wrap mb-6 leading-relaxed">
                        {step.description}
                      </div>
                    )}
                    
                    {/* Step materiallari */}
                    {step.materials.length > 0 && (
                      <div className="space-y-6 mt-6">
                        {step.materials
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((material) => (
                            <div key={material.id}>
                              {material.type === 'TEXT' && material.content ? (
                                <div className="relative">
                                  {/* Material tahrirlash tugmasi */}
                                  {canEdit && editingMaterialId !== material.id && (
                                    <div className="mb-4 flex justify-end">
                                      <button
                                        onClick={() => handleStartEditMaterial(material)}
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                                      >
                                        <span>✏️</span>
                                        Tahrirlash
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Tahrirlash rejimi */}
                                  {editingMaterialId === material.id ? (
                                    <div className="mb-4">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Material matni:
                                      </label>
                                      <textarea
                                        value={editMaterialContent}
                                        onChange={(e) => setEditMaterialContent(e.target.value)}
                                        className="w-full min-h-[400px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                        placeholder="HTML yoki oddiy matn kiriting..."
                                      />
                                      <p className="mt-2 text-xs text-gray-500">
                                        HTML formatida kiriting. Masalan: &lt;p&gt;Matn&lt;/p&gt;
                                      </p>
                                      <div className="mt-4 flex gap-2 justify-end">
                                        <button
                                          onClick={() => handleSaveMaterial(material.id)}
                                          disabled={savingMaterial}
                                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {savingMaterial ? 'Saqlanmoqda...' : '💾 Saqlash'}
                                        </button>
                                        <button
                                          onClick={handleCancelEditMaterial}
                                          disabled={savingMaterial}
                                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                                        >
                                          Bekor qilish
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div 
                                      className="lesson-content text-gray-700 leading-relaxed"
                                      dangerouslySetInnerHTML={{ __html: material.content }}
                                      style={{
                                        fontFamily: 'system-ui, -apple-system, sans-serif',
                                      }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">
                                      {material.type === 'TEXT' && '📄'}
                                      {material.type === 'AUDIO' && '🎵'}
                                      {material.type === 'VIDEO' && '🎥'}
                                      {material.type === 'IMAGE' && '🖼️'}
                                    </span>
                                    {material.title}
                                  </h3>
                                  
                                  {/* Material kontenti */}
                                  <div className="space-y-4">
                                    {material.type === 'VIDEO' && material.fileUrl && (
                                      <div className="rounded-lg overflow-hidden">
                                        <video
                                          src={material.fileUrl}
                                          controls
                                          className="w-full rounded-lg"
                                        >
                                          Video'ni qo'llab-quvvatlamaydi
                                        </video>
                                      </div>
                                    )}

                                    {material.type === 'AUDIO' && material.fileUrl && (
                                      <div className="bg-white p-4 rounded border">
                                        <audio
                                          src={material.fileUrl}
                                          controls
                                          className="w-full"
                                        >
                                          Audio'ni qo'llab-quvvatlamaydi
                                        </audio>
                                      </div>
                                    )}

                                    {material.type === 'IMAGE' && material.fileUrl && (
                                      <div className="rounded-lg overflow-hidden">
                                        <img
                                          src={convertGoogleDriveUrl(material.fileUrl)}
                                          alt={material.title}
                                          className="w-full rounded-lg border border-gray-200"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (target.src !== material.fileUrl) {
                                              target.src = material.fileUrl || '';
                                            }
                                          }}
                                        />
                                      </div>
                                    )}

                                    {material.durationMin && (
                                      <p className="text-sm text-gray-500">
                                        Davomiyligi: {material.durationMin} daqiqa
                                      </p>
                                    )}

                                    <button
                                      onClick={() => handleMaterialComplete(material.id)}
                                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                      ✓ Materialni yakunlash
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}

                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Materiallar mavjud emas
            </div>
          )}
        </article>
      </div>

      {/* Barcha imtihonlar - sahifaning eng pastida */}
      {(() => {
        const allExams = stage.steps?.flatMap(step => step.exams || []) || [];
        const hasExams = allExams.length > 0;
        console.log('All exams:', allExams, 'Has exams:', hasExams);
        return hasExams;
      })() && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Imtihonlar</h2>
          <div className="space-y-4">
            {stage.steps
              .filter(step => step.exams && step.exams.length > 0)
              .map((step) => {
                const lessonStatus = getLessonStatus(step.id);
                const canTakeExam = lessonStatus && (lessonStatus.status === 'IN_PROGRESS' || lessonStatus.status === 'COMPLETED' || lessonStatus.status === 'FAILED');
                
                return (
                  <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">{step.title}</h3>
                    <div className="space-y-3">
                      {step.exams?.map((exam) => (
                        <div
                          key={exam.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{exam.title}</h4>
                            {exam.description && (
                              <p className="text-sm text-gray-600 mt-1">{exam.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleStartExam(exam.id)}
                            disabled={!canTakeExam}
                            className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                              canTakeExam
                                ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {canTakeExam ? 'Imtihonni boshlash' : 'Avval darsni boshlang'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

