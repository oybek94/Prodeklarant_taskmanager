import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';
import Chart from 'react-apexcharts';

// format uzs
const formatUzs = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount);
};

export default function WorkerReport() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [workerName, setWorkerName] = useState('');
    const [stats, setStats] = useState<any>(null);

    // Date filters
    const [dateRange, setDateRange] = useState('all'); // '7days', '30days', 'month', 'all'

    useEffect(() => {
        loadWorkerStats();
    }, [id, dateRange]);

    const loadWorkerStats = async () => {
        try {
            setLoading(true);
            // Let's also fetch worker info first
            const userRes = await apiClient.get(`/users/${id}`);
            setWorkerName(userRes.data?.name || 'Ishchi');

            // Build date params
            let params = {};
            if (dateRange !== 'all') {
                const end = new Date();
                const start = new Date();
                if (dateRange === '7days') {
                    start.setDate(start.getDate() - 7);
                } else if (dateRange === '30days') {
                    start.setDate(start.getDate() - 30);
                } else if (dateRange === 'month') {
                    start.setDate(1); // start of month
                }
                params = {
                    startDate: start.toISOString(),
                    endDate: end.toISOString()
                };
            }

            const response = await apiClient.get(`/kpi/worker-stats/${id}`, { params });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) {
        return <div className="p-8 text-center text-gray-500">Ma'lumotlar yuklanmoqda...</div>;
    }

    if (!stats) return <div className="p-8 text-center text-red-500">Xatolik yuz berdi. Iltimos qaytadan urining.</div>;

    // Chart configs
    const pieChartOptions = {
        labels: stats.stageStats.map((s: any) => s.name),
        chart: { type: 'donut', fontFamily: 'Inter, sans-serif' },
        plotOptions: { pie: { donut: { size: '65%' } } },
        dataLabels: { enabled: false },
        legend: { position: 'bottom' },
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']
    };
    const pieChartSeries = stats.stageStats.map((s: any) => s.count);

    const lineChartOptions = {
        chart: { type: 'area', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        xaxis: { categories: stats.dailyStats.map((d: any) => d.date) },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#3B82F6'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
        tooltip: { y: { formatter: (val: number) => formatUzs(val) + " so'm" } }
    };
    const lineChartSeries = [{ name: 'Ishlangan summa', data: stats.dailyStats.map((d: any) => d.totalUzs) }];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <button onClick={() => navigate('/workers')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2">
                        <Icon icon="lucide:arrow-left" className="w-4 h-4" /> Ishchilar ro'yxatiga qaytish
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{workerName}</h1>
                    <p className="text-sm text-gray-500 mt-1">Ishchi samaradorligi va daromad hisoboti</p>
                </div>

                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="bg-white border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm min-w-[150px]"
                >
                    <option value="all">Barcha vaqt</option>
                    <option value="month">Shu oy</option>
                    <option value="7days">Oxirgi 7 kun</option>
                    <option value="30days">Oxirgi 30 kun</option>
                </select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Icon icon="lucide:check-circle" className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Jami bajarilgan vazifalar</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.summary.totalTasks} ta</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                            <Icon icon="lucide:coins" className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Umumiy ishlab topilgan pul</p>
                            <h3 className="text-2xl font-bold text-emerald-600">{formatUzs(stats.summary.totalUzs)} so'm</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <Icon icon="lucide:activity" className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Aktiv ishlagan kunlar</p>
                            <h3 className="text-2xl font-bold text-purple-600">{stats.dailyStats.length} kun</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">Kunlik daromad grafigi</h3>
                    {stats.dailyStats.length > 0 ? (
                        <Chart options={lineChartOptions as any} series={lineChartSeries} type="area" height={300} />
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-400">Oraliqda ma'lumot yo'q</div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">Vazifalar bo'linishi</h3>
                    {stats.stageStats.length > 0 ? (
                        <Chart options={pieChartOptions as any} series={pieChartSeries} type="donut" height={300} />
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-400">Oraliqda ma'lumot yo'q</div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-base font-semibold text-gray-800">Oxirgi bajarilgan vazifalar ro'yxati (Tarix)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left align-middle text-gray-600">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Bajarilgan Sana</th>
                                <th className="px-6 py-3">Bosqich nomi</th>
                                <th className="px-6 py-3">Vazifa Ma'lumotlari</th>
                                <th className="px-6 py-3 text-right">Summa (UZS)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats.logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Malumot topilmadi</td>
                                </tr>
                            ) : (
                                stats.logs.slice(0, 100).map((log: any) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString('ru-RU')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-50 text-blue-600 px-2.5 py-1.5 flex w-fit items-center text-xs font-semibold rounded-full border border-blue-100">
                                                {log.stageName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-800">{log.taskTitle || 'Boshqa'}</span>
                                            {log.clientName && <span className="text-gray-400 block text-xs mt-0.5">{log.clientName}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                                            +{formatUzs(log.amountUzs)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
