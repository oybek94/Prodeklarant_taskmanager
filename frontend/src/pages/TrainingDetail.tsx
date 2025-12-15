import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';

interface Material {
  id: number;
  title: string;
  content?: string;
  type: 'TEXT' | 'AUDIO' | 'VIDEO';
  fileUrl?: string;
  durationMin?: number;
  orderIndex: number;
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
  materials: Material[];
  exams: Exam[];
  progress: {
    completed: boolean;
    progressPercent: number;
    lastAccessedAt: string | null;
  };
  recentExamAttempts: any[];
}

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(0);

  useEffect(() => {
    if (id) {
      fetchTraining();
    }
  }, [id]);

  const fetchTraining = async () => {
    try {
      const response = await apiClient.get(`/training/${id}`);
      setTraining(response.data);
      
      // Progress bo'yicha oxirgi o'qilgan materialni topish
      if (response.data.materials.length > 0) {
        const lastMaterialId = response.data.progress?.materialId;
        if (lastMaterialId) {
          const index = response.data.materials.findIndex(
            (m: Material) => m.id === lastMaterialId
          );
          if (index !== -1) {
            // Keyingi materialga o'tish (o'qilgan materialdan keyin)
            setCurrentMaterialIndex(Math.min(index + 1, response.data.materials.length - 1));
          }
        } else {
          // Birinchi materialga o'tish
          setCurrentMaterialIndex(0);
        }
      }
    } catch (error) {
      console.error('Error fetching training:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialComplete = async (materialId: number) => {
    try {
      const response = await apiClient.post(`/training/${id}/materials/${materialId}/complete`);
      fetchTraining();
      
      // Keyingi materialga o'tish
      if (currentMaterialIndex < (training?.materials.length || 0) - 1) {
        setCurrentMaterialIndex(currentMaterialIndex + 1);
      }
    } catch (error: any) {
      console.error('Error completing material:', error);
      if (error.response?.status === 400) {
        alert(error.response.data.error);
        // Kerakli materialga o'tish
        if (error.response.data.requiredMaterialId) {
          const requiredIndex = training?.materials.findIndex(
            (m: Material) => m.id === error.response.data.requiredMaterialId
          );
          if (requiredIndex !== undefined && requiredIndex !== -1) {
            setCurrentMaterialIndex(requiredIndex);
          }
        }
      } else {
        alert('Xatolik yuz berdi');
      }
    }
  };

  const isMaterialUnlocked = (materialIndex: number): boolean => {
    if (materialIndex === 0) return true;
    if (!training?.progress?.materialId) return false;
    
    const lastCompletedMaterial = training.materials.find(
      (m: Material) => m.id === training.progress.materialId
    );
    
    if (!lastCompletedMaterial) return false;
    
    const currentMaterial = training.materials[materialIndex];
    // Oldingi material o'qilgan bo'lsa, keyingisi ochiladi
    return currentMaterial.orderIndex <= lastCompletedMaterial.orderIndex + 1;
  };

  const handleNextMaterial = () => {
    if (currentMaterialIndex < (training?.materials.length || 0) - 1) {
      const nextIndex = currentMaterialIndex + 1;
      if (isMaterialUnlocked(nextIndex)) {
        setCurrentMaterialIndex(nextIndex);
      } else {
        alert('Avval oldingi materiallarni o\'qishingiz kerak');
      }
    }
  };

  const handlePrevMaterial = () => {
    if (currentMaterialIndex > 0) {
      setCurrentMaterialIndex(currentMaterialIndex - 1);
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

  const currentMaterial = training.materials[currentMaterialIndex];
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asosiy kontent */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            {training.materials.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Hozircha materiallar mavjud emas
              </p>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">
                      {currentMaterial?.title}
                    </h2>
                    <span className="text-sm text-gray-500">
                      {currentMaterialIndex + 1} / {training.materials.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${((currentMaterialIndex + 1) / training.materials.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {currentMaterial && (
                  <div className="space-y-4">
                    {currentMaterial.type === 'TEXT' && (
                      <div className="prose max-w-none">
                        <div
                          className="text-gray-700 whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: currentMaterial.content || '',
                          }}
                        />
                      </div>
                    )}

                    {currentMaterial.type === 'AUDIO' && (
                      <div>
                        {currentMaterial.fileUrl ? (
                          <audio controls className="w-full">
                            <source src={currentMaterial.fileUrl} />
                            Brauzeringiz audio faylni qo'llab-quvvatlamaydi.
                          </audio>
                        ) : (
                          <p className="text-gray-500">Audio fayl mavjud emas</p>
                        )}
                        {currentMaterial.durationMin && (
                          <p className="text-sm text-gray-500 mt-2">
                            Davomiyligi: {currentMaterial.durationMin} daqiqa
                          </p>
                        )}
                      </div>
                    )}

                    {currentMaterial.type === 'VIDEO' && (
                      <div>
                        {currentMaterial.fileUrl ? (
                          <video controls className="w-full">
                            <source src={currentMaterial.fileUrl} />
                            Brauzeringiz video faylni qo'llab-quvvatlamaydi.
                          </video>
                        ) : (
                          <p className="text-gray-500">Video fayl mavjud emas</p>
                        )}
                        {currentMaterial.durationMin && (
                          <p className="text-sm text-gray-500 mt-2">
                            Davomiyligi: {currentMaterial.durationMin} daqiqa
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <button
                        onClick={handlePrevMaterial}
                        disabled={currentMaterialIndex === 0}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Oldingi
                      </button>

                      <button
                        onClick={() => handleMaterialComplete(currentMaterial.id)}
                        disabled={!isMaterialUnlocked(currentMaterialIndex)}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        O'qib bo'ldim ✓
                      </button>

                      <button
                        onClick={handleNextMaterial}
                        disabled={
                          currentMaterialIndex === training.materials.length - 1 ||
                          !isMaterialUnlocked(currentMaterialIndex + 1)
                        }
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Keyingi →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Progress</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Umumiy progress:</span>
                <span className="font-medium">
                  {training.progress.progressPercent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    training.progress.completed
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${training.progress.progressPercent}%`,
                  }}
                />
              </div>
              {training.progress.completed && (
                <p className="text-green-600 text-sm mt-2">
                  ✓ O'qitish tugallandi
                </p>
              )}
            </div>
          </div>

          {/* Imtihonlar */}
          {training.exams.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Imtihonlar</h3>
              <div className="space-y-3">
                {training.exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <h4 className="font-medium mb-2">{exam.title}</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Savollar: {exam._count.questions}</p>
                      <p>O'tish balli: {exam.passingScore}%</p>
                      {exam.timeLimitMin && (
                        <p>Vaqt: {exam.timeLimitMin} daqiqa</p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/exam/${exam.id}`)}
                      disabled={!canTakeExam}
                      className={`mt-3 w-full px-4 py-2 rounded ${
                        canTakeExam
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {canTakeExam ? 'Imtihon topshirish' : 'Avval o\'qitishni tugallang'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materiallar ro'yxati */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Materiallar</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {training.materials.map((material, index) => {
                const unlocked = isMaterialUnlocked(index);
                const isCompleted = training.progress?.materialId && 
                  training.materials.find((m: Material) => m.id === training.progress.materialId)?.orderIndex >= material.orderIndex;
                
                return (
                  <button
                    key={material.id}
                    onClick={() => {
                      if (unlocked) {
                        setCurrentMaterialIndex(index);
                      } else {
                        alert('Avval oldingi materiallarni o\'qishingiz kerak');
                      }
                    }}
                    disabled={!unlocked}
                    className={`w-full text-left p-2 rounded text-sm ${
                      index === currentMaterialIndex
                        ? 'bg-blue-100 text-blue-700'
                        : unlocked
                        ? 'hover:bg-gray-50'
                        : 'opacity-50 cursor-not-allowed bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span className="text-green-600">✓</span>
                        )}
                        {!unlocked && (
                          <span className="text-gray-400">🔒</span>
                        )}
                        <span>{material.title}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {material.type === 'TEXT' && '📄'}
                        {material.type === 'AUDIO' && '🎵'}
                        {material.type === 'VIDEO' && '🎥'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

