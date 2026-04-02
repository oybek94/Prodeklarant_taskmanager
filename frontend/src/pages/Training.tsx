import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';
import { useIsMobile } from '../utils/useIsMobile';

interface Training {
  id: number;
  title: string;
  description?: string;
  orderIndex: number;
  requiresExam?: boolean;
  progress: {
    completed: boolean;
    progressPercent: number;
    lastAccessedAt: string | null;
  };
  _count: {
    materials: number;
    exams: number;
  };
}

export default function Training() {
  const isMobile = useIsMobile();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const response = await apiClient.get('/training');
      setTrainings(response.data);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 ${isMobile ? 'pb-32' : ''}`}>
      <div className="mb-10 max-w-4xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30">
            <Icon icon="lucide:book-marked" className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">O'qitish Kurslari</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Kompaniyamizning o'quv dasturlari va malaka oshirish materiallari. Bilimingizni oshiring va doimo rivojlaning!
        </p>
      </div>

      {trainings.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon icon="lucide:folder-open" className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Kurslar hali mavjud emas</h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            Hozircha siz uchun ochiq kurslar yo'q. Iltimos, keyinroq tekshirib ko'ring.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trainings.map((training) => (
            <Link
              key={training.id}
              to={`/training/${training.id}`}
              className="group relative bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden"
            >
              {/* Card Accent */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                    <Icon icon="lucide:layout" className="w-7 h-7 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Kurs #{training.orderIndex}
                    </span>
                    {training.requiresExam === false ? (
                      <span className="px-3 py-1 bg-slate-200 dark:bg-slate-600 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        Imtixonsiz
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        Imtihonli
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {training.title}
                </h2>

                {training.description && (
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-2 leading-relaxed">
                    {training.description}
                  </p>
                )}

                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                      <Icon icon="lucide:book-open" className="w-4 h-4" />
                      <span>{training._count.materials} Materiallar</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                      <Icon icon="lucide:help-circle" className="w-4 h-4" />
                      <span>{training._count.exams} Testlar</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Progress</span>
                      <span className={`font-bold ${training.progress.completed ? 'text-green-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {training.progress.progressPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative ${training.progress.completed
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                          : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                          }`}
                        style={{ width: `${training.progress.progressPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>

                  {training.progress.completed && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-bold pt-1">
                      <Icon icon="lucide:check-circle-2" className="w-4 h-4" />
                      Tugallangan
                    </div>
                  )}
                </div>
              </div>

              {/* Hover Action Indicator */}
              <div className="absolute bottom-4 right-8 opacity-0 group-hover:opacity-100 group-hover:right-6 transition-all duration-300">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  O'qishni boshlash
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

