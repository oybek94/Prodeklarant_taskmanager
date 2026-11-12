import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import api from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: number;
  name: string;
}

interface Note {
  id: number;
  content: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdBy: { id: number; name: string };
  assignedTo: { id: number; name: string } | null;
  completedBy: { id: number; name: string } | null;
  xpReward: number | null;
  bountyReward: number | null;
  createdAt: string;
}

const firstName = (name: string): string => name.split(' ')[0];

/** Server rad etganda (masalan ruxsat yo'q) sababini foydalanuvchiga ko'rsatish uchun */
const apiErrorMessage = (err: unknown, fallback: string): string => {
  const message = (err as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof message === 'string' ? message : fallback;
};

const DashboardNotes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [xpReward, setXpReward] = useState<string>('');
  const [bountyReward, setBountyReward] = useState<string>('');
  const [showArchive, setShowArchive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const socket = useSocket();
  const { user } = useAuth();
  // Mukofot (XP, pul) bajargan xodimning hisobiga qo'shiladi — uni faqat admin belgilaydi
  const canSetReward = user?.role === 'ADMIN';

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const notesRes = await api.get(showArchive ? '/dashboard-notes/archive' : '/dashboard-notes');
      setNotes(notesRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard notes:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showArchive]);

  // Xodimlar ro'yxati (topshiriq biriktirish uchun) — bir marta; oldin har eslatma
  // yangilanishida qayta yuklanardi. /users emas — admin tekshiruvini chetlab o'tish uchun
  useEffect(() => {
    api.get('/workers')
      .then((usersRes) => {
        if (usersRes.data?.users) {
          setUsers(usersRes.data.users);
        } else if (Array.isArray(usersRes.data)) {
          setUsers(usersRes.data);
        }
      })
      .catch((error) => console.error('Failed to fetch workers:', error));
  }, []);

  useEffect(() => {
    fetchData();

    if (socket) {
      const handleUpdate = () => fetchData(true);
      socket.on('dashboardNote:updated', handleUpdate);

      return () => {
        socket.off('dashboardNote:updated', handleUpdate);
      };
    }
  }, [fetchData, socket]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      await api.post('/dashboard-notes', {
        content,
        assignedToId: assignedToId ? Number(assignedToId) : null,
        xpReward: canSetReward && xpReward ? Number(xpReward) : null,
        bountyReward: canSetReward && bountyReward ? Number(bountyReward) : null,
      });
      setContent('');
      setAssignedToId('');
      setXpReward('');
      setBountyReward('');
      if (!showArchive) {
        fetchData(); // refresh
      } else {
        setShowArchive(false); // Switch to active notes if added from archive view
      }
    } catch (err) {
      console.error('Failed to add note', err);
      alert(apiErrorMessage(err, "Vazifani qo'shib bo'lmadi"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    // Optimistic UI update
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isCompleted: !currentStatus } : n));
    try {
      await api.put(`/dashboard-notes/${id}/toggle`, { isCompleted: !currentStatus });
      fetchData(); // sync with server
    } catch (err) {
      console.error('Failed to toggle note', err);
      // Revert on error
      fetchData();
      alert(apiErrorMessage(err, "Vazifa holatini o'zgartirib bo'lmadi"));
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!window.confirm("Rostdan ham o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/dashboard-notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note', err);
      alert(apiErrorMessage(err, "Vazifani o'chirib bo'lmadi"));
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingContent.trim()) {
      setEditingNoteId(null);
      return;
    }
    try {
      await api.put(`/dashboard-notes/${id}`, { content: editingContent });
      setNotes(prev => prev.map(n => n.id === id ? { ...n, content: editingContent } : n));
      setEditingNoteId(null);
    } catch (err) {
      console.error('Failed to edit note', err);
      alert(apiErrorMessage(err, "Vazifani tahrirlab bo'lmadi"));
    }
  };

  const activeCount = notes.filter(n => !n.isCompleted).length;
  const doneCount = notes.length - activeCount;

  const smallFieldClass =
    'min-h-[36px] rounded-[10px] border px-2 text-xs font-semibold outline-none transition-colors';

  return (
    <div className="rounded-[28px] bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 shadow-sm p-6 flex flex-col gap-4 h-full min-h-[456px]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center">
          <Icon icon="solar:check-square-bold-duotone" className="w-[22px] h-[22px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
            Qilinishi kerak bo'lgan ishlar
          </h2>
          <div className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-gray-400">
            {showArchive ? `Arxiv · ${notes.length} ta` : `${activeCount} ta faol · ${doneCount} ta bajarildi`}
          </div>
        </div>
        <button
          onClick={() => setShowArchive(!showArchive)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[10px] px-2.5 text-xs font-bold text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <Icon icon={showArchive ? 'solar:inbox-bold-duotone' : 'solar:archive-bold-duotone'} className="w-4 h-4" />
          {showArchive ? 'Faollar' : 'Arxiv'}
        </button>
      </div>

      <ul className="flex flex-1 flex-col gap-2.5 overflow-y-auto custom-scrollbar max-h-[300px] pr-0.5">
        {loading ? (
          <li className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </li>
        ) : notes.length === 0 ? (
          <li className="py-6 text-center text-sm text-slate-500 dark:text-gray-400">
            {showArchive ? 'Arxiv bo\'sh' : 'Hozircha ishlar yo\'q 🎉'}
          </li>
        ) : (
          notes.map(note => (
            <li
              key={note.id}
              className={`group flex gap-3 rounded-2xl py-3 pl-3.5 pr-3 ${
                note.isCompleted
                  ? 'border border-dashed border-slate-200 dark:border-gray-700'
                  : 'border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/60'
              }`}
            >
              <button
                onClick={() => toggleStatus(note.id, note.isCompleted)}
                aria-label={note.isCompleted ? 'Bajarilmagan deb belgilash' : 'Bajarildi deb belgilash'}
                className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                  note.isCompleted
                    ? 'border-blue-700 bg-blue-700 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-blue-950'
                    : 'border-slate-400 dark:border-gray-500 text-transparent hover:border-blue-600'
                }`}
              >
                <Icon icon="solar:check-circle-bold-duotone" className="w-4 h-4" />
              </button>

              <div className="min-w-0 flex-1">
                {editingNoteId === note.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(note.id)}
                      className="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-800 dark:text-gray-100 outline-none"
                    />
                    <button onClick={() => handleSaveEdit(note.id)} aria-label="Saqlash" className="text-blue-600 hover:text-blue-700">
                      <Icon icon="solar:check-circle-bold-duotone" className="w-5 h-5" />
                    </button>
                    <button onClick={() => setEditingNoteId(null)} aria-label="Bekor qilish" className="text-gray-400 hover:text-gray-600">
                      <Icon icon="solar:close-circle-bold-duotone" className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative pr-12">
                    <p
                      className={`break-words text-sm leading-snug ${
                        note.isCompleted
                          ? 'font-semibold text-slate-500 dark:text-gray-400 line-through'
                          : 'font-bold text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {note.content}
                    </p>
                    <div className="absolute right-0 top-0 flex items-center gap-2 pl-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        onClick={() => { setEditingNoteId(note.id); setEditingContent(note.content); }}
                        className="text-gray-400 hover:text-blue-500 transition-colors"
                        title="O'zgartirish"
                        aria-label="O'zgartirish"
                      >
                        <Icon icon="solar:pen-bold-duotone" className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="O'chirish"
                        aria-label="O'chirish"
                      >
                        <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <Icon icon="solar:user-bold-duotone" className="w-3.5 h-3.5" />
                    {firstName(note.createdBy.name)}
                  </span>

                  {note.assignedTo && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 dark:bg-orange-400/15 px-1.5 py-0.5 text-orange-800 dark:text-orange-300">
                      <Icon icon="solar:arrow-right-bold-duotone" className="w-3 h-3" />
                      {firstName(note.assignedTo.name)}
                    </span>
                  )}

                  {note.xpReward && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 dark:bg-amber-400/15 px-2 py-0.5 font-extrabold text-amber-800 dark:text-amber-300">
                      <Icon icon="solar:star-bold-duotone" className="w-3 h-3" />
                      +{note.xpReward} XP
                    </span>
                  )}

                  {note.bountyReward && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-400/15 px-2 py-0.5 font-extrabold text-emerald-800 dark:text-emerald-300">
                      <Icon icon="solar:banknote-2-bold-duotone" className="w-3.5 h-3.5" />
                      {note.bountyReward.toLocaleString()} UZS
                    </span>
                  )}

                  {note.isCompleted && note.completedBy && (
                    <span className="ml-auto inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <Icon icon="solar:check-circle-bold-duotone" className="w-3.5 h-3.5" />
                      {firstName(note.completedBy.name)} bajardi
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {!showArchive && (
        <form onSubmit={handleAddNote} className="flex flex-col gap-2 border-t border-slate-200 dark:border-gray-800 pt-3.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Yangi vazifa qo'shish..."
              aria-label="Yangi vazifa"
              required
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3.5 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-colors focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              aria-label="Vazifa qo'shish"
              className="flex min-h-[44px] w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-400 dark:text-blue-950 dark:hover:bg-blue-300"
            >
              {submitting ? (
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
              ) : (
                <Icon icon="solar:add-circle-bold-duotone" className="w-6 h-6" />
              )}
            </button>
          </div>
          <div className="flex gap-2">
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              aria-label="Kimga"
              className={`${smallFieldClass} min-w-0 flex-1 border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-300`}
            >
              <option value="">(barchaga)</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {canSetReward && (
              <>
                <input
                  type="number"
                  min="0"
                  value={xpReward}
                  onChange={(e) => setXpReward(e.target.value)}
                  placeholder="XP"
                  aria-label="XP mukofoti"
                  title="Vazifani bajargan xodimga beriladigan XP"
                  className={`${smallFieldClass} w-14 shrink-0 border-amber-200 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10 text-amber-900 dark:text-amber-200 placeholder:text-amber-700/60 dark:placeholder:text-amber-300/50 focus:border-amber-500`}
                />
                <input
                  type="number"
                  min="0"
                  value={bountyReward}
                  onChange={(e) => setBountyReward(e.target.value)}
                  placeholder="UZS"
                  aria-label="Pul mukofoti, UZS"
                  title="Vazifani bajargan xodimga beriladigan pul mukofoti (UZS)"
                  className={`${smallFieldClass} w-[72px] shrink-0 border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-900 dark:text-emerald-200 placeholder:text-emerald-700/60 dark:placeholder:text-emerald-300/50 focus:border-emerald-500`}
                />
              </>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default DashboardNotes;
