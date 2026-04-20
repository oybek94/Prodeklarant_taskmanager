import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '../lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const Finance = () => {
  const [data, setData] = useState({
    revenue: 0,
    expenses: 0,
    cash: 0,
    debtors: 0,
    topClientsByRevenue: [] as {name: string, total: number}[],
    expensesByCategory: [] as {name: string, sum: number}[],
    profitDynamics: [] as {month: string, revenue: number, expenses: number}[],
  });
  const [loading, setLoading] = useState(true);

  // API dan ma'lumotlarni yuklash
  useEffect(() => {
    const fetchStats = async () => {
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
        });
      } catch (error) {
        console.error("CEO statistikani yuklashda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Sof foyda formulasi
  const opex = data.expensesByCategory.reduce((sum, cat) => sum + cat.sum, 0);
  const grossProfit = data.revenue - data.expenses;
  const netProfit = grossProfit - opex;

  // Rentabellik (Margin)
  const grossMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0;
  const netMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0;

  // Xarajat / Tushum KPI
  const expenseRatio = data.revenue > 0 ? (data.expenses / data.revenue) * 100 : 0;
  const isRisk = expenseRatio > 60;

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

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

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
                   <span className="text-[10px] text-blue-200">Formula: T - X</span>
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

        {/* Analitika bloklari */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* 2. Tushum analitikasi (Top 5 Mijoz) */}
           <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                <Icon icon="lucide:award" className="w-5 h-5 text-yellow-500" />
                TOP 5 Mijozlar (Tushum bo'yicha)
              </h2>
              
              <div className="space-y-3 flex-grow">
                {data.topClientsByRevenue.map((client, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 shadow-sm">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{client.name}</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(client.total)}</span>
                  </div>
                ))}
                {!loading && data.topClientsByRevenue.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full py-10 opacity-60">
                    <Icon icon="lucide:inbox" className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-gray-500">Mijozlar tushumi mavjud emas</p>
                  </div>
                )}
              </div>
           </div>

           {/* 3. Xarajatlar nazorati */}
           <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Icon icon="lucide:pie-chart" className="w-5 h-5 text-red-500" />
                  Xarajatlar nazorati
                </h2>
                
                {/* KPI Badge */}
                <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold shadow-sm ${isRisk ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/50' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800/50'}`}>
                  <Icon icon={isRisk ? "lucide:alert-triangle" : "lucide:check-circle"} className="w-4 h-4" />
                  {expenseRatio.toFixed(1)}% Xarajat / Tushum
                </div>
              </div>

              {/* Alert: If expense > 60% */}
              {isRisk && (
                <div className="mb-6 p-4 md:p-5 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800/30 flex gap-4 items-start shadow-sm animate-pulse-slight">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg shrink-0">
                    <Icon icon="lucide:alert-octagon" className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Xavf oralig'i!</h4>
                    <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed text-pretty">Xarajatlar tushumga nisbatan 60% dan oshib ketdi. Xarajatlarni optimallashtirish va moliya oqimini nazorat qilish tavsiya etiladi.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-6">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="sum"
                      >
                        {data.expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => formatCurrency(Number(val))} 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  {data.expensesByCategory.map((exp, idx) => {
                     const totalOp = data.expensesByCategory.reduce((s, e) => s + e.sum, 0) || 1;
                     const pct = (exp.sum / totalOp) * 100;
                     return (
                        <div key={idx}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                              {exp.name}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(exp.sum)}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                             <div className="h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                          </div>
                        </div>
                     )
                  })}
                  {!loading && data.expensesByCategory.length === 0 && (
                    <p className="text-gray-500 text-center text-sm py-4">Xarajatlar kiritilmagan</p>
                  )}
                </div>
              </div>
           </div>

        </div>

        {/* 4. Foyda dinamikasi */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
             <div>
               <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-1">
                 <Icon icon="lucide:bar-chart-3" className="w-5 h-5 text-indigo-500" />
                 Foyda Dinamikasi
               </h2>
               <p className="text-sm text-gray-500 dark:text-gray-400">Oylik kesimda tushum va xarajatlar tahlili</p>
             </div>
             
             <div className="flex items-center gap-4 text-sm font-medium">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Tushum
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-400"></div> Xarajat
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-indigo-500"></div> Sof Foyda
               </div>
             </div>
           </div>

           <div className="h-[350px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={data.profitDynamics.map(p => ({ ...p, profit: p.revenue - p.expenses }))} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                 <defs>
                   <linearGradient id="profitColor" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                     <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                 <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickMargin={12} axisLine={false} tickLine={false} />
                 <YAxis 
                   stroke="#9ca3af" 
                   fontSize={12} 
                   tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} 
                   axisLine={false} 
                   tickLine={false} 
                   width={60}
                 />
                 <Tooltip 
                   formatter={(value: any, name: any) => [formatCurrency(Number(value)), name === 'profit' ? 'Sof Foyda' : name === 'revenue' ? 'Tushum' : 'Xarajat']}
                   labelStyle={{ color: '#9ca3af', marginBottom: '8px' }}
                   contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '12px', padding: '12px' }}
                 />
                 <Area type="monotone" dataKey="revenue" stackId="2" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                 <Area type="monotone" dataKey="expenses" stackId="3" stroke="#f87171" strokeWidth={2} fillOpacity={0} />
                 <Area type="monotone" dataKey="profit" stackId="1" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#profitColor)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
         </div>

         {/* 9. Rentabellik (Margin) */}
         <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Icon icon="lucide:percent" className="w-5 h-5 text-indigo-500" />
                9. Rentabellik (Margin)
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Biznesning daromadlilik darajasini o'lchovchi eng muhim ko'rsatkichlar.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Gross Margin */}
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Gross Margin</h3>
                    <p className="text-xs text-gray-500 mt-1">Yalpi foyda marjasi</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${grossMargin >= 30 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : grossMargin <= 10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {grossMargin >= 30 ? 'Yaxshi' : grossMargin <= 10 ? 'Xavf' : 'O\'rtacha'}
                  </div>
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <span className={`text-4xl font-black ${grossMargin >= 30 ? 'text-green-600 dark:text-green-400' : grossMargin <= 10 ? 'text-red-600 dark:text-red-400' : 'text-amber-500'}`}>
                    {grossMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                  <div 
                    className={`h-2 rounded-full ${grossMargin >= 30 ? 'bg-green-500' : grossMargin <= 10 ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, grossMargin))}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-4 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50 leading-relaxed text-balance">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Formula:</span> (Tushum - Tan narx) / Tushum. <br/>Asosiy ish jarayonlarining o'zi qanchalik foydali ekanini ko'rsatadi.
                </p>
              </div>

              {/* Net Margin */}
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Net Margin</h3>
                    <p className="text-xs text-gray-500 mt-1">Sof foyda marjasi</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${netMargin >= 30 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : netMargin <= 10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {netMargin >= 30 ? 'Yaxshi' : netMargin <= 10 ? 'Xavf' : 'O\'rtacha'}
                  </div>
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <span className={`text-4xl font-black ${netMargin >= 30 ? 'text-blue-600 dark:text-blue-400' : netMargin <= 10 ? 'text-red-600 dark:text-red-400' : 'text-amber-500'}`}>
                    {netMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                  <div 
                    className={`h-2 rounded-full ${netMargin >= 30 ? 'bg-blue-500' : netMargin <= 10 ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, netMargin))}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-4 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50 leading-relaxed text-balance">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Formula:</span> Sof Foyda / Tushum. <br/>Ofis, yashirin xarajatlar va soliqlar ayrib tashlangandan keyingi haqiqiy rentabellik.
                </p>
              </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default Finance;
