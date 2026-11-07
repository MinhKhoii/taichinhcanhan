import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles, ChevronRight } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

export const PWAInstallBanner: React.FC = () => {
  const { isInstalled, isInstallable, promptInstall, openInstallGuide } = useFinancial();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissedUntil = localStorage.getItem('moneyflow_pwa_banner_dismissed_until');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      setIsDismissed(true);
      return;
    }
    // Only show if not installed
    if (!isInstalled) {
      setIsDismissed(false);
    }
  }, [isInstalled]);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    // Dismiss for 24 hours
    localStorage.setItem('moneyflow_pwa_banner_dismissed_until', String(Date.now() + 24 * 60 * 60 * 1000));
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-30 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 dark:bg-slate-900/98 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-blue-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-white truncate">Cài MoneyFlow ra màn hình</p>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 text-3xs font-semibold border border-blue-400/30 shrink-0">
                1 Chạm
              </span>
            </div>
            <p className="text-2xs text-slate-300 truncate mt-0.5">
              Dùng nhanh như app thật, không dính thanh web
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={promptInstall}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cài đặt</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
