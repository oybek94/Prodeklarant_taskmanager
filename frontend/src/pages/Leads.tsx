import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';


export type LeadStage =
    | 'COLD'
    | 'IN_PROGRESS'
    | 'MEETING'
    | 'FOLLOW_UP'
    | 'CLOSED_WON'
    | 'CLOSED_LOST';

export interface Lead {
    id: number;
    companyName: string;
    inn: string | null;
    productType: string | null;
    phone: string | null;
    contactPerson: string | null;
    stage: LeadStage;
    lostReason: string | null;
    nextCallAt: string | null;
    createdAt: string;
    updatedAt: string;
    assignedTo: { id: number; name: string } | null;
    _count: { activities: number };
}

interface User { id: number; name: string; role: string; }

const STAGES: { key: LeadStage | 'ALL'; label: string; color: string; dot: string }[] = [
    { key: 'ALL', label: 'Barchasi', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
    { key: 'COLD', label: 'Yangi', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
    { key: 'IN_PROGRESS', label: 'Aloqada', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
    { key: 'MEETING', label: 'Uchrashuv', color: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
    { key: 'FOLLOW_UP', label: "O'ylanyapti", color: 'bg-orange-50 text-orange-700', dot: 'bg-orange-400' },
    { key: 'CLOSED_WON', label: 'Mijoz', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    { key: 'CLOSED_LOST', label: 'Rad etdi', color: 'bg-red-50 text-red-700', dot: 'bg-red-400' },
];

function StageBadge({ stage }: { stage: LeadStage }) {
    const s = STAGES.find((x) => x.key === stage) ?? STAGES[0];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    );
}

function AddLeadModal({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: (lead: Lead) => void;
}) {
    const [form, setForm] = useState({
        companyName: '', inn: '', productType: '', phone: '', contactPerson: '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.companyName.trim()) { toast.error('Firma nomi majburiy'); return; }
        setSaving(true);
        try {
            const { data } = await apiClient.post('/leads', form);
            toast.success('Lid qo\'shildi');
            onCreated(data);
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Yangi lid qo'shish</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <Icon icon="lucide:x" className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Firma nomi <span className="text-red-500">*</span>
                        </label>
                        <input
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="OOO Iqbol Trade"
                            value={form.companyName}
                            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">STIR</label>
                            <input
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="123456789"
                                value={form.inn}
                                onChange={(e) => setForm({ ...form, inn: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
                            <input
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="+998 90 000 00 00"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mahsulot turi</label>
                        <input
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Meva-sabzavot, don mahsulotlari..."
                            value={form.productType}
                            onChange={(e) => setForm({ ...form, productType: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mas'ul shaxs</label>
                        <input
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Direktor ismi"
                            value={form.contactPerson}
                            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Bekor
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {saving ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" /> : <Icon icon="lucide:plus" className="w-4 h-4" />}
                            Qo'shish
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Leads() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStage, setActiveStage] = useState<LeadStage | 'ALL'>('ALL');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const importRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    const fetchLeads = async (stage: LeadStage | 'ALL' = activeStage, q: string = search) => {
        setLoading(true);
        try {
            const params: any = {};
            if (stage !== 'ALL') params.stage = stage;
            if (q.trim()) params.search = q.trim();
            const { data } = await apiClient.get('/leads', { params });
            if (Array.isArray(data)) {
                setLeads(data);
            } else {
                setLeads([]);
            }
        } catch {
            toast.error("Lidlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await apiClient.get('/workers');
            setUsers(data.filter((u: User) => u.role === 'MANAGER' || u.role === 'ADMIN'));
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchLeads(); fetchUsers(); }, []);

    const handleStageChange = (s: LeadStage | 'ALL') => {
        setActiveStage(s);
        fetchLeads(s, search);
    };

    const handleSearch = (val: string) => {
        setSearch(val);
        const timer = setTimeout(() => fetchLeads(activeStage, val), 400);
        return () => clearTimeout(timer);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await apiClient.post('/leads/import', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(`${data.imported} ta lid import qilindi`);
            fetchLeads(activeStage, search);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Import xatosi');
        } finally {
            setImporting(false);
            if (importRef.current) importRef.current.value = '';
        }
    };

    const stageCounts = STAGES.reduce((acc, s) => {
        acc[s.key] = leads.length; // recount from full list below
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lidlar bazasi</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Potensial eksportyor mijozlar
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        ref={importRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleImport}
                    />
                    <button
                        onClick={() => importRef.current?.click()}
                        disabled={importing}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
                    >
                        {importing
                            ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                            : <Icon icon="lucide:upload" className="w-4 h-4" />}
                        Excel/CSV import
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
                    >
                        <Icon icon="lucide:plus" className="w-4 h-4" />
                        Yangi lid
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Firma, STIR, telefon yoki mas'ul shaxs bo'yicha qidirish..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Stage Tabs */}
            <div className="flex gap-2 flex-wrap">
                {STAGES.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => handleStageChange(s.key as LeadStage | 'ALL')}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all border ${activeStage === s.key
                            ? 'border-blue-200 bg-blue-600 text-white shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Icon icon="lucide:loader-2" className="w-7 h-7 animate-spin text-blue-500" />
                    </div>
                ) : leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Icon icon="lucide:inbox" className="w-12 h-12 mb-3 opacity-40" />
                        <p className="text-sm font-medium">Lidlar topilmadi</p>
                        <p className="text-xs mt-1">Yangi lid qo'shish yoki Excel import qiling</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Firma</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">STIR</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mahsulot</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Telefon</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mas'ul</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Holat</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Keyingi qo'ng'iroq</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sotuvchi</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {leads.map((lead) => {
                                    const isOverdue = lead.nextCallAt && new Date(lead.nextCallAt) < new Date() &&
                                        lead.stage !== 'CLOSED_WON' && lead.stage !== 'CLOSED_LOST';
                                    return (
                                        <tr
                                            key={lead.id}
                                            onClick={() => navigate(`/leads/${lead.id}`)}
                                            className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {lead.companyName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{lead.companyName}</p>
                                                        {lead._count.activities > 0 && (
                                                            <p className="text-xs text-gray-400">{lead._count.activities} ta faoliyat</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{lead.inn || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{lead.productType || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {lead.phone ? (
                                                    <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="hover:text-blue-600 transition-colors">
                                                        {lead.phone}
                                                    </a>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{lead.contactPerson || '—'}</td>
                                            <td className="px-4 py-3">
                                                <StageBadge stage={lead.stage} />
                                                {lead.stage === 'CLOSED_LOST' && lead.lostReason && (
                                                    <p className="text-xs text-red-400 mt-0.5 truncate max-w-[120px]">{lead.lostReason}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {lead.nextCallAt ? (
                                                    <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                                        {isOverdue && <Icon icon="lucide:alert-circle" className="w-3 h-3 inline mr-1" />}
                                                        {new Date(lead.nextCallAt).toLocaleDateString('uz-UZ')}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{lead.assignedTo?.name || '—'}</td>
                                            <td className="px-4 py-3">
                                                <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <AddLeadModal
                    onClose={() => setShowModal(false)}
                    onCreated={(lead) => setLeads((prev) => [lead, ...prev])}
                />
            )}
        </div>
    );
}
