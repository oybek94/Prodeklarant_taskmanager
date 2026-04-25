import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  topic: string | null;
  imageUrl: string | null;
  imageDescription: string | null;
}

const FAQ = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    topic: '',
    imageUrl: '',
    imageDescription: ''
  });
  
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const res = await apiClient.get('/faq');
      setFaqs(res.data);
    } catch (error: any) {
      toast.error('FAQ larni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/faq/${editingId}`, formData);
        toast.success("FAQ yangilandi");
      } else {
        await apiClient.post('/faq', formData);
        toast.success("FAQ qo'shildi");
      }
      setModalOpen(false);
      fetchFaqs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Saqlashda xatolik");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Rostdan ham ushbu FAQ ni o'chirmoqchimisiz?")) return;
    try {
      await apiClient.delete(`/faq/${id}`);
      toast.success("FAQ o'chirildi");
      fetchFaqs();
    } catch (error) {
      toast.error("O'chirishda xatolik");
    }
  };

  const openModal = (faq?: FAQItem) => {
    if (faq) {
      setEditingId(faq.id);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        topic: faq.topic || '',
        imageUrl: faq.imageUrl || '',
        imageDescription: faq.imageDescription || ''
      });
    } else {
      setEditingId(null);
      setFormData({ question: '', answer: '', topic: '', imageUrl: '', imageDescription: '' });
    }
    setModalOpen(true);
  };

  const handleReportError = () => {
    toast.success("Xatolik xabari yuborildi. Tez orada ko'rib chiqamiz!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const endpoint = isVideo ? '/upload/video' : '/upload/image';

    const uploadData = new FormData();
    uploadData.append(isVideo ? 'video' : 'image', file);

    setUploadingMedia(true);
    try {
      const res = await apiClient.post(endpoint, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, imageUrl: res.data.fileUrl }));
      toast.success(isVideo ? "Video yuklandi" : "Rasm yuklandi");
    } catch (error: any) {
      toast.error("Fayl yuklashda xatolik: " + (error.response?.data?.error || error.message));
    } finally {
      setUploadingMedia(false);
    }
  };

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(search.toLowerCase()) || 
    f.answer.toLowerCase().includes(search.toLowerCase()) ||
    (f.topic && f.topic.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon icon="lucide:help-circle" className="w-7 h-7 text-indigo-600" />
            Bojxona Rasmiylashtiruvi FAQ
          </h1>
          <p className="text-gray-500 text-sm mt-1">Deklarantlar uchun yordam bazasi</p>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
            >
              <Icon icon="lucide:plus" className="w-5 h-5" />
              FAQ Qo'shish
            </button>
          )}
          <button
            onClick={handleReportError}
            className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-2 transition dark:bg-red-900/20 dark:border-red-800"
          >
            <Icon icon="lucide:alert-triangle" className="w-5 h-5" />
            Xatolik xabarini yuborish
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="relative">
          <Icon icon="lucide:search" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Savol yoki kalit so'z bo'yicha qidiruv (masalan: CMR, Tranzit)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500 flex flex-col items-center gap-2">
          <Icon icon="lucide:loader-2" className="w-8 h-8 animate-spin text-indigo-500" />
          Yuklanmoqda...
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500">
          <Icon icon="lucide:search-x" className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          Hech narsa topilmadi
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map(faq => {
            const isExpanded = expandedId === faq.id;
            return (
            <div key={faq.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div 
                className="p-5 cursor-pointer flex justify-between items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                onClick={() => toggleExpand(faq.id)}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 select-none">
                  {faq.topic && <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-1 rounded-md mr-2 align-middle">{faq.topic}</span>}
                  <span className="align-middle">{faq.question}</span>
                </h3>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAdmin && (
                    <div className="flex items-center gap-1 mr-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openModal(faq)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition dark:hover:bg-gray-700">
                        <Icon icon="lucide:edit" className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(faq.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition dark:hover:bg-gray-700">
                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <Icon 
                    icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"} 
                    className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'text-indigo-500' : ''}`} 
                  />
                </div>
              </div>
              
              <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-5 pt-0 border-t border-gray-100 dark:border-gray-700">
                  <div className="mt-3 text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {faq.answer.split('\n').map((line, i) => (
                      <p key={i} className="mb-2 last:mb-0">
                        {line.includes('[RASM JOYI') ? (
                           <span className="inline-block mt-2 bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 text-xs px-2 py-1 rounded">
                             ⚠️ {line}
                           </span>
                        ) : (
                          line
                        )}
                      </p>
                    ))}
                  </div>

                  {faq.imageUrl && (
                    <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden relative group/media">
                      {faq.imageUrl.match(/\.(mp4|webm|ogg)$/i) || faq.imageUrl.includes('/videos/') ? (
                        <video src={faq.imageUrl} controls className="w-full max-h-[400px] bg-black" />
                      ) : (
                        <div className="cursor-pointer hover:opacity-90 transition group relative" onClick={() => setLightboxImage(faq.imageUrl!)}>
                          <img src={faq.imageUrl} alt={faq.imageDescription || 'FAQ rasm'} className="w-full max-h-64 object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icon icon="lucide:zoom-in" className="w-8 h-8 text-white drop-shadow" />
                          </div>
                        </div>
                      )}
                      {faq.imageDescription && (
                        <div className="bg-gray-50 dark:bg-gray-900 p-2 text-xs text-gray-500 text-center border-t border-gray-200 dark:border-gray-700">
                          {faq.imageDescription}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modal form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg font-bold">{editingId ? 'FAQ Tahrirlash' : "Yangi FAQ Qo'shish"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700 transition">
                <Icon icon="lucide:x" className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mavzu (ixtiyoriy)</label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({...formData, topic: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Masalan: CMR, Tranzit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Savol <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({...formData, question: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Javob <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={6}
                  value={formData.answer}
                  onChange={(e) => setFormData({...formData, answer: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                  placeholder="Javob matni. Yangi qatorlarni saqlaydi."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Media fayli (Rasm yoki Video)</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className={`cursor-pointer px-4 py-2 border border-gray-300 rounded-lg flex items-center justify-center gap-2 transition ${uploadingMedia ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 dark:bg-gray-900'}`}>
                    {uploadingMedia ? <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin" /> : <Icon icon="lucide:upload-cloud" className="w-5 h-5" />}
                    <span className="whitespace-nowrap">{uploadingMedia ? 'Yuklanmoqda...' : 'Fayl tanlash'}</span>
                    <input type="file" accept="image/*,video/mp4,video/webm,video/ogg" className="hidden" onChange={handleFileUpload} disabled={uploadingMedia} />
                  </label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                    className="flex-1 p-2 border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="yoki shu yerga URL kiriting"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rasm tavsifi (ixtiyoriy)</label>
                <input
                  type="text"
                  value={formData.imageDescription}
                  onChange={(e) => setFormData({...formData, imageDescription: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 transition">Bekor qilish</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Kattalashtirilgan rasm" 
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
          />
          <button 
            className="absolute top-4 right-4 text-white p-3 hover:bg-white/20 rounded-full transition"
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
          >
            <Icon icon="lucide:x" className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FAQ;
