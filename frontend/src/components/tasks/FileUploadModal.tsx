import React, { useState, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import type { TaskStage } from './types';

interface FileUploadModalProps {
  show: boolean;
  stageName: string;
  fileName: string;
  file: File | null;
  uploading: boolean;
  selectedStageForReminder: TaskStage | null;
  onFileNameChange: (name: string) => void;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  onSkipValidation: () => void;
  onClose: () => void;
}

const VALID_EXTENSIONS = ['.pdf', '.jpg', '.jpeg'];
const VALID_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/pjpeg'];

export default function FileUploadModal({
  show,
  stageName,
  fileName,
  file,
  uploading,
  selectedStageForReminder,
  onFileNameChange,
  onFileChange,
  onUpload,
  onSkipValidation,
  onClose,
}: FileUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!show || !stageName) return null;

  // Helpers
  const isCertStage = stageName === 'Sertifikat olib chiqish';
  const isInvoice = stageName === 'Invoys';
  const isST = stageName === 'ST' || (isCertStage && fileName === 'ST');
  const displayTitle = isInvoice ? 'Invoice' : isCertStage ? fileName || 'ST' : stageName;

  const validateFile = (f: File): boolean => {
    const name = f.name.toLowerCase();
    const type = f.type.toLowerCase();
    const hasValidExt = VALID_EXTENSIONS.some(ext => name.endsWith(ext));
    const hasValidMime = VALID_MIME_TYPES.includes(type) || type === '';
    return hasValidExt || hasValidMime;
  };

  const handleFileSelect = (f: File) => {
    if (!validateFile(f)) {
      alert('Faqat PDF va JPG fayllar qabul qilinadi');
      return;
    }
    onFileChange(f);
    // Auto-fill name
    const defaultName = isInvoice ? 'Invoice' : isCertStage ? fileName || 'ST' : stageName;
    if (!fileName || fileName === stageName || fileName === defaultName) {
      onFileNameChange(f.name);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [fileName]);

  const getFileIcon = () => {
    if (!file) return 'lucide:file-up';
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) return 'lucide:file-text';
    return 'lucide:image';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Gradient color based on stage type
  const gradientClass = isST
    ? 'from-orange-500 to-amber-500'
    : isInvoice
      ? 'from-blue-600 to-indigo-600'
      : 'from-emerald-500 to-teal-500';

  const accentColor = isST ? 'orange' : isInvoice ? 'blue' : 'emerald';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full mx-4 overflow-hidden max-w-lg"
        style={{ animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradientClass} px-6 py-5 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Icon icon="lucide:upload-cloud" className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{displayTitle} yuklash</h3>
                <p className="text-white/80 text-xs mt-0.5">
                  {isCertStage ? 'Sertifikat olib chiqish' : stageName} — PDF yoki JPG
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <Icon icon="lucide:x" className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Document name / type */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {isCertStage ? 'Sertifikat turi' : 'Hujjat nomi'}
            </label>
            {isCertStage ? (
              <div className="flex gap-2">
                {['ST', 'Fito'].map((type) => (
                  <button
                    key={type}
                    onClick={() => onFileNameChange(type)}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                      fileName === type
                        ? `border-${accentColor}-500 bg-${accentColor}-50 text-${accentColor}-700 shadow-sm`
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Icon
                        icon={type === 'ST' ? 'lucide:shield-check' : 'lucide:leaf'}
                        className="w-4 h-4"
                      />
                      {type === 'ST' ? 'ST sertifikati' : 'Fito sertifikati'}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={fileName}
                onChange={(e) => onFileNameChange(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm"
                placeholder={isInvoice ? 'Invoice' : stageName}
              />
            )}
          </div>

          {/* File drop zone */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Fayl tanlash
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? `border-${accentColor}-400 bg-${accentColor}-50`
                  : file
                    ? 'border-green-300 bg-green-50/50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf,.jpg,.jpeg,image/jpeg,image/jpg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
              />

              {file ? (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon icon={getFileIcon()} className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileChange(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Icon icon="lucide:upload-cloud" className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    Faylni bu yerga tashlang yoki{' '}
                    <span className={`text-${accentColor}-600 font-semibold`}>tanlang</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG formatlar qabul qilinadi</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2.5">
              <button
                onClick={onUpload}
                disabled={!file || uploading}
                className={`flex-1 px-4 py-3 bg-gradient-to-r ${gradientClass} text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-${accentColor}-200 flex items-center justify-center gap-2`}
              >
                {uploading ? (
                  <>
                    <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:check-circle" className="w-4 h-4" />
                    Yuklash va tayyor qilish
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                Bekor
              </button>
            </div>
            {selectedStageForReminder && (
              <button
                onClick={onSkipValidation}
                className="w-full px-4 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl font-medium text-sm hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
              >
                <Icon icon="lucide:skip-forward" className="w-4 h-4" />
                O'tkazib yuborish va tayyor qilish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
