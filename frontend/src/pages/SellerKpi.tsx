import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../utils/useIsMobile';

const BONUS_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    PHONE_MEETING: { label: 'Telda uchrashuv', icon: 'lucide:phone-call', color: 'text-blue-500' },
    IN_PERSON_MEETING: { label: 'Yuzma-yuz uchrashuv', icon: 'lucide:users', color: 'text-violet-500' },
    CONTRACT_SMALL: { label: 'Shartnoma (< 20)', icon: 'lucide:file-check', color: 'text-emerald-500' },
    CONTRACT_MEDIUM: { label: 'Shartnoma (20-50)', icon: 'lucide:file-check-2', color: 'text-amber-500' },
    CONTRACT_LARGE: { label: 'Shartnoma (> 50)', icon: 'lucide:trophy', color: 'text-rose-500' },
};

function CircularProgress({ value, max, label, icon, color, size = 120 }: { value: number; max: number; label: string; icon: string; color: string; size?: number }) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    const r = (size - 12) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    const done = value >= max;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-gray-100 dark:text-gray-700" />
                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={8} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                        className={`transition-all duration-1000 ease-out ${done ? 'text-emerald-500' : color}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Icon icon={done ? 'lucide:check-circle-2' : icon} className={`w-5 h-5 mb-0.5 ${done ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span className={`text-xl font-black ${done ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>{value}</span>
                    <span className="text-[10px] text-gray-400">/ {max}</span>
                </div>
            </div>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${done ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                {pct}%
            </span>
        </div>
    );
}

export default function SellerKpi() {
    const { user } = useAuth();
    const isMobile = useIsMobile();
    const isAdmin = user?.role === 'ADMIN';
    const [loading, setLoading] = useState(true);
    const [myStats, setMyStats] = useState<any>(null);
    const [dashboard, setDashboard] = useState<any>(null);
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
    const [subsInput, setSubsInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'my' | 'team'>(isAdmin ? 'team' : 'my');

    useEffect(() => {
        loadData();
    }, [period]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [myRes, dashRes] = await Promise.all([
                apiClient.get('/seller-kpi/my-stats'),
                isAdmin ? apiClient.get(`/seller-kpi/dashboard?period=${period}`) : Promise.resolve(null),
            ]);
            setMyStats(myRes.data);
            if (dashRes) setDashboard(dashRes.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSaveSubscribers = async () => {
        if (!subsInput) return;
        setSaving(true);
        try {
            await apiClient.put('/seller-kpi/daily', { subscribersAdded: Number(subsInput) });
            setSubsInput('');
            loadData();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const formatAmount = (n: number) => n.toLocaleString('uz-UZ');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Icon icon="lucide:loader-2" className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${isMobile ? 'pb-32' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Icon icon="lucide:target" className="w-6 h-6 text-indigo-500" />
                        Sotuvchi KPI
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kunlik vazifalar va bonus nazorati</p>
                </div>
                {isAdmin && (
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
                        {(['my', 'team'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                                {t === 'my' ? 'Shaxsiy' : 'Jamoa'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {tab === 'my' && myStats && (
                <>
                    {/* Bugungi progress */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                            <Icon icon="lucide:clock" className="w-5 h-5 text-indigo-500" />
                            Bugungi holat
                        </h2>
                        <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
                            <CircularProgress value={myStats.today?.callsMade || 0} max={40} label="Qo'ng'iroqlar" icon="lucide:phone" color="text-blue-500" />
                            <CircularProgress value={myStats.today?.subscribersAdded || 0} max={20} label="Obunachi" icon="lucide:user-plus" color="text-violet-500" />
                        </div>
                        {/* Obunachi kiritish */}
                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Bugun kanalga qo'shilgan obunachi sonini kiriting:</label>
                            <div className="flex gap-2">
                                <input type="number" min="0" value={subsInput} onChange={e => setSubsInput(e.target.value)} placeholder="Soni..."
                                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                <button onClick={handleSaveSubscribers} disabled={saving || !subsInput}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                                    {saving ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" /> : 'Saqlash'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Oylik bonus summasi */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-center gap-2 mb-2 opacity-80"><Icon icon="lucide:banknote" className="w-5 h-5" /><span className="text-sm">Oylik bonus</span></div>
                            <p className="text-3xl font-black">{formatAmount(myStats.totalMonthlyBonus || 0)} <span className="text-lg font-medium opacity-80">so'm</span></p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-center gap-2 mb-2 opacity-80"><Icon icon="lucide:calendar-check" className="w-5 h-5" /><span className="text-sm">Uchrashuvlar</span></div>
                            <p className="text-3xl font-black">{(myStats.bonusBreakdown?.phoneMeetings?.length || 0) + (myStats.bonusBreakdown?.inPersonMeetings?.length || 0)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-center gap-2 mb-2 opacity-80"><Icon icon="lucide:file-check" className="w-5 h-5" /><span className="text-sm">Shartnomalar</span></div>
                            <p className="text-3xl font-black">{(myStats.bonusBreakdown?.contractsSmall?.length || 0) + (myStats.bonusBreakdown?.contractsMedium?.length || 0) + (myStats.bonusBreakdown?.contractsLarge?.length || 0)}</p>
                        </div>
                    </div>

                    {/* Bonus tarixi */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <Icon icon="lucide:gift" className="w-5 h-5 text-amber-500" />
                            Bonus tarixi (shu oy)
                        </h2>
                        {myStats.monthlyBonuses?.length > 0 ? (
                            <div className="space-y-2">
                                {myStats.monthlyBonuses.map((b: any) => {
                                    const cfg = BONUS_LABELS[b.type] || { label: b.type, icon: 'lucide:star', color: 'text-gray-500' };
                                    return (
                                        <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${cfg.color}`}>
                                                <Icon icon={cfg.icon} className="w-4.5 h-4.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cfg.label}</p>
                                                <p className="text-xs text-gray-400 truncate">{b.lead?.companyName || b.note || '—'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatAmount(Number(b.amount))} so'm</p>
                                                <p className="text-[10px] text-gray-400">{new Date(b.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-300 dark:text-gray-600">
                                <Icon icon="lucide:inbox" className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Hali bonus yo'q</p>
                            </div>
                        )}
                    </div>

                    {/* Qoidalar */}
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 p-6">
                        <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
                            <Icon icon="lucide:scroll-text" className="w-4 h-4" /> Kelishuv shartlari
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1"><Icon icon="lucide:alert-triangle" className="w-4 h-4" /> Majburiy (kunlik)</p>
                                <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                                    <li className="flex items-center gap-2"><Icon icon="lucide:phone" className="w-3.5 h-3.5 text-blue-500" /> 40 ta lid bilan gaplashish</li>
                                    <li className="flex items-center gap-2"><Icon icon="lucide:user-plus" className="w-3.5 h-3.5 text-violet-500" /> 20 ta obunachi qo'shish</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1"><Icon icon="lucide:gift" className="w-4 h-4" /> Bonus</p>
                                <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                                    <li className="flex items-center gap-2"><Icon icon="lucide:phone-call" className="w-3.5 h-3.5 text-blue-500" /> Telda uchrashuv — <b>10,000</b> so'm</li>
                                    <li className="flex items-center gap-2"><Icon icon="lucide:users" className="w-3.5 h-3.5 text-violet-500" /> Yuzma-yuz uchrashuv — <b>30,000</b> so'm</li>
                                    <li className="flex items-center gap-2"><Icon icon="lucide:file-check" className="w-3.5 h-3.5 text-emerald-500" /> Shartnoma {'<'} 20 — <b>300,000</b> so'm</li>
                                    <li className="flex items-center gap-2"><Icon icon="lucide:file-check-2" className="w-3.5 h-3.5 text-amber-500" /> Shartnoma 20-50 — <b>600,000</b> so'm</li>
                                    <li className="flex items-center gap-2"><Icon icon="lucide:trophy" className="w-3.5 h-3.5 text-rose-500" /> Shartnoma {'>'} 50 — <b>1,200,000</b> so'm</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {tab === 'team' && isAdmin && dashboard && (
                <>
                    {/* Period filter */}
                    <div className="flex gap-2">
                        {(['today', 'week', 'month'] as const).map(p => (
                            <button key={p} onClick={() => setPeriod(p)}
                                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${period === p ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                {p === 'today' ? 'Bugun' : p === 'week' ? 'Hafta' : 'Oy'}
                            </button>
                        ))}
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Jami qo'ng'iroqlar</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{dashboard.summary.totalCalls}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Jami obunachi</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{dashboard.summary.totalSubscribers}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Jami bonus</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatAmount(dashboard.summary.totalBonuses)} <span className="text-sm font-medium">so'm</span></p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shartnomalar</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{dashboard.summary.totalContracts}</p>
                        </div>
                    </div>

                    {/* Seller cards */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Sotuvchilar</h2>
                        {dashboard.sellers.map((s: any) => (
                            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
                                            {s.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{s.name}</p>
                                            <p className="text-xs text-gray-400">Bonus: <span className="text-emerald-500 font-bold">{formatAmount(s.totalBonusAmount)} so'm</span></p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                            📞 {s.totalCalls}
                                        </span>
                                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                                            👥 {s.totalSubscribers}
                                        </span>
                                    </div>
                                </div>
                                {/* Progress bars */}
                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-500">Qo'ng'iroqlar</span>
                                            <span className={`font-bold ${s.callsCompliance >= 100 ? 'text-emerald-500' : s.callsCompliance >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{s.callsCompliance}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${s.callsCompliance >= 100 ? 'bg-emerald-500' : s.callsCompliance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, s.callsCompliance)}%` }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-500">Obunachi</span>
                                            <span className={`font-bold ${s.subscribersCompliance >= 100 ? 'text-emerald-500' : s.subscribersCompliance >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{s.subscribersCompliance}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${s.subscribersCompliance >= 100 ? 'bg-emerald-500' : s.subscribersCompliance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, s.subscribersCompliance)}%` }} />
                                        </div>
                                    </div>
                                </div>
                                {/* Bonus breakdown */}
                                <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                                    <span>📞 Uchrashuv: <b className="text-gray-700 dark:text-gray-300">{s.bonusBreakdown.phoneMeetings + s.bonusBreakdown.inPersonMeetings}</b></span>
                                    <span>📄 Shartnoma: <b className="text-gray-700 dark:text-gray-300">{s.bonusBreakdown.contracts}</b></span>
                                </div>
                            </div>
                        ))}
                        {dashboard.sellers.length === 0 && (
                            <div className="text-center py-12 text-gray-300 dark:text-gray-600">
                                <Icon icon="lucide:users" className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                <p>SELLER rolidagi foydalanuvchi topilmadi</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
