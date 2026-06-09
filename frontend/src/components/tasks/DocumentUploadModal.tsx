import toast from 'react-hot-toast';
import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { getFileIcon, formatFileSize } from './taskHelpers';
import type { TaskStage } from './types';

interface DocumentUploadModalProps {
  show: boolean;
  uploadFiles: File[];
  setUploadFiles: React.Dispatch<React.SetStateAction<File[]>>;
  documentNames: string[];
  setDocumentNames: React.Dispatch<React.SetStateAction<string[]>>;
  documentDescriptions: string[];
  setDocumentDescriptions: React.Dispatch<React.SetStateAction<string[]>>;
  selectedStageForReminder: TaskStage | null;
  setSelectedStageForReminder: React.Dispatch<React.SetStateAction<TaskStage | null>>;
  onClose: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  uploading?: boolean;
  uploadProgress?: number;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  show,
  uploadFiles, setUploadFiles,
  documentNames, setDocumentNames,
  documentDescriptions, setDocumentDescriptions,
  selectedStageForReminder, setSelectedStageForReminder,
  onClose, onFileSelect, onUpload,
  uploading = false,
  uploadProgress = 0,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  // dragCounter — nested elementlarga kirish/chiqishda flickerni oldini olish
  const dragCounter = useRef(0);

  const handleClose = () => {
    onClose();
    setUploadFiles([]);
    setDocumentNames([]);
    setDocumentDescriptions([]);
    if (selectedStageForReminder?.name === 'Pochta') {
      setSelectedStageForReminder(null);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(uploadFiles.filter((_, i) => i !== index));
    setDocumentNames(documentNames.filter((_, i) => i !== index));
    setDocumentDescriptions(documentDescriptions.filter((_, i) => i !== index));
  };

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setUploadFiles(prev => [...prev, ...newFiles]);
    setDocumentNames(prev => [...prev, ...newFiles.map(() => '')]);
    setDocumentDescriptions(prev => [...prev, ...newFiles.map(() => '')]);
  }, [setUploadFiles, setDocumentNames, setDocumentDescriptions]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  return (
    <AnimatePresence>
      {show && (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <motion.div
        className={`bg-white rounded-lg shadow-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto relative transition-all duration-150 ${
          isDragOver ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
        }`}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay — modal ustida ko'rinadigan qatlam */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 rounded-lg bg-indigo-50/90 border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <Icon icon="lucide:file-down" className="w-8 h-8 text-indigo-500" />
            </div>
            <p className="text-lg font-semibold text-indigo-700">Fayllarni qo'yib yuboring</p>
            <p className="text-sm text-indigo-500">Bir nechta fayl bir vaqtda qabul qilinadi</p>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {selectedStageForReminder?.name === 'Pochta'
              ? 'Pochta jarayoni uchun hujjatlar yuklash'
              : 'Hujjat yuklash (bir nechta fayl)'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
        </div>

        {/* Pochta eslatmasi */}
        {selectedStageForReminder?.name === 'Pochta' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Eslatma:</strong> Pochta jarayonini tayyor qilish uchun hujjatlarni yuklang.
              Hujjatlar yuklangandan keyin Pochta jarayoni avtomatik tayyor bo'ladi.
            </p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (uploadFiles.length === 0) {
              toast.error('Kamida bitta faylni tanlang');
              return;
            }
            onUpload();
          }}
          className="space-y-4"
          noValidate
        >
          {/* File input + drag hint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fayllar (bir nechta tanlash mumkin)
            </label>

            <div className="flex items-center gap-3">
              <input
                type="file"
                multiple
                onChange={onFileSelect}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <div className="flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                <Icon icon="lucide:move-down-left" className="w-3.5 h-3.5" />
                yoki oynaga tashlang
              </div>
            </div>

            {/* Selected files grid */}
            {uploadFiles.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {uploadFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative flex flex-col items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 z-10"
                        title="O'chirish"
                      >
                        <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex-shrink-0 mb-2">
                        {getFileIcon(file.type || '', file.name)}
                      </div>
                      <div className="text-center w-full">
                        <p className="text-xs font-medium text-gray-700 truncate px-1" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                  Yuklanmoqda... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
                </>
              ) : (
                <>Yuklash ({uploadFiles.length} fayl)</>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                setUploadFiles([]);
                setDocumentNames([]);
                setDocumentDescriptions([]);
              }}
              className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
            >
              Bekor
            </button>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600">Yuklash jarayoni</span>
                <span className="text-xs font-bold text-gray-700">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </form>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DocumentUploadModal;
