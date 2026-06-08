import { useState } from 'react';
import apiClient from '../../lib/api';
import { Icon } from '@iconify/react';

export const SystemTab = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      const response = await apiClient.get('/system/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prodeklarant-backup-${new Date().toISOString().slice(0, 10)}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      alert("Zaxira o'rnatishda xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("DIQQAT! Bu amal bazadagi barcha joriy ma'lumotlarni O'CHIRIB TASHLAydi va o'rniga arxivdagi ma'lumotlarni yozadi. Haqiqatan ham davom ettirmoqchimisiz?")) {
      event.target.value = '';
      return;
    }

    try {
      setIsRestoring(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await apiClient.post('/system/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message || "Ma'lumotlar muvaffaqiyatli tiklandi!");
      window.location.reload();
    } catch (e: any) {
      alert(e.response?.data?.error || "Tiklashda xatolik yuz berdi");
    } finally {
      setIsRestoring(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center">
            <Icon icon="lucide:database-backup" className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ma'lumotlar zaxirasi</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Dasturdagi barcha ma'lumotlarni zaxira nusxasini ko'chirib olish</p>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-orange-500 dark:text-orange-400 flex-shrink-0" />
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Zaxira nusxasi (Backup) barcha jadvallardagi ma'lumotlarni o'z ichiga oladi. Dasturda kutilmaganda
              turli jiddiy muammolar bo'lib, ma'lumotlar o'chib ketsa, shu orqali uni qayta tiklasangiz bo'ladi.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleBackup}
            disabled={isBackingUp || isRestoring}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            {isBackingUp ? (
              <>
                <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin" />
                Yuklanmoqda...
              </>
            ) : (
              <>
                <Icon icon="lucide:download" className="w-5 h-5" />
                Zaxira faylini yuklab olish
              </>
            )}
          </button>

          <div className="relative">
            <input 
              type="file" 
              accept=".zip,.json" 
              onChange={handleRestore}
              disabled={isBackingUp || isRestoring}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button
              disabled={isBackingUp || isRestoring}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-sm w-full"
            >
              {isRestoring ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin" />
                  Tiklanmoqda...
                </>
              ) : (
                <>
                  <Icon icon="lucide:upload" className="w-5 h-5" />
                  Zaxiradan tiklash (Restore)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
