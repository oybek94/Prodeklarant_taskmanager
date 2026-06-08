import React, { useState, useEffect } from 'react';
import TableModal from './TableModal';
import apiClient from '../../../lib/api';

interface ParticipationsModalProps {
  workerId: number;
  period: string;
  onClose: () => void;
}

export default function ParticipationsModal({ workerId, period, onClose }: ParticipationsModalProps) {
  const [participations, setParticipations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipations = async () => {
      try {
        const response = await apiClient.get(`/workers/${workerId}/participations`, {
          params: { period }
        });
        setParticipations(response.data);
      } catch (error) {
        console.error('Error loading participations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchParticipations();
  }, [workerId, period]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <TableModal
      title="Jami tasklarda ishtirok"
      subtitle="Har bir bajarilgan jarayon kesimida"
      onClose={onClose}
      loading={loading}
      empty={participations.length === 0}
      emptyText="Hozircha ishtiroklar yo'q"
    >
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 sticky top-0">
          <tr>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Sana</th>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Task</th>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Jarayon</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {participations.map((part, idx) => (
            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(part.completedAt)}</td>
              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{part.task?.title || `Task #${part.taskId || '?'}`}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{part.name}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableModal>
  );
}
