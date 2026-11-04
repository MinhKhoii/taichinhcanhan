import React from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useFinancial();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-slate-900 text-white';
        let Icon = Info;
        if (toast.type === 'success') {
          bg = 'bg-emerald-600 text-white';
          Icon = CheckCircle2;
        } else if (toast.type === 'error') {
          bg = 'bg-rose-600 text-white';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all transform animate-in slide-in-from-bottom duration-300 max-w-md ${bg}`}
          >
            <div className="flex items-center space-x-3">
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 p-1 hover:opacity-80 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

