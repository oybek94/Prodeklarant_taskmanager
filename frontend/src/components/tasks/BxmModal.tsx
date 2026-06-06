import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../common/Button';

interface BXMModalProps {
  show: boolean;
  bxmMultiplier: string;
  setBxmMultiplier: (val: string) => void;
  afterHoursDeclaration: boolean;
  setAfterHoursDeclaration: (val: boolean) => void;
  formatBxmAmountInSum: (multiplier: number) => string;
  onConfirm: () => void;
  onClose: () => void;
}

const BXMModal: React.FC<BXMModalProps> = ({
  show,
  bxmMultiplier, setBxmMultiplier,
  afterHoursDeclaration, setAfterHoursDeclaration,
  formatBxmAmountInSum,
  onConfirm, onClose,
}) => {
  return (
    <AnimatePresence>
      {show && (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-white dark:bg-slate-900 dark:text-gray-100 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Deklaratsiya To'lovi
        </h3>

        {/* BXM multiplier select */}
        <div className="mb-4">
          <select
            value={bxmMultiplier}
            onChange={(e) => setBxmMultiplier(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
          >
            <option value="1">BXM 1 barobari ({formatBxmAmountInSum(1)})</option>
            <option value="1.5">BXM 1.5 barobari ({formatBxmAmountInSum(1.5)})</option>
            <option value="2.5">BXM 2.5 barobari ({formatBxmAmountInSum(2.5)})</option>
            <option value="4">BXM 4 barobari ({formatBxmAmountInSum(4)})</option>
          </select>
        </div>

        {/* After hours checkbox */}
        <label className="mb-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={afterHoursDeclaration}
            onChange={(e) => setAfterHoursDeclaration(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Ish vaqtidan tashqari rasmiylashtiruv
        </label>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onConfirm}
            variant="primary"
            className="flex-1"
          >
            Tasdiqlash
          </Button>
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            Bekor qilish
          </Button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BXMModal;
