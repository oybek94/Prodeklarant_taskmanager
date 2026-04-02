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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-xl p-5 rounded-2xl shadow-sm border border-white/80 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                    <Icon icon="lucide:wallet" className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">Qarzlar</h1>
                    <p className="text-sm text-gray-500 font-medium mt-0.5">Kimgadir qarz berilgan yoki olinganligini boshqarish.</p>
                  </div>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex w-full justify-center sm:w-auto items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 font-semibold text-sm"
                >
                    <Icon icon="lucide:plus-circle" className="w-4 h-4" />
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
