import React, { useState } from 'react';
import apiClient from '../../lib/api';
import toast from 'react-hot-toast';
import { formatMoney } from '../tasks/taskHelpers';

interface UnratedErrorsModalProps {
  show: boolean;
  onClose: () => void;
  errors: any[];
  onRateSuccess: () => void;
}

export const UnratedErrorsModal: React.FC<UnratedErrorsModalProps> = ({ show, onClose, errors, onRateSuccess }) => {
  const [ratingValue, setRatingValue] = useState<number>(10);
  const [ratingErrorId, setRatingErrorId] = useState<number | null>(null);

  if (!show) return null;

  const handleRateError = async (errorId: number, taskId: number) => {
    if (ratingValue < 1 || ratingValue > 10) {
      toast.error("Baho 1 va 10 oralig'ida bo'lishi kerak");
      return;
    }
    try {
      await apiClient.put(`/tasks/${taskId}/errors/${errorId}/rate`, { rating: ratingValue });
      toast.success("Xato baholandi va xodim mukofotlandi!");
      setRatingErrorId(null);
      onRateSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Baholashda xatolik yuz berdi');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-[110] backdrop-blur-sm transition-all" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <i className="fas fa-gavel text-orange-500"></i> Baholanmagan xatolar
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div className="p-4 flex-1 flex flex-col gap-3">
          {errors.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
              <i className="fas fa-check-circle text-4xl mb-3 text-green-400"></i>
              <p>Barcha xatolar baholangan!</p>
            </div>
          ) : (
            errors.map(error => (
              <div key={error.id} className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                  <div>
                    <a href={`/tasks/${error.task.id}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline block break-all max-w-[200px]">
                      #{error.task.id} - {error.task.title}
                    </a>
                    <div className="text-sm font-semibold mt-1 dark:text-gray-200">
                      Bosqich: {error.stageName}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">
                     {formatMoney(Number(error.amount), 'USD')}
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 pl-2">
                  <div>Kirituvchi: <span className="font-medium text-gray-800 dark:text-gray-200">{error.createdBy?.name}</span></div>
                  <div>Aybdor: <span className="font-medium text-gray-800 dark:text-gray-200">{error.worker?.name}</span></div>
                  <div>Sana: {new Date(error.date).toLocaleDateString('uz-UZ')}</div>
                  {error.comment && <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded italic">"{error.comment}"</div>}
                </div>
                
                <div className="border-t dark:border-gray-700 pt-2 mt-2">
                  {ratingErrorId === error.id ? (
                    <div className="flex flex-wrap justify-between items-center bg-orange-50 dark:bg-orange-900/20 p-2 rounded gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">Baho (1-10):</span>
                        <input type="number" min="1" max="10" value={ratingValue} onChange={e => setRatingValue(Number(e.target.value))} className="w-14 px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-orange-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      </div>
                      <div className="flex items-center gap-1 w-full sm:w-auto mt-1 sm:mt-0 justify-end">
                        <button onClick={() => setRatingErrorId(null)} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-bold whitespace-nowrap">Bekor</button>
                        <button onClick={() => handleRateError(error.id, error.task.id)} className="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded font-bold shadow-sm whitespace-nowrap">Saqlash</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setRatingErrorId(error.id); setRatingValue(10); }} className="w-full py-1.5 flex justify-center items-center gap-2 bg-gray-100 hover:bg-orange-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 hover:text-orange-600 dark:text-gray-300 dark:hover:text-orange-400 rounded transition font-medium text-xs">
                      <i className="fas fa-star text-orange-400"></i> Xatoni baholash
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
