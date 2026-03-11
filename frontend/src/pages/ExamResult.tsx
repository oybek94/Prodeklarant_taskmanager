import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';

interface ExamResultData {
  attempt: {
    id: number;
    score: number;
    maxScore: number;
    passed: boolean;
    completedAt: string;
    answers: Array<{
      id: number;
      answer: any;
      isCorrect: boolean;
      points: number;
      question: {
        id: number;
        question: string;
        type: string;
        options: string[];
        correctAnswer?: any;
        points: number;
      };
    }>;
  };
  score: number;
  maxScore: number;
  scorePercent: number;
  passed: boolean;
  passingScore: number;
  evaluation?: string; // AI feedback
}

export default function ExamResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<ExamResultData | null>(
    location.state?.result || null
  );
  const [loading, setLoading] = useState(!result);

  useEffect(() => {
    if (!result && id) {
      fetchResult();
    }
  }, [id, result]);

  const fetchResult = async () => {
    try {
      const response = await apiClient.get(`/exams/${id}/results`);
      if (response.data && response.data.attempts && response.data.attempts.length > 0) {
        const latestAttempt = response.data.attempts[0];
        const scorePercent = latestAttempt.maxScore > 0
          ? Math.round((latestAttempt.score / latestAttempt.maxScore) * 100)
          : 0;

        setResult({
          attempt: latestAttempt,
          score: latestAttempt.score,
          maxScore: latestAttempt.maxScore,
          scorePercent,
          passed: latestAttempt.passed,
          passingScore: response.data.exam?.passingScore || 70,
        });
      }
    } catch (error) {
      console.error('Error fetching exam result:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold">Natijalar hisoblanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-700 max-w-lg">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-600">
            <Icon icon="lucide:alert-circle" className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Natija topilmadi</h2>
          <p className="text-slate-500 mb-8">Ushbu imtihon uchun hali natija qayd etilmagan.</p>
          <Link to="/training" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all">
            <Icon icon="lucide:arrow-left" className="w-5 h-5" />
            O'qitish sahifasiga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-y-auto">
      {/* Hero Result Section */}
      <section className={`relative pt-24 pb-32 overflow-hidden transition-colors ${result.passed ? 'bg-emerald-600' : 'bg-slate-900'
        }`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 lg:px-6 relative z-10 text-center">
          <div className={`w-28 h-28 mx-auto mb-8 rounded-[40px] flex items-center justify-center shadow-2xl border-4 border-white/20 backdrop-blur-xl ${result.passed ? 'bg-white/20' : 'bg-red-500/20'
            }`}>
            <Icon
              icon={result.passed ? "lucide:award" : "lucide:frown"}
              className={`w-14 h-14 text-white ${result.passed ? 'animate-bounce' : ''}`}
            />
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
            {result.passed ? "Tabriklaymiz!" : "Hali imkoniyat bor"}
          </h1>
          <p className="text-xl text-white/80 font-medium mb-12">
            {result.passed
              ? "Siz imtihonni muvaffaqiyatli topshirdingiz va keyingi bosqichga o'tdingiz."
              : "Imtihondan o'tish uchun ball yetarli bo'lmadi. Xatolarni ko'rib chiqing va yana urinib ko'ring."}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Olingan Ball", value: result.score, icon: "lucide:star", color: "bg-white/10" },
              { label: "Maksimal Ball", value: result.maxScore, icon: "lucide:target", color: "bg-white/10" },
              { label: "Natija", value: `${result.scorePercent}%`, icon: "lucide:percent", color: "bg-white/20" },
              { label: "O'tish Balli", value: `${result.passingScore}%`, icon: "lucide:shield-check", color: "bg-white/10" },
            ].map((stat, i) => (
              <div key={i} className={`${stat.color} backdrop-blur-md rounded-3xl p-6 border border-white/10`}>
                <Icon icon={stat.icon} className="w-6 h-6 text-white/60 mx-auto mb-2" />
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <main className="max-w-4xl mx-auto px-4 lg:px-6 -mt-16 relative z-20">

        {/* AI Evaluation / Feedback Card */}
        {result.evaluation && (
          <div className="bg-indigo-600 rounded-[40px] p-10 mb-12 shadow-2xl shadow-indigo-600/30 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 transform translate-x-1/4 -translate-y-1/4 opacity-10">
              <Icon icon="lucide:brain-circuit" className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon icon="lucide:sparkles" className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">AI Baholash va Tavsiyalar</h2>
              </div>
              <div className="prose prose-invert max-w-none text-indigo-50 font-medium leading-relaxed">
                {typeof result.evaluation === 'string' ? (
                  result.evaluation.split('\n').map((line, i) => (
                    <p key={i} className="mb-4">{line}</p>
                  ))
                ) : (
                  <div className="space-y-6">
                    {/* Yutuqlar */}
                    {(result.evaluation as any).strengths && (result.evaluation as any).strengths.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-emerald-300 mb-2 flex items-center gap-2">
                          <Icon icon="lucide:check-circle" /> Yutuqlar:
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm md:text-base">
                          {(result.evaluation as any).strengths.map((str: string, i: number) => <li key={i}>{str}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Kamchiliklar */}
                    {(result.evaluation as any).weaknesses && (result.evaluation as any).weaknesses.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-red-300 mb-2 flex items-center gap-2">
                          <Icon icon="lucide:alert-circle" /> Kamchiliklar:
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm md:text-base">
                          {(result.evaluation as any).weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Tavsiyalar */}
                    {(result.evaluation as any).recommendation && (
                      <div>
                        <h3 className="text-lg font-bold text-yellow-300 mb-2 flex items-center gap-2">
                          <Icon icon="lucide:lightbulb" /> Tavsiya:
                        </h3>
                        <p className="text-sm md:text-base pl-2 border-l-2 border-yellow-300/30">
                          {(result.evaluation as any).recommendation}
                        </p>
                      </div>
                    )}

                    {/* Takrorlanishi kerak bo'lganlar */}
                    {(result.evaluation as any).suggested_review && (result.evaluation as any).suggested_review.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-indigo-300 mb-2 flex items-center gap-2">
                          <Icon icon="lucide:book-open" /> Qayta ko'rib chiqish tavsiya etiladi:
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm md:text-base">
                          {(result.evaluation as any).suggested_review.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
          {!result.passed ? (
            <button
              onClick={() => navigate(`/exam/${id}`)}
              className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3"
            >
              <Icon icon="lucide:refresh-ccw" className="w-6 h-6" />
              Qayta Topshirish
            </button>
          ) : (
            <button
              onClick={() => navigate('/training')} // To'g'ridan to'g'ri training ro'yxatiga qaytarsak, ochilgan yangi bosqichni o'sha yerdan tanlashi mumkin
              className="w-full sm:w-auto px-10 py-5 bg-emerald-600 text-white rounded-[24px] font-black shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3"
            >
              <Icon icon="lucide:arrow-right" className="w-6 h-6" />
              Keyingi Bosqich
            </button>
          )}
          <button
            onClick={() => navigate('/training')}
            className="w-full sm:w-auto px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-black shadow-xl hover:bg-slate-800 dark:hover:bg-slate-100 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3"
          >
            <Icon icon="lucide:layout-grid" className="w-6 h-6" />
            Kurslar Ro'yxati
          </button>
        </div>
      </main>
    </div >
  );
}

