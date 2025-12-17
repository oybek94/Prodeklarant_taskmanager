import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';

// Google Drive linkini rasm URL'iga o'tkazish
const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return url;
  
  // Agar allaqachon to'g'ri formatda bo'lsa
  if (url.includes('drive.google.com/uc?export=view')) {
    return url;
  }
  
  // Google Drive link formatlarini aniqlash
  let fileId = '';
  
  // Format 1: https://drive.google.com/file/d/FILE_ID/view
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) {
    fileId = match1[1];
  }
  
  // Format 2: https://drive.google.com/open?id=FILE_ID
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) {
    fileId = match2[1];
  }
  
  // Format 3: https://drive.google.com/file/d/FILE_ID/edit
  const match3 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\/edit/);
  if (match3) {
    fileId = match3[1];
  }
  
  // Agar fileId topilsa, to'g'ri formatga o'tkazish
  if (fileId) {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  
  // Agar Google Drive linki bo'lmasa, asl URL'ni qaytarish
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
}

interface Stage {
  id: number;
  title: string;
  description?: string;
  orderIndex: number;
  steps: Step[];
}

interface Exam {
  id: number;
  title: string;
  description?: string;
  passingScore: number;
  timeLimitMin?: number;
  _count: {
    questions: number;
  };
}

interface Training {
  id: number;
  title: string;
  description?: string;
  stages: Stage[];
  materials: Material[]; // Eski materiallar (backward compatibility)
  exams: Exam[];
  progress: {
    completed: boolean;
    progressPercent: number;
    lastAccessedAt: string | null;
    stageId?: number;
    stepId?: number;
    materialId?: number;
  };
  recentExamAttempts: any[];
}

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [expandedMaterials, setExpandedMaterials] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (id) {
      fetchTraining();
    }
  }, [id]);

  const fetchTraining = async () => {
    try {
      const response = await apiClient.get(`/training/${id}`);
      setTraining(response.data);
      
      // Progress bo'yicha ochilgan bosqich, qadam va materialni topish
      if (response.data.progress?.stageId) {
        setExpandedStages(new Set([response.data.progress.stageId]));
        if (response.data.progress?.stepId) {
          setExpandedSteps(new Set([response.data.progress.stepId]));
          if (response.data.progress?.materialId) {
            setExpandedMaterials(new Set([response.data.progress.materialId]));
          }
        }
      } else if (response.data.stages && response.data.stages.length > 0) {
        // Birinchi bosqichni ochish
        setExpandedStages(new Set([response.data.stages[0].id]));
        if (response.data.stages[0].steps && response.data.stages[0].steps.length > 0) {
          setExpandedSteps(new Set([response.data.stages[0].steps[0].id]));
        }
      }
    } catch (error) {
      console.error('Error fetching training:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = (stageId: number) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };

  const toggleStep = (stepId: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const toggleMaterial = (materialId: number) => {
    const newExpanded = new Set(expandedMaterials);
    if (newExpanded.has(materialId)) {
      newExpanded.delete(materialId);
    } else {
      newExpanded.add(materialId);
    }
    setExpandedMaterials(newExpanded);
  };

  const handleMaterialComplete = async (materialId: number) => {
    try {
      await apiClient.post(`/training/${id}/materials/${materialId}/complete`);
      fetchTraining();
      alert('Material muvaffaqiyatli yakunlandi!');
    } catch (error: any) {
      console.error('Error completing material:', error);
      if (error.response?.status === 400) {
        alert(error.response.data.error);
      } else {
        alert('Xatolik yuz berdi');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!training) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">O'qitish topilmadi</p>
          <Link to="/training" className="text-blue-600 mt-4 inline-block">
            Orqaga
          </Link>
        </div>
      </div>
    );
  }

  const hasStages = training.stages && training.stages.length > 0;
  const canTakeExam = training.progress.completed;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          to="/training"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← O'qitish kurslariga qaytish
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{training.title}</h1>
        {training.description && (
          <p className="text-gray-600 mt-2">{training.description}</p>
        )}
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Progress:</span>
            <span className="font-medium">{training.progress.progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                training.progress.completed ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${training.progress.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Jadval ko'rinishi - Bosqichlar, Qadamlar va Materiallar (tepadan pastga) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Bosqichlar va Qadamlar</h2>
        </div>
        
        {hasStages ? (
          <div className="space-y-4 p-4">
            {training.stages
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((stage) => (
              <div key={stage.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                {/* Bosqich sarlavhasi */}
                <button
                  onClick={() => toggleStage(stage.id)}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between bg-gray-50"
                >
                      <div className="flex flex-col gap-1">
                        <span className="text-lg font-semibold text-gray-900">
                          {stage.title}
                        </span>
                        {stage.description && (
                          <span className="text-sm text-gray-500 whitespace-pre-wrap">
                            {stage.description}
                          </span>
                        )}
                      </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedStages.has(stage.id) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Qadamlar ro'yxati */}
                {expandedStages.has(stage.id) && (
                  <div className="bg-gray-50">
                    {stage.steps
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((step) => (
                      <div key={step.id} className="border-t border-gray-200">
                        {/* Qadam sarlavhasi */}
                        <button
                          onClick={() => toggleStep(step.id)}
                          className="w-full px-10 py-3 text-left hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="font-medium text-blue-700 mb-1 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                                {step.title}
                              </div>
                              {step.description && (
                                <div className="text-sm text-gray-500 whitespace-pre-wrap mt-2">
                                  {step.description}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {step.materials.length > 0 && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">
                                  {step.materials.length} material
                                </span>
                              )}
                              <svg
                                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
                                  expandedSteps.has(step.id) ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </div>
                        </button>

                        {/* Materiallar ro'yxati */}
                        {expandedSteps.has(step.id) && (
                          <div className="bg-white">
                            {step.materials.length === 0 ? (
                              <div className="pl-16 pr-6 py-3">
                                <p className="text-sm text-gray-500">
                                  Materiallar mavjud emas
                                </p>
                              </div>
                            ) : (
                              <div className="divide-y">
                                {step.materials
                                  .sort((a, b) => a.orderIndex - b.orderIndex)
                                  .map((material) => (
                                  <div key={material.id} className="pl-16 pr-6">
                                    {/* Material sarlavhasi */}
                                    <button
                                      onClick={() => toggleMaterial(material.id)}
                                      className="w-full text-left py-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-900">
                                          {material.title}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          ({material.type})
                                        </span>
                                        {material.durationMin && (
                                          <span className="text-xs text-gray-400">
                                            • {material.durationMin} min
                                          </span>
                                        )}
                                      </div>
                                      <svg
                                        className={`w-4 h-4 text-gray-400 transition-transform ${
                                          expandedMaterials.has(material.id) ? 'rotate-180' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 9l-7 7-7-7"
                                        />
                                      </svg>
                                    </button>

                                    {/* Material kontenti */}
                                    {expandedMaterials.has(material.id) && (
                                      <div className="pb-4 pl-4 border-l-2 border-blue-200 ml-2">
                                        <div className="space-y-4">
                                          {material.type === 'TEXT' && (
                                            <div className="prose max-w-none">
                                              <div className="text-gray-700 whitespace-pre-wrap text-sm">
                                                {material.content || 'Kontent mavjud emas'}
                                              </div>
                                            </div>
                                          )}

                                          {material.type === 'VIDEO' && material.fileUrl && (
                                            <div>
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
                                            <div>
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
                                            <div>
                                              <img
                                                src={convertGoogleDriveUrl(material.fileUrl)}
                                                alt={material.title}
                                                className="w-full rounded-lg"
                                                onError={(e) => {
                                                  // Agar rasm yuklanmasa, asl URL'ni sinab ko'rish
                                                  const target = e.target as HTMLImageElement;
                                                  if (target.src !== material.fileUrl) {
                                                    target.src = material.fileUrl || '';
                                                  }
                                                }}
                                              />
                                            </div>
                                          )}

                                          <button
                                            onClick={() => handleMaterialComplete(material.id)}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                          >
                                            Materialni yakunlash ✓
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
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
          <div className="p-8 text-center text-gray-500">
            Hozircha bosqichlar mavjud emas
          </div>
        )}
      </div>

      {/* Imtihonlar bo'limi */}
      {training.exams.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Imtihonlar</h2>
          <div className="space-y-3">
            {training.exams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{exam.title}</h3>
                  {exam.description && (
                    <p className="text-sm text-gray-500 mt-1">{exam.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {exam._count.questions} ta savol | O'tish balli: {exam.passingScore}%
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/exam/${exam.id}`)}
                  disabled={!canTakeExam}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    canTakeExam
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {canTakeExam ? 'Imtihonni boshlash' : 'Avval o\'qitishni tugallang'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
