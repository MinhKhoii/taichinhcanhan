import React, { useState, useEffect } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { Plus, ChevronUp, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Sparkles } from 'lucide-react';

export const FloatingActionButtons: React.FC = () => {
  const { openAddTxModal, openAIModal } = useFinancial();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
      if (window.scrollY < 100) {
        setShowQuickMenu(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end space-y-2.5 pointer-events-none">
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-lg hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all duration-200 flex items-center justify-center cursor-pointer group animate-in fade-in slide-in-from-bottom-2"
          title="Cuộn lên đầu trang"
          aria-label="Cuộn lên đầu trang"
        >
          <ChevronUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* Floating Action Speed Dial Menu (Optional quick actions) */}
      {showQuickMenu && (
        <div className="pointer-events-auto flex flex-col items-end space-y-2 mb-1 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => {
              setShowQuickMenu(false);
              openAddTxModal();
            }}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-slate-200/80 dark:border-slate-700/80 shadow-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <span>Khoản chi mới</span>
            <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowQuickMenu(false);
              openAddTxModal();
            }}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200/80 dark:border-slate-700/80 shadow-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <span>Khoản thu mới</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Floating Smart Assistant Button */}
      <button
        type="button"
        onClick={() => openAIModal()}
        className="pointer-events-auto flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer group"
        title="Trợ lý thông minh: Nói để ghi chép & Chat tư vấn"
        aria-label="Trợ lý thông minh"
      >
        <Sparkles className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform animate-pulse" />
      </button>

      {/* Primary Floating Action Button (FAB) */}
      <div className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => openAddTxModal()}
          className="flex items-center justify-center gap-2 h-12 w-12 sm:h-auto sm:w-auto sm:px-4.5 sm:py-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/35 hover:shadow-2xl hover:shadow-blue-500/45 hover:scale-105 active:scale-90 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-4 focus:ring-blue-500/30"
          title="Thêm giao dịch thu chi nhanh (+)"
          aria-label="Thêm giao dịch"
        >
          <Plus className="w-6 h-6 sm:w-5 sm:h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
          <span className="hidden sm:inline font-bold text-sm tracking-wide">
            Thêm chi tiêu
          </span>
        </button>
      </div>
    </div>
  );
};

