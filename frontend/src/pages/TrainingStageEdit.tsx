import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import RichTextEditor from '../components/RichTextEditor';

interface Material {
  id: number;
  title: string;
  content?: string;
  type: 'TEXT' | 'AUDIO' | 'VIDEO' | 'IMAGE';
  fileUrl?: string;
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

interface Training {
  id: number;
  title: string;
}

export default function TrainingStageEdit() {
  const { trainingId, stageId } = useParams<{ trainingId: string; stageId: string }>();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage | null>(null);
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    orderIndex: 0,
  });

  useEffect(() => {
    if (trainingId && stageId) {
      fetchData();
    }
  }, [trainingId, stageId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/training/${trainingId}`);
      setTraining(response.data);
      
      const foundStage = response.data.stages?.find((s: Stage) => s.id === parseInt(stageId));
      if (foundStage) {
        setStage(foundStage);
        setForm({
          title: foundStage.title || '',
          description: foundStage.description || '',
          orderIndex: foundStage.orderIndex || 0,
        });
        setEditorContent(foundStage.description || '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiClient.put(`/training/${trainingId}/stages/${stageId}`, {
        ...form,
        description: editorContent,
      });
      alert('Maqola muvaffaqiyatli saqlandi!');
      navigate(`/training/${trainingId}/manage`);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b fixed top-0 left-0 right-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(`/training/${trainingId}/manage`)}
              className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← Orqaga
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Maqola Tahrirlash
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {training.title} - {stage.title}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/training/${trainingId}/manage`)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-7xl mx-auto px-6 py-8 pt-32">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sarlavha *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
              placeholder="Masalan: 1. KOMPANIYA BILAN TANISHUV"
            />
          </div>

          {/* Rich Text Editor */}
          <div>
            <RichTextEditor
              content={editorContent}
              onChange={setEditorContent}
            />
          </div>

          {/* Order Index */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tartib raqami
            </label>
            <input
              type="number"
              value={form.orderIndex}
              onChange={(e) =>
                setForm({
                  ...form,
                  orderIndex: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

