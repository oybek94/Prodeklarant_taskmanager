import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';

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

    // Barcha savollarga javob berilganini tekshirish
    if (answersArray.length < questions.length) {
      const confirmed = window.confirm(
        `Siz ${answersArray.length} ta savolga javob berdingiz. ${questions.length} ta savol bor. Yana davom etasizmi?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);

    try {
      const response = await apiClient.post(`/exams/${id}/submit`, {
        answers: answersArray,
      });

      // Natijani ko'rsatish
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Imtihon topilmadi</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
            {exam.description && (
              <p className="text-gray-600 mt-1">{exam.description}</p>
            )}
          </div>
          {timeLeft !== null && (
            <div
              className={`text-2xl font-bold ${
                timeLeft < 60 ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">
              Savol {currentQuestionIndex + 1} / {questions.length}
            </span>
            <span className="text-gray-600">
              Javob berilgan: {Object.keys(answers).length} / {questions.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {currentQuestion.question}
            </h2>
            <p className="text-sm text-gray-500">
              Ball: {currentQuestion.points} | Turi:{' '}
              {currentQuestion.type === 'SINGLE_CHOICE' && 'Bitta javob'}
              {currentQuestion.type === 'MULTIPLE_CHOICE' && 'Bir nechta javob'}
              {currentQuestion.type === 'TEXT' && 'Matnli javob'}
            </p>
          </div>

          {currentQuestion.type === 'SINGLE_CHOICE' && (
            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => (
                <label
                  key={index}
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option}
                    checked={currentAnswer === option}
                    onChange={(e) =>
                      handleAnswerChange(currentQuestion.id, e.target.value)
                    }
                    className="mr-3"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => {
                const selectedAnswers = Array.isArray(currentAnswer)
                  ? currentAnswer
                  : [];
                return (
                  <label
                    key={index}
                    className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAnswers.includes(option)}
                      onChange={(e) => {
                        const newAnswers = e.target.checked
                          ? [...selectedAnswers, option]
                          : selectedAnswers.filter((a) => a !== option);
                        handleAnswerChange(currentQuestion.id, newAnswers);
                      }}
                      className="mr-3"
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'TEXT' && (
            <textarea
              value={currentAnswer || ''}
              onChange={(e) =>
                handleAnswerChange(currentQuestion.id, e.target.value)
              }
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={5}
              placeholder="Javobingizni yozing..."
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Oldingi
          </button>

          <div className="flex gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded text-sm ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : answers[questions[index].id]
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Yuborilmoqda...' : 'Topshirish ✓'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Keyingi →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

