import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { TransactionType, PaymentMethod } from '../../types';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Check, Calendar, CreditCard, Tag, Wallet, Sparkles, FileText } from 'lucide-react';
import { DynamicIcon } from '../common/DynamicIcon';
import { formatVND, getReadableVNDWords, getDefaultPaymentMethodForAccount } from '../../utils/formatters';
import { useModalEscape } from '../../hooks/useModalEscape';

export const TransactionModal: React.FC = () => {
  const {
    isAddTxOpen,
    closeAddTxModal,
    editingTransaction,
    categories,
    accounts,
    createTransaction,
    updateTransaction,
  } = useFinancial();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(editingTransaction.amount.toString());
      setCategoryId(editingTransaction.categoryId || '');
      setAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId || '');
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.paymentMethod);
      setNote(editingTransaction.note || '');
    } else {
      setType('expense');
      setAmountStr('');
      setDate(new Date().toISOString().split('T')[0]);
      // Ưu tiên chọn tài khoản có số dư dương để tránh âm ví
      const defaultAcc = accounts.find((a) => a.balance > 0) || accounts[0];
      setAccountId(defaultAcc?.id || '');
      const otherAcc = accounts.find((a) => a.id !== defaultAcc?.id) || accounts[0];
      setToAccountId(otherAcc?.id || '');
      // Tự động gán phương thức thanh toán tương ứng với loại tài khoản (ngân hàng -> chuyển khoản, MoMo -> ví điện tử, tiền mặt -> tiền mặt)
      setPaymentMethod(getDefaultPaymentMethodForAccount(defaultAcc));
      setNote('');
      // Default to first expense category
      const firstExp = categories.find((c) => c.type === 'expense');
      setCategoryId(firstExp?.id || '');
    }
  }, [editingTransaction, isAddTxOpen, accounts, categories]);

  useModalEscape(closeAddTxModal, isAddTxOpen);

  if (!isAddTxOpen) return null;

  // Filter categories by selected type
  const availableCategories = categories.filter((c) => c.type === type);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmountStr(raw);
  };

  const addQuickAmount = (val: number) => {
    const current = parseInt(amountStr || '0', 10);
    setAmountStr((current + val).toString());
  };

  const parsedAmount = parseInt(amountStr || '0', 10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0');
      return;
    }
    if (!accountId) {
      alert('Vui lòng chọn tài khoản thanh toán');
      return;
    }
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      alert('Vui lòng chọn tài khoản nhận khác với tài khoản nguồn');
      return;
    }
    if (type !== 'transfer' && !categoryId) {
      alert('Vui lòng chọn một danh mục thu/chi');
      return;
    }

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, {
        type,
        amount: parsedAmount,
        categoryId: type === 'transfer' ? undefined : categoryId,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        date,
        paymentMethod,
        note,
      });
    } else {
      createTransaction({
        type,
        amount: parsedAmount,
        categoryId: type === 'transfer' ? undefined : categoryId,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        date,
        paymentMethod,
        note,
      });
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center animate-in fade-in duration-200 modal-backdrop-lock"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAddTxModal();
      }}
    >
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col modal-content-scroll">
        {/* Header - Cố định trên cùng */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            {editingTransaction ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch mới'}
          </h3>
          <button
            type="button"
            onClick={closeAddTxModal}
            title="Đóng (Phím Esc)"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form chính với vùng nội dung cuộn mượt mà độc lập */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 modal-content-scroll">
            {/* Type Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  const firstExp = categories.find((c) => c.type === 'expense');
                  if (firstExp) setCategoryId(firstExp.id);
                }}
                className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Chi tiêu</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  const firstInc = categories.find((c) => c.type === 'income');
                  if (firstInc) setCategoryId(firstInc.id);
                }}
                className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Thu nhập</span>
              </button>
              <button
                type="button"
                onClick={() => setType('transfer')}
                className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  type === 'transfer'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Chuyển khoản</span>
              </button>
            </div>

            {/* Amount Input with big focus */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                Số tiền giao dịch (VNĐ)
              </label>
              <div className="flex items-center justify-center space-x-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="0"
                  value={amountStr ? parseInt(amountStr, 10).toLocaleString('vi-VN') : ''}
                  onChange={handleAmountChange}
                  className="w-full text-center text-3xl font-extrabold text-slate-900 bg-transparent focus:outline-hidden tracking-tight"
                />
                <span className="text-xl font-bold text-slate-400">₫</span>
              </div>

              {parsedAmount > 0 && getReadableVNDWords(parsedAmount) && (
                <div className="flex items-center justify-center space-x-1.5 mt-2 py-1 px-3 bg-blue-50/80 border border-blue-100 rounded-xl text-xs font-bold text-blue-700 animate-in fade-in duration-150 max-w-md mx-auto">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="break-words leading-tight">{getReadableVNDWords(parsedAmount)}</span>
                </div>
              )}

              {/* Quick amount chips */}
              <div className="flex items-center justify-center flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-200/60">
                {[
                  { label: '+50k', val: 50000 },
                  { label: '+100k', val: 100000 },
                  { label: '+200k', val: 200000 },
                  { label: '+500k', val: 500000 },
                  { label: '+1tr', val: 1000000 },
                  { label: '+5tr', val: 5000000 },
                ].map((chip) => (
                  <button
                    type="button"
                    key={chip.val}
                    onClick={() => addQuickAmount(chip.val)}
                    className="px-3 py-1 text-2xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 hover:border-emerald-300 rounded-xl border border-slate-200 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selector (If not transfer) - Bỏ thanh cuộn lồng nhau để cuộn cả trang mượt mà */}
            {type !== 'transfer' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Danh mục {type === 'expense' ? 'chi tiêu' : 'thu nhập'}</span>
                  </label>
                  <span className="text-3xs text-slate-400 font-medium">Bấm chọn 1 danh mục</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-0.5">
                  {availableCategories.map((c) => {
                    const isSelected = categoryId === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setCategoryId(c.id)}
                        className={`flex items-center space-x-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs ring-2 ring-blue-500/20'
                            : 'border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                        }`}
                        title={c.name}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-2xs shrink-0"
                          style={{ backgroundColor: c.color }}
                        >
                          <DynamicIcon name={c.icon} className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold leading-tight line-clamp-1 truncate">
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Account(s) Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1.5 h-6">
                  <Wallet className="w-3.5 h-3.5 text-slate-400" />
                  <span>{type === 'transfer' ? 'Tài khoản nguồn' : 'Tài khoản'}</span>
                </label>
                <select
                  value={accountId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setAccountId(newId);
                    const selectedAcc = accounts.find((a) => a.id === newId);
                    // Tự động đồng bộ phương thức thanh toán tương ứng với loại tài khoản được chọn
                    setPaymentMethod(getDefaultPaymentMethodForAccount(selectedAcc));
                  }}
                  className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatVND(a.balance)})
                    </option>
                  ))}
                </select>
                {(() => {
                  const currentAcc = accounts.find((a) => a.id === accountId);
                  if (currentAcc && type === 'expense' && parsedAmount > currentAcc.balance) {
                    return (
                      <p className="text-3xs text-amber-600 mt-1 font-medium leading-tight">
                        ⚠️ Số dư ví hiện có {formatVND(currentAcc.balance)}. Khoản thiếu sẽ tự động cấn trừ từ tài khoản có tiền.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {type === 'transfer' ? (
                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1.5 h-6">
                    <Wallet className="w-3.5 h-3.5 text-blue-500" />
                    <span>Tài khoản nhận</span>
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {accounts
                      .filter((a) => a.id !== accountId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatVND(a.balance)})
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1.5 h-6">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phương thức</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="transfer">Chuyển khoản</option>
                    <option value="card">Thẻ tín dụng / ghi nợ</option>
                    <option value="qr">Quét mã QR</option>
                    <option value="ewallet">Ví điện tử</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              )}
            </div>

            {/* Date & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1.5 h-6">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ngày giao dịch</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1.5 h-6">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ghi chú nội dung</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Ăn tối cùng bạn bè..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions - Cố định ở chân modal để bấm nhanh mọi lúc */}
          <div className="flex items-center justify-end space-x-3 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
            <button
              type="button"
              onClick={closeAddTxModal}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingTransaction ? 'Lưu cập nhật' : 'Hoàn tất ghi nhận'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

