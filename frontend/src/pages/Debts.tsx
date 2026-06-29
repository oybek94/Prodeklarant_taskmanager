import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/api';
import DebtDashboard from '../components/debts/DebtDashboard';
import DebtTable from '../components/debts/DebtTable';
import { Icon } from '@iconify/react';
import AddDebtModal from '../components/debts/AddDebtModal';
import CertifierPayModal from '../components/debts/CertifierPayModal';
import { useIsMobile } from '../utils/useIsMobile';

const Debts = () => {
    const isMobile = useIsMobile();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCertifierPayModalOpen, setIsCertifierPayModalOpen] = useState(false);
    const [certifierPayType, setCertifierPayType] = useState<'ST1' | 'FITO' | null>(null);
    const [certifierRemainingAmount, setCertifierRemainingAmount] = useState(0);
    const [certifierBranchId, setCertifierBranchId] = useState<number | null>(null);

    const [debts, setDebts] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: 'active' });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchDebts = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams([
                ['page', page.toString()],
                ['limit', '10'],
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
    }, [page, filters]);

    const fetchDashboard = useCallback(async () => {
        try {
            const res = await apiClient.get('/debts/dashboard');
            setStats(res.data);
        } catch (error) {
            console.error('Dashboard statistikasida xato:', error);
        }
    }, []);

    useEffect(() => { fetchDebts(); }, [fetchDebts]);
    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const reloadData = useCallback(() => {
        fetchDebts();
        fetchDashboard();
    }, [fetchDebts, fetchDashboard]);

    const handlePayCertifier = useCallback((type: 'ST1' | 'FITO', amount: number, branchId: number | null) => {
        setCertifierPayType(type);
        setCertifierRemainingAmount(amount);
        setCertifierBranchId(branchId);
        setIsCertifierPayModalOpen(true);
    }, []);

    const handleAddSuccess = useCallback(() => {
        setIsAddModalOpen(false);
        reloadData();
    }, [reloadData]);

    const handleCertifierSuccess = useCallback(() => {
        setIsCertifierPayModalOpen(false);
        reloadData();
    }, [reloadData]);

    return (
        <div className={`space-y-5 ${isMobile ? 'pb-32' : 'pb-10'}`}>

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                        <Icon icon="solar:wallet-bold-duotone" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                            Qarzlar
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Barcha qarz va to'lovlarni nazorat qilish
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors w-full sm:w-auto"
                >
                    <Icon icon="solar:add-circle-bold-duotone" className="w-4 h-4" />
                    Yangi Qarz
                </button>
            </div>

            <DebtDashboard
                stats={stats}
                loading={loading}
                onPayCertifier={handlePayCertifier}
            />

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
                onSuccess={handleAddSuccess}
            />

            <CertifierPayModal
                isOpen={isCertifierPayModalOpen}
                onClose={() => setIsCertifierPayModalOpen(false)}
                onSuccess={handleCertifierSuccess}
                type={certifierPayType}
                remainingAmount={certifierRemainingAmount}
                branchId={certifierBranchId}
            />
        </div>
    );
};

export default Debts;
