import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/api';

interface Training {
  id: number;
  title: string;
  description?: string;
  orderIndex: number;
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">O'qitish Kurslari</h1>
        <p className="text-gray-600 mt-2">
          Yangi kelgan ishchilar uchun o'qitish materiallari va imtihonlar
        </p>
      </div>

      {trainings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Hozircha o'qitish kurslari mavjud emas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainings.map((training) => (
            <Link
              key={training.id}
              to={`/training/${training.id}`}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {training.title}
                </h2>
                <span className="text-sm text-gray-500">
                  #{training.orderIndex}
                </span>
              </div>

              {training.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {training.description}
                </p>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Materiallar:</span>
                  <span className="font-medium">{training._count.materials}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Imtihonlar:</span>
                  <span className="font-medium">{training._count.exams}</span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress:</span>
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
                      style={{ width: `${training.progress.progressPercent}%` }}
                    />
                  </div>
                </div>

                {training.progress.completed && (
                  <div className="mt-3 flex items-center text-green-600 text-sm">
                    <svg
                      className="w-5 h-5 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Tugallangan
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

