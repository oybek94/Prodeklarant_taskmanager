import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '../lib/api';

const Finance = () => {
  const [data, setData] = useState({
    revenue: 0,
    expenses: 0,
    cash: 0,
    debtors: 0,
  });
  const [loading, setLoading] = useState(true);

  // API dan ma'lumotlarni yuklash
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/finance/ceo-stats');
        setData(res.data);
      } catch (error) {
        console.error("CEO statistikani yuklashda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Sof foyda formulasi
  const netProfit = data.revenue - data.expenses;

  // Valyutani formatlash funksiyasi
  const formatCurrency = (amount: number) => {
    if (loading) return 'Yuklanmoqda...';
    return new Intl.NumberFormat('uz-UZ', {
        style: 'currency',
        currency: 'UZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace(/,/g, ' ');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header qismi */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3 tracking-tight">
            <Icon icon="lucide:pie-chart" className="w-8 h-8 text-blue-600 dark:text-blue-500" />
            Moliya Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Asosiy ko'rsatkichlar va moliyaviy oqimlar nazorati.</p>
        </div>

        {/* 1. Asosiy blok (CEO ko'rishi kerak bo'lgan 5 raqam) */}
        <div>
           <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
             <Icon icon="lucide:layout-template" className="w-5 h-5 text-gray-400" />
             Asosiy Blok
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
             
             {/* 1. Jami tushum (Revenue) */}
             <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-green-200 dark:hover:border-green-900/50 transition-all duration-300 group">
               <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-900/30 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
               <div className="relative z-10">
                 <div className="flex items-center justify-between mb-4">
                   <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Jami tushum</p>
                   <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center ring-4 ring-green-50 dark:ring-green-900/10">
                     <Icon icon="lucide:trending-up" className="w-5 h-5 text-green-600 dark:text-green-400" />
                   </div>
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                   {formatCurrency(data.revenue)}
                 </h3>
                 <p className="text-[11px] text-green-600 dark:text-green-400 mt-3 font-semibold bg-green-50 dark:bg-green-900/30 w-fit px-2.5 py-1 rounded-md uppercase tracking-wider">Revenue</p>
               </div>
             </div>

             {/* 2. Jami xarajat (Expenses) */}
             <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-300 group">
               <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/10 dark:to-red-900/30 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
               <div className="relative z-10">
                 <div className="flex items-center justify-between mb-4">
                   <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Jami xarajat</p>
                   <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center ring-4 ring-red-50 dark:ring-red-900/10">
                     <Icon icon="lucide:trending-down" className="w-5 h-5 text-red-600 dark:text-red-400" />
                   </div>
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                   {formatCurrency(data.expenses)}
                 </h3>
                 <p className="text-[11px] text-red-600 dark:text-red-400 mt-3 font-semibold bg-red-50 dark:bg-red-900/30 w-fit px-2.5 py-1 rounded-md uppercase tracking-wider">Expenses</p>
               </div>
             </div>

             {/* 3. Sof foyda (Net profit) */}
             <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300 group border border-blue-500/50">
               <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700 ease-out" />
               <div className="absolute -left-8 -top-8 w-24 h-24 bg-white/5 rounded-full" />
               <div className="relative z-10">
                 <div className="flex items-center justify-between mb-4">
                   <p className="text-sm font-semibold text-blue-100">Sof foyda</p>
                   <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-inner">
                     <Icon icon="lucide:briefcase" className="w-5 h-5 text-white" />
                   </div>
                 </div>
                 <h3 className="text-3xl font-bold text-white tracking-tight">
                   {formatCurrency(netProfit)}
                 </h3>
                 <div className="flex items-center gap-2 mt-3">
                   <p className="text-[11px] text-blue-100 font-semibold bg-black/10 w-fit px-2.5 py-1 rounded-md backdrop-blur-sm uppercase tracking-wider">Net Profit</p>
                   <span className="text-[10px] text-blue-200">Formula: Tushum - Xarajat</span>
                 </div>
               </div>
             </div>

             {/* 4. Cash (hisobdagi pul) */}
             <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all duration-300 group">
               <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/10 dark:to-emerald-900/30 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
               <div className="relative z-10">
                 <div className="flex items-center justify-between mb-4">
                   <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Cash / Hisobda</p>
                   <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center ring-4 ring-emerald-50 dark:ring-emerald-900/10">
                     <Icon icon="lucide:wallet" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                   </div>
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                   {formatCurrency(data.cash)}
                 </h3>
                 <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-3 font-semibold bg-emerald-50 dark:bg-emerald-900/30 w-fit px-2.5 py-1 rounded-md uppercase tracking-wider">Naqd va bank</p>
               </div>
             </div>

             {/* 5. Debitor qarzdorlik */}
             <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900/50 transition-all duration-300 group">
               <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-900/30 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
               <div className="relative z-10">
                 <div className="flex items-center justify-between mb-4">
                   <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Debitor qarzdorlik</p>
                   <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center ring-4 ring-purple-50 dark:ring-purple-900/10">
                     <Icon icon="lucide:users" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                   </div>
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                   {formatCurrency(data.debtors)}
                 </h3>
                 <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-3 font-semibold bg-purple-50 dark:bg-purple-900/30 w-fit px-2.5 py-1 rounded-md uppercase tracking-wider">Mijozlar qarzlari</p>
               </div>
             </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default Finance;
