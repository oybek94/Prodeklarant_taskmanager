import React, { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import DebtDashboard from '../components/debts/DebtDashboard';
import DebtTable from '../components/debts/DebtTable';
import { Icon } from '@iconify/react';
import AddDebtModal from '../components/debts/AddDebtModal';
import { useIsMobile } from '../utils/useIsMobile';

const Debts = () => {
    const isMobile = useIsMobile();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [debts, setDebts] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'active'
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchDebts = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams([
                ['page', page.toString()],
                ['limit', '10'], // default limit
                ...Object.entries(filters).filter(([_, v]) => v !== '')
            ]);
            const res = await apiClient.get(`/debts?${params.toString()}`);
            setDebts(res.data.debts);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error('Qarzlarni yuklashda xato:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboard = async () => {
        try {
            const res = await apiClient.get('/debts/dashboard');
            setStats(res.data);
        } catch (error) {
            console.error('Dashboard statistikasida xato:', error);
        }
    };

    useEffect(() => {
        fetchDebts();
    }, [page, filters]);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const reloadData = () => {
        fetchDebts();
        fetchDashboard();
    };

    return (
        <div className={`space-y-6 animate-fade-in ${isMobile ? 'pb-32' : 'pb-10'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Icon icon="lucide:wallet" className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Qarzlar</h1>
                    <p className="text-sm text-gray-500 font-medium">Barchasini elektron nazorat qilish.</p>
                  </div>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex w-full justify-center sm:w-auto items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium text-sm shadow-sm"
                >
                    <Icon icon="lucide:plus" className="w-4 h-4" />
                    Yangi Qarz
                </button>
            </div>
            
            <DebtDashboard stats={stats} loading={loading} />
            <DebtTable 
              debts={debts} 
              loading={loading} 
              filters={filters} 
              setFilters={setFilters} 
              page={page} 
              setPage={setPage} 
              totalPages={totalPages} 
              reloadData={reloadData} 
            />
            
            <AddDebtModal 
              isOpen={isAddModalOpen} 
              onClose={() => setIsAddModalOpen(false)} 
              onSuccess={() => {
                  setIsAddModalOpen(false);
                  reloadData();
              }} 
            />
        </div>
    );
};

export default Debts;
