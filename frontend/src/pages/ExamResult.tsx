import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';

interface ExamResult {
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
        points: number;
      };
    }>;
  };
  score: number;
  maxScore: number;
  scorePercent: number;
  passed: boolean;
  passingScore: number;
}

export default function ExamResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<ExamResult | null>(
    location.state?.result || null
  );
  const [loading, setLoading] = useState(!result);

  useEffect(() => {
    // Agar state orqali result kelmagan bo'lsa, API'dan olish
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Natija topilmadi</p>
          <button
            onClick={() => navigate('/training')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            O'qitish kurslariga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Imtihon Natijasi
          </h1>
          <div
            className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${
              result.passed
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {result.passed ? (
              <>
                <Icon icon="lucide:check-circle-2" className="w-6 h-6 mr-2" />
                O'tdingiz!
              </>
            ) : (
              <>
                <Icon icon="lucide:x-circle" className="w-6 h-6 mr-2" />
                O'ta olmadingiz
              </>
            )}
          </div>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">
              {result.score}
            </div>
            <div className="text-sm text-gray-600 mt-1">Olingan ball</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-600">
              {result.maxScore}
            </div>
            <div className="text-sm text-gray-600 mt-1">Maksimal ball</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">
              {result.scorePercent}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Foiz</div>
          </div>
        </div>

        {/* Passing Score */}
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">O'tish balli:</span>
            <span className="font-semibold text-gray-900">
              {result.passingScore}%
            </span>
          </div>
        </div>

        {/* Answers Review */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Javoblar Ko'rib Chiqish
          </h2>
          <div className="space-y-4">
            {result.attempt.answers.map((answer, index) => (
              <div
                key={answer.id}
                className={`p-4 rounded-lg border-2 ${
                  answer.isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="font-semibold text-gray-900 mr-2">
                        {index + 1}.
                      </span>
                      <span className="text-gray-900">
                        {answer.question.question}
                      </span>
                    </div>
                    {answer.question.type !== 'TEXT' && (
                      <div className="ml-6 mt-2">
                        <div className="text-sm text-gray-600 mb-1">
                          Variantlar:
                        </div>
                        <div className="space-y-1">
                          {answer.question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`text-sm p-2 rounded ${
                                Array.isArray(answer.answer) &&
                                answer.answer.includes(option)
                                  ? 'bg-blue-100 font-medium'
                                  : ''
                              }`}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {answer.question.type === 'TEXT' && (
                      <div className="ml-6 mt-2">
                        <div className="text-sm text-gray-600 mb-1">
                          Sizning javobingiz:
                        </div>
                        <div className="p-2 bg-white rounded border">
                          {answer.answer || '(Javob berilmagan)'}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <div
                      className={`text-lg font-bold ${
                        answer.isCorrect ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {answer.isCorrect ? '✓' : '✗'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {answer.points} / {answer.question.points} ball
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4 border-t">
          <button
            onClick={() => navigate('/training')}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            O'qitish kurslariga qaytish
          </button>
          <button
            onClick={() => navigate(`/exam/${id}`)}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Qayta topshirish
          </button>
        </div>
      </div>
    </div>
  );
}

