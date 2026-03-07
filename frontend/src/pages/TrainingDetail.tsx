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
  isUnlocked?: boolean;
  isPassed?: boolean;
  isRead?: boolean;
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
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            to="/training"
            className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 mb-6 transition-all"
          >
            <div className="p-1.5 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
              <Icon icon="lucide:arrow-left" className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm">Kurslar ro'yxatiga qaytish</span>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                {training.title}
              </h1>
              {training.description && (
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                  {training.description}
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl min-w-[300px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Sizning progressíngiz</span>
                <span className={`text-xl font-black ${training.progress.completed ? 'text-green-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {training.progress.progressPercent}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-1000 relative ${training.progress.completed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    }`}
                  style={{ width: `${training.progress.progressPercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center font-medium">
                {training.progress.completed ? 'Tabriklaymiz! Kurs yakunlandi' : 'Keyingi bosqichga o\'tish uchun materiallarni o\'rganing'}
              </p>
            </div>
          </div>
        </div>

        {/* Progression Timeline / Map */}
        <div className="mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 hidden xl:block" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
            {training.stages
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((stage, index) => {
                const totalMaterials = (stage.steps || [])
                  .filter(step => step.title !== '_AI_STAGE_EXAM')
                  .reduce((sum, step) => sum + (step.materials?.length || 0), 0);

                const isPassed = stage.isPassed === true;
                const isUnlocked = stage.isUnlocked ?? (index === 0);

                // 3 holat: O'qilmagan | O'qilgan imtihon topshirilmagan | Tugallangan
                // "O'qilgan imtihon topshirilmagan" - foydalanuvchi o'qigan (backend tracking)
                // Hozircha localStorage'da tracking yo'q, shuning uchun faqat backend flag ishlatamiz
                const isReadOnServer = stage.isRead === true;

                const statusLabel = isPassed
                  ? 'Tugallangan'
                  : isReadOnServer
                    ? "O'qilgan, imtihon topshirilmagan"
                    : isUnlocked
                      ? "O'qilmagan"
                      : 'Qulflangan';

                const statusColor = isPassed
                  ? 'bg-green-500 border-green-600 text-white'
                  : isReadOnServer
                    ? 'bg-amber-500 border-amber-600 text-white'
                    : isUnlocked
                      ? 'bg-indigo-600 border-indigo-700 text-white'
                      : 'bg-slate-100 border-slate-200 dark:bg-slate-700 dark:border-slate-600 text-slate-500';

                // HTML teglardan xoli tekst
                const plainDescription = stage.description
                  ? stage.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                  : '';

                return (
                  <div
                    key={stage.id}
                    onClick={() => {
                      if (isUnlocked) {
                        navigate(`/training/${id}/stage/${stage.id}`)
                      }
                    }}
                    className={`group relative bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 transition-all duration-300 ${isPassed
                      ? 'border-green-500/30 bg-green-50/10 cursor-pointer hover:shadow-2xl hover:-translate-y-2'
                      : isUnlocked
                        ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 cursor-pointer hover:shadow-2xl hover:-translate-y-2'
                        : 'border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
                      }`}
                  >
                    {/* Status Badge */}
                    <div className="absolute -top-3 left-6">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-sm ${statusColor}`}>
                        {statusLabel}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-4 mt-2">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${isPassed
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                        : isUnlocked
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-400'
                        }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {stage.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-bold">{totalMaterials} ta material</p>
                      </div>
                    </div>

                    {plainDescription && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-6 h-10 leading-snug">
                        {plainDescription}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {isUnlocked ? 'Kirish' : 'Qulflangan'}
                      </span>
                      <div className={`p-2 rounded-xl transition-all ${isPassed
                        ? 'bg-green-50 text-green-600'
                        : isUnlocked
                          ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                          : 'bg-slate-50 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                        }`}>
                        <Icon icon={isUnlocked ? "lucide:arrow-right" : "lucide:lock"} className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Exams Section */}
        {training.exams.length > 0 && (
          <div className="bg-slate-900 rounded-[40px] p-10 relative overflow-hidden shadow-2xl">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/20 blur-[80px] rounded-full" />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                  <Icon icon="lucide:brain-circuit" className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white">Kurs Imtihonlari</h2>
                  <p className="text-slate-400 font-medium">Bilimingizni sinovdan o'tkazing va sertifikatga ega bo'ling</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {training.exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-black uppercase">Final</span>
                          <h3 className="text-xl font-bold text-white">{exam.title}</h3>
                        </div>
                        {exam.description && (
                          <p className="text-slate-400 text-sm mb-4 line-clamp-2">{exam.description}</p>
                        )}
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                            <Icon icon="lucide:help-circle" className="w-4 h-4" />
                            {exam._count.questions} ta savol
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                            <Icon icon="lucide:target" className="w-4 h-4" />
                            {exam.passingScore}% o'tish balli
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/exam/${exam.id}`)}
                        disabled={!canTakeExam}
                        className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${canTakeExam
                          ? 'bg-white text-slate-900 hover:scale-105 active:scale-95 shadow-xl shadow-white/10'
                          : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                          }`}
                      >
                        {canTakeExam ? (
                          <>
                            Boshlash
                            <Icon icon="lucide:play-circle" className="w-5 h-5" />
                          </>
                        ) : (
                          'Kursni yakunlang'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
