import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';

interface Question {
    id: number;
    question: string;
    type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT';
    options: string[];
    correctAnswer: any;
    points: number;
}

interface QuestionsModalProps {
    stageId: string;
    trainingId: string;
    onClose: () => void;
}

export default function QuestionsModal({ stageId, trainingId, onClose }: QuestionsModalProps) {
    const [examId, setExamId] = useState<number | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formType, setFormType] = useState<'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT'>('SINGLE_CHOICE');
    const [formText, setFormText] = useState('');
    const [formOptions, setFormOptions] = useState<string[]>(['', '']);
    const [formCorrectSingle, setFormCorrectSingle] = useState<string>('');
    const [formCorrectMultiple, setFormCorrectMultiple] = useState<string[]>([]);
    const [formCorrectText, setFormCorrectText] = useState('');
    const [formPoints, setFormPoints] = useState(1);

    useEffect(() => {
        fetchExamAndQuestions();
    }, [stageId]);

    const fetchExamAndQuestions = async () => {
        try {
            setLoading(true);
            // 1. Fetch stage to see if dummy step + exam exists
            const response = await apiClient.get(`/training/${trainingId}`);
            const stage = response.data.stages?.find((s: any) => s.id === parseInt(stageId));
            if (!stage) {
                toast.error('Bosqich topilmadi');
                return;
            }
            let dummyStep = stage.steps.find((s: any) => s.title === '_AI_STAGE_EXAM');
            let currentExamId = null;
            let initResp: any = null;

            if (dummyStep && dummyStep.exams && dummyStep.exams.length > 0) {
                currentExamId = dummyStep.exams[0].id;
                setExamId(currentExamId);
                // Also need questions. We can just call init-manual-exam regardless because it returns exam + questions
            }

            // Just use the init endpoint which handles finding or creating
            initResp = await apiClient.post(`/exams/stage/${stageId}/init-manual-exam`);
            currentExamId = initResp.data.exam.id;
            setExamId(currentExamId);

            // 2. Fetch questions for this exam
            if (currentExamId) {
                // To fetch all questions with correct answers, we use init response which already returns them
                setQuestions(initResp?.data?.questions || []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Savollarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        if (!formText.trim()) return toast.error("Savol matnini kiriting");
        let correct: any;
        if (formType === 'SINGLE_CHOICE') {
            if (!formCorrectSingle) return toast.error("To'g'ri javobni tanlang");
            correct = formCorrectSingle;
        } else if (formType === 'MULTIPLE_CHOICE') {
            if (formCorrectMultiple.length === 0) return toast.error("Kamida bitta to'g'ri javobni tanlang");
            correct = formCorrectMultiple;
        } else {
            if (!formCorrectText.trim()) return toast.error("Javob matnini kiriting");
            correct = formCorrectText;
        }

        // validate options
        const finalOptions = formType !== 'TEXT' ? formOptions.filter(o => o.trim()) : [];
        if (formType !== 'TEXT' && finalOptions.length < 2) {
            return toast.error("Kamida ikkita variant kiriting");
        }

        try {
            if (editingId) {
                await apiClient.put(`/exams/${examId}/questions/${editingId}`, {
                    question: formText,
                    type: formType,
                    options: finalOptions,
                    correctAnswer: correct,
                    points: formPoints
                });
                toast.success("Savol yangilandi");
            } else {
                await apiClient.post(`/exams/${examId}/questions`, {
                    question: formText,
                    type: formType,
                    options: finalOptions,
                    correctAnswer: correct,
                    points: formPoints,
                    orderIndex: questions.length
                });
                toast.success("Savol qo'shildi");
            }
            setIsFormOpen(false);
            resetForm();
            fetchExamAndQuestions();
        } catch (err) {
            console.error(err);
            toast.error("Xatolik yuz berdi");
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormText('');
        setFormType('SINGLE_CHOICE');
        setFormOptions(['', '']);
        setFormCorrectSingle('');
        setFormCorrectMultiple([]);
        setFormCorrectText('');
        setFormPoints(1);
    };

    const openEdit = (q: Question) => {
        setEditingId(q.id);
        setFormText(q.question);
        setFormType(q.type);
        setFormOptions(q.options && q.options.length > 0 ? q.options : ['', '']);
        setFormPoints(q.points || 1);
        if (q.type === 'SINGLE_CHOICE') setFormCorrectSingle(q.correctAnswer);
        else if (q.type === 'MULTIPLE_CHOICE') setFormCorrectMultiple(q.correctAnswer || []);
        else setFormCorrectText(q.correctAnswer);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Haqiqatan ham ushbu savolni o'chirmoqchimisiz?")) return;
        try {
            await apiClient.delete(`/exams/${examId}/questions/${id}`);
            setQuestions(prev => prev.filter(q => q.id !== id));
            toast.success("O'chirildi");
        } catch (err) {
            console.error(err);
            toast.error("Xatolik");
        }
    };

    const handleOptionChange = (idx: number, val: string) => {
        const newOps = [...formOptions];
        newOps[idx] = val;
        setFormOptions(newOps);

        // Agar option o'zgartirilsa va u to'g'ri javoblar ro'yxatida bo'lsa, o'zgartirmaymiz yoki update qilamiz
        // Lekin buni sodda qilish uchun indextan foydalanish yaxshi. Biz value saqlaymiz.
        // Hozir value saqlangan, foydalanuvchi keyin belgilaydi deb faraz qilamiz.
    };

    const toggleMultipleCorrect = (op: string) => {
        setFormCorrectMultiple(prev => prev.includes(op) ? prev.filter(p => p !== op) : [...prev, op]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Icon icon="lucide:database" className="text-indigo-600" />
                        Imtihon Savollari Bazasi
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <Icon icon="lucide:x" className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center py-12"><Icon icon="lucide:loader-2" className="w-8 h-8 animate-spin text-indigo-600" /></div>
                    ) : (
                        <div>
                            {!isFormOpen ? (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <p className="text-slate-500 font-medium">Jami {questions.length} ta savol</p>
                                        <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700">
                                            <Icon icon="lucide:plus" /> Savol qo'shish
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {questions.map((q, i) => (
                                            <div key={q.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl relative group">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <span className="text-xs font-black uppercase text-indigo-500 mb-2 block">{i + 1}. {q.type}</span>
                                                        <h3 className="font-bold text-lg dark:text-white">{q.question}</h3>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => openEdit(q)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700">
                                                            <Icon icon="lucide:edit-3" />
                                                        </button>
                                                        <button onClick={() => handleDelete(q.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-slate-700">
                                                            <Icon icon="lucide:trash-2" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {questions.length === 0 && (
                                            <div className="py-12 text-center text-slate-400 font-medium">
                                                Hozircha hech qanday savol qo'shilmagan.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-xl font-bold mb-6 dark:text-white">{editingId ? 'Savolni tahrirlash' : 'Yangi savol'}</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Savol turi</label>
                                            <select value={formType} onChange={(e: any) => setFormType(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                                <option value="SINGLE_CHOICE">Bitta to'g'ri javobli (Test)</option>
                                                <option value="MULTIPLE_CHOICE">Bir nechta to'g'ri javobli</option>
                                                <option value="TEXT">Ochiq savol (Matnli)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Savol matni</label>
                                            <textarea value={formText} onChange={e => setFormText(e.target.value)} rows={3} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" placeholder="Savolni kiriting..." />
                                        </div>

                                        {formType !== 'TEXT' && (
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Variantlar</label>
                                                <div className="space-y-2">
                                                    {formOptions.map((opt, vIdx) => (
                                                        <div key={vIdx} className="flex gap-2 items-center">
                                                            {formType === 'SINGLE_CHOICE' ? (
                                                                <input type="radio" name="opt_correct" checked={!!opt && formCorrectSingle === opt} onChange={() => setFormCorrectSingle(opt)} className="w-5 h-5 text-indigo-600" />
                                                            ) : (
                                                                <input type="checkbox" checked={!!opt && formCorrectMultiple.includes(opt)} onChange={() => toggleMultipleCorrect(opt)} className="w-5 h-5 rounded text-indigo-600" />
                                                            )}
                                                            <input type="text" value={opt} onChange={e => handleOptionChange(vIdx, e.target.value)} className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" placeholder={`${vIdx + 1}-variant`} />
                                                            <button onClick={() => setFormOptions(prev => prev.filter((_, i) => i !== vIdx))} className="p-3 text-red-500 hover:bg-red-50 rounded-xl" disabled={formOptions.length <= 2}>
                                                                <Icon icon="lucide:minus" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button onClick={() => setFormOptions(prev => [...prev, ''])} className="mt-3 text-sm text-indigo-600 font-bold flex items-center gap-1 hover:underline">
                                                    <Icon icon="lucide:plus" /> Variant qo'shish
                                                </button>
                                            </div>
                                        )}

                                        {formType === 'TEXT' && (
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">To'g'ri javob kutilmasi (Kalit so'zlar)</label>
                                                <textarea value={formCorrectText} onChange={e => setFormCorrectText(e.target.value)} rows={2} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ball</label>
                                            <input type="number" value={formPoints} onChange={e => setFormPoints(Number(e.target.value))} min={1} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                                        </div>

                                        <div className="pt-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                                            <button onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Bekor qilish</button>
                                            <button onClick={handleCreateOrUpdate} className="px-5 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">Saqlash</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
