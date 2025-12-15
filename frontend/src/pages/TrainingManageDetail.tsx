import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';

interface Material {
  id: number;
  title: string;
  content?: string;
  type: 'TEXT' | 'AUDIO' | 'VIDEO';
  fileUrl?: string;
  orderIndex: number;
  durationMin?: number;
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
  materials: Material[];
  exams: Exam[];
}

export default function TrainingManageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'exams'>('materials');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [materialForm, setMaterialForm] = useState({
    title: '',
    content: '',
    type: 'TEXT' as 'TEXT' | 'AUDIO' | 'VIDEO',
    fileUrl: '',
    orderIndex: 0,
    durationMin: undefined as number | undefined,
  });
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    passingScore: 70,
    timeLimitMin: undefined as number | undefined,
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
    setShowMaterialModal(true);
  };

  const handleSubmitMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
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
      fetchTraining();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
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

      {/* Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {selectedMaterial ? 'Materialni Tahrirlash' : 'Yangi Material'}
            </h2>
            <form onSubmit={handleSubmitMaterial}>
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
                {(materialForm.type === 'AUDIO' || materialForm.type === 'VIDEO') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fayl URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={materialForm.fileUrl}
                        onChange={(e) =>
                          setMaterialForm({
                            ...materialForm,
                            fileUrl: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="https://example.com/file.mp4"
                      />
                    </div>
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

