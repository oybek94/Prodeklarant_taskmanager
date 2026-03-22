import React, { Component } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * TaskErrorBoundary — React Error Boundary komponent.
 * 
 * Bitta komponent xato qilsa butun sahifa oqlanishining oldini oladi.
 * Xato bo'lganda foydalanuvchiga tushunarli xato xabari va
 * "Qayta yuklash" tugmasini ko'rsatadi.
 */
class TaskErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[TaskErrorBoundary] Xatolik ushlandi:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Kutilmagan xatolik yuz berdi
            </h2>

            {/* Description */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Sahifa ko'rsatishda muammo bor. Iltimos, sahifani qayta yuklang
              yoki keyinroq qayta urinib ko'ring.
            </p>

            {/* Error details (collapsible) */}
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  Texnik tafsilotlar
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-slate-800 rounded-xl text-xs text-red-600 dark:text-red-400 overflow-auto max-h-32 border border-gray-200 dark:border-slate-700 font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 font-semibold text-sm transition-all shadow-sm hover:shadow active:scale-[0.98]"
              >
                Qayta urinish
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                Sahifani qayta yuklash
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TaskErrorBoundary;
