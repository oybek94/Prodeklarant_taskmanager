import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import type { LeadStage } from './Leads';


const STAGES: { key: LeadStage; label: string; icon: string; color: string }[] = [
    { key: 'COLD', label: 'Yangi', icon: 'lucide:snowflake', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { key: 'IN_PROGRESS', label: 'Aloqada', icon: 'lucide:phone-call', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { key: 'MEETING', label: 'Uchrashuv', icon: 'lucide:calendar-check', color: 'bg-violet-100 text-violet-700 border-violet-200' },
    { key: 'FOLLOW_UP', label: "O'ylanyapti", icon: 'lucide:clock', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { key: 'CLOSED_WON', label: 'Mijoz', icon: 'lucide:check-circle-2', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { key: 'CLOSED_LOST', label: 'Rad etdi', icon: 'lucide:x-circle', color: 'bg-red-100 text-red-700 border-red-200' },
];

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
    call: { icon: 'lucide:phone', color: 'bg-blue-100 text-blue-600' },
    comment: { icon: 'lucide:message-square', color: 'bg-gray-100 text-gray-600' },
    stage_change: { icon: 'lucide:git-branch', color: 'bg-violet-100 text-violet-600' },
    created: { icon: 'lucide:plus-circle', color: 'bg-emerald-100 text-emerald-600' },
    import: { icon: 'lucide:upload', color: 'bg-teal-100 text-teal-600' },
};

interface Activity {
    id: number;
    type: string;
    note: string | null;
    createdAt: string;
    user: { id: number; name: string };
}

interface LeadFull {
    id: number;
    companyName: string;
    inn: string | null;
    productType: string | null;
    phone: string | null;
    contactPerson: string | null;
    estimatedExportVolume: string | null;
    region: string | null;
    district: string | null;
    exportedCountries: string | null;
    partners: string | null;
    stage: LeadStage;
    lostReason: string | null;
    nextCallAt: string | null;
    createdAt: string;
    updatedAt: string;
    assignedTo: { id: number; name: string } | null;
    activities: Activity[];
}

interface Worker { id: number; name: string; role: string; }

export default function LeadDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [lead, setLead] = useState<LeadFull | null>(null);
    const [loading, setLoading] = useState(true);
    const [workers, setWorkers] = useState<Worker[]>([]);

    // Edit mode
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<LeadFull>>({});

    // Activity
    const [actType, setActType] = useState<'call' | 'comment'>('call');
    const [actNote, setActNote] = useState('');
    const [addingAct, setAddingAct] = useState(false);

    // Stage change
    const [changingStage, setChangingStage] = useState(false);
    const [lostReason, setLostReason] = useState('');
    const [pendingStage, setPendingStage] = useState<LeadStage | null>(null);

    // Reminder
    const [reminder, setReminder] = useState('');
    const [savingReminder, setSavingReminder] = useState(false);


    const fetchLead = async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/leads/${id}`);
            setLead(data);
            if (data.nextCallAt) {
                const date = new Date(data.nextCallAt);
                const offset = date.getTimezoneOffset() * 60000;
                const localDate = new Date(date.getTime() - offset);
                setReminder(localDate.toISOString().slice(0, 16));
            } else {
                setReminder('');
            }
            setEditForm({
                companyName: data.companyName,
                inn: data.inn,
                productType: data.productType,
                phone: data.phone,
                contactPerson: data.contactPerson,
                estimatedExportVolume: data.estimatedExportVolume,
                region: data.region,
                district: data.district,
                exportedCountries: data.exportedCountries,
                partners: data.partners,
                assignedToId: data.assignedTo?.id ?? null,
            } as any);
        } catch {
            toast.error('Lid topilmadi');
            navigate('/leads');
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkers = async () => {
        try {
            const { data } = await apiClient.get('/workers');
            setWorkers(data.filter((w: Worker) => w.role === 'MANAGER' || w.role === 'ADMIN' || w.role === 'SELLER'));
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchLead(); fetchWorkers(); }, [id]);

    const handleSaveEdit = async () => {
        try {
            const { data } = await apiClient.put(`/leads/${id}`, editForm);
            setLead((prev) => ({ ...prev!, ...data }));
            setEditing(false);
            toast.success('Saqlandi');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Xatolik');
        }
    };

    const handleStageChange = async (stage: LeadStage) => {
        if (stage === 'CLOSED_LOST') {
            setPendingStage(stage);
            setChangingStage(true);
            return;
        }
        try {
            const { data } = await apiClient.put(`/leads/${id}`, { stage });
            setLead((prev) => ({ ...prev!, stage: data.stage, activities: prev!.activities }));
            await fetchLead();
            toast.success('Bosqich yangilandi');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Xatolik');
        }
    };

    const handleStageLost = async () => {
        if (!pendingStage) return;
        try {
            const { data } = await apiClient.put(`/leads/${id}`, {
                stage: pendingStage,
                lostReason,
            });
            setChangingStage(false);
            setPendingStage(null);
            setLostReason('');
            await fetchLead();
            toast.success('Bosqich yangilandi');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Xatolik');
        }
    };

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!actNote.trim()) { toast.error('Matn kiriting'); return; }
        setAddingAct(true);
        try {
            await apiClient.post(`/leads/${id}/activities`, { type: actType, note: actNote });
            setActNote('');
            await fetchLead();
            toast.success('Izoh qo\'shildi');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Xatolik');
        } finally {
            setAddingAct(false);
        }
    };

    const handleSaveReminder = async () => {
        setSavingReminder(true);
        try {
            await apiClient.put(`/leads/${id}`, {
                nextCallAt: reminder ? new Date(reminder).toISOString() : null,
            });
            await fetchLead();
            toast.success('Eslatma saqlandi');
        } catch {
            toast.error('Xatolik');
        } finally {
            setSavingReminder(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Ushbu lidni o\'chirishni tasdiqlaysizmi?')) return;
        try {
            await apiClient.delete(`/leads/${id}`);
            toast.success('O\'chirildi');
            navigate('/leads');
        } catch {
            toast.error('Xatolik');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Icon icon="lucide:loader-2" className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }
    if (!lead) return null;

    const currentStage = STAGES.find((s) => s.key === lead.stage);

    return (
        <div className="max-w-5xl mx-auto space-y-5">
            {/* Back + Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/leads')}
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Icon icon="lucide:arrow-left" className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                        {lead.companyName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        {editing ? (
                            <input
                                className="text-xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-blue-400 focus:outline-none"
                                value={(editForm as any).companyName ?? ''}
                                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                            />
                        ) : (
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{lead.companyName}</h1>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Yaratildi: {new Date(lead.createdAt).toLocaleDateString('uz-UZ')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {editing ? (
                        <>
                            <button onClick={() => setEditing(false)} className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                Bekor
                            </button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                                Saqlash
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setEditing(true)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title="Tahrirlash">
                                <Icon icon="lucide:pencil" className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            {user?.role !== 'SELLER' && (
                                <button onClick={handleDelete} className="p-2 rounded-xl border border-red-200 hover:bg-red-50 transition-colors" title="O'chirish">
                                    <Icon icon="lucide:trash-2" className="w-4 h-4 text-red-500" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left: Info + Stage + Reminder */}
                <div className="space-y-4">
                    {/* Info Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Ma'lumotlar</h2>
                        <div className="space-y-3">
                            {[
                                { label: 'Viloyat', field: 'region', icon: 'lucide:map-pin' },
                                { label: 'Tuman', field: 'district', icon: 'lucide:map' },
                                { label: 'STIR', field: 'inn', icon: 'lucide:hash' },
                                { label: 'Telefon', field: 'phone', icon: 'lucide:phone' },
                                { label: "Mas'ul shaxs", field: 'contactPerson', icon: 'lucide:user' },
                                { label: 'Tahminiy hajmi', field: 'estimatedExportVolume', icon: 'lucide:bar-chart-3' },
                                { label: 'Turkumi', field: 'productType', icon: 'lucide:package' },
                                { label: 'Export davlatlari', field: 'exportedCountries', icon: 'lucide:globe' },
                                { label: 'Xamkorlari', field: 'partners', icon: 'lucide:users' },
                            ].map(({ label, field, icon }) => (
                                <div key={field} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Icon icon={icon} className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                                        {editing ? (
                                            <input
                                                className="w-full text-sm text-gray-900 dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-400 py-0.5"
                                                value={(editForm as any)[field] ?? ''}
                                                onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-all">
                                                {field === 'estimatedExportVolume' && (lead as any)[field] && !isNaN(Number((lead as any)[field])) ? (
                                                    (() => {
                                                        const vol = Number((lead as any)[field]);
                                                        let colorClass = "text-gray-800 dark:text-gray-200";
                                                        if (vol > 30) colorClass = "text-emerald-600 dark:text-emerald-400 font-bold";
                                                        else if (vol >= 10) colorClass = "text-amber-500 dark:text-amber-400 font-semibold";
                                                        else colorClass = "text-red-500 dark:text-red-400 font-medium";

                                                        return <span className={colorClass}>{Math.round(vol).toLocaleString()}</span>;
                                                    })()
                                                ) : ((lead as any)[field] || '—')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {/* Assigned To */}
                            <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Icon icon="lucide:user-check" className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Sotuvchi</p>
                                    {editing ? (
                                        <select
                                            className="w-full text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 mt-0.5"
                                            value={(editForm as any).assignedToId ?? ''}
                                            onChange={(e) => setEditForm({ ...editForm, assignedToId: e.target.value ? Number(e.target.value) : null } as any)}
                                        >
                                            <option value="">Tayinlanmagan</option>
                                            {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    ) : (
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{lead.assignedTo?.name || '—'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pipeline Stage */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sotuv bosqichi</h2>
                        <div className="space-y-2">
                            {STAGES.map((s) => (
                                <button
                                    key={s.key}
                                    onClick={() => handleStageChange(s.key)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${lead.stage === s.key
                                        ? s.color + ' shadow-sm'
                                        : 'border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <Icon icon={s.icon} className="w-4 h-4 flex-shrink-0" />
                                    {s.label}
                                    {lead.stage === s.key && <Icon icon="lucide:check" className="w-3.5 h-3.5 ml-auto" />}
                                </button>
                            ))}
                        </div>
                        {lead.stage === 'CLOSED_LOST' && lead.lostReason && (
                            <div className="mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                                <p className="text-xs text-red-500 font-medium">Rad etish sababi:</p>
                                <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{lead.lostReason}</p>
                            </div>
                        )}
                    </div>

                    {/* Next Call Reminder */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <Icon icon="lucide:bell" className="w-4 h-4 text-amber-500" />
                            Keyingi qo'ng'iroq va vaqti
                        </h2>
                        <div className="flex gap-2">
                            <input
                                type="datetime-local"
                                value={reminder}
                                onChange={(e) => setReminder(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleSaveReminder}
                                disabled={savingReminder}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60"
                            >
                                {savingReminder
                                    ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                                    : <Icon icon="lucide:save" className="w-4 h-4" />}
                            </button>
                        </div>
                        {lead.nextCallAt && (
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5 font-medium">
                                <Icon icon="lucide:calendar" className="w-3.5 h-3.5 text-blue-500" />
                                {new Date(lead.nextCallAt).toLocaleString('uz-UZ', { 
                                    weekday: 'short', 
                                    day: 'numeric', 
                                    month: 'short', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                })}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: Activity Log */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Add Activity */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Yozuv qo'shish</h2>
                        <form onSubmit={handleAddActivity} className="space-y-3">
                            <div className="flex gap-2">
                                {(['call', 'comment'] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setActType(t)}
                                        className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-xl border transition-all ${actType === t
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <Icon icon={t === 'call' ? 'lucide:phone' : 'lucide:message-square'} className="w-4 h-4" />
                                        {t === 'call' ? 'Qo\'ng\'iroq' : 'Izoh'}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                rows={3}
                                value={actNote}
                                onChange={(e) => setActNote(e.target.value)}
                                placeholder={actType === 'call'
                                    ? "Qo'ng'iroq natijasi: muddati belgilandi, qayta aloqaga chiqamiz..."
                                    : "Izoh qoldiring..."}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                            <button
                                type="submit"
                                disabled={addingAct}
                                className="w-full py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {addingAct
                                    ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                                    : <Icon icon="lucide:send" className="w-4 h-4" />}
                                Saqlash
                            </button>
                        </form>
                    </div>

                    {/* Activity Timeline */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            Faoliyat tarixi
                            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                                {lead.activities.length}
                            </span>
                        </h2>
                        {lead.activities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-300 dark:text-gray-600">
                                <Icon icon="lucide:activity" className="w-10 h-10 mb-2" />
                                <p className="text-sm">Faoliyat yo'q</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {lead.activities.map((act, idx) => {
                                    const def = ACTIVITY_ICONS[act.type] ?? { icon: 'lucide:info', color: 'bg-gray-100 text-gray-500' };
                                    return (
                                        <div key={act.id} className="flex gap-3 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${def.color}`}>
                                                <Icon icon={def.icon} className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{act.user.name}</span>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                                                        {new Date(act.createdAt).toLocaleString('uz-UZ', {
                                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                {act.note && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{act.note}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lost Reason Modal */}
            {changingStage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Rad etish sababi</h3>
                        <p className="text-sm text-gray-500 mb-4">Mijoz nima sababdan rad etganini yozing</p>
                        <textarea
                            rows={3}
                            value={lostReason}
                            onChange={(e) => setLostReason(e.target.value)}
                            placeholder="Narx mos kelmadi, raqobatchi tanladi..."
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setChangingStage(false); setPendingStage(null); setLostReason(''); }}
                                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Bekor
                            </button>
                            <button
                                onClick={handleStageLost}
                                className="flex-1 py-2.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                            >
                                Saqlash
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
