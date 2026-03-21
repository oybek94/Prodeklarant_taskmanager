// Yangi maydon qo'shish modali
import { useState } from 'react';

interface AddFieldModalProps {
  show: boolean;
  onClose: () => void;
  onAdd: (field: { id: string; label: string; value: string }) => void;
}

const AddFieldModal = ({ show, onClose, onAdd }: AddFieldModalProps) => {
  const [label, setLabel] = useState('');

  if (!show) return null;

  const handleClose = () => {
    setLabel('');
    onClose();
  };

  const handleAdd = () => {
    if (label.trim()) {
      onAdd({
        id: Date.now().toString(),
        label: label.trim(),
        value: '',
      });
      setLabel('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Yangi maydon qo'shish</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maydon nomi:</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Masalan: Номер контейнера"
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!label.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Qo'shish
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddFieldModal;
