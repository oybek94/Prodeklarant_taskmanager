import { useEffect, useState, useCallback, useRef } from 'react';
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
    { key: 'WRONG_NUMBER', label: "Raqam xato", icon: 'lucide:phone-off', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    { key: 'UNREACHABLE', label: "O'chiq / Ko'tarmadi", icon: 'lucide:phone-missed', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
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

interface Conversation {
    id: number;
    audioUrl: string;
    audioFileName: string;
    audioDuration: number | null;
    transcript: string | null;
    sentiment: any;
    keyInsights: any;
    compliance: any;
    summary: string | null;
    status: 'UPLOADING' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'ERROR';
    errorMessage: string | null;
    uploadedBy: { id: number; name: string };
    createdAt: string;
}

const playSuccessSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const playNote = (freq: number, startTime: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
            
            gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + duration);
        };
        
        // E5, A5
        playNote(659.25, 0, 0.15);
        playNote(880.00, 0.1, 0.4);
    } catch(e) { /* ignore */ }
};

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

    // AI Features
    const [score, setScore] = useState<{ score: number; explanation: string; temperature: string } | null>(null);
    const [loadingScore, setLoadingScore] = useState(false);
    const [summary, setSummary] = useState<{ summary: string; nextBestAction: string } | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [aiMessageContext, setAiMessageContext] = useState('');
    const [generatingMessage, setGeneratingMessage] = useState(false);
    const [aiMode, setAiMode] = useState(false);

    // Conversations
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [expandedConv, setExpandedConv] = useState<number | null>(null);
    const dropRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);


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

    const fetchConversations = async () => {
        try {
            const { data } = await apiClient.get(`/leads/${id}/conversations`);
            setConversations(data);

            // Agar hali tahlil qilinayotgan suhbat bo'lsa, polling davom etsin
            const processing = data.some((c: Conversation) => c.status === 'TRANSCRIBING' || c.status === 'ANALYZING' || c.status === 'UPLOADING');
            if (processing && !pollingRef.current) {
                pollingRef.current = setInterval(async () => {
                    try {
                        const { data: updated } = await apiClient.get(`/leads/${id}/conversations`);
                        setConversations(updated);
                        const stillProcessing = updated.some((c: Conversation) => c.status === 'TRANSCRIBING' || c.status === 'ANALYZING' || c.status === 'UPLOADING');
                        if (!stillProcessing && pollingRef.current) {
                            clearInterval(pollingRef.current);
                            pollingRef.current = null;
                            // Refresh lead to get updated activities
                            fetchLead();
                        }
                    } catch { /* ignore polling errors */ }
                }, 3000);
            }
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchLead(); fetchWorkers(); fetchConversations(); }, [id]);

    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, []);

    const handleAudioUpload = async (file: File) => {
        // Validatsiya
        const maxSize = 25 * 1024 * 1024; // 25MB
        const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/amr', 'audio/3gpp', 'video/3gpp'];
        
        if (file.size > maxSize) {
            toast.error('Fayl hajmi 25MB dan oshmasligi kerak');
            return;
        }
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm|m4a|aac|flac|amr|3gp)$/i)) {
            toast.error('Faqat audio formatlar qo\'llab-quvvatlanadi (MP3, WAV, OGG, M4A, AAC)');
            return;
        }

        setUploadingAudio(true);
        try {
            const formData = new FormData();
            formData.append('conversation', file);
            await apiClient.post(`/leads/${id}/conversations/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            });
            toast.success('Audio yuklandi! AI tahlil boshlanmoqda...');
            await fetchConversations();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Audio yuklashda xatolik');
        } finally {
            setUploadingAudio(false);
        }
    };

    const handleDeleteConversation = async (convId: number) => {
        if (!confirm('Bu suhbat yozuvini o\'chirishni tasdiqlaysizmi?')) return;
        try {
            await apiClient.delete(`/leads/${id}/conversations/${convId}`);
            toast.success('O\'chirildi');
            setConversations(prev => prev.filter(c => c.id !== convId));
        } catch {
            toast.error('Xatolik');
        }
    };

    // Drag & Drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleAudioUpload(files[0]);
        }
    }, [id]);

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
        if (stage === 'CLOSED_WON') {
            navigate('/clients/new', { 
                state: { 
                    openAddForm: true, 
                    fromLead: true,
                    leadData: lead 
                } 
            });
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
            playSuccessSound();
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

    // AI Handlers
    const handleFetchScore = async () => {
        setLoadingScore(true);
        try {
            const { data } = await apiClient.post('/ai/crm/score', { leadId: Number(id) });
            setScore(data.data);
        } catch (e) {
            toast.error("AI xatolik(Baholash)");
        } finally {
            setLoadingScore(false);
        }
    };

    const handleFetchSummary = async () => {
        setLoadingSummary(true);
        try {
            const { data } = await apiClient.post('/ai/crm/summary', { leadId: Number(id) });
            setSummary(data.data);
        } catch (e) {
            toast.error("AI xatolik(Xulosa)");
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleGenerateMessage = async () => {
        if (!aiMessageContext) return toast.error("AI uchun ko'rsatma yozing");
        setGeneratingMessage(true);
        try {
            const { data } = await apiClient.post('/ai/crm/copywriting', { 
                leadId: Number(id), 
                context: aiMessageContext 
            });
            setActNote((prev) => prev + (prev ? '\n\n' : '') + data.data.message);
            setAiMessageContext('');
            setAiMode(false);
            toast.success("Matn izohga qo'shildi");
        } catch (e) {
            toast.error("AI xatolik(Matn yozish)");
        } finally {
            setGeneratingMessage(false);
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

                    {/* AI Assistant Panel */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 p-5 shadow-sm overflow-hidden relative">
                        <div className="absolute -right-4 -top-4 opacity-10">
                            <Icon icon="lucide:bot" className="w-24 h-24 text-indigo-500" />
                        </div>
                        <h2 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
                            <Icon icon="lucide:sparkles" className="w-4 h-4" />
                            AI Yordamchisi
                        </h2>

                        <div className="space-y-4 relative z-10">
                            {/* Score */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-indigo-50 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Lid Sifati (Score)</span>
                                    <button 
                                        onClick={handleFetchScore}
                                        disabled={loadingScore}
                                        className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md hover:bg-indigo-200 transition-colors"
                                    >
                                        {loadingScore ? 'Olinmoqda...' : 'Tahlil qilish'}
                                    </button>
                                </div>
                                {score && (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`text-xl font-black ${score.temperature === 'HOT' ? 'text-red-500' : score.temperature === 'WARM' ? 'text-amber-500' : 'text-blue-500'}`}>
                                                {score.score}/100
                                            </div>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                                {score.temperature}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{score.explanation}</p>
                                    </div>
                                )}
                            </div>

                            {/* Summary & Next Action */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-indigo-50 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Xulosa va Tavsiya</span>
                                    <button 
                                        onClick={handleFetchSummary}
                                        disabled={loadingSummary}
                                        className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md hover:bg-indigo-200 transition-colors"
                                    >
                                        {loadingSummary ? 'Olinmoqda...' : 'Tahlil qilish'}
                                    </button>
                                </div>
                                {summary && (
                                    <div className="space-y-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <div>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-0.5">Holat xulosasi</span>
                                            <p className="text-xs text-gray-700 dark:text-gray-300">{summary.summary}</p>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded-lg border border-green-100 dark:border-green-900/30">
                                            <span className="text-[10px] text-green-600 dark:text-green-500 uppercase tracking-wider block mb-0.5 font-bold flex items-center gap-1">
                                                <Icon icon="lucide:lightbulb" className="w-3 h-3" /> Tavsiya qadam (NBA)
                                            </span>
                                            <p className="text-xs text-green-700 dark:text-green-400">{summary.nextBestAction}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
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

                {/* Right: Activity Log + Conversations */}
                <div className="lg:col-span-2 space-y-4">
                    {/* === SUHBAT TAHLILI SECTION === */}
                    <div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-cyan-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-cyan-200/60 dark:border-cyan-800/50 p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 opacity-[0.07]">
                            <Icon icon="lucide:audio-waveform" className="w-32 h-32 text-cyan-500" />
                        </div>

                        <h2 className="text-sm font-bold text-cyan-900 dark:text-cyan-300 mb-4 flex items-center gap-2 relative z-10">
                            <Icon icon="lucide:mic" className="w-4 h-4" />
                            Suhbat Tahlili (AI)
                            {conversations.length > 0 && (
                                <span className="px-2 py-0.5 text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400 rounded-full font-medium">
                                    {conversations.length}
                                </span>
                            )}
                        </h2>

                        {/* Drag & Drop Zone */}
                        <div
                            ref={dropRef}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => !uploadingAudio && fileInputRef.current?.click()}
                            className={`relative z-10 cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                                isDragging
                                    ? 'border-cyan-400 bg-cyan-100/60 dark:bg-cyan-900/40 scale-[1.02]'
                                    : uploadingAudio
                                    ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 cursor-wait'
                                    : 'border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-800/40 hover:border-cyan-400 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/20'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.amr,.3gp"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleAudioUpload(file);
                                    e.target.value = '';
                                }}
                            />
                            {uploadingAudio ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                                        <Icon icon="lucide:loader-2" className="w-5 h-5 text-cyan-600 animate-spin" />
                                    </div>
                                    <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Audio yuklanmoqda...</p>
                                    <p className="text-xs text-gray-400">Iltimos, kuting</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                        isDragging ? 'bg-cyan-200 dark:bg-cyan-800 scale-110' : 'bg-gray-100 dark:bg-gray-700'
                                    }`}>
                                        <Icon icon={isDragging ? 'lucide:download' : 'lucide:mic'} className={`w-5 h-5 transition-colors ${
                                            isDragging ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-400 dark:text-gray-500'
                                        }`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {isDragging ? 'Qo\'yib yuboring!' : 'Audio faylni tashlang yoki tanlang'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">MP3, WAV, OGG, M4A, AAC • Max 25MB</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Conversations List */}
                        {conversations.length > 0 && (
                            <div className="mt-4 space-y-3 relative z-10">
                                {conversations.map((conv) => (
                                    <div key={conv.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                        {/* Header */}
                                        <div
                                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                                            onClick={() => setExpandedConv(expandedConv === conv.id ? null : conv.id)}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                conv.status === 'DONE' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                                                conv.status === 'ERROR' ? 'bg-red-100 dark:bg-red-900/30' :
                                                'bg-amber-100 dark:bg-amber-900/30'
                                            }`}>
                                                <Icon icon={
                                                    conv.status === 'DONE' ? 'lucide:check-circle' :
                                                    conv.status === 'ERROR' ? 'lucide:alert-circle' :
                                                    'lucide:loader-2'
                                                } className={`w-4 h-4 ${
                                                    conv.status === 'DONE' ? 'text-emerald-600' :
                                                    conv.status === 'ERROR' ? 'text-red-500' :
                                                    'text-amber-500 animate-spin'
                                                }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                    {conv.audioFileName}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(conv.createdAt).toLocaleString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    {' • '}{conv.uploadedBy.name}
                                                    {conv.status !== 'DONE' && conv.status !== 'ERROR' && (
                                                        <span className="ml-1 text-amber-500 font-medium">
                                                            • {conv.status === 'TRANSCRIBING' ? 'Matn chiqarilmoqda...' : conv.status === 'ANALYZING' ? 'AI tahlil qilmoqda...' : 'Yuklanmoqda...'}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {user?.role !== 'SELLER' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="O'chirish"
                                                    >
                                                        <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <Icon icon={expandedConv === conv.id ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {expandedConv === conv.id && conv.status === 'DONE' && (
                                            <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-3">
                                                {/* Sentiment */}
                                                {conv.sentiment && (
                                                    <div className={`p-3 rounded-xl border ${
                                                        conv.sentiment.overall === 'POSITIVE' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50' :
                                                        conv.sentiment.overall === 'NEGATIVE' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50' :
                                                        conv.sentiment.overall === 'MIXED' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50' :
                                                        'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                                    }`}>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-lg">
                                                                {conv.sentiment.overall === 'POSITIVE' ? '😊' : conv.sentiment.overall === 'NEGATIVE' ? '😠' : conv.sentiment.overall === 'MIXED' ? '😐' : '😶'}
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Kayfiyat tahlili</span>
                                                            <span className={`ml-auto text-sm font-black ${
                                                                conv.sentiment.score >= 7 ? 'text-emerald-600' : conv.sentiment.score >= 4 ? 'text-amber-500' : 'text-red-500'
                                                            }`}>{conv.sentiment.score}/10</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">{conv.sentiment.details}</p>
                                                        {conv.sentiment.moments?.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {conv.sentiment.moments.map((m: any, i: number) => (
                                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-white/60 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                                                                        <Icon icon="lucide:quote" className="w-2.5 h-2.5" />
                                                                        {m.emotion}: {m.text?.substring(0, 40)}{m.text?.length > 40 ? '...' : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Key Insights */}
                                                {conv.keyInsights && (
                                                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Icon icon="lucide:lightbulb" className="w-3.5 h-3.5 text-blue-500" />
                                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Muhim nuqtalar</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                                            {conv.keyInsights.priceDiscussed && (
                                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">💰 Narx</span>
                                                            )}
                                                            {conv.keyInsights.qualityDiscussed && (
                                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full border border-purple-200 dark:border-purple-800">⭐ Sifat</span>
                                                            )}
                                                            {conv.keyInsights.deliveryDiscussed && (
                                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full border border-orange-200 dark:border-orange-800">🚚 Yetkazish</span>
                                                            )}
                                                        </div>
                                                        {conv.keyInsights.interests?.length > 0 && (
                                                            <div className="mb-1.5">
                                                                <span className="text-[10px] text-gray-400 uppercase block mb-0.5">Qiziqishlar</span>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {conv.keyInsights.interests.map((item: string, i: number) => (
                                                                        <span key={i} className="px-2 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md">{item}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {conv.keyInsights.objections?.length > 0 && (
                                                            <div>
                                                                <span className="text-[10px] text-gray-400 uppercase block mb-0.5">E'tirozlar</span>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {conv.keyInsights.objections.map((item: string, i: number) => (
                                                                        <span key={i} className="px-2 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md">{item}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{conv.keyInsights.details}</p>
                                                    </div>
                                                )}

                                                {/* Compliance */}
                                                {conv.compliance && (
                                                    <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/50">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <Icon icon="lucide:shield-check" className="w-3.5 h-3.5 text-violet-500" />
                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Qoidalarga rioya</span>
                                                            </div>
                                                            <div className={`text-sm font-black ${
                                                                conv.compliance.overallScore >= 80 ? 'text-emerald-600' : conv.compliance.overallScore >= 50 ? 'text-amber-500' : 'text-red-500'
                                                            }`}>{conv.compliance.overallScore}/100</div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <Icon icon={conv.compliance.greeting ? 'lucide:check-circle' : 'lucide:x-circle'} className={`w-3.5 h-3.5 ${conv.compliance.greeting ? 'text-emerald-500' : 'text-red-500'}`} />
                                                                <span className="text-xs text-gray-600 dark:text-gray-400">Salomlashish</span>
                                                                <span className="text-[10px] text-gray-400 ml-auto truncate max-w-[200px]">{conv.compliance.greetingDetails}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Icon icon={conv.compliance.followedScript ? 'lucide:check-circle' : 'lucide:x-circle'} className={`w-3.5 h-3.5 ${conv.compliance.followedScript ? 'text-emerald-500' : 'text-red-500'}`} />
                                                                <span className="text-xs text-gray-600 dark:text-gray-400">Skript bo'yicha</span>
                                                                <span className="text-[10px] text-gray-400 ml-auto truncate max-w-[200px]">{conv.compliance.scriptDetails}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Icon icon={!conv.compliance.prohibitedWords ? 'lucide:check-circle' : 'lucide:x-circle'} className={`w-3.5 h-3.5 ${!conv.compliance.prohibitedWords ? 'text-emerald-500' : 'text-red-500'}`} />
                                                                <span className="text-xs text-gray-600 dark:text-gray-400">Taqiqlangan so'zlar</span>
                                                                <span className="text-[10px] text-gray-400 ml-auto truncate max-w-[200px]">{conv.compliance.prohibitedWordsDetails}</span>
                                                            </div>
                                                        </div>
                                                        {conv.compliance.recommendations?.length > 0 && (
                                                            <div className="mt-2 pt-2 border-t border-violet-100 dark:border-violet-800/30">
                                                                <span className="text-[10px] text-violet-500 dark:text-violet-400 uppercase font-bold block mb-0.5">Tavsiyalar</span>
                                                                {conv.compliance.recommendations.map((rec: string, i: number) => (
                                                                    <p key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                                                        <Icon icon="lucide:arrow-right" className="w-3 h-3 mt-0.5 flex-shrink-0 text-violet-400" />
                                                                        {rec}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Summary */}
                                                {conv.summary && (
                                                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-200 dark:border-emerald-800/50">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <Icon icon="lucide:file-text" className="w-3.5 h-3.5 text-emerald-500" />
                                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Xulosa</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{conv.summary}</p>
                                                        <button
                                                            onClick={() => {
                                                                setActNote(prev => prev + (prev ? '\n\n' : '') + `🎙️ AI Suhbat xulosasi: ${conv.summary}`);
                                                                toast.success('Izohga qo\'shildi');
                                                            }}
                                                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-800"
                                                        >
                                                            <Icon icon="lucide:copy-plus" className="w-3 h-3" />
                                                            Izohga qo'shish
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Transcript toggle */}
                                                {conv.transcript && (
                                                    <details className="group">
                                                        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1">
                                                            <Icon icon="lucide:file-audio" className="w-3 h-3" />
                                                            To'liq transkripsiya
                                                            <Icon icon="lucide:chevron-down" className="w-3 h-3 transition-transform group-open:rotate-180" />
                                                        </summary>
                                                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{conv.transcript}</p>
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        )}

                                        {/* Error state */}
                                        {expandedConv === conv.id && conv.status === 'ERROR' && (
                                            <div className="border-t border-red-100 dark:border-red-900/30 p-3">
                                                <div className="flex items-center gap-2 text-red-500">
                                                    <Icon icon="lucide:alert-triangle" className="w-4 h-4" />
                                                    <p className="text-xs">{conv.errorMessage || 'AI tahlil xatoligi'}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add Activity */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Yozuv qo'shish</h2>
                        <form onSubmit={handleAddActivity} className="space-y-3">
                            <div className="flex flex-wrap gap-2">
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
                                <button
                                    type="button"
                                    onClick={() => setAiMode(!aiMode)}
                                    className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-xl border transition-all ${aiMode 
                                        ? 'bg-purple-600 text-white border-purple-600' 
                                        : 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'}`}
                                >
                                    <Icon icon="lucide:sparkles" className="w-4 h-4" />
                                    AI
                                </button>
                            </div>

                            {aiMode && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-200 dark:border-purple-800/50 mb-3">
                                    <p className="text-xs text-purple-700 dark:text-purple-300 font-medium mb-2">AI ga qanday xabar yozishni buyuring:</p>
                                    <input 
                                        value={aiMessageContext}
                                        onChange={(e) => setAiMessageContext(e.target.value)}
                                        placeholder="Mijozga narx tushirib berolmasligimizni do'stona tushuntirib xat yoz..."
                                        className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 mb-2"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGenerateMessage}
                                        disabled={generatingMessage || !aiMessageContext}
                                        className="w-full py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex justify-center items-center gap-2 disabled:opacity-50 transition-colors"
                                    >
                                        {generatingMessage ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" /> : <Icon icon="lucide:bot" className="w-4 h-4" />}
                                        Matn yaratish
                                    </button>
                                </div>
                            )}

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
