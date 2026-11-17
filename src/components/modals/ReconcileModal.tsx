import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { Account } from '../../types';
import {
  X,
  CheckCheck,
  Scale,
  Sparkles,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { formatVND, formatDateVN, getLocalDateString } from '../../utils/formatters';
import { useModalEscape } from '../../hooks/useModalEscape';

interface ReconcileModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({ account, isOpen, onClose }) => {
  const { updateAccount, createTransaction, showToast, categories } = useFinancial();

  useModalEscape(onClose, isOpen);

  const [actualBalanceStr, setActualBalanceStr] = useState<string>('');
  const [createAdjustmentTx, setCreateAdjustmentTx] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (account && isOpen) {
      setActualBalanceStr(account.balance.toString());
      setCreateAdjustmentTx(true);
      setIsSubmitting(false);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  // Parse actual balance from user input
  const rawNum = actualBalanceStr.replace(/[^0-9-]/g, '');
  const actualBalance = rawNum ? parseInt(rawNum, 10) : 0;
  const difference = actualBalance - account.balance;
  const isExactMatch = difference === 0;

  const handleConfirmReconciliation = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const todayStr = getLocalDateString();

      // Nếu có chênh lệch và người dùng muốn tạo giao dịch bù trừ
      if (!isExactMatch && createAdjustmentTx) {
        // Tìm category Thu nhập khác hoặc Chi phí khác
        const otherIncCat = categories.find(
          (c) => c.type === 'income' && (c.name.toLowerCase().includes('khác') || c.id === 'cat_inc_other')
        );
        const otherExpCat = categories.find(
          (c) => c.type === 'expense' && (c.name.toLowerCase().includes('khác') || c.id === 'cat_exp_other')
        );

        if (difference > 0) {
          // Thực tế nhiều hơn app -> Tạo khoản Thu nhập điều chỉnh
          createTransaction({
            type: 'income',
            amount: difference,
            accountId: account.id,
            categoryId: otherIncCat?.id || categories.find((c) => c.type === 'income')?.id,
            date: todayStr,
            paymentMethod: 'transfer',
            note: `[Đối soát] Điều chỉnh số dư khớp thực tế ngân hàng (+${formatVND(difference)})`,
          });
        } else {
          // Thực tế ít hơn app -> Tạo khoản Chi tiêu điều chỉnh
          createTransaction({
            type: 'expense',
            amount: Math.abs(difference),
            accountId: account.id,
            categoryId: otherExpCat?.id || categories.find((c) => c.type === 'expense')?.id,
            date: todayStr,
            paymentMethod: 'transfer',
            note: `[Đối soát] Điều chỉnh số dư khớp thực tế ngân hàng (-${formatVND(Math.abs(difference))})`,
          });
        }

        // Cập nhật timestamp đối soát
        updateAccount(account.id, {
          lastReconciledAt: nowIso,
        });
      } else {
        // Nếu khớp hoàn toàn hoặc không tạo giao dịch phụ: cập nhật số dư trực tiếp và gắn timestamp
        updateAccount(account.id, {
          balance: actualBalance,
          lastReconciledAt: nowIso,
        });
      }

      showToast(`✨ Đã đối soát và chốt số dư tài khoản "${account.name}" thành công!`, 'success');
      onClose();
    } catch (e: any) {
      showToast(`Lỗi khi đối soát: ${e?.message || 'Không rõ'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Đối soát số dư thực tế</h3>
              <p className="text-3xs text-blue-100">
                {account.name} ({account.type === 'bank' ? 'Ngân hàng' : account.type === 'ewallet' ? 'Ví điện tử' : 'Tiền mặt'})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Box 1: Current App Balance */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
                Số dư đang ghi nhận trên ứng dụng
              </span>
              <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                {formatVND(account.balance)}
              </div>
            </div>

            {account.lastReconciledAt && (
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  Đã đối soát {formatDateVN(account.lastReconciledAt)}
                </span>
              </div>
            )}
          </div>

          {/* Box 2: Input Actual Balance */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Số dư thực tế trên ứng dụng ngân hàng / ví thật của bạn (VNĐ):
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={actualBalanceStr}
                onChange={(e) => setActualBalanceStr(e.target.value)}
                placeholder="VD: 15.536.000"
                className="w-full pl-4 pr-10 py-3 text-lg font-black text-slate-900 bg-slate-50 border-2 border-slate-300 focus:border-blue-600 rounded-2xl focus:outline-hidden transition-all shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ₫
              </span>
            </div>

            {/* Quick shortcuts */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-3xs text-slate-400 font-semibold">Gợi ý nhanh:</span>
              <button
                type="button"
                onClick={() => setActualBalanceStr(account.balance.toString())}
                className="px-2.5 py-1 text-2xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Khớp số dư app ({formatVND(account.balance)})
              </button>
              <button
                type="button"
                onClick={() => setActualBalanceStr(Math.round(account.balance / 1000) * 1000 + '')}
                className="px-2.5 py-1 text-2xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Làm tròn nghìn
              </button>
            </div>
          </div>

          {/* Box 3: Live Reconciliation Analysis (Actual Budget style) */}
          <div className="p-4 rounded-2xl border transition-all">
            {isExactMatch ? (
              <div className="flex items-center space-x-3 text-emerald-800 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    Số dư hoàn toàn khớp 100%!
                  </h4>
                  <p className="text-3xs text-emerald-700 mt-0.5">
                    Số dư trên MoneyFlow và tài khoản thực tế của bạn hoàn toàn trùng khớp. Bấm xác nhận để chốt sổ đối soát.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-xl border flex items-start space-x-3 ${
                    difference > 0
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/80 border-rose-200 text-rose-900'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg text-white shrink-0 mt-0.5 ${
                      difference > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black">
                        Chênh lệch: {difference > 0 ? '+' : ''}{formatVND(difference)}
                      </span>
                      <span className="text-3xs px-2 py-0.5 rounded-full font-bold bg-white shadow-2xs">
                        {difference > 0 ? 'Thực tế thừa tiền' : 'Thực tế thiếu tiền'}
                      </span>
                    </div>
                    <p className="text-3xs mt-1 leading-relaxed opacity-90">
                      {difference > 0
                        ? `Ngân hàng thực tế đang có nhiều hơn trên ứng dụng ${formatVND(difference)}. Có thể bạn đã quên ghi nhận một khoản tiền được chuyển vào.`
                        : `Ngân hàng thực tế đang có ít hơn trên ứng dụng ${formatVND(Math.abs(difference))}. Có thể bạn đã quên ghi nhận một khoản chi tiêu nhỏ hoặc phí giao dịch.`}
                    </p>
                  </div>
                </div>

                {/* Option to create adjustment transaction */}
                <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={createAdjustmentTx}
                    onChange={(e) => setCreateAdjustmentTx(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="text-xs text-slate-700">
                    <span className="font-bold block">
                      Tự động tạo giao dịch {difference > 0 ? 'Thu nhập' : 'Chi tiêu'} bù trừ ({difference > 0 ? '+' : '-'}{formatVND(Math.abs(difference))})
                    </span>
                    <span className="text-3xs text-slate-400 block mt-0.5">
                      Giúp sổ nhật ký giao dịch luôn rõ ràng, minh bạch nguồn gốc của số tiền điều chỉnh này.
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleConfirmReconciliation}
            disabled={isSubmitting}
            className={`flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer active:scale-95 ${
              isExactMatch
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>{isExactMatch ? 'Khóa sổ & Chốt đối soát' : 'Đồng bộ & Cân bằng số dư'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
