import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../lib/api';
import RichTextEditor from '../components/RichTextEditor';
import { Icon } from '@iconify/react';

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

      const foundStage = response.data.stages?.find((s: Stage) => s.id === parseInt(stageId ?? '0'));
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!stage || !training) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-700 max-w-lg">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-600">
            <Icon icon="lucide:alert-circle" className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Bosqich topilmadi</h2>
          <p className="text-slate-500 mb-8">Ushbu bosqich tizimda mavjud emas yoki o'chirib yuborilgan.</p>
          <Link to={`/training/${trainingId}/manage`} className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all">
            <Icon icon="lucide:arrow-left" className="w-5 h-5" />
            Boshqaruvga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1600px] mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(`/training/${trainingId}/manage`)}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all active:scale-90"
            >
              <Icon icon="lucide:chevron-left" className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                <span>O'qitish</span>
                <Icon icon="lucide:chevron-right" className="w-3 h-3" />
                <span>{training.title}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Bosqichni Tahrirlash</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/training/${trainingId}/manage`)}
              className="px-6 py-3 rounded-2xl font-black text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Icon icon={saving ? "lucide:loader-2" : "lucide:save"} className={`w-5 h-5 ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Saqlanmoqda...' : 'O\'zgarishlarni Saqlash'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General Information Card */}
          <section className="bg-white dark:bg-slate-800 rounded-[40px] p-8 border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Icon icon="lucide:settings-2" className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Asosiy Ma'lumotlar</h2>
                <p className="text-slate-500 text-sm">Bosqich nomi va tartibini belgilang</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Bosqich Sarlavhasi</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  placeholder="Masalan: 1. KOMPANIYA BILAN TANISHUV"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tartib Raqami</label>
                <input
                  type="number"
                  value={form.orderIndex}
                  onChange={(e) => setForm({ ...form, orderIndex: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  placeholder="0"
                />
              </div>
            </div>
          </section>

          {/* Editor Card */}
          <section className="bg-white dark:bg-slate-800 rounded-[40px] p-8 border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none min-h-[600px] flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Icon icon="lucide:layout-template" className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Maqola Kontenti</h2>
                <p className="text-slate-500 text-sm">Rich-text editor yordamida kontentni boyiting</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="prose-container flex-1 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <RichTextEditor
                  content={editorContent}
                  onChange={setEditorContent}
                />
              </div>
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center rounded-lg">
                  <Icon icon="lucide:info" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Editor orqali jadvallar, kod bloklari, rasm va formatlangan matnlar qo'shishingiz mumkin. Barcha o'zgarishlar saqlanganidan so'ng studentlarga ko'rinadi.
                </p>
              </div>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}

