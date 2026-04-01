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
    _count: { activities: number };
    activities: { note: string | null; createdAt: string; type: string }[];
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
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${s.color}`}>
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
        companyName: '', inn: '', productType: '', phone: '', contactPerson: '', estimatedExportVolume: '',
        region: '', district: '', exportedCountries: '', partners: ''
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 my-8">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Yangi lid qo'shish</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <Icon icon="lucide:x" className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Viloyat</label>
                            <input
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Namangan"
                                value={form.region}
                                onChange={(e) => setForm({ ...form, region: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tuman</label>
                            <input
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Uychi tumani"
                                value={form.district}
                                onChange={(e) => setForm({ ...form, district: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tahminiy hajmi</label>
                            <input
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="100 tonna"
                                value={form.estimatedExportVolume}
                                onChange={(e) => setForm({ ...form, estimatedExportVolume: e.target.value })}
                            />
                        </div>
                        <div className="opacity-0 pointer-events-none"></div>
                    </div>



                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Export qilgan davlatlari</label>
                        <input
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Rossiya, Xitoy, Turkiya..."
                            value={form.exportedCountries}
                            onChange={(e) => setForm({ ...form, exportedCountries: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Xamkorlari</label>
                        <input
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Logistika kompaniyalari, agentlar..."
                            value={form.partners}
                            onChange={(e) => setForm({ ...form, partners: e.target.value })}
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
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState<number>(() => Number(sessionStorage.getItem('leads_page')) || 1);
    const [limit, setLimit] = useState<number>(() => Number(sessionStorage.getItem('leads_limit')) || 25);
    const [loading, setLoading] = useState(true);
    const [activeStage, setActiveStage] = useState<LeadStage | 'ALL'>(() => (sessionStorage.getItem('leads_stage') as LeadStage | 'ALL') || 'ALL');
    const [search, setSearch] = useState<string>(() => sessionStorage.getItem('leads_search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState<string>(() => sessionStorage.getItem('leads_search') || '');
    const [filterSeller, setFilterSeller] = useState<string>(() => sessionStorage.getItem('leads_seller') || '');
    const [filterRegion, setFilterRegion] = useState<string>(() => sessionStorage.getItem('leads_region') || '');
    const [filterType, setFilterType] = useState<string>(() => sessionStorage.getItem('leads_type') || '');
    const [filterVolume, setFilterVolume] = useState<string>(() => sessionStorage.getItem('leads_volume') || '');
    const [filterCountry, setFilterCountry] = useState<string>(() => sessionStorage.getItem('leads_country') || '');
    const [filterPartners, setFilterPartners] = useState<string>(() => sessionStorage.getItem('leads_partners') || '');
    const [showModal, setShowModal] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const importRef = useRef<HTMLInputElement>(null);
    const searchTimerRef = useRef<any>(null);
    const isInitialMount = useRef(true);
    const [importing, setImporting] = useState(false);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (activeStage !== 'ALL') params.stage = activeStage;
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
            if (filterSeller) params.assignedToId = filterSeller;
            if (filterRegion.trim()) params.region = filterRegion.trim();
            if (filterType.trim()) params.productType = filterType.trim();
            if (filterVolume) params.exportVolume = filterVolume;
            if (filterCountry.trim()) params.exportedCountries = filterCountry.trim();
            if (filterPartners.trim()) params.partners = filterPartners.trim();
            params.page = page;
            params.limit = limit;

            const { data } = await apiClient.get('/leads', { params });
            if (data && data.data) {
                setLeads(data.data);
                setTotal(data.total);
            } else {
                setLeads(Array.isArray(data) ? data : []);
                setTotal(Array.isArray(data) ? data.length : 0);
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
            setUsers(data.filter((u: User) => u.role === 'MANAGER' || u.role === 'ADMIN' || u.role === 'SELLER'));
        } catch { /* ignore */ }
    };

    // Initial load for users
    useEffect(() => { fetchUsers(); }, []);

    // Fetch leads whenever any filter state changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            setPage(1);
        }
    }, [activeStage, debouncedSearch, filterSeller, filterRegion, filterType, filterVolume, filterCountry, filterPartners]);

    useEffect(() => {
        sessionStorage.setItem('leads_page', page.toString());
        sessionStorage.setItem('leads_limit', limit.toString());
        sessionStorage.setItem('leads_stage', activeStage);
        sessionStorage.setItem('leads_search', search);
        sessionStorage.setItem('leads_seller', filterSeller);
        sessionStorage.setItem('leads_region', filterRegion);
        sessionStorage.setItem('leads_type', filterType);
        sessionStorage.setItem('leads_volume', filterVolume);
        sessionStorage.setItem('leads_country', filterCountry);
        sessionStorage.setItem('leads_partners', filterPartners);
    }, [page, limit, activeStage, search, filterSeller, filterRegion, filterType, filterVolume, filterCountry, filterPartners]);

    useEffect(() => {
        fetchLeads();
    }, [activeStage, debouncedSearch, filterSeller, filterRegion, filterType, filterVolume, filterCountry, filterPartners, page, limit]);

    // Handle search debounce separately
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [search]);

    // Handle search input change
    const handleSearchInput = (val: string) => {
        setSearch(val);
    };

    // Handle region select change
    const handleRegionChange = (val: string) => {
        setFilterRegion(val);
    };

    // Handle volume select change
    const handleVolumeChange = (val: string) => {
        setFilterVolume(val);
    };

    // Handle stage tab change
    const handleStageChange = (s: LeadStage | 'ALL') => {
        setActiveStage(s);
    };

    const clearFilters = () => {
        setSearch('');
        setDebouncedSearch('');
        setFilterSeller('');
        setFilterRegion('');
        setFilterType('');
        setFilterVolume('');
        setFilterCountry('');
        setFilterPartners('');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await apiClient.post('/leads/import', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success("Lidlar import qilindi");
            fetchLeads();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Import xatosi');
        } finally {
            setImporting(false);
            if (importRef.current) importRef.current.value = '';
        }
    };

    const regions = [
        "Andijon", "Buxoro", "Farg'ona", "Jizzax", "Xorazm", "Namangan", "Navoiy",
        "Qashqadaryo", "Qoraqalpog'iston", "Samarqand", "Sirdaryo", "Surxondaryo", "Toshkent"
    ];

    const stageCounts = STAGES.reduce((acc, s) => {
        acc[s.key] = leads.length; // Note: This will show current filtered count on all tabs
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-5">
            <div className="flex items-end justify-between gap-4 flex-wrap pb-2 border-b border-gray-100 dark:border-gray-800">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Lidlar bazasi</h1>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Potensial eksportyor mijozlar</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
                    <button
                        onClick={() => importRef.current?.click()}
                        disabled={importing}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
                    >
                        {importing ? <Icon icon="lucide:loader-2" className="w-3.5 h-3.5 animate-spin" /> : <Icon icon="lucide:upload" className="w-3.5 h-3.5" />}
                        Import
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm active:scale-95"
                    >
                        <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
                        Yangi lid
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-3 items-center">
                <div className="relative flex-1 group w-full">
                    <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Firma, STIR, telefon yoki o'zim qidirgan ma'lumot..."
                        value={search}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border-transparent bg-gray-100/50 dark:bg-gray-800/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-800 transition-all border border-gray-50 dark:border-gray-700/50"
                    />
                </div>
                <div className="w-full md:w-48">
                    <select
                        value={filterRegion}
                        onChange={(e) => handleRegionChange(e.target.value)}
                        className="w-full px-4 py-2 text-sm border-transparent bg-gray-100/50 dark:bg-gray-800/50 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer border border-gray-50 dark:border-gray-700/50"
                    >
                        <option value="">Barchasi (Viloyat)</option>
                        {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-44">
                    <select
                        value={filterVolume}
                        onChange={(e) => handleVolumeChange(e.target.value)}
                        className="w-full px-4 py-2 text-sm border-transparent bg-gray-100/50 dark:bg-gray-800/50 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer border border-gray-50 dark:border-gray-700/50"
                    >
                        <option value="">Barchasi (Hajm)</option>
                        <option value="low">Past (&lt;10)</option>
                        <option value="medium">O'rta (10-30)</option>
                        <option value="high">Yuqori (&gt;30)</option>
                    </select>
                </div>
                <div className="w-full md:w-36">
                    <input
                        type="text"
                        placeholder="Export davlati..."
                        value={filterCountry}
                        onChange={(e) => setFilterCountry(e.target.value)}
                        className="w-full px-3 py-2 text-sm border-transparent bg-gray-100/50 dark:bg-gray-800/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all border border-gray-50 dark:border-gray-700/50"
                    />
                </div>
                <div className="w-full md:w-36">
                    <input
                        type="text"
                        placeholder="Xamkorlar..."
                        value={filterPartners}
                        onChange={(e) => setFilterPartners(e.target.value)}
                        className="w-full px-3 py-2 text-sm border-transparent bg-gray-100/50 dark:bg-gray-800/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all border border-gray-50 dark:border-gray-700/50"
                    />
                </div>
                {(search || filterRegion || filterVolume || filterCountry || filterPartners) && (
                    <button
                        onClick={clearFilters}
                        className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                        Tozalash
                    </button>
                )}
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
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Firma</th>
                                    <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Manzil</th>
                                    <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Eksport hajmi</th>
                                    <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Export davlatlari</th>
                                    <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Hamkorlar</th>
                                    <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Holat</th>
                                    <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Keyingi qo'ng'iroq</th>
                                    <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Izoh</th>
                                    <th className="px-4 py-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {leads.map((lead) => {
                                    const isOverdue = lead.nextCallAt && new Date(lead.nextCallAt) < new Date() &&
                                        lead.stage !== 'CLOSED_WON' && lead.stage !== 'CLOSED_LOST';
                                    return (
                                        <tr
                                            key={lead.id}
                                            onClick={() => navigate(`/leads/${lead.id}`)}
                                            className="hover:bg-blue-50/30 dark:hover:bg-blue-900/5 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-4 py-3.5">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {lead.companyName}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                                                {lead.region ? (
                                                    <span className="truncate max-w-[150px] block" title={`${lead.region}${lead.district ? `, ${lead.district}` : ''}`}>
                                                        {lead.region}{lead.district ? `, ${lead.district}` : ''}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-sm">
                                                {lead.estimatedExportVolume ? (() => {
                                                    const vol = Number(lead.estimatedExportVolume);
                                                    const isNumeric = !isNaN(vol);
                                                    let colorClass = "text-gray-500 dark:text-gray-400 font-medium";

                                                    if (isNumeric) {
                                                        if (vol > 30) {
                                                            colorClass = "text-emerald-600 dark:text-emerald-400 font-bold";
                                                        } else if (vol >= 10) {
                                                            colorClass = "text-amber-500 dark:text-amber-400 font-semibold";
                                                        } else {
                                                            colorClass = "text-red-500 dark:text-red-400 font-medium";
                                                        }
                                                    }

                                                    return (
                                                        <span className={colorClass}>
                                                            {isNumeric ? Math.round(vol).toLocaleString() : lead.estimatedExportVolume}
                                                        </span>
                                                    );
                                                })() : <span className="text-gray-300 dark:text-gray-700">—</span>}
                                            </td>
                                            <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="truncate max-w-[150px] block" title={lead.exportedCountries || ''}>
                                                    {lead.exportedCountries || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="truncate max-w-[150px] block" title={lead.partners || ''}>
                                                    {lead.partners || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <StageBadge stage={lead.stage} />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {lead.nextCallAt ? (
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm border ${
                                                        isOverdue 
                                                            ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' 
                                                            : 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800'
                                                    }`}>
                                                        <Icon icon={isOverdue ? "lucide:phone-incoming" : "lucide:calendar-check"} className="w-3.5 h-3.5" />
                                                        {new Date(lead.nextCallAt).toLocaleDateString('uz-UZ')}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 max-w-[250px]">
                                                {lead.activities?.[0] ? (
                                                    <div>
                                                        <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium line-clamp-2 leading-relaxed" title={lead.activities[0].note || ''}>
                                                            {lead.activities[0].note || lead.activities[0].type}
                                                        </p>
                                                        <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-1">
                                                            <Icon icon="lucide:clock" className="w-2.5 h-2.5" />
                                                            {new Date(lead.activities[0].createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <Icon icon="lucide:arrow-right" className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-blue-500" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        {/* Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Oldingi
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * limit >= total}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Keyingi
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between font-outfit uppercase">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Ko'rsatilyapti <span className="font-bold text-gray-900 dark:text-white">{Math.min(total, (page - 1) * limit + 1)}</span> dan{' '}
                                        <span className="font-bold text-gray-900 dark:text-white">{Math.min(total, page * limit)}</span> gacha, jami{' '}
                                        <span className="font-bold text-gray-900 dark:text-white">{total}</span> ta lid
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={limit}
                                        onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                        className="text-[10px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-200 outline-none"
                                    >
                                        <option value={25}>25 ta</option>
                                        <option value={50}>50 ta</option>
                                        <option value={100}>100 ta</option>
                                    </select>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center px-1.5 py-1.5 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Oldingi</span>
                                            <Icon icon="lucide:chevron-left" className="h-4 w-4" />
                                        </button>
                                        {[...Array(Math.ceil(total / limit))].map((_, i) => {
                                            const p = i + 1;
                                            // Show only some page numbers if there are too many
                                            if (
                                                p === 1 || 
                                                p === Math.ceil(total / limit) || 
                                                (p >= page - 1 && p <= page + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={p}
                                                        onClick={() => setPage(p)}
                                                        className={`relative inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-medium ${
                                                            page === p 
                                                                ? 'z-10 bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400' 
                                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        {p}
                                                    </button>
                                                );
                                            } else if (
                                                (p === 2 && page > 3) || 
                                                (p === Math.ceil(total / limit) - 1 && page < Math.ceil(total / limit) - 2)
                                            ) {
                                                return (
                                                    <span key={p} className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
                                                        ...
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })}
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page * limit >= total}
                                            className="relative inline-flex items-center px-1.5 py-1.5 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Keyingi</span>
                                            <Icon icon="lucide:chevron-right" className="h-4 w-4" />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
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
