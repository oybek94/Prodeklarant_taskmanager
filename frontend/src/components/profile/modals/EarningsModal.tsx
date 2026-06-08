import React, { useState, useEffect } from 'react';
import TableModal from './TableModal';
import apiClient from '../../../lib/api';

interface EarningsModalProps {
  workerId: number;
  period: string;
  onClose: () => void;
}

export default function EarningsModal({ workerId, period, onClose }: EarningsModalProps) {
  const [currentEarnings, setCurrentEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const response = await apiClient.get(`/workers/${workerId}/current-earnings`, {
          params: { period }
        });
        setCurrentEarnings(response.data);
      } catch (error) {
        console.error('Error loading current earnings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, [workerId, period]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <TableModal
      title="Joriy mavsum (Ishlab topilgan)"
      subtitle="Har bir ish va jarayon kesimida"
      onClose={onClose}
      loading={loading}
      empty={currentEarnings.length === 0}
      emptyText="Hozircha joriy mavsumda hech qanday daromad yo'q"
    >
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 sticky top-0">
          <tr>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Sana</th>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Task</th>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Jarayon</th>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 text-right">Summa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {currentEarnings.map((earn) => (
            <tr key={earn.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(earn.createdAt)}</td>
              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{earn.taskTitle}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{earn.stageName}</span>
              </td>
              <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{Number(earn.amount).toLocaleString()} UZS</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold sticky bottom-0">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600">Jami:</td>
            <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 border-t border-gray-200 dark:border-gray-600">{currentEarnings.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()} UZS</td>
          </tr>
        </tfoot>
      </table>
    </TableModal>
  );
}
