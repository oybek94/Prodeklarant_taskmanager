import React from 'react';
import type { TaskDetail, TaskStage } from './types';

interface SendEmailForm {
  subject: string;
  body: string;
  recipients: string;
  cc: string;
  bcc: string;
}

interface SendEmailModalProps {
  show: boolean;
  selectedTask: TaskDetail | null;
  sendEmailForm: SendEmailForm;
  setSendEmailForm: React.Dispatch<React.SetStateAction<SendEmailForm>>;
  sendingEmail: boolean;
  sendEmailError: string | null;
  setSendEmailError: (err: string | null) => void;
  taskDocuments: { id: number; name?: string }[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const SendEmailModal: React.FC<SendEmailModalProps> = ({
  show, selectedTask, sendEmailForm, setSendEmailForm,
  sendingEmail, sendEmailError, setSendEmailError,
  taskDocuments, onClose, onSubmit,
}) => {
  if (!show || !selectedTask) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] backdrop-blur-sm"
      style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !sendingEmail) {
          onClose();
          setSendEmailError(null);
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
        style={{ animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Send Documents by Email
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={sendEmailForm.subject}
              onChange={(e) => setSendEmailForm((f) => ({ ...f, subject: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              placeholder="Email subject"
            />
          </div>
          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message (optional)
            </label>
            <textarea
              value={sendEmailForm.body}
              onChange={(e) => setSendEmailForm((f) => ({ ...f, body: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
              placeholder="Message body"
            />
          </div>
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Recipients <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={sendEmailForm.recipients}
              onChange={(e) => setSendEmailForm((f) => ({ ...f, recipients: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              placeholder="email1@example.com, email2@example.com"
            />
          </div>
          {/* CC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CC (optional)
            </label>
            <input
              type="text"
              value={sendEmailForm.cc}
              onChange={(e) => setSendEmailForm((f) => ({ ...f, cc: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              placeholder="cc@example.com"
            />
          </div>
          {/* Attached documents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ilova qilinadigan fayllar
            </label>
            <ul className="mt-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
              {taskDocuments.length > 0 ? (
                taskDocuments.map((doc) => (
                  <li key={doc.id}>{doc.name || `Hujjat #${doc.id}`}</li>
                ))
              ) : (
                <li className="list-none text-gray-500 dark:text-gray-400">Hujjatlar yo&apos;q</li>
              )}
            </ul>
          </div>
          {/* Error */}
          {sendEmailError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {sendEmailError}
            </div>
          )}
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={sendingEmail}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingEmail ? 'Sending...' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => { onClose(); setSendEmailError(null); }}
              disabled={sendingEmail}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendEmailModal;
