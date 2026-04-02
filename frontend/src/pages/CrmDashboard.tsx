import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import apiClient from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../utils/useIsMobile';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


interface Stats {
    totalLeads: number;
    byStage: Record<string, number>;
    todayActivities: number;
    todayMeetings: number;
    sellerPerformance: { id: number; name: string; total: number; won: number }[];
    last7Days: { date: string; count: number }[];
}

const STAGE_CONFIG: { key: string; label: string; color: string; icon: string }[] = [
    { key: 'COLD', label: 'Yangi', color: 'text-blue-600', icon: 'lucide:snowflake' },
    { key: 'IN_PROGRESS', label: 'Aloqada', color: 'text-amber-600', icon: 'lucide:phone-call' },
    { key: 'MEETING', label: 'Uchrashuv', color: 'text-violet-600', icon: 'lucide:calendar-check' },
    { key: 'FOLLOW_UP', label: "O'ylanyapti", color: 'text-orange-600', icon: 'lucide:clock' },
    { key: 'CLOSED_WON', label: 'Mijozlar', color: 'text-emerald-600', icon: 'lucide:check-circle-2' },
    { key: 'CLOSED_LOST', label: 'Rad etdi', color: 'text-red-500', icon: 'lucide:x-circle' },
];

function KpiCard({ label, value, icon, sub }: { label: string; value: string | number; icon: string; sub?: string }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <Icon icon={icon} className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}

export default function CrmDashboard() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isMobile = useIsMobile();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient
            .get('/leads/stats')
            .then((r) => setStats(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const isDark = theme === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';

    const chartData = {
        labels: stats?.last7Days.map((d) => d.date) ?? [],
        datasets: [
            {
                label: 'Qo\'ng\'iroqlar',
                data: stats?.last7Days.map((d) => d.count) ?? [],
                backgroundColor: 'rgba(99,102,241,0.7)',
                borderRadius: 6,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { color: gridColor }, ticks: { color: labelColor } },
            y: { grid: { color: gridColor }, ticks: { color: labelColor, stepSize: 1 } },
        },
    };

    const wonRate = stats
        ? stats.totalLeads > 0
            ? Math.round(((stats.byStage['CLOSED_WON'] ?? 0) / stats.totalLeads) * 100)
            : 0
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Icon icon="lucide:loader-2" className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${isMobile ? 'pb-32' : ''}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM Analytics</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Sotuvchi samaradorligi va lid statistikasi</p>
                </div>
                <button
                    onClick={() => navigate('/leads')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <Icon icon="lucide:target" className="w-4 h-4" />
                    Lidlar ro'yxati
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Jami lidlar" value={stats?.totalLeads ?? 0} icon="lucide:users-2" />
                <KpiCard label="Bugungi qo'ng'iroqlar" value={stats?.todayActivities ?? 0} icon="lucide:phone" sub="Bugun" />
                <KpiCard label="Bugungi uchrashuvlar" value={stats?.todayMeetings ?? 0} icon="lucide:calendar-check" sub="Bugun belgilandi" />
                <KpiCard label="Konversiya" value={`${wonRate}%`} icon="lucide:trending-up" sub="Liddan mijozga" />
            </div>

            {/* Pipeline Funnel */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">Sotuv voronkasi</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {STAGE_CONFIG.map((s) => {
                        const count = stats?.byStage[s.key] ?? 0;
                        const pct = stats?.totalLeads ? Math.round((count / stats.totalLeads) * 100) : 0;
                        return (
                            <button
                                key={s.key}
                                onClick={() => navigate(`/leads?stage=${s.key}`)}
                                className="flex flex-col items-center p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all group"
                            >
                                <Icon icon={s.icon} className={`w-6 h-6 mb-2 ${s.color}`} />
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-0.5">{s.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{pct}%</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">So'nggi 7 kun faoliyati</h2>
                    <Bar data={chartData} options={chartOptions} />
                </div>

                {/* Seller Performance */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">Sotuvchi reytingi</h2>
                    {!stats?.sellerPerformance.length ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-300 dark:text-gray-600">
                            <Icon icon="lucide:bar-chart-2" className="w-10 h-10 mb-2" />
                            <p className="text-sm">Ma'lumot yo'q</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.sellerPerformance
                                .sort((a, b) => b.won - a.won)
                                .map((s, idx) => {
                                    const convRate = s.total > 0 ? Math.round((s.won / s.total) * 100) : 0;
                                    const maxWon = Math.max(...stats.sellerPerformance.map((x) => x.won), 1);
                                    return (
                                        <div key={s.id} className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-gray-400 w-5">{idx + 1}</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center text-sm mb-1">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400">{s.total} lid</span>
                                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                            {s.won} ✓
                                                        </span>
                                                        <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-lg">
                                                            {convRate}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all"
                                                        style={{ width: `${(s.won / maxWon) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
