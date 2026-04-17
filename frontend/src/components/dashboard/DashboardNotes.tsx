import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import api from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';

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
  createdAt: string;
}

const DashboardNotes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [showArchive, setShowArchive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const socket = useSocket();

  useEffect(() => {
    fetchData();
    
    if (socket) {
      const handleUpdate = () => fetchData(true);
      socket.on('dashboardNote:updated', handleUpdate);
      
      return () => {
        socket.off('dashboardNote:updated', handleUpdate);
      };
    }
  }, [showArchive, socket]);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [notesRes, usersRes] = await Promise.all([
        api.get(showArchive ? '/dashboard-notes/archive' : '/dashboard-notes'),
        api.get('/workers') // fetch workers for assignment instead of /users to bypass admin check
      ]);
      setNotes(notesRes.data);
      if (usersRes.data?.users) {
        setUsers(usersRes.data.users);
      } else if (Array.isArray(usersRes.data)) {
        setUsers(usersRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard notes:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      await api.post('/dashboard-notes', {
        content,
        assignedToId: assignedToId ? Number(assignedToId) : null
      });
      setContent('');
      setAssignedToId('');
      if (!showArchive) {
        fetchData(); // refresh
      } else {
        setShowArchive(false); // Switch to active notes if added from archive view
      }
    } catch (err) {
      console.error('Failed to add note', err);
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
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!window.confirm("Rostdan ham o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/dashboard-notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note', err);
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
    }
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[24px] shadow-sm border border-white/60 dark:border-gray-700/50 p-5 flex flex-col h-full lg:min-h-[160px] relative overflow-hidden transition-all">
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Icon icon="lucide:check-square" className="w-5 h-5 text-blue-500" />
          Qilinishi kerak bo'lgan ishlar
        </h2>
        <button 
          onClick={() => setShowArchive(!showArchive)}
          className="text-[11px] font-bold tracking-widest text-gray-500 hover:text-blue-600 uppercase flex items-center gap-1 transition-colors"
        >
          <Icon icon={showArchive ? 'lucide:inbox' : 'lucide:archive'} className="w-3.5 h-3.5" />
          {showArchive ? 'Faollar' : 'Arxiv'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4 space-y-2 max-h-[220px]">
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
            {showArchive ? 'Arxiv bo\'sh' : 'Hozircha ishlar yo\'q 🎉'}
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className={`group flex items-start gap-3 p-3 rounded-xl border ${note.isCompleted ? 'bg-gray-50/50 border-gray-100 dark:bg-gray-900/30 dark:border-gray-800' : 'bg-white border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700'} hover:border-blue-200 dark:hover:border-blue-900 transition-colors relative z-10`}>
              <button 
                onClick={() => toggleStatus(note.id, note.isCompleted)}
                className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${note.isCompleted ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-gray-500 text-transparent hover:border-blue-400'}`}
              >
                <Icon icon="lucide:check" className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex-1 min-w-0">
                {editingNoteId === note.id ? (
                  <div className="flex items-center gap-2">
                    <input 
                      autoFocus
                      type="text" 
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(note.id)}
                      className="w-full text-sm bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded px-2 py-1 outline-none text-gray-800 dark:text-gray-100"
                    />
                    <button onClick={() => handleSaveEdit(note.id)} className="text-blue-600 hover:text-blue-700">
                      <Icon icon="lucide:check" className="w-5 h-5" />
                    </button>
                    <button onClick={() => setEditingNoteId(null)} className="text-gray-400 hover:text-gray-600">
                      <Icon icon="lucide:x" className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative group/text pr-12">
                    <p className={`text-sm ${note.isCompleted ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200 font-medium'} break-words leading-snug`}>
                      {note.content}
                    </p>
                    <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm pl-2">
                      <button onClick={() => { setEditingNoteId(note.id); setEditingContent(note.content); }} className="text-gray-400 hover:text-blue-500 transition-colors" title="O'zgartirish">
                        <Icon icon="lucide:pencil" className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteNote(note.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="O'chirish">
                        <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                  <span className="flex items-center gap-0.5">
                    <Icon icon="lucide:user" className="w-3 h-3" /> 
                    {note.createdBy.name.split(' ')[0]}
                  </span>
                  
                  {note.assignedTo && (
                    <span className="flex items-center gap-0.5 text-orange-500/80 bg-orange-50/50 dark:bg-orange-900/20 px-1 rounded">
                      <Icon icon="lucide:arrow-right" className="w-3 h-3" />
                      {note.assignedTo.name.split(' ')[0]}
                    </span>
                  )}

                  {note.isCompleted && note.completedBy && (
                    <span className="flex items-center gap-0.5 text-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-900/20 px-1 rounded ml-auto">
                      <Icon icon="lucide:check-circle-2" className="w-3 h-3" />
                      {note.completedBy.name.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!showArchive && (
        <form onSubmit={handleAddNote} className="relative z-10 flex gap-2 items-end pt-2 border-t border-gray-100 dark:border-gray-700/50 shrink-0">
          <div className="flex-1 flex flex-col gap-2">
            <input 
              type="text" 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Yangi vazifa qo'shish..." 
              required
              className="w-full text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
            />
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-500 dark:text-gray-400"
            >
              <option value="">(barchaga)</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <button 
            type="submit" 
            disabled={submitting || !content.trim()}
            className="h-[68px] px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors shrink-0 shadow-sm"
          >
            {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icon icon="lucide:plus" className="w-5 h-5" />}
          </button>
        </form>
      )}
    </div>
  );
};

export default DashboardNotes;
