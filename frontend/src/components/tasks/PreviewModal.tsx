import React from 'react';

interface PreviewModalProps {
  previewDocument: { url: string; type: string; name: string } | null;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ previewDocument, onClose }) => {
  if (!previewDocument) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[120] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{previewDocument.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="flex justify-center items-center min-h-[400px]">
          {previewDocument.type?.includes('image') ? (
            <img
              src={previewDocument.url}
              alt={previewDocument.name}
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : previewDocument.type?.includes('pdf') ? (
            <iframe
              src={previewDocument.url}
              className="w-full h-[70vh] border-0"
              title={previewDocument.name}
            />
          ) : previewDocument.type?.includes('video') ? (
            <video
              src={previewDocument.url}
              controls
              className="max-w-full max-h-[70vh]"
            >
              Sizning brauzeringiz video elementini qo'llab-quvvatlamaydi.
            </video>
          ) : previewDocument.type?.includes('audio') ? (
            <audio
              src={previewDocument.url}
              controls
              className="w-full"
            >
              Sizning brauzeringiz audio elementini qo'llab-quvvatlamaydi.
            </audio>
          ) : (
            <div className="text-center text-gray-500">
              <p className="mb-4">Bu fayl turini dasturdan ko'rish mumkin emas.</p>
              <a
                href={previewDocument.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Yuklab olish
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
