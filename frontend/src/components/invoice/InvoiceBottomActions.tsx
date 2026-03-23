import React from 'react';

interface InvoiceBottomActionsProps {
  additionalInfoError: string | null;
  canEditEffective: boolean;
  invoysStageReady: boolean;
  markingReady: boolean;
  taskId: string | number | undefined;
  saving: boolean;
  handleMarkInvoysReady: () => void;
  navigate: (delta: number) => void;
}

export const InvoiceBottomActions: React.FC<InvoiceBottomActionsProps> = ({
  additionalInfoError,
  canEditEffective,
  invoysStageReady,
  markingReady,
  taskId,
  saving,
  handleMarkInvoysReady,
  navigate,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 mt-8 pt-6 border-t pdf-hide-border">
      {additionalInfoError && (
        <div className="w-full text-sm text-red-600 text-right">
          {additionalInfoError}
        </div>
      )}
      {canEditEffective && !invoysStageReady && (
        <button
          type="button"
          onClick={handleMarkInvoysReady}
          disabled={markingReady || !taskId}
          className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:bg-amber-300 disabled:opacity-50"
          title="Invoys jarayonini tayyor qilish"
        >
          {markingReady ? 'Jarayon...' : 'Tayyor'}
        </button>
      )}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
      >
        Bekor qilish
      </button>
      {canEditEffective && (
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      )}
    </div>
  );
};
