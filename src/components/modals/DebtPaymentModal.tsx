import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { DebtItem, DebtBalanceAction } from '../../types';
import {
  X,
  Check,
  HandCoins,
  Calendar,
  Wallet,
  FileText,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  ShieldAlert,
  Sparkles,
  Coins,
} from 'lucide-react';
import { formatVND, getRelationshipIcon } from '../../utils/formatters';
import { QuickAmountInput } from '../common/QuickAmountInput';
import { useModalEscape } from '../../hooks/useModalEscape';
import confetti from 'canvas-confetti';

interface DebtPaymentModalProps {
  debt: DebtItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  debt,
  isOpen,
  onClose,
}) => {
  const { accounts, recordDebtPayment, showToast } = useFinancial();

  const [amountStr, setAmountStr] = useState('500000');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [balanceAction, setBalanceAction] = useState<DebtBalanceAction>(
    debt?.type === 'lend' ? 'credit' : 'debit'
  );
  const [note, setNote] = useState('');

  useEffect(() => {
    if (debt) {
      setBalanceAction(debt.type === 'lend' ? 'credit' : 'debit');
      const rem = Math.max(0, debt.totalAmount - debt.paidAmount);
      // Gợi ý số tiền phù hợp: nếu còn ít (<=500k) thì đề xuất trả hết, nếu nhiều thì gợi ý đợt nhỏ 500k hoặc 1Tr
      if (rem <= 500000) {
        setAmountStr(rem.toString());
      } else if (rem <= 2000000) {
        setAmountStr('500000');
      } else {
        setAmountStr('1000000');
      }
      const preferredAcc =
        accounts.find((a) => a.id === debt.accountId) ||
        accounts.find((a) => a.balance > 0) ||
        accounts[0];
      setAccountId(preferredAcc?.id || '');
    }
  }, [debt, isOpen, accounts]);

  useModalEscape(onClose, isOpen);

  const remaining = Math.max(0, (debt?.totalAmount || 0) - (debt?.paidAmount || 0));
  const currentPayAmount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);
  const remainingAfterPayment = Math.max(0, remaining - currentPayAmount);
  const isPayingFull = currentPayAmount >= remaining && remaining > 0;
  const newPaidAmount = Math.min(debt?.totalAmount || 0, (debt?.paidAmount || 0) + currentPayAmount);
  const currentPct = Math.round(((debt?.paidAmount || 0) / (debt?.totalAmount || 1)) * 100);
  const nextPct = Math.round((newPaidAmount / (debt?.totalAmount || 1)) * 100);

  const handlePayFull = () => {
    setAmountStr(remaining.toString());
  };

  const handlePayPartial = (val?: number) => {
    if (val) {
      setAmountStr(val.toString());
    } else {
      const suggested = remaining > 1000000 ? 500000 : Math.max(100000, Math.round(remaining / 2));
      setAmountStr(suggested.toString());
    }
  };

  if (!isOpen || !debt) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền trả nợ hợp lệ');
      return;
    }

    if (amount >= remaining) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (err) {
        console.error(err);
      }
      showToast(
        debt.type === 'lend'
          ? `Tuyệt vời! Khoản nợ của "${debt.personName}" đã được thanh toán 100%! 🎉`
          : `Tuyệt vời! Bạn đã hoàn trả hết 100% khoản nợ cho "${debt.personName}"! 🎉`,
        'success'
      );
    }

    recordDebtPayment(
      debt.id,
      amount,
      balanceAction !== 'none' ? accountId : undefined,
      note.trim() || (amount >= remaining ? 'Thanh toán toàn bộ nợ' : 'Trả nợ một phần'),
      date,
      balanceAction
    );
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {debt.type === 'lend' ? 'Ghi nhận thu hồi nợ' : 'Ghi nhận trả nợ'}
              </h3>
              <p className="text-2xs text-slate-500 truncate max-w-64 flex items-center gap-1.5 mt-0.5">
                <span>Đối tác: <strong className="text-slate-700">{debt.personName}</strong></span>
                {debt.relationship && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-3xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <span>{getRelationshipIcon(debt.relationship)}</span>
                    <span>{debt.relationship}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng (Phím Esc)"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Debt Summary Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Tổng nợ:</span>
              <span className="font-semibold text-slate-700">{formatVND(debt.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Đã trả trước đó:</span>
              <span className="font-semibold text-emerald-600">
                {formatVND(debt.paidAmount)} ({currentPct}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200">
              <span className="font-bold text-slate-700">Còn nợ lại hiện tại:</span>
              <span className="text-sm font-black text-rose-600">{formatVND(remaining)}</span>
            </div>
          </div>

          {/* Chọn hình thức: Trả bớt một phần HOẶC Tất toán hết */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hình thức thanh toán đợt này
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePayPartial()}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !isPayingFull
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-blue-600" />
                <span>Trả bớt (Khoản nhỏ)</span>
              </button>

              <button
                type="button"
                onClick={handlePayFull}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isPayingFull
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tất toán hết ({formatVND(remaining)})</span>
              </button>
            </div>
          </div>

          {/* Amount Input with Pay Full button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Số tiền trả đợt này (VNĐ)
              </label>
              {!isPayingFull && (
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="text-2xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Hoặc trả hết ({formatVND(remaining)})
                </button>
              )}
            </div>
            <QuickAmountInput
              label=""
              value={amountStr}
              onChange={setAmountStr}
              presets={[
                { label: '100k', value: 100000 },
                { label: '200k', value: 200000 },
                { label: '500k', value: 500000 },
                { label: '1 Tr', value: 1000000 },
                { label: '2 Tr', value: 2000000 },
                { label: 'Tất toán', value: remaining },
              ]}
              addChips={[
                { label: '+50k', value: 50000 },
                { label: '+100k', value: 100000 },
                { label: '+200k', value: 200000 },
                { label: '+500k', value: 500000 },
                { label: '+1 Tr', value: 1000000 },
              ]}
            />
          </div>

          {/* Real-time Calculation & Projection Box */}
          <div
            className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-all ${
              isPayingFull
                ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border-emerald-300 text-emerald-950'
                : 'bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50/90 border-blue-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <Sparkles className={`w-3.5 h-3.5 ${isPayingFull ? 'text-emerald-600' : 'text-blue-600'}`} />
                <span>Dự toán sau đợt trả này:</span>
              </span>
              <span
                className={`text-3xs font-extrabold uppercase px-2 py-0.5 rounded-md ${
                  isPayingFull
                    ? 'bg-emerald-200 text-emerald-900 font-bold'
                    : 'bg-blue-200 text-blue-900'
                }`}
              >
                {isPayingFull ? '🎉 Hoàn tất 100%' : `Tiến độ: ${currentPct}% ➔ ${nextPct}%`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-2xs">
              <div>
                <span className="text-slate-500 block">Đợt này thanh toán:</span>
                <strong className="text-sm font-black text-emerald-700">
                  {formatVND(currentPayAmount)}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">
                  {isPayingFull ? 'Trạng thái nợ:' : 'Nợ còn lại sau đợt này:'}
                </span>
                <strong
                  className={`text-sm font-black ${
                    isPayingFull ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {isPayingFull ? 'Đã hết nợ (0 ₫)' : formatVND(remainingAfterPayment)}
                </strong>
              </div>
            </div>

            {!isPayingFull && (
              <p className="text-3xs text-slate-500 italic pt-0.5">
                💡 Khoản nợ vẫn duy trì với số dư còn lại là <strong>{formatVND(remainingAfterPayment)}</strong>. Chi tiết đợt trả này sẽ tự động lưu vào mục <strong>"Lịch sử các đợt trả"</strong>.
              </p>
            )}
            {isPayingFull && (
              <p className="text-3xs text-emerald-700 font-bold pt-0.5">
                🎉 Tuyệt vời! Sau đợt trả này, toàn bộ khoản nợ sẽ được tất toán xong 100%!
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center space-x-1 text-xs font-semibold text-slate-700 mb-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Ngày thanh toán</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tác động số dư ví khi thanh toán (Cộng / Trừ / Không đổi) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tác động số dư ví:</span>
              </label>
              <span className="text-3xs text-slate-400 font-medium">Bấm chọn 1 trong 3</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option: Cộng tiền ví */}
              <button
                type="button"
                onClick={() => setBalanceAction('credit')}
                className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  balanceAction === 'credit'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <PlusCircle className={`w-3.5 h-3.5 ${balanceAction === 'credit' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    1. Cộng ví
                  </span>
                  {balanceAction === 'credit' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </div>
                <p className="text-3xs text-slate-500 leading-tight">
                  Nhận tiền về ví (Ví tăng)
                </p>
              </button>

              {/* Option: Trừ tiền ví */}
              <button
                type="button"
                onClick={() => setBalanceAction('debit')}
                className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  balanceAction === 'debit'
                    ? 'border-rose-500 bg-rose-50/80 text-rose-950 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <MinusCircle className={`w-3.5 h-3.5 ${balanceAction === 'debit' ? 'text-rose-600' : 'text-slate-400'}`} />
                    2. Trừ ví
                  </span>
                  {balanceAction === 'debit' && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                </div>
                <p className="text-3xs text-slate-500 leading-tight">
                  Trích tiền trả nợ (Ví giảm)
                </p>
              </button>

              {/* Option: Không đổi */}
              <button
                type="button"
                onClick={() => setBalanceAction('none')}
                className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  balanceAction === 'none'
                    ? 'border-blue-500 bg-blue-50/80 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <ShieldAlert className={`w-3.5 h-3.5 ${balanceAction === 'none' ? 'text-blue-600' : 'text-slate-400'}`} />
                    3. Không đổi
                  </span>
                  {balanceAction === 'none' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </div>
                <p className="text-3xs text-slate-500 leading-tight">
                  Tiền trả ngoài ví, ví giữ nguyên
                </p>
              </button>
            </div>

            {balanceAction !== 'none' ? (
              <div className="pt-1 animate-in fade-in duration-150">
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  {balanceAction === 'credit'
                    ? 'Chọn tài khoản / ví nhận CỘNG TIỀN:'
                    : 'Chọn tài khoản / ví muốn TRỪ TIỀN:'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatVND(a.balance)})
                    </option>
                  ))}
                </select>
                {(() => {
                  const currentAcc = accounts.find((a) => a.id === accountId);
                  const payAmount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);
                  if (currentAcc && balanceAction === 'debit' && payAmount > currentAcc.balance) {
                    return (
                      <p className="text-3xs text-amber-600 mt-1 font-medium leading-tight">
                        ⚠️ Ví này chỉ có {formatVND(currentAcc.balance)}. Khoản thiếu sẽ tự động cấn trừ từ tài khoản có tiền.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            ) : (
              <p className="text-3xs text-slate-400 italic pt-0.5">
                ℹ️ Số tiền này được ghi nhận đã tất toán trên Sổ nợ, nhưng số dư trong các tài khoản ví của bạn sẽ không bị thay đổi.
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="flex items-center space-x-1 text-xs font-semibold text-slate-700 mb-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Ghi chú đợt trả</span>
            </label>
            <input
              type="text"
              placeholder="VD: Trả tiền mặt đợt 1, chuyển khoản MB..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận trả nợ</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

