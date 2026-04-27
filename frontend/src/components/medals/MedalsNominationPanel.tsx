import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Award, Search, Edit2 } from 'lucide-react';
import apiClient from '../../lib/api';
import { MEDAL_DETAILS, TIER_LABELS, type MedalType } from '../../types/medals';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
}

interface Nomination {
  userId: number | null;
  medalType: MedalType;
  period: string;
  reason: string;
  cashBonus: number;
  xpBonus: number;
}

interface MedalsNominationPanelProps {
  onClose: () => void;
  initialTab?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

const MedalsNominationPanel: React.FC<MedalsNominationPanelProps> = ({ onClose, initialTab = 'WEEKLY' }) => {
  const [activeTab, setActiveTab] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>(initialTab);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [periodStr, setPeriodStr] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchNominations();
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNominations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/medals/nominations?type=${activeTab}`);
      setNominations(res.data.nominations);
      setPeriodStr(res.data.periodStr);
    } catch (err) {
      console.error(err);
      toast.error('Nominatsiyalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleAward = async (nomination: Nomination) => {
    if (!nomination.userId) {
      toast.error('Xodimni tanlang!');
      return;
    }

    try {
      await apiClient.post('/medals/award', {
        userId: nomination.userId,
        medalType: nomination.medalType,
        period: nomination.period,
        cashBonus: nomination.cashBonus,
        xpBonus: nomination.xpBonus,
      });
      toast.success(`${MEDAL_DETAILS[nomination.medalType].name} muvaffaqiyatli topshirildi!`);
      // Remove from list
      setNominations(prev => prev.filter(n => n.medalType !== nomination.medalType));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Medal Nominatsiyalari</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tizim bo'yicha hisoblangan g'oliblar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-4 gap-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          {['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab === 'WEEKLY' ? 'Haftalik' : tab === 'MONTHLY' ? 'Oylik' : tab === 'QUARTERLY' ? 'Choraklik' : 'Yillik'}
            </button>
          ))}
          
          <div className="ml-auto flex items-center px-4 font-bold text-gray-500 dark:text-gray-400">
            Davr: {periodStr}
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 dark:bg-gray-900/20">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
            </div>
          ) : nominations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Ushbu davr uchun nomzodlar topilmadi yoki barcha medallar tarqatib bo'lingan.
            </div>
          ) : (
            <div className="space-y-4">
              {nominations.map((nom, index) => {
                const details = MEDAL_DETAILS[nom.medalType];
                const selectedUser = users.find(u => u.id === nom.userId);

                return (
                  <div key={nom.medalType} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 items-center transition-all hover:shadow-md">
                    <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center ${details.bgClass} border border-gray-100 dark:border-gray-700 overflow-hidden`}>
                      <img src={details.image} alt={details.name} className="w-full h-full object-contain p-2 drop-shadow-md" />
                    </div>
                    
                    <div className="flex-1 text-center md:text-left w-full">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <h3 className={`font-bold text-lg ${details.color}`}>{details.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          {TIER_LABELS[details.tier]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{nom.reason}</p>
                      
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-bold">
                          <span>💰</span> {nom.cashBonus.toLocaleString('ru-RU')} UZS
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm font-bold">
                          <span>✨</span> +{nom.xpBonus} XP
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col items-stretch gap-2 shrink-0">
                      <div className="relative">
                        {editIndex === index ? (
                          <select
                            value={nom.userId || ''}
                            onChange={(e) => {
                              const newNoms = [...nominations];
                              newNoms[index].userId = Number(e.target.value);
                              setNominations(newNoms);
                              setEditIndex(null);
                            }}
                            className="w-full md:w-48 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                            autoFocus
                            onBlur={() => setEditIndex(null)}
                          >
                            <option value="">Xodimni tanlang</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div 
                            onClick={() => setEditIndex(index)}
                            className={`flex items-center justify-between w-full md:w-48 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
                              nom.userId 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold' 
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-medium'
                            }`}
                          >
                            <span className="truncate">{selectedUser?.name || 'Xodim tanlanmagan'}</span>
                            <Edit2 className="w-3.5 h-3.5 opacity-50 ml-2 shrink-0" />
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleAward(nom)}
                        disabled={!nom.userId}
                        className="w-full px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        Topshirish
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MedalsNominationPanel;
