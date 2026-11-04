import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { SavingsGoal } from '../../types';
import { X, Check, Sparkles, TrendingUp } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { QuickAmountInput } from '../common/QuickAmountInput';
import { useModalEscape } from '../../hooks/useModalEscape';
import confetti from 'canvas-confetti';

interface GoalDepositModalProps {
  goal: SavingsGoal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GoalDepositModal: React.FC<GoalDepositModalProps> = ({
  goal,
  isOpen,
  onClose,
}) => {
  const { accounts, depositToGoal, showToast } = useFinancial();

  const defaultAcc = accounts.find((a) => a.balance > 0) || accounts[0];
  const [amountStr, setAmountStr] = useState('1000000');
  const [accountId, setAccountId] = useState(defaultAcc?.id || '');
  const [deductFromAccount, setDeductFromAccount] = useState(true);

  useModalEscape(onClose, isOpen);

  if (!isOpen || !goal) return null;

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0');
      return;
    }

    const newTotal = goal.currentAmount + amount;
    if (newTotal >= goal.targetAmount) {
      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (err) {
        console.error('Confetti error:', err);
      }
      showToast(`Chúc mừng! Bạn đã hoàn thành 100% mục tiêu "${goal.name}"!`, 'success');
    }

    depositToGoal(goal.id, amount, deductFromAccount ? accountId : undefined);
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Tích lũy mục tiêu</h3>
              <p className="text-2xs text-slate-500 truncate max-w-64">{goal.name}</p>
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
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <span className="text-2xs font-medium text-slate-500 uppercase">Còn thiếu để về đích</span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">
              {formatVND(remaining)}
            </div>
          </div>

          <QuickAmountInput
            label="Số tiền nạp thêm (VNĐ)"
            value={amountStr}
            onChange={setAmountStr}
            presets={[
              { label: '500k', value: 500000 },
              { label: '1 Tr', value: 1000000 },
              { label: '2 Tr', value: 2000000 },
              { label: '5 Tr', value: 5000000 },
              { label: '10 Tr', value: 10000000 },
            ]}
            addChips={[
              { label: '+500k', value: 500000 },
              { label: '+1 Tr', value: 1000000 },
              { label: '+2 Tr', value: 2000000 },
            ]}
          />

          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={deductFromAccount}
                onChange={(e) => setDeductFromAccount(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Trừ trực tiếp số tiền này từ tài khoản thanh toán
              </span>
            </label>

            {deductFromAccount && (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Số dư: {formatVND(a.balance)})
                  </option>
                ))}
              </select>
            )}
          </div>

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
              <span>Xác nhận nạp</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

