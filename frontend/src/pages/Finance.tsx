import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '../lib/api';
import VirtualCards from '../components/finance/VirtualCards';
import MainMetrics from '../components/finance/MainMetrics';
import AnalyticsBlocks from '../components/finance/AnalyticsBlocks';
import ProfitDynamics from '../components/finance/ProfitDynamics';
import MarginAnalysis from '../components/finance/MarginAnalysis';

const Finance = () => {
    const [data, setData] = useState({
        revenue: 0,
        expenses: 0,
        cash: 0,
        debtors: 0,
        topClientsByRevenue: [] as { name: string, total: number }[],
        expensesByCategory: [] as { name: string, sum: number }[],
        profitDynamics: [] as { month: string, revenue: number, expenses: number }[],
        virtualCards: [] as { id: number, name: string, description: string, perTask: number, total: number }[],
    });
    const [loading, setLoading] = useState(true);

    // API dan ma'lumotlarni yuklash
    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/finance/ceo-stats');
            setData({
                revenue: res.data.revenue || 0,
                expenses: res.data.expenses || 0,
                cash: res.data.cash || 0,
                debtors: res.data.debtors || 0,
                topClientsByRevenue: res.data.topClientsByRevenue || [],
                expensesByCategory: res.data.expensesByCategory || [],
                profitDynamics: res.data.profitDynamics || [],
                virtualCards: res.data.virtualCards || [],
            });
        } catch (error) {
            console.error("CEO statistikani yuklashda xatolik:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Sof foyda formulasi
    const netProfit = useMemo(() => {
        const opex = data.expensesByCategory.reduce((sum, cat) => sum + cat.sum, 0);
        const grossProfit = data.revenue - data.expenses;
        return grossProfit - opex;
    }, [data.revenue, data.expenses, data.expensesByCategory]);

    // Rentabellik (Margin)
    const grossMargin = useMemo(() => {
        const grossProfit = data.revenue - data.expenses;
        return data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0;
    }, [data.revenue, data.expenses]);

    const netMargin = useMemo(() => {
        return data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0;
    }, [data.revenue, netProfit]);

    // Xarajat / Tushum KPI
    const expenseRatio = useMemo(() => {
        return data.revenue > 0 ? (data.expenses / data.revenue) * 100 : 0;
    }, [data.revenue, data.expenses]);

    const isRisk = expenseRatio > 60;

    // Valyutani formatlash funksiyasi
    const formatCurrency = useCallback((amount: number) => {
        if (loading) return 'Yuklanmoqda...';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'UZS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount).replace(/,/g, ' ').replace(/\./g, ',');
    }, [loading]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 animate-fade-in">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* Header qismi */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3 tracking-tight">
                        <Icon icon="solar:pie-chart-2-bold-duotone" className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                        Moliya Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Asosiy ko'rsatkichlar va moliyaviy oqimlar nazorati.</p>
                </div>

                <VirtualCards
                    cards={data.virtualCards}
                    formatCurrency={formatCurrency}
                />

                <MainMetrics
                    revenue={data.revenue}
                    expenses={data.expenses}
                    netProfit={netProfit}
                    cash={data.cash}
                    debtors={data.debtors}
                    formatCurrency={formatCurrency}
                />

                <AnalyticsBlocks
                    topClientsByRevenue={data.topClientsByRevenue}
                    expensesByCategory={data.expensesByCategory}
                    loading={loading}
                    formatCurrency={formatCurrency}
                    expenseRatio={expenseRatio}
                    isRisk={isRisk}
                />

                <ProfitDynamics
                    profitDynamics={data.profitDynamics}
                    formatCurrency={formatCurrency}
                />

                <MarginAnalysis
                    grossMargin={grossMargin}
                    netMargin={netMargin}
                />

            </div>
        </div>
    );
};

export default Finance;
