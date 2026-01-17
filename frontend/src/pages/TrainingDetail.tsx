import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { getReadArticles } from '../utils/articleStorage';
import { Icon } from '@iconify/react';

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
  const [readStages, setReadStages] = useState<number[]>([]);

  useEffect(() => {
    if (id) {
      fetchTraining();
      
      // Load read articles from localStorage on mount
      const trainingIdNum = parseInt(id);
      if (!isNaN(trainingIdNum)) {
        const read = getReadArticles(trainingIdNum);
        setReadStages(read);
      }
    }
  }, [id]);
  
  // Sync read state when window regains focus (user returns from article page)
  useEffect(() => {
    const handleFocus = () => {
      if (id) {
        const trainingIdNum = parseInt(id);
        if (!isNaN(trainingIdNum)) {
          const read = getReadArticles(trainingIdNum);
          setReadStages(read);
        }
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
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

      {/* Progress Line ko'rinishi - Bosqichlar progress line bilan */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {hasStages ? (
          <div className="p-6">
            {/* Progress Line */}
            <div className="relative mb-8">
              <div className="flex items-center justify-between">
                {training.stages
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((stage, index, array) => {
                    const isLast = index === array.length - 1;
                    const totalMaterials = (stage.steps || []).reduce((sum, step) => sum + (step.materials?.length || 0), 0);
                    const completedMaterials = 0; // TODO: Calculate from progress
                    const stageProgress = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;
                    const isCompleted = stageProgress === 100;
                    const isActive = index === 0 || (training.progress?.stageId === stage.id);
                    
                    return (
                      <div key={stage.id} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          {/* Progress Circle */}
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all ${
                              isCompleted 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : isActive
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'bg-gray-200 border-gray-300 text-gray-500'
                            }`}>
                              {isCompleted ? (
                                <Icon icon="mdi:check" className="w-6 h-6" />
                              ) : (
                                <span className="text-sm font-bold">{index + 1}</span>
                              )}
                            </div>
                            {/* Progress percentage */}
                            {stageProgress > 0 && stageProgress < 100 && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {Math.round(stageProgress)}%
                              </div>
                            )}
                          </div>
                          
                          {/* Stage Title */}
                          <div className="mt-3 text-center max-w-[150px]">
                            <p className={`text-xs font-medium ${
                              isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                              {stage.title.length > 30 ? stage.title.substring(0, 30) + '...' : stage.title}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {totalMaterials} material
                            </p>
                          </div>
                        </div>
                        
                        {/* Connecting Line */}
                        {!isLast && (
                          <div className="flex-1 mx-2 h-1 relative">
                            <div className={`h-1 w-full ${
                              isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-300'
                            }`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
            
            {/* Stages List - Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {training.stages
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((stage, stageIndex) => {
                  const totalMaterials = (stage.steps || []).reduce((sum, step) => sum + (step.materials?.length || 0), 0);
                  const completedMaterials = 0; // TODO: Calculate from progress
                  const stageProgress = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;
                  const isCompleted = stageProgress === 100;
                  const isActive = stageIndex === 0 || (training.progress?.stageId === stage.id);
                  const isRead = readStages.includes(stage.id);
                  
                  return (
                    <div 
                      key={stage.id} 
                      onClick={() => navigate(`/training/${id}/stage/${stage.id}`)}
                      className={`border rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer bg-white h-full flex flex-col ${
                        isRead
                          ? 'border-blue-300 hover:border-blue-400 bg-blue-50'
                          : isCompleted 
                          ? 'border-green-300 hover:border-green-400' 
                          : isActive
                          ? 'border-blue-300 hover:border-blue-400'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="p-5 flex flex-col h-full">
                        {/* Progress Circle va Sarlavha */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm ${
                              isRead
                                ? 'bg-blue-500 border-blue-600 text-white'
                                : isCompleted 
                                ? 'bg-green-500 border-green-600 text-white' 
                                : isActive
                                ? 'bg-blue-500 border-blue-600 text-white'
                                : 'bg-gray-100 border-gray-300 text-gray-600'
                            }`}>
                              {isRead ? (
                                <Icon icon="mdi:check" className="w-5 h-5" />
                              ) : isCompleted ? (
                                <Icon icon="mdi:check" className="w-5 h-5" />
                              ) : (
                                <span className="text-sm font-bold">{stageIndex + 1}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-lg font-bold mb-2 line-clamp-2 ${
                              isRead ? 'text-blue-900' : isCompleted ? 'text-green-900' : isActive ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {stage.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              {isRead && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <Icon icon="mdi:check" className="w-3 h-3" />
                                  O'qildi
                                </span>
                              )}
                              {stageProgress > 0 && stageProgress < 100 && !isRead && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                  {Math.round(stageProgress)}%
                                </span>
                              )}
                              {isCompleted && !isRead && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                                  ✓ Yakunlangan
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Qisqa tavsif */}
                        {stage.description && (
                          <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed flex-grow">
                            {stage.description.length > 150 
                              ? stage.description.substring(0, 150) + '...' 
                              : stage.description}
                          </p>
                        )}
                        
                        {/* Progress bar */}
                        {totalMaterials > 0 && (
                          <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${stageProgress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {completedMaterials} / {totalMaterials} material
                            </div>
                          </div>
                        )}
                        
                        {/* Maqolani o'qish linki */}
                        <div className="flex items-center gap-2 text-blue-600 font-medium text-sm mt-auto pt-2 border-t border-gray-100">
                          <span>Maqolani o'qish</span>
                          <Icon icon="mdi:chevron-right" className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
