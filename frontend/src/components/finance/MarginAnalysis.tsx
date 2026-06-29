import React from 'react';
import { Icon } from '@iconify/react';

interface MarginAnalysisProps {
    grossMargin: number;
    netMargin: number;
}

const MarginAnalysis = React.memo(({ grossMargin, netMargin }: MarginAnalysisProps) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Icon icon="solar:sale-bold-duotone" className="w-5 h-5 text-indigo-500" />
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
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Formula:</span> (Tushum - Tan narx) / Tushum. <br />Asosiy ish jarayonlarining o'zi qanchalik foydali ekanini ko'rsatadi.
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
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Formula:</span> Sof Foyda / Tushum. <br />Ofis, yashirin xarajatlar va soliqlar ayrib tashlangandan keyingi haqiqiy rentabellik.
                    </p>
                </div>
            </div>
        </div>
    );
});

export default MarginAnalysis;
