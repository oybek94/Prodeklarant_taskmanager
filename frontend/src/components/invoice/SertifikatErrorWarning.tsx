import React from 'react';

interface SertifikatErrorWarningProps {
  sertifikatStageCompleted: boolean;
  canEdit: boolean;
  taskHasErrors: boolean;
  taskId: number | undefined;
  navigate: (path: string, options?: { state?: any }) => void;
}

export const SertifikatErrorWarning: React.FC<SertifikatErrorWarningProps> = ({
  sertifikatStageCompleted,
  canEdit,
  taskHasErrors,
  taskId,
  navigate,
}) => {
  if (!sertifikatStageCompleted || !canEdit || taskHasErrors) return null;

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-amber-900">
        Sertifikatlar tayyor bo&apos;lgani sababli, invoysga o&apos;zgartirish kiritishdan oldin, iltimos, aniqlangan xatoliklar haqida to&apos;liq ma&apos;lumotlarni kiriting.
      </p>
      <button
        type="button"
        onClick={() => navigate('/invoices', { state: { openErrorModalForTaskId: taskId } })}
        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
      >
        Xatolik qo&apos;shish
      </button>
    </div>
  );
};
