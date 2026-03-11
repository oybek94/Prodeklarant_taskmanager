import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';

interface Question {
  id: number;
  question: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT';
  options: string[];
  points: number;
  orderIndex: number;
}

interface Exam {
  id: number;
  title: string;
  description?: string;
  passingScore: number;
  timeLimitMin?: number;
}

export default function Exam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [maxScore, setMaxScore] = useState(0);

  useEffect(() => {
    if (id) {
      startExam();
    }
  }, [id]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);

      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft]);

  const startExam = async () => {
    try {
      const response = await apiClient.post(`/exams/${id}/start`);
      setExam(response.data.exam);
      setQuestions(response.data.questions);
      setMaxScore(response.data.maxScore);

      if (response.data.exam.timeLimitMin) {
        setTimeLeft(response.data.exam.timeLimitMin * 60);
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        alert(error.response.data.error);
        navigate('/training');
      }
      console.error('Error starting exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
      questionId: parseInt(questionId),
      answer,
    }));

    if (answersArray.length < questions.length) {
      const confirmed = window.confirm(
        `Siz ${answersArray.length} ta savolga javob berdingiz. ${questions.length} ta savol bor. Baribir topshirasizmi?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);

    try {
      // Always use /submit for exact answer matching (SINGLE_CHOICE questions)
      const response = await apiClient.post(`/exams/${id}/submit`, {
        answers: answersArray,
      });

      navigate(`/exam/${id}/result`, {
        state: {
          result: response.data,
        },
      });
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert('Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold">Imtihon tayyorlanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Icon icon="lucide:alert-circle" className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-bold text-slate-900 dark:text-white">Imtihon topilmadi</p>
          <button onClick={() => navigate('/training')} className="mt-4 text-indigo-600 font-bold">Kursga qaytish</button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Sidebar - Question Navigation - Hidden on mobile */}
      <aside className="hidden lg:flex lg:w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-20">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Savollar Navigatsiyasi</h2>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`aspect-square rounded-xl flex items-center justify-center font-black text-sm transition-all ${idx === currentQuestionIndex
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 active:scale-90 scale-110'
                  : answers[q.id]
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Maksimal Ball</p>
              <p className="text-2xl font-black text-indigo-900 dark:text-white">
                {questions.reduce((sum, q) => sum + q.points, 0)} <span className="text-sm opacity-50">ball</span>
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Topshirildi:</span>
                <span className="text-sm font-black text-indigo-600">{Object.keys(answers).length} / {questions.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 mt-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100"
          >
            {submitting ? <Icon icon="lucide:loader-2" className="animate-spin" /> : <Icon icon="lucide:check-circle" className="w-5 h-5" />}
            Imtihonni Yakunlash
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Section */}
        <header className="h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Icon icon="lucide:file-question" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{exam.title}</h1>
              <p className="text-xs font-bold text-slate-400">Diqqat bilan javob bering</p>
            </div>
          </div>

          {timeLeft !== null && (
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-2xl tabular-nums transition-colors duration-300 ${timeLeft < 60 ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
              }`}>
              <Icon icon="lucide:timer" className="w-6 h-6" />
              {formatTime(timeLeft)}
            </div>
          )}
        </header>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar">
          <div className="max-w-3xl mx-auto py-10">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">Savol {currentQuestionIndex + 1}</span>
              <span className="text-xs font-bold text-slate-400">• {currentQuestion.points} ball</span>
            </div>

            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-12 tracking-tight leading-tight">
              {currentQuestion.question}
            </h2>

            <div className="space-y-4">
              {currentQuestion.type === 'SINGLE_CHOICE' && (
                currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerChange(currentQuestion.id, option)}
                    className={`w-full text-left p-6 rounded-3xl border-2 transition-all flex items-center gap-4 group ${currentAnswer === option
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black transition-colors ${currentAnswer === option ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
                      }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-lg font-bold">{option}</span>
                  </button>
                ))
              )}

              {currentQuestion.type === 'MULTIPLE_CHOICE' && (
                currentQuestion.options.map((option, idx) => {
                  const selectedAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
                  const isSelected = selectedAnswers.includes(option);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const newAnswers = isSelected
                          ? selectedAnswers.filter((a) => a !== option)
                          : [...selectedAnswers, option];
                        handleAnswerChange(currentQuestion.id, newAnswers);
                      }}
                      className={`w-full text-left p-6 rounded-3xl border-2 transition-all flex items-center gap-4 group ${isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-600/20'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-emerald-400 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
                        }`}>
                        <Icon icon={isSelected ? "lucide:check-square" : "lucide:square"} className="w-5 h-5" />
                      </div>
                      <span className="text-lg font-bold">{option}</span>
                    </button>
                  );
                })
              )}

              {currentQuestion.type === 'TEXT' && (
                <textarea
                  value={currentAnswer || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl p-8 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 min-h-[300px] transition-all"
                  placeholder="Sizning javobingiz..."
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer Navigation Area */}
        <footer className="h-24 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 lg:px-10 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-4 lg:px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs lg:text-sm hover:bg-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icon icon="lucide:chevron-left" className="w-5 h-5" />
            Oldingi Savol
          </button>

          <button
            onClick={currentQuestionIndex === questions.length - 1 ? handleSubmit : handleNext}
            className={`flex items-center gap-2 px-4 lg:px-10 py-4 rounded-2xl font-black text-xs lg:text-sm shadow-xl transition-all active:scale-95 ${currentQuestionIndex === questions.length - 1
              ? 'bg-green-600 text-white shadow-green-600/20 hover:bg-green-700'
              : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700'
              }`}
          >
            {currentQuestionIndex === questions.length - 1 ? (
              <>Topshirish <Icon icon="lucide:send" className="w-5 h-5" /></>
            ) : (
              <>Keyingi Savol <Icon icon="lucide:chevron-right" className="w-5 h-5" /></>
            )}
          </button>
        </footer>
      </main>

      {/* Checking Answers Modal Overlay */}
      {submitting && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-2xl max-w-sm w-full mx-4 text-center flex flex-col items-center">
            <Icon icon="lucide:loader-2" className="w-16 h-16 text-indigo-500 animate-spin mb-6" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Javoblar tekshirilmoqda...</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Iltimos kuting, AI natijalaringizni hisoblamoqda.</p>
          </div>
        </div>
      )}
    </div>
  );
}
