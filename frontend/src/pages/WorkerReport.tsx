import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';
import Chart from 'react-apexcharts';

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n)).replace(/,/g, ' ').replace(/\./g, ',');
const fmtUsd = (n: number) => `$ ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n))}`;

export default function WorkerReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workerName, setWorkerName] = useState('');
  const [kpiStats, setKpiStats] = useState<any>(null);
  const [finStats, setFinStats] = useState<any>(null);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => { loadData(); }, [id, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await apiClient.get(`/users/${id}`);
      setWorkerName(userRes.data?.name || 'Ishchi');

      let params: any = {};
      if (dateRange !== 'all') {
        const end = new Date();
        const start = new Date();
        if (dateRange === '7days') start.setDate(start.getDate() - 7);
        else if (dateRange === '30days') start.setDate(start.getDate() - 30);
        else if (dateRange === 'month') start.setDate(1);
        params = { startDate: start.toISOString(), endDate: end.toISOString() };
      }

      const [kpi, fin] = await Promise.all([
        apiClient.get(`/kpi/worker-stats/${id}`, { params }),
        apiClient.get(`/workers/${id}/stats`, { params: { period: 'all' } }),
      ]);
      setKpiStats(kpi.data);
      setFinStats(fin.data);
    } catch (e) {
      console.error('Error fetching stats', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !kpiStats) return <div className="p-8 text-center text-gray-500">Ma'lumotlar yuklanmoqda...</div>;
  if (!kpiStats) return <div className="p-8 text-center text-red-500">Xatolik yuz berdi.</div>;

  const legacy = finStats ? {
    initial: finStats.legacyDebt + (finStats.payments?.filter((p: any) => p.isLegacyPayment).reduce((s: number, p: any) => s + Number(p.paidAmountUsd), 0) || 0),
    paid: finStats.payments?.filter((p: any) => p.isLegacyPayment).reduce((s: number, p: any) => s + Number(p.paidAmountUsd), 0) || 0,
    remaining: finStats.legacyDebt || 0,
  } : { initial: 0, paid: 0, remaining: 0 };

  const current = finStats ? {
    earned: finStats.totalEarned || 0,
    paid: finStats.totalPaid || 0,
    errors: finStats.totalErrors || 0,
    pending: finStats.pending || 0,
    currency: finStats.salaryCurrency || 'UZS',
  } : { earned: 0, paid: 0, errors: 0, pending: 0, currency: 'UZS' };

  const legacyPayments = finStats?.payments?.filter((p: any) => p.isLegacyPayment) || [];
  const currentPayments = finStats?.payments?.filter((p: any) => !p.isLegacyPayment) || [];

  // Charts
  const stageStats = kpiStats.stageStats || [];
  const dailyStats = kpiStats.dailyStats || [];

  const donutOpts: any = {
    labels: stageStats.map((s: any) => s.name),
    chart: { type: 'donut', fontFamily: 'Inter, sans-serif' },
    plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Jami', formatter: () => stageStats.reduce((s: number, x: any) => s + x.count, 0) + ' ta' } } } } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '12px' },
    colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
  };
  const donutSeries = stageStats.map((s: any) => s.count);

  const areaOpts: any = {
    chart: { type: 'area', fontFamily: 'Inter, sans-serif', toolbar: { show: false }, sparkline: { enabled: false } },
    xaxis: { categories: dailyStats.map((d: any) => d.date.slice(5)), labels: { style: { fontSize: '10px' } } },
    yaxis: { labels: { formatter: (v: number) => fmt(v) } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5 },
    colors: ['#6366f1'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 100] } },
    tooltip: { y: { formatter: (v: number) => fmt(v) + " so'm" } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
  };
  const areaSeries = [{ name: 'Ishlangan (UZS)', data: dailyStats.map((d: any) => d.totalUzs) }];

  // Stage bar chart
  const barOpts: any = {
    chart: { type: 'bar', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
    xaxis: { categories: stageStats.map((s: any) => s.name), labels: { formatter: (v: number) => fmt(v) } },
    colors: ['#10b981'],
    dataLabels: { enabled: false },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v: number) => fmt(v) + " so'm" } },
  };
  const barSeries = [{ name: 'Summa (UZS)', data: stageStats.map((s: any) => s.totalUzs) }];

  // Legacy debt progress
  const legacyPaidPct = legacy.initial > 0 ? Math.min(100, (legacy.paid / legacy.initial) * 100) : 0;

  // Current earned vs paid vs errors radial
  const currentPaidPct = current.earned > 0 ? Math.min(100, (current.paid / current.earned) * 100) : 0;
  const currentErrorsPct = current.earned > 0 ? Math.min(100, (current.errors / current.earned) * 100) : 0;
  const radialOpts: any = {
    chart: { type: 'radialBar', fontFamily: 'Inter, sans-serif' },
    plotOptions: { radialBar: { hollow: { size: '45%' }, track: { background: '#e2e8f0' }, dataLabels: { name: { fontSize: '12px', color: '#64748b' }, value: { fontSize: '18px', fontWeight: 700, color: '#1e293b', formatter: (v: number) => v.toFixed(0) + '%' }, total: { show: true, label: 'Umumiy', formatter: () => Math.round(currentPaidPct + currentErrorsPct) + '%' } } } },
    labels: ["To'langan", 'Xatoliklar'],
    colors: ['#8b5cf6', '#ef4444'],
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-xl p-5 rounded-2xl shadow-sm border border-white/80 ring-1 ring-black/5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/workers')} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            <Icon icon="solar:arrow-left-bold-duotone" className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">{workerName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Ishchi samaradorligi va moliyaviy hisobot</p>
          </div>
        </div>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
          className="bg-white border border-gray-200 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm min-w-[160px] font-medium">
          <option value="all">Barcha vaqt</option>
          <option value="month">Shu oy</option>
          <option value="7days">Oxirgi 7 kun</option>
          <option value="30days">Oxirgi 30 kun</option>
        </select>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Legacy Debt */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-100/80 p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-200/20 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center border border-amber-200/50">
              <Icon icon="solar:buildings-bold-duotone" className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-amber-600/80 uppercase tracking-wider">Eski qarz (USD)</span>
          </div>
          <p className="text-2xl font-black text-amber-900 tracking-tight">{fmtUsd(legacy.remaining)}</p>
          <p className="text-xs text-amber-600/70 mt-1">Boshlang'ich: {fmtUsd(legacy.initial)} · To'langan: {fmtUsd(legacy.paid)}</p>
        </div>

        {/* Current Earned */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-sm border border-emerald-100/80 p-5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-200/20 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center border border-emerald-200/50">
              <Icon icon="solar:graph-up-bold-duotone" className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-emerald-600/80 uppercase tracking-wider">Ishlab topilgan</span>
          </div>
          <p className="text-2xl font-black text-emerald-900 tracking-tight">{fmt(current.earned)} <small className="text-sm font-bold opacity-60">so'm</small></p>
          <p className="text-xs text-emerald-600/70 mt-1">Joriy mavsum daromadi</p>
        </div>

        {/* Current Paid */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-sm border border-purple-100/80 p-5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-200/20 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center border border-purple-200/50">
              <Icon icon="solar:wallet-bold-duotone" className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-bold text-purple-600/80 uppercase tracking-wider">To'langan</span>
          </div>
          <p className="text-2xl font-black text-purple-900 tracking-tight">{fmt(current.paid)} <small className="text-sm font-bold opacity-60">so'm</small></p>
          <p className="text-xs text-purple-600/70 mt-1">Joriy mavsumda berilgan</p>
        </div>

        {/* Pending */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100/80 p-5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-200/20 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center border border-blue-200/50">
              <Icon icon="solar:clock-circle-bold-duotone" className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-blue-600/80 uppercase tracking-wider">Qolgan haq</span>
          </div>
          <p className="text-2xl font-black text-blue-900 tracking-tight">{fmt(current.pending)} <small className="text-sm font-bold opacity-60">so'm</small></p>
          <p className="text-xs text-blue-600/70 mt-1">Hali to'lanmagan ish haqi</p>
        </div>
      </div>

      {/* Performance KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-4 ring-1 ring-black/5 text-center">
          <Icon icon="solar:check-circle-bold-duotone" className="w-7 h-7 text-indigo-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-gray-900">{kpiStats.summary.totalTasks}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Bajarilgan vazifalar</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-4 ring-1 ring-black/5 text-center">
          <Icon icon="solar:calendar-date-bold-duotone" className="w-7 h-7 text-teal-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-gray-900">{dailyStats.length}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Aktiv kunlar</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-4 ring-1 ring-black/5 text-center">
          <Icon icon="solar:layers-bold-duotone" className="w-7 h-7 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-gray-900">{stageStats.length}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Bosqich turlari</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-4 ring-1 ring-black/5 text-center">
          <Icon icon="solar:bolt-bold-duotone" className="w-7 h-7 text-rose-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-gray-900">{dailyStats.length > 0 ? Math.round(kpiStats.summary.totalTasks / dailyStats.length) : 0}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">O'rtacha kun/vazifa</p>
        </div>
      </div>

      {/* Legacy Debt Progress */}
      {legacy.initial > 0 && (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-6 ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Icon icon="solar:buildings-bold-duotone" className="w-5 h-5 text-amber-500" />
              O'tgan mavsum qarzini yopish jarayoni
            </h3>
            <span className="text-sm font-bold text-amber-600">{legacyPaidPct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 ease-out relative"
              style={{ width: `${legacyPaidPct}%` }}>
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>To'langan: {fmtUsd(legacy.paid)}</span>
            <span>Qolgan: {fmtUsd(legacy.remaining)}</span>
          </div>
          {legacyPayments.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">To'lov tarixi</p>
              {legacyPayments.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center bg-amber-50/60 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-600">{new Date(p.paymentDate).toLocaleDateString('en-US')}</span>
                  <span className="text-gray-500 text-xs flex-1 mx-3 truncate">{p.comment || '-'}</span>
                  <span className="font-bold text-amber-700">{fmtUsd(p.paidAmountUsd)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Earnings Area */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-6 ring-1 ring-black/5">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Icon icon="solar:chart-2-bold-duotone" className="w-5 h-5 text-indigo-500" />
            Kunlik daromad dinamikasi
          </h3>
          {dailyStats.length > 0 ? (
            <Chart options={areaOpts} series={areaSeries} type="area" height={280} />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">Oraliqda ma'lumot yo'q</div>
          )}
        </div>

        {/* Donut */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-6 ring-1 ring-black/5">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Icon icon="solar:pie-chart-2-bold-duotone" className="w-5 h-5 text-purple-500" />
            Vazifalar taqsimoti
          </h3>
          {stageStats.length > 0 ? (
            <Chart options={donutOpts} series={donutSeries} type="donut" height={280} />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">Oraliqda ma'lumot yo'q</div>
          )}
        </div>
      </div>

      {/* Radial + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radial - Current paid pct */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-6 ring-1 ring-black/5 flex flex-col items-center">
          <h3 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2 self-start">
            <Icon icon="solar:target-bold-duotone" className="w-5 h-5 text-violet-500" />
            Joriy to'lov holati
          </h3>
          <Chart options={radialOpts} series={[Math.round(currentPaidPct), Math.round(currentErrorsPct)]} type="radialBar" height={250} />
          <div className="text-center mt-1 space-y-0.5">
            <p className="text-xs text-gray-500">Ishlab topilgan: <span className="font-bold text-emerald-600">{fmt(current.earned)}</span></p>
            <p className="text-xs text-gray-500">To'langan: <span className="font-bold text-purple-600">{fmt(current.paid)}</span></p>
            <p className="text-xs text-gray-500">Xatoliklar: <span className="font-bold text-red-500">{fmt(current.errors)}</span></p>
            <p className="text-xs text-gray-500">Qolgan: <span className="font-bold text-blue-600">{fmt(current.pending)}</span></p>
          </div>
        </div>

        {/* Horizontal bar - stage earnings */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-6 ring-1 ring-black/5">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Icon icon="solar:chart-square-bold-duotone" className="w-5 h-5 text-emerald-500" />
            Bosqichlar bo'yicha daromad (UZS)
          </h3>
          {stageStats.length > 0 ? (
            <Chart options={barOpts} series={barSeries} type="bar" height={Math.max(200, stageStats.length * 45)} />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400">Oraliqda ma'lumot yo'q</div>
          )}
        </div>
      </div>

      {/* Current Payments */}
      {currentPayments.length > 0 && (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 ring-1 ring-black/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100/80 bg-purple-50/40">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Icon icon="solar:card-bold-duotone" className="w-5 h-5 text-purple-500" />
              Joriy mavsumda olingan to'lovlar ({currentPayments.length} ta)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Sana</th>
                  <th className="px-6 py-3 text-left">Izoh</th>
                  <th className="px-6 py-3 text-right">Summa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {currentPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{new Date(p.paymentDate).toLocaleDateString('en-US')}</td>
                    <td className="px-6 py-3 text-gray-700">{p.comment || '-'}</td>
                    <td className="px-6 py-3 text-right font-bold text-purple-600 whitespace-nowrap">
                      {p.paidCurrency === 'UZS' ? `${fmt(p.paidAmountUzs)} so'm` : fmtUsd(p.paidAmountUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task History Table */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100/80 bg-indigo-50/30 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Icon icon="solar:checklist-bold-duotone" className="w-5 h-5 text-indigo-500" />
            Oxirgi vazifalar tarixi
          </h3>
          <span className="text-xs text-gray-500 font-medium bg-white px-3 py-1 rounded-full border">{kpiStats.logs?.length || 0} ta yozuv</span>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 sticky top-0">
              <tr>
                <th className="px-6 py-3">Sana</th>
                <th className="px-6 py-3">Bosqich</th>
                <th className="px-6 py-3">Vazifa</th>
                <th className="px-6 py-3 text-right">Summa (UZS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {(!kpiStats.logs || kpiStats.logs.length === 0) ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Malumot topilmadi</td></tr>
              ) : (
                kpiStats.logs.slice(0, 100).map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{new Date(log.createdAt).toLocaleDateString('en-US')}</td>
                    <td className="px-6 py-3">
                      <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-semibold rounded-full border border-indigo-100">{log.stageName}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-medium text-gray-800">{log.taskTitle || 'Boshqa'}</span>
                      {log.clientName && <span className="text-gray-400 block text-xs mt-0.5">{log.clientName}</span>}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">+{fmt(log.amountUzs)}</td>
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
