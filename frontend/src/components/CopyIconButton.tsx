import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';

interface CopyIconButtonProps {
  textToCopy: string;
  toastMessage?: string;
  className?: string;
}

export const CopyIconButton: React.FC<CopyIconButtonProps> = ({ 
  textToCopy, 
  toastMessage = 'Nusxalandi',
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy);
    toast.success(toastMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`relative inline-flex items-center justify-center p-1.5 rounded-md transition-all duration-300 overflow-hidden ${
        copied 
          ? 'text-emerald-600 dark:text-emerald-400 scale-110' 
          : 'text-emerald-500 hover:text-emerald-600 hover:scale-105'
      } ${className}`}
      title="Nusxa olish"
    >
      <div className={`transition-all duration-300 transform flex items-center justify-center absolute inset-0 ${copied ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <Icon icon="lucide:check" className="w-4 h-4" />
      </div>
      <div className={`transition-all duration-300 transform flex items-center justify-center ${copied ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <Icon icon="lucide:copy" className="w-4 h-4" />
      </div>
    </button>
  );
};
