import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { Transaction } from '../../types';
import { formatVND } from '../../utils/formatters';
import { useModalEscape } from '../../hooks/useModalEscape';
import {
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Award,
  ChevronLeft,
  ChevronRight,
  Flame,
  CreditCard,
  Calendar,
  Share2,
  CheckCircle,
} from 'lucide-react';

interface MonthlyWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MonthlyWrappedModal: React.FC<MonthlyWrappedModalProps> = ({ isOpen, onClose }) => {
  const { transactions, categories, user } = useFinancial();
  const [currentSlide, setCurrentSlide] = useState(0);

  useModalEscape(onClose, isOpen);

  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Compute metrics for current month
  const metrics = useMemo(() => {
    const monthTxs = transactions.filter((t) => t.date.startsWith(currentYearMonth));

    let income = 0;
    let expense = 0;
    let topExpenseTx: Transaction | null = null;
    const catExpenseMap: Record<string, number> = {};
    const methodMap: Record<string, number> = {};

    monthTxs.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
        if (!topExpenseTx || tx.amount > topExpenseTx.amount) {
          topExpenseTx = tx;
        }
        if (tx.categoryId) {
          catExpenseMap[tx.categoryId] = (catExpenseMap[tx.categoryId] || 0) + tx.amount;
        }
        if (tx.paymentMethod) {
          methodMap[tx.paymentMethod] = (methodMap[tx.paymentMethod] || 0) + 1;
        }
      }
    });

    const netSavings = Math.max(0, income - expense);
    const savingRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

    // Find top expense category
    let topCatId = '';
    let topCatAmount = 0;
    Object.entries(catExpenseMap).forEach(([cId, amt]) => {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatId = cId;
      }
    });
    const topCat = categories.find((c) => c.id === topCatId);

    // Find favorite payment method
    let favMethod = 'transfer';
    let maxMethodCount = 0;
    Object.entries(methodMap).forEach(([m, count]) => {
      if (count > maxMethodCount) {
        maxMethodCount = count;
        favMethod = m;
      }
    });

    const favMethodNames: Record<string, string> = {
      transfer: 'Chuyển khoản Ngân hàng',
      ewallet: 'Ví điện tử',
      cash: 'Tiền mặt',
      card: 'Thẻ tín dụng / ghi nợ',
      qr: 'Quét mã QR',
      other: 'Khác',
    };

    // Determine badge & personality
    let badgeTitle = 'Nhà Quản Lý Cân Bằng';
    let badgeIcon = '🎯';
    let aiComment = 'Bạn duy trì mức thu chi khá ổn định. Hãy tiếp tục gia tăng tỷ lệ tiết kiệm vào các tháng tới!';

    if (savingRate >= 40) {
      badgeTitle = 'Bậc Thầy Tích Lũy Tinh Hoa';
      badgeIcon = '👑';
      aiComment = 'Tuyệt vời! Bạn giữ lại hơn 40% thu nhập của mình. Tốc độ tự do tài chính của bạn đang vượt trội so với 90% người dùng!';
    } else if (savingRate >= 20) {
      badgeTitle = 'Chuyên Gia Chi Tiêu Kỷ Luật';
      badgeIcon = '🏆';
      aiComment = 'Rất ấn tượng! Bạn tuân thủ chuẩn quy tắc tài chính 50/30/20 với hơn 20% tiết kiệm. Hãy tiếp tục duy trì phong độ này nhé!';
    } else if (expense > income && income > 0) {
      badgeTitle = 'Chiến Binh Cần Tối Ưu Hóa';
      badgeIcon = '🛡️';
      aiComment = 'Tháng này có thể bạn đã có các khoản chi lớn đột xuất. Đừng lo lắng, hãy rà soát lại danh mục lớn nhất để lấy lại nhịp cân bằng tháng sau nhé!';
    }

    const daysInMonth = today.getDate() || 1;
    const avgDailyExpense = Math.round(expense / daysInMonth);

    return {
      monthTxsCount: monthTxs.length,
      income,
      expense,
      netSavings,
      savingRate,
      hasTopExpense: Boolean(topExpenseTx),
      topExpenseNote: topExpenseTx ? (topExpenseTx as Transaction).note : '',
      topExpenseDate: topExpenseTx ? (topExpenseTx as Transaction).date : '',
      topExpenseAmount: topExpenseTx ? (topExpenseTx as Transaction).amount : 0,
      topCatName: topCat?.name || 'Chi tiêu tổng hợp',
      topCatAmount,
      favMethodName: favMethodNames[favMethod] || 'Chuyển khoản',
      badgeTitle,
      badgeIcon,
      aiComment,
      avgDailyExpense,
    };
  }, [transactions, categories, currentYearMonth, today]);

  if (!isOpen) return null;

  const totalSlides = 4;

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-indigo-500/30 text-white overflow-hidden flex flex-col min-h-[520px]">
        {/* Glow ambient background effects */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Story Progress Bars */}
        <div className="flex items-center gap-1.5 mb-5 relative z-10">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div
              key={idx}
              className="h-1 flex-1 rounded-full overflow-hidden bg-white/20 transition-all cursor-pointer"
              onClick={() => setCurrentSlide(idx)}
            >
              <div
                className={`h-full transition-all duration-300 ${
                  idx <= currentSlide ? 'bg-gradient-to-r from-blue-400 to-indigo-300 w-full' : 'w-0'
                }`}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors ml-2 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide Content Area */}
        <div className="flex-1 flex flex-col justify-center relative z-10 animate-in fade-in duration-300">
          {/* SLIDE 0: OVERVIEW */}
          {currentSlide === 0 && (
            <div className="space-y-5 text-center my-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-2xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>MoneyFlow Wrapped • Tháng {currentMonth}/{currentYear}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Toàn cảnh Dòng tiền của {user?.fullName || 'Bạn'}
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                Cùng nhìn lại bức tranh thu chi và thói quen tài chính trong tháng vừa qua!
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs text-left">
                  <span className="text-3xs font-semibold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Thu nhập
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-300 mt-1 block">
                    +{formatVND(metrics.income)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs text-left">
                  <span className="text-3xs font-semibold text-rose-400 uppercase tracking-wider block flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Chi tiêu
                  </span>
                  <span className="text-base sm:text-lg font-black text-rose-300 mt-1 block">
                    -{formatVND(metrics.expense)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-indigo-400/40 text-center">
                <span className="text-3xs text-indigo-200 font-semibold uppercase tracking-wider block">
                  Tiết kiệm tích lũy tháng này
                </span>
                <span className="text-xl sm:text-2xl font-black text-white mt-0.5 block">
                  {formatVND(metrics.netSavings)}
                </span>
                <span className="text-2xs text-indigo-300 font-medium block mt-1">
                  Đạt tỷ lệ tích lũy: <strong>{metrics.savingRate}%</strong> thu nhập
                </span>
              </div>
            </div>
          )}

          {/* SLIDE 1: TOP EXPENSE */}
          {currentSlide === 1 && (
            <div className="space-y-5 text-center my-auto">
              <div className="w-14 h-14 rounded-3xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto text-2xl">
                <Flame className="w-7 h-7 text-amber-400" />
              </div>

              <div>
                <span className="text-3xs uppercase tracking-wider text-amber-400 font-bold block mb-1">
                  Khoản chi kỷ lục tháng này
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Món chi "đậm" nhất
                </h3>
              </div>

              {metrics.hasTopExpense ? (
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      {metrics.topExpenseNote}
                    </span>
                    <span className="text-3xs text-slate-400">
                      {metrics.topExpenseDate}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-rose-400 block">
                    -{formatVND(metrics.topExpenseAmount)}
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
                  Tháng này bạn chưa có khoản chi tiêu lớn nào được ghi nhận!
                </div>
              )}

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-3xs text-slate-400 uppercase tracking-wider block">
                    Danh mục ngốn tiền nhất:
                  </span>
                  <span className="text-sm font-bold text-white mt-0.5 block">
                    {metrics.topCatName}
                  </span>
                </div>
                <span className="text-sm font-black text-rose-300">
                  {formatVND(metrics.topCatAmount)}
                </span>
              </div>
            </div>
          )}

          {/* SLIDE 2: HABITS */}
          {currentSlide === 2 && (
            <div className="space-y-5 text-center my-auto">
              <div className="w-14 h-14 rounded-3xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center mx-auto text-2xl">
                <CreditCard className="w-7 h-7 text-blue-400" />
              </div>

              <div>
                <span className="text-3xs uppercase tracking-wider text-blue-400 font-bold block mb-1">
                  Thói quen giao dịch
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Nhịp điệu chi tiêu
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-3xs font-semibold text-slate-400 block uppercase">
                    Số lần ghi chép
                  </span>
                  <span className="text-2xl font-black text-white mt-1 block">
                    {metrics.monthTxsCount} <span className="text-xs font-normal text-slate-400">lần</span>
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-3xs font-semibold text-slate-400 block uppercase">
                    Chi trung bình / ngày
                  </span>
                  <span className="text-base sm:text-lg font-black text-indigo-300 mt-1 block">
                    {formatVND(metrics.avgDailyExpense)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
                <span className="text-3xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Kênh thanh toán yêu thích nhất:
                </span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {metrics.favMethodName}
                </span>
              </div>
            </div>
          )}

          {/* SLIDE 3: BADGE & AI FEEDBACK */}
          {currentSlide === 3 && (
            <div className="space-y-4 text-center my-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-indigo-500/20">
                {metrics.badgeIcon}
              </div>

              <div>
                <span className="text-3xs uppercase tracking-wider text-indigo-300 font-bold block mb-1">
                  Danh hiệu tài chính tháng này
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {metrics.badgeTitle}
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-200 leading-relaxed text-left space-y-1.5">
                <span className="text-2xs font-bold text-indigo-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Lời nhắn từ Trợ lý Tài chính AI:
                </span>
                <p className="text-slate-300 text-2xs sm:text-xs">
                  "{metrics.aiComment}"
                </p>
              </div>

              <p className="text-3xs text-slate-400">
                Cảm ơn bạn đã luôn kỷ luật với tài chính cá nhân cùng MoneyFlow! 🎉
              </p>
            </div>
          )}
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-auto relative z-10">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Trước</span>
          </button>

          <span className="text-3xs font-semibold text-slate-400">
            {currentSlide + 1} / {totalSlides}
          </span>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-md transition-all cursor-pointer"
          >
            <span>{currentSlide === totalSlides - 1 ? 'Hoàn tất 🎉' : 'Tiếp tục'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
