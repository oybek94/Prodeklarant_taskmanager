import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';

interface Material {
  id: number;
  title: string;
  content?: string;
  type: 'TEXT' | 'AUDIO' | 'VIDEO' | 'IMAGE';
  fileUrl?: string;
  orderIndex: number;
  durationMin?: number;
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
  active: boolean;
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
}

export default function TrainingManageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stages' | 'materials' | 'exams'>('stages');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedStep, setSelectedStep] = useState<{ stageId: number; step: Step | null } | null>(null);
  const [materialForm, setMaterialForm] = useState({
    title: '',
    content: '',
    type: 'TEXT' as 'TEXT' | 'AUDIO' | 'VIDEO' | 'IMAGE',
    fileUrl: '',
    orderIndex: 0,
    durationMin: undefined as number | undefined,
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    passingScore: 70,
    timeLimitMin: undefined as number | undefined,
  });
  const [stageForm, setStageForm] = useState({
    title: '',
    description: '',
    orderIndex: 0,
  });
  const [stepForm, setStepForm] = useState({
    title: '',
    description: '',
    orderIndex: 0,
  });

  useEffect(() => {
    if (id) {
      fetchTraining();
    }
  }, [id]);

  const fetchTraining = async () => {
    try {
      const response = await apiClient.get(`/training/${id}`);
      setTraining(response.data);
    } catch (error) {
      console.error('Error fetching training:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = () => {
    setSelectedMaterial(null);
    setMaterialForm({
      title: '',
      content: '',
      type: 'TEXT',
      fileUrl: '',
      orderIndex: training?.materials.length || 0,
      durationMin: undefined,
    });
    setSelectedFile(null);
    setShowMaterialModal(true);
  };

  const handleEditMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setMaterialForm({
      title: material.title,
      content: material.content || '',
      type: material.type,
      fileUrl: material.fileUrl || '',
      orderIndex: material.orderIndex,
      durationMin: material.durationMin,
    });
    setSelectedFile(null);
    setShowMaterialModal(true);
  };

  const handleFileUpload = async (file: File, type: 'IMAGE' | 'VIDEO' | 'AUDIO') => {
    setUploadingFile(true);
    try {
      const formData = new FormData();
      const fieldName = type === 'IMAGE' ? 'image' : type === 'VIDEO' ? 'video' : 'audio';
      formData.append(fieldName, file);

      const endpoint = type === 'IMAGE' ? '/upload/image' : type === 'VIDEO' ? '/upload/video' : '/upload/audio';
      const response = await apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Backend'dan kelgan fileUrl'ni olish
      const fileUrl = response.data.fileUrl;
      
      // Backend'dan kelgan fileUrl allaqachon to'liq yoki relative bo'lishi mumkin
      // Relative bo'lsa, server base URL'ni qo'shamiz
      let fullUrl = fileUrl;
      if (!fileUrl.startsWith('http')) {
        // API base URL'dan server base URL'ni olish (/api ni olib tashlash)
        const apiBaseUrl = apiClient.defaults.baseURL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');
        const serverBaseUrl = apiBaseUrl.replace('/api', '') || (import.meta.env.PROD ? '' : 'http://localhost:3001');
        fullUrl = `${serverBaseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
      }
      
      setMaterialForm({ ...materialForm, fileUrl: fullUrl });
      setSelectedFile(null);
      return fullUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMessage = error.response?.data?.error || 'Fayl yuklashda xatolik yuz berdi';
      alert(errorMessage);
      throw error;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Avtomatik yuklash
    if (materialForm.type === 'IMAGE' || materialForm.type === 'VIDEO' || materialForm.type === 'AUDIO') {
      try {
        await handleFileUpload(file, materialForm.type);
      } catch (error) {
        setSelectedFile(null);
      }
    }
  };

  const handleSubmitMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Agar file tanlangan va yuklanmagan bo'lsa, avval yuklash
    if (selectedFile && (materialForm.type === 'IMAGE' || materialForm.type === 'VIDEO' || materialForm.type === 'AUDIO')) {
      try {
        await handleFileUpload(selectedFile, materialForm.type);
      } catch (error) {
        return; // Xatolik bo'lsa, to'xtatish
      }
    }

    try {
      if (selectedMaterial) {
        await apiClient.put(
          `/training/${id}/materials/${selectedMaterial.id}`,
          materialForm
        );
      } else {
        await apiClient.post(`/training/${id}/materials`, materialForm);
      }
      setShowMaterialModal(false);
      setSelectedMaterial(null);
      setSelectedFile(null);
      fetchTraining();
    } catch (error: any) {
      console.error('Error submitting material:', error);
      let errorMessage = 'Xatolik yuz berdi';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Agar details array bo'lsa
        if (Array.isArray(errorData.details)) {
          errorMessage = errorData.details
            .map((e: any) => {
              const path = Array.isArray(e.path) ? e.path.join('.') : e.path || '';
              return path ? `${path}: ${e.message || e}` : (e.message || e);
            })
            .join('\n');
        } 
        // Agar details string bo'lsa
        else if (typeof errorData.details === 'string') {
          errorMessage = errorData.details;
        }
        // Agar error bor bo'lsa
        else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : JSON.stringify(errorData.error);
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('Materialni o\'chirishni tasdiqlaysizmi?')) return;

    try {
      await apiClient.delete(`/training/${id}/materials/${materialId}`);
      fetchTraining();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleAddExam = () => {
    setSelectedExam(null);
    setExamForm({
      title: '',
      description: '',
      passingScore: 70,
      timeLimitMin: undefined,
    });
    setShowExamModal(true);
  };

  const handleEditExam = (exam: Exam) => {
    setSelectedExam(exam);
    setExamForm({
      title: exam.title,
      description: exam.description || '',
      passingScore: exam.passingScore,
      timeLimitMin: exam.timeLimitMin,
    });
    setShowExamModal(true);
  };

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedExam) {
        await apiClient.put(`/exams/${selectedExam.id}`, examForm);
      } else {
        await apiClient.post('/exams', {
          ...examForm,
          trainingId: parseInt(id!),
        });
      }
      setShowExamModal(false);
      setSelectedExam(null);
      fetchTraining();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleManageExamQuestions = (examId: number) => {
    navigate(`/exam/${examId}/manage`);
  };

  // Stages handlers
  const handleAddStage = () => {
    setSelectedStage(null);
    setStageForm({
      title: '',
      description: '',
      orderIndex: training?.stages.length || 0,
    });
    setShowStageModal(true);
  };

  const handleSubmitStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/training/${id}/stages`, stageForm);
      setShowStageModal(false);
      setSelectedStage(null);
      fetchTraining();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteStage = async (stageId: number) => {
    if (!confirm('Bosqichni o\'chirishni tasdiqlaysizmi? Barcha qadamlar va materiallar ham o\'chiriladi.')) return;
    try {
      await apiClient.delete(`/training/${id}/stages/${stageId}`);
      fetchTraining();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  // Steps handlers
  const handleAddStep = (stageId: number) => {
    const stage = training?.stages.find(s => s.id === stageId);
    setSelectedStep({ stageId, step: null });
    setStepForm({
      title: '',
      description: '',
      orderIndex: stage?.steps.length || 0,
    });
    setShowStepModal(true);
  };

  const handleEditStep = (stageId: number, step: Step) => {
    setSelectedStep({ stageId, step });
    setStepForm({
      title: step.title,
      description: step.description || '',
      orderIndex: step.orderIndex,
    });
    setShowStepModal(true);
  };

  const handleSubmitStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStep) return;
    try {
      if (selectedStep.step) {
        await apiClient.put(
          `/training/${id}/stages/${selectedStep.stageId}/steps/${selectedStep.step.id}`,
          stepForm
        );
      } else {
        await apiClient.post(`/training/${id}/stages/${selectedStep.stageId}/steps`, stepForm);
      }
      setShowStepModal(false);
      setSelectedStep(null);
      fetchTraining();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteStep = async (stageId: number, stepId: number) => {
    if (!confirm('Qadamni o\'chirishni tasdiqlaysizmi? Barcha materiallar ham o\'chiriladi.')) return;
    try {
      await apiClient.delete(`/training/${id}/stages/${stageId}/steps/${stepId}`);
      fetchTraining();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };


  // Material handlers for steps
  const [materialContext, setMaterialContext] = useState<{ stageId?: number; stepId?: number } | null>(null);

  const handleAddMaterialToStep = (stageId: number, stepId: number) => {
    const step = training?.stages.find(s => s.id === stageId)?.steps.find(st => st.id === stepId);
    setSelectedMaterial(null);
    setMaterialContext({ stageId, stepId });
    setMaterialForm({
      title: '',
      content: '',
      type: 'TEXT',
      fileUrl: '',
      orderIndex: step?.materials.length || 0,
      durationMin: undefined,
    });
    setShowMaterialModal(true);
  };

  const handleSubmitMaterialForStep = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (materialContext?.stageId && materialContext?.stepId) {
      // Submit to step
      try {
        // Validation: IMAGE, AUDIO, VIDEO uchun fileUrl required
        if ((materialForm.type === 'IMAGE' || materialForm.type === 'AUDIO' || materialForm.type === 'VIDEO') && !materialForm.fileUrl) {
          alert('Fayl URL kiritilishi shart');
          return;
        }

        // Agar file tanlangan va yuklanmagan bo'lsa, avval yuklash
        if (selectedFile && (materialForm.type === 'IMAGE' || materialForm.type === 'VIDEO' || materialForm.type === 'AUDIO')) {
          try {
            await handleFileUpload(selectedFile, materialForm.type);
          } catch (error) {
            return; // Xatolik bo'lsa, to'xtatish
          }
        }

        const payload: any = { ...materialForm };
        // TEXT type uchun fileUrl ni o'chirish
        if (materialForm.type === 'TEXT') {
          delete payload.fileUrl;
        }
        // IMAGE type uchun durationMin ni o'chirish
        if (materialForm.type === 'IMAGE') {
          delete payload.durationMin;
        }

        console.log('Submitting material payload:', payload);

        if (selectedMaterial) {
          await apiClient.put(
            `/training/${id}/materials/${selectedMaterial.id}`,
            payload
          );
        } else {
          await apiClient.post(
            `/training/${id}/stages/${materialContext.stageId}/steps/${materialContext.stepId}/materials`,
            payload
          );
        }
        setShowMaterialModal(false);
        setSelectedMaterial(null);
        setMaterialContext(null);
        setSelectedFile(null);
        fetchTraining();
      } catch (error: any) {
        console.error('Error submitting material:', error);
        let errorMessage = 'Xatolik yuz berdi';
        
        if (error.response?.data) {
          const errorData = error.response.data;
          
          // Agar details array bo'lsa
          if (Array.isArray(errorData.details)) {
            errorMessage = errorData.details
              .map((e: any) => {
                const path = Array.isArray(e.path) ? e.path.join('.') : e.path || '';
                return path ? `${path}: ${e.message || e}` : (e.message || e);
              })
              .join('\n');
          } 
          // Agar details string bo'lsa
          else if (typeof errorData.details === 'string') {
            errorMessage = errorData.details;
          }
          // Agar error bor bo'lsa
          else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' 
              ? errorData.error 
              : JSON.stringify(errorData.error);
          }
        }
        
        alert(errorMessage);
      }
    } else {
      // Old material submission (backward compatibility)
      handleSubmitMaterial(e);
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
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/training/manage')}
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Orqaga
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{training.title}</h1>
        {training.description && (
          <p className="text-gray-600 mt-2">{training.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('stages')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'stages'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Bosqichlar ({training.stages?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'materials'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Materiallar ({training.materials.length})
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'exams'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Imtihonlar ({training.exams.length})
          </button>
        </div>
      </div>

      {/* Stages Tab */}
      {activeTab === 'stages' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Bosqichlar</h2>
            <button
              onClick={handleAddStage}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Bosqich qo'shish
            </button>
          </div>

          <div className="space-y-4">
            {!training.stages || training.stages.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Hozircha bosqichlar mavjud emas</p>
              </div>
            ) : (
              training.stages.map((stage) => {
                // Barcha materiallarni to'plash (steps va stage materiallari)
                const allMaterials: Material[] = [];
                stage.steps.forEach(step => {
                  allMaterials.push(...step.materials);
                });
                
                return (
                  <div key={stage.id} className="bg-white rounded-lg shadow overflow-hidden">
                    <div 
                      className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => navigate(`/training/${id}/stage/${stage.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">📖</span>
                            <h3 className="text-lg font-semibold">{stage.title}</h3>
                          </div>
                          {stage.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{stage.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            #{stage.orderIndex} | {allMaterials.length} ta material
                          </p>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/training/${id}/stage/${stage.id}/edit`);
                            }}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                          >
                            Tahrirlash
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStage(stage.id);
                            }}
                            className="px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm"
                          >
                            O'chirish
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Materiallar</h2>
            <button
              onClick={handleAddMaterial}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Material qo'shish
            </button>
          </div>

          <div className="space-y-4">
            {training.materials.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Hozircha materiallar mavjud emas</p>
              </div>
            ) : (
              training.materials.map((material) => (
                <div
                  key={material.id}
                  className="bg-white rounded-lg shadow p-6 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {material.type === 'TEXT' && '📄'}
                        {material.type === 'AUDIO' && '🎵'}
                        {material.type === 'VIDEO' && '🎥'}
                      </span>
                      <h3 className="font-semibold">{material.title}</h3>
                      <span className="text-sm text-gray-500">
                        #{material.orderIndex}
                      </span>
                    </div>
                    {material.durationMin && (
                      <p className="text-sm text-gray-500">
                        Davomiyligi: {material.durationMin} daqiqa
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditMaterial(material)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    >
                      Tahrirlash
                    </button>
                    <button
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm"
                    >
                      O'chirish
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Exams Tab */}
      {activeTab === 'exams' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Imtihonlar</h2>
            <button
              onClick={handleAddExam}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Imtihon qo'shish
            </button>
          </div>

          <div className="space-y-4">
            {training.exams.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Hozircha imtihonlar mavjud emas</p>
              </div>
            ) : (
              training.exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{exam.title}</h3>
                      {exam.description && (
                        <p className="text-gray-600 text-sm mt-1">
                          {exam.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        exam.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {exam.active ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Savollar:</span>{' '}
                      <span className="font-medium">{exam._count.questions}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">O'tish balli:</span>{' '}
                      <span className="font-medium">{exam.passingScore}%</span>
                    </div>
                    {exam.timeLimitMin && (
                      <div>
                        <span className="text-gray-600">Vaqt:</span>{' '}
                        <span className="font-medium">{exam.timeLimitMin} daqiqa</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleManageExamQuestions(exam.id)}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm"
                    >
                      Savollar
                    </button>
                    <button
                      onClick={() => handleEditExam(exam)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    >
                      Tahrirlash
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stage Modal - Full Screen Editor */}
      {showStageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-7xl mx-4 my-8 min-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="border-b p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {selectedStage ? 'Bosqichni Tahrirlash' : 'Yangi Bosqich - Maqola Tahrirlash'}
              </h2>
              <button
                onClick={() => {
                  setShowStageModal(false);
                  setSelectedStage(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Editor Content */}
            <form onSubmit={handleSubmitStage} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Sarlavha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sarlavha * (masalan: "1. KOMPANIYA BILAN TANISHUV")
                  </label>
                  <input
                    type="text"
                    required
                    value={stageForm.title}
                    onChange={(e) =>
                      setStageForm({ ...stageForm, title: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
                    placeholder="1. KOMPANIYA BILAN TANISHUV"
                  />
                </div>

                {/* Tavsif - Rich Text Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maqola Kontenti
                  </label>
                  
                  {/* Formatlash Tugmalari */}
                  <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const selectedText = textarea.value.substring(start, end);
                          const newText = textarea.value.substring(0, start) + 
                            `**${selectedText || 'qalin matn'}**` + 
                            textarea.value.substring(end);
                          setStageForm({ ...stageForm, description: newText });
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + 2, start + 2 + (selectedText || 'qalin matn').length);
                          }, 0);
                        }
                      }}
                      className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
                      title="Qalin matn"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const selectedText = textarea.value.substring(start, end);
                          const newText = textarea.value.substring(0, start) + 
                            `*${selectedText || 'kursiv matn'}*` + 
                            textarea.value.substring(end);
                          setStageForm({ ...stageForm, description: newText });
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + 1, start + 1 + (selectedText || 'kursiv matn').length);
                          }, 0);
                        }
                      }}
                      className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm italic"
                      title="Kursiv"
                    >
                      <em>I</em>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const newText = textarea.value.substring(0, start) + 
                            '\n## ' + 
                            textarea.value.substring(start);
                          setStageForm({ ...stageForm, description: newText });
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + 4, start + 4);
                          }, 0);
                        }
                      }}
                      className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                      title="Sarlavha"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const selectedText = textarea.value.substring(start, end);
                          const newText = textarea.value.substring(0, start) + 
                            `[${selectedText || 'link matni'}](url)` + 
                            textarea.value.substring(end);
                          setStageForm({ ...stageForm, description: newText });
                          setTimeout(() => {
                            textarea.focus();
                            const linkStart = start + 1;
                            const linkEnd = linkStart + (selectedText || 'link matni').length;
                            textarea.setSelectionRange(linkStart, linkEnd);
                          }, 0);
                        }
                      }}
                      className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                      title="Link"
                    >
                      🔗
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const newText = textarea.value.substring(0, start) + 
                            '\n- ' + 
                            textarea.value.substring(start);
                          setStageForm({ ...stageForm, description: newText });
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + 3, start + 3);
                          }, 0);
                        }
                      }}
                      className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                      title="Ro'yxat"
                    >
                      •
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const newText = textarea.value.substring(0, start) + 
                            '\n```\nKod bloki\n```\n' + 
                            textarea.value.substring(start);
                          setStageForm({ ...stageForm, description: newText });
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + 6, start + 13);
                          }, 0);
                        }
                      }}
                      className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                      title="Kod bloki"
                    >
                      {'</>'}
                    </button>
                    <div className="border-l border-gray-300 mx-2"></div>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt('Rasm URL manzilini kiriting:');
                        if (url) {
                          const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const newText = textarea.value.substring(0, start) + 
                              `\n![Rasm tavsifi](${url})\n` + 
                              textarea.value.substring(start);
                            setStageForm({ ...stageForm, description: newText });
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 2, start + 15);
                            }, 0);
                          }
                        }
                      }}
                      className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                      title="Rasm qo'shish"
                    >
                      🖼️
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt('Video URL manzilini kiriting:');
                        if (url) {
                          const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const newText = textarea.value.substring(0, start) + 
                              `\n[Video: ${url}]\n` + 
                              textarea.value.substring(start);
                            setStageForm({ ...stageForm, description: newText });
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 2, start + 7);
                            }, 0);
                          }
                        }
                      }}
                      className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                      title="Video qo'shish"
                    >
                      🎥
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt('Audio URL manzilini kiriting:');
                        if (url) {
                          const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const newText = textarea.value.substring(0, start) + 
                              `\n[Audio: ${url}]\n` + 
                              textarea.value.substring(start);
                            setStageForm({ ...stageForm, description: newText });
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 2, start + 7);
                            }, 0);
                          }
                        }
                      }}
                      className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                      title="Audio qo'shish"
                    >
                      🎵
                    </button>
                  </div>

                  {/* Textarea */}
                  <textarea
                    id="description-textarea"
                    value={stageForm.description}
                    onChange={(e) =>
                      setStageForm({ ...stageForm, description: e.target.value })
                    }
                    className="w-full px-4 py-3 border-x border-b border-gray-300 rounded-b-lg min-h-[400px] font-mono text-sm"
                    placeholder="Maqola kontentini kiriting...&#10;&#10;Formatlash uchun yuqoridagi tugmalardan foydalaning.&#10;Markdown formatida yozishingiz mumkin."
                  />
                  
                  {/* Preview (optional) */}
                  {stageForm.description && (
                    <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Ko'rinish:</h4>
                      <div className="prose max-w-none text-sm whitespace-pre-wrap">
                        {stageForm.description.split('\n').map((line, i) => {
                          // Oddiy markdown parsing
                          if (line.startsWith('## ')) {
                            return <h2 key={i} className="text-xl font-bold mt-4 mb-2">{line.substring(3)}</h2>;
                          }
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return <p key={i}><strong>{line.substring(2, line.length - 2)}</strong></p>;
                          }
                          if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
                            return <p key={i}><em>{line.substring(1, line.length - 1)}</em></p>;
                          }
                          if (line.startsWith('- ')) {
                            return <li key={i} className="ml-4">{line.substring(2)}</li>;
                          }
                          if (line.startsWith('![')) {
                            const match = line.match(/!\[([^\]]+)\]\(([^)]+)\)/);
                            if (match) {
                              return <img key={i} src={match[2]} alt={match[1]} className="max-w-full rounded my-2" />;
                            }
                          }
                          if (line.trim()) {
                            return <p key={i} className="mb-2">{line}</p>;
                          }
                          return <br key={i} />;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tartib raqami */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tartib raqami
                  </label>
                  <input
                    type="number"
                    value={stageForm.orderIndex}
                    onChange={(e) =>
                      setStageForm({
                        ...stageForm,
                        orderIndex: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t p-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowStageModal(false);
                    setSelectedStage(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step Modal */}
      {showStepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {selectedStep?.step ? 'Qadamni Tahrirlash' : 'Yangi Qadam'}
            </h2>
            <form onSubmit={handleSubmitStep}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sarlavha * (masalan: "1. KOMPANIYA HAQIDA QISQACHA")
                  </label>
                  <input
                    type="text"
                    required
                    value={stepForm.title}
                    onChange={(e) =>
                      setStepForm({ ...stepForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="1. KOMPANIYA HAQIDA QISQACHA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tavsif
                  </label>
                  <textarea
                    value={stepForm.description}
                    onChange={(e) =>
                      setStepForm({ ...stepForm, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tartib raqami
                  </label>
                  <input
                    type="number"
                    value={stepForm.orderIndex}
                    onChange={(e) =>
                      setStepForm({
                        ...stepForm,
                        orderIndex: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStepModal(false);
                    setSelectedStep(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {selectedMaterial ? 'Materialni Tahrirlash' : 'Yangi Material'}
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (materialContext?.stageId && materialContext?.stepId) {
                handleSubmitMaterialForStep(e);
              } else {
                handleSubmitMaterial(e);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sarlavha *
                  </label>
                  <input
                    type="text"
                    required
                    value={materialForm.title}
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Turi *
                  </label>
                  <select
                    value={materialForm.type}
                    onChange={(e) =>
                      setMaterialForm({
                        ...materialForm,
                        type: e.target.value as 'TEXT' | 'AUDIO' | 'VIDEO',
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="TEXT">Matn</option>
                    <option value="AUDIO">Audio</option>
                    <option value="VIDEO">Video</option>
                    <option value="IMAGE">Rasm</option>
                  </select>
                </div>
                {materialForm.type === 'TEXT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kontent
                    </label>
                    <textarea
                      value={materialForm.content}
                      onChange={(e) =>
                        setMaterialForm({
                          ...materialForm,
                          content: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={10}
                    />
                  </div>
                )}
                {(materialForm.type === 'AUDIO' || materialForm.type === 'VIDEO' || materialForm.type === 'IMAGE') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fayl yuklash yoki URL kiritish *
                      </label>
                      
                      {/* File Upload */}
                      <div className="mb-3">
                        <label className="block text-sm text-gray-600 mb-2">
                          Serverga yuklash:
                        </label>
                        <input
                          type="file"
                          accept={
                            materialForm.type === 'IMAGE'
                              ? 'image/jpeg,image/jpg,image/png,image/gif,image/webp'
                              : materialForm.type === 'VIDEO'
                              ? 'video/mp4,video/mpeg,video/quicktime,video/webm'
                              : 'audio/mpeg,audio/mp3,audio/wav,audio/ogg'
                          }
                          onChange={handleFileChange}
                          disabled={uploadingFile}
                          className="w-full px-3 py-2 border rounded-lg cursor-pointer disabled:opacity-50"
                        />
                        {uploadingFile && (
                          <p className="text-sm text-blue-600 mt-1">Yuklanmoqda...</p>
                        )}
                        {selectedFile && !uploadingFile && (
                          <p className="text-sm text-green-600 mt-1">
                            ✓ {selectedFile.name} tanlandi
                          </p>
                        )}
                        {materialForm.fileUrl && materialForm.fileUrl.startsWith('http') && (
                          <p className="text-sm text-green-600 mt-1">
                            ✓ Fayl muvaffaqiyatli yuklandi
                          </p>
                        )}
                      </div>

                      {/* URL Input */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-2">
                          Yoki URL kiritish:
                        </label>
                        <input
                          type="url"
                          value={materialForm.fileUrl}
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              fileUrl: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder={
                            materialForm.type === 'IMAGE'
                              ? 'https://drive.google.com/file/d/... yoki https://example.com/image.jpg'
                              : materialForm.type === 'VIDEO'
                              ? 'https://example.com/file.mp4'
                              : 'https://example.com/file.mp3'
                          }
                        />
                        {materialForm.type === 'IMAGE' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Google Drive linklari avtomatik to'g'ri formatga o'tkaziladi. Fayl "Anyone with the link" rejimida bo'lishi kerak.
                          </p>
                        )}
                      </div>
                    </div>
                    {(materialForm.type === 'AUDIO' || materialForm.type === 'VIDEO') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Davomiyligi (daqiqa)
                        </label>
                        <input
                          type="number"
                          value={materialForm.durationMin || ''}
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              durationMin: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tartib raqami
                  </label>
                  <input
                    type="number"
                    value={materialForm.orderIndex}
                    onChange={(e) =>
                      setMaterialForm({
                        ...materialForm,
                        orderIndex: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMaterialModal(false);
                    setSelectedMaterial(null);
                    setMaterialContext(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exam Modal */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {selectedExam ? 'Imtihonni Tahrirlash' : 'Yangi Imtihon'}
            </h2>
            <form onSubmit={handleSubmitExam}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sarlavha *
                  </label>
                  <input
                    type="text"
                    required
                    value={examForm.title}
                    onChange={(e) =>
                      setExamForm({ ...examForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tavsif
                  </label>
                  <textarea
                    value={examForm.description}
                    onChange={(e) =>
                      setExamForm({ ...examForm, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    O'tish balli (foiz) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={examForm.passingScore}
                    onChange={(e) =>
                      setExamForm({
                        ...examForm,
                        passingScore: parseInt(e.target.value) || 70,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vaqt cheklovi (daqiqa)
                  </label>
                  <input
                    type="number"
                    value={examForm.timeLimitMin || ''}
                    onChange={(e) =>
                      setExamForm({
                        ...examForm,
                        timeLimitMin: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExamModal(false);
                    setSelectedExam(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

