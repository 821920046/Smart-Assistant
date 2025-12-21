import React, { createContext, useContext, useState, useCallback } from 'react';
import { Icons } from '../constants';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-slate-200 dark:shadow-slate-900 border transition-all duration-300 transform translate-y-0 opacity-100 toast-enter
              ${toast.type === 'success' ? 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400' : ''}
              ${toast.type === 'error' ? 'bg-white dark:bg-slate-800 border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400' : ''}
              ${toast.type === 'info' ? 'bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400' : ''}
              ${toast.type === 'warning' ? 'bg-white dark:bg-slate-800 border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-400' : ''}
            `}
          >
            {toast.type === 'success' && <Icons.Check className="w-5 h-5" />}
            {toast.type === 'error' && <Icons.X className="w-5 h-5" />}
            {toast.type === 'info' && <Icons.Info className="w-5 h-5" />}
            {toast.type === 'warning' && <Icons.AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <Icons.X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
