import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { X, ArrowRight, Check } from 'lucide-react';
import { formatVND, getLocalDateString } from '../../utils/formatters';
import { QuickAmountInput } from '../common/QuickAmountInput';
import { useModalEscape } from '../../hooks/useModalEscape';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFromAccountId?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  defaultFromAccountId,
}) => {
  const { accounts, transferFunds } = useFinancial();

  const [fromId, setFromId] = useState<string>(
    defaultFromAccountId || accounts[0]?.id || ''
  );
  const [toId, setToId] = useState<string>(
    accounts.find((a) => a.id !== (defaultFromAccountId || accounts[0]?.id))?.id || ''
  );
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(getLocalDateString());

  useModalEscape(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền chuyển hợp lệ');
      return;
    }
    if (!fromId || !toId || fromId === toId) {
      alert('Tài khoản nguồn và tài khoản nhận phải khác nhau');
      return;
    }

    transferFunds(fromId, toId, amount, note, date);
    onClose();
  };

  const fromAcc = accounts.find((a) => a.id === fromId);
  const toAcc = accounts.find((a) => a.id === toId);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200 modal-backdrop-lock"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col h-[90dvh] sm:h-auto sm:max-h-[88vh] max-h-[92dvh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />
        <div className="flex items-center justify-between px-6 py-3.5 sm:py-4 border-b border-slate-100 flex-shrink-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Chuyển tiền nội bộ</h3>
            <p className="text-2xs text-slate-500">
              Giao dịch chuyển giữa các tài khoản sẽ không tính vào thu/chi
            </p>
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain modal-content-scroll">
          {/* Transfer visual preview */}
          <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl">
            <div className="text-left">
              <span className="text-2xs text-slate-500 block">Từ tài khoản</span>
              <span className="text-xs font-bold text-slate-800 truncate block max-w-32">
                {fromAcc?.name || 'Chọn nguồn'}
              </span>
              <span className="text-2xs text-blue-600">
                {fromAcc ? formatVND(fromAcc.balance) : ''}
              </span>
            </div>
            <div className="p-2 bg-white rounded-full shadow-2xs text-blue-600">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="text-2xs text-slate-500 block">Đến tài khoản</span>
              <span className="text-xs font-bold text-slate-800 truncate block max-w-32">
                {toAcc?.name || 'Chọn đích'}
              </span>
              <span className="text-2xs text-emerald-600">
                {toAcc ? formatVND(toAcc.balance) : ''}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                Tài khoản nguồn
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                Tài khoản nhận
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl"
              >
                {accounts
                  .filter((a) => a.id !== fromId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <QuickAmountInput
            label="Số tiền chuyển (VNĐ)"
            value={amountStr}
            onChange={setAmountStr}
            presets={[
              { label: '50k', value: 50000 },
              { label: '100k', value: 100000 },
              { label: '200k', value: 200000 },
              { label: '500k', value: 500000 },
              { label: '1 Tr', value: 1000000 },
              { label: '2 Tr', value: 2000000 },
              { label: '5 Tr', value: 5000000 },
            ]}
            addChips={[
              { label: '+50k', value: 50000 },
              { label: '+100k', value: 100000 },
              { label: '+200k', value: 200000 },
              { label: '+500k', value: 500000 },
              { label: '+1 Tr', value: 1000000 },
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                Ngày chuyển
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                Ghi chú
              </label>
              <input
                type="text"
                placeholder="VD: Trích tiết kiệm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>
          </div>

          <div className="flex items-center justify-end space-x-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/95 backdrop-blur-xs flex-shrink-0 sticky bottom-0 z-10 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Chuyển tiền</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

