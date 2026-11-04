import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { RecurringItem, PaymentMethod } from '../../types';
import {
  X,
  Check,
  Calendar,
  Wallet,
  Tag,
  CreditCard,
  Sparkles,
  Coins,
  Edit2,
  Trash2,
  Play,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { QuickAmountInput } from '../common/QuickAmountInput';
import { formatVND } from '../../utils/formatters';
import { useModalEscape } from '../../hooks/useModalEscape';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: RecurringItem | null;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  editingItem,
}) => {
  const {
    accounts,
    categories,
    recurringItems,
    saveRecurringItem,
    deleteRecurringItem,
    toggleRecurringItem,
    checkAndProcessRecurring,
  } = useFinancial();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [curItem, setCurItem] = useState<RecurringItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amountStr, setAmountStr] = useState('15000000');
  const [dayOfMonth, setDayOfMonth] = useState<number>(5);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [isActive, setIsActive] = useState(true);

  const availableCategories = categories.filter((c) => c.type === type);

  // Sync state whenever modal opens or editingItem changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      setCurItem(editingItem);
      setViewMode('form');
      fillForm(editingItem);
    } else if (recurringItems.length > 0) {
      setCurItem(null);
      setViewMode('list');
    } else {
      setCurItem(null);
      setViewMode('form');
      resetForm();
    }
  }, [isOpen, editingItem, recurringItems.length]);

  const fillForm = (item: RecurringItem) => {
    setName(item.name);
    setType(item.type);
    setAmountStr(item.amount.toString());
    setDayOfMonth(item.dayOfMonth);
    setAccountId(item.accountId);
    setCategoryId(item.categoryId || '');
    setPaymentMethod(item.paymentMethod);
    setIsActive(item.isActive);
  };

  const resetForm = () => {
    setName('Lương cố định hàng tháng');
    setType('income');
    setAmountStr('15000000');
    setDayOfMonth(5);
    setAccountId(accounts[0]?.id || '');
    const defaultCat =
      categories.find((c) => c.id === 'cat_inc_salary') ||
      categories.find((c) => c.type === 'income');
    setCategoryId(defaultCat?.id || '');
    setPaymentMethod('transfer');
    setIsActive(true);
  };

  const handleStartCreate = () => {
    setCurItem(null);
    resetForm();
    setViewMode('form');
  };

  const handleStartEdit = (item: RecurringItem) => {
    setCurItem(item);
    fillForm(item);
    setViewMode('form');
  };

  useModalEscape(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);
    if (!name.trim()) {
      alert('Vui lòng nhập tên khoản lương hoặc thu chi định kỳ');
      return;
    }
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (!accountId) {
      alert('Vui lòng chọn tài khoản nhận tiền');
      return;
    }

    saveRecurringItem({
      id: curItem?.id,
      name: name.trim(),
      type,
      amount,
      dayOfMonth: Number(dayOfMonth),
      accountId,
      categoryId: categoryId || undefined,
      paymentMethod,
      isActive,
    });

    // If there were already items, return to list view to see it
    setViewMode('list');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {viewMode === 'list'
                  ? 'Quản lý Lương & Thu chi định kỳ'
                  : curItem
                  ? 'Chỉnh sửa khoản lương / định kỳ'
                  : 'Cài đặt khoản Lương tự động mới'}
              </h3>
              <p className="text-2xs text-slate-400">
                {viewMode === 'list'
                  ? `Đang theo dõi ${recurringItems.length} khoản định kỳ tự động`
                  : 'Tự động cộng tiền vào ví khi đến ngày nhận lương trong tháng'}
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

        {/* VIEW 1: LIST OF RECURRING ITEMS */}
        {viewMode === 'list' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Top Toolbar in List view */}
            <div className="flex items-center justify-between gap-2 pb-2">
              <button
                type="button"
                onClick={checkAndProcessRecurring}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                title="Quét và tự động ghi nhận vào tháng này nếu chưa nạp"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Ghi nhận ngay</span>
              </button>

              <button
                type="button"
                onClick={handleStartCreate}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm khoản mới</span>
              </button>
            </div>

            {/* List */}
            <div className="space-y-3">
              {recurringItems.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-700">Chưa thiết lập lương định kỳ nào</p>
                  <p className="text-2xs text-slate-400 max-w-sm mx-auto">
                    Đặt mức lương nhận hàng tháng (ví dụ: ngày 5 hoặc 10). Đến ngày đó hệ thống sẽ tự động cộng tiền vào ví.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="mt-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                  >
                    + Thiết lập lương ngay
                  </button>
                </div>
              ) : (
                recurringItems.map((item) => {
                  const acc = accounts.find((a) => a.id === item.accountId);
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all space-y-3"
                    >
                      {/* Top: Icon + Name + Badge + Amount */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          {/* Date Badge */}
                          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex flex-col items-center justify-center font-black shadow-2xs shrink-0">
                            <span className="text-3xs uppercase tracking-wider text-emerald-600 font-semibold leading-none">Ngày</span>
                            <span className="text-base font-black leading-tight text-emerald-800">{String(item.dayOfMonth).padStart(2, '0')}</span>
                          </div>

                          {/* Name & Details */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                                {item.name}
                              </h4>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-semibold whitespace-nowrap shrink-0 ${
                                  item.isActive
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                                {item.isActive ? 'Đang tự động' : 'Tạm tắt'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                              <span>Nạp tự động vào <strong>ngày {item.dayOfMonth}</strong> hàng tháng</span>
                              <span className="text-slate-300">•</span>
                              <span>Ví nhận: <strong className="text-slate-700">{acc?.name || 'Tài khoản'}</strong></span>
                            </p>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <span className="text-base sm:text-lg font-black text-emerald-600 tracking-tight block whitespace-nowrap">
                            +{formatVND(item.amount)}
                          </span>
                          <span className="text-3xs text-slate-400 font-medium">Hàng tháng</span>
                        </div>
                      </div>

                      {/* Bottom: Info + Actions */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-2xs text-slate-400 truncate">
                          {item.lastProcessedMonth
                            ? `Đã nạp tự động gần nhất: Tháng ${item.lastProcessedMonth}`
                            : 'Chưa có lượt nạp tự động nào trong tháng'}
                        </span>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleRecurringItem(item.id)}
                            className={`px-3 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                              item.isActive
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                            }`}
                          >
                            {item.isActive ? 'Tạm tắt' : 'Bật lại'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                            title="Chỉnh sửa cấu hình"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Xóa cấu hình lương định kỳ "${item.name}"?`)) {
                                deleteRecurringItem(item.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                            title="Xóa cấu hình"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: FORM CREATE / EDIT */}
        {viewMode === 'form' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {recurringItems.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline mb-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại danh sách ({recurringItems.length} khoản)</span>
              </button>
            )}

            {/* Preset Buttons for Quick Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên khoản thu chi định kỳ *
              </label>
              <input
                type="text"
                required
                placeholder="VD: Lương công ty, Tiền nhà định kỳ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {[
                  'Lương cố định công ty',
                  'Lương cứng hàng tháng',
                  'Thuê nhà nhận tiền',
                  'Tiền thưởng kinh doanh',
                ].map((presetName) => (
                  <button
                    type="button"
                    key={presetName}
                    onClick={() => setName(presetName)}
                    className="px-2 py-0.5 text-3xs font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    {presetName}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <QuickAmountInput
              label="Số tiền lương / định kỳ (VNĐ)"
              value={amountStr}
              onChange={setAmountStr}
              presets={[
                { label: '5 Tr', value: 5000000 },
                { label: '10 Tr', value: 10000000 },
                { label: '15 Tr', value: 15000000 },
                { label: '20 Tr', value: 20000000 },
                { label: '25 Tr', value: 25000000 },
                { label: '30 Tr', value: 30000000 },
              ]}
              addChips={[
                { label: '+1 Tr', value: 1000000 },
                { label: '+2 Tr', value: 2000000 },
                { label: '+5 Tr', value: 5000000 },
              ]}
            />

            {/* Day of Month and Target Account */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                  Ngày nhận trong tháng
                </label>
                <div className="flex items-center space-x-1.5">
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full h-10 px-3 py-2 text-sm font-bold text-blue-600 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Ngày {d} hàng tháng
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                  Tài khoản nhận tiền
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatVND(a.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category & Payment Method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                  Danh mục
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                  Hình thức chuyển
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full h-10 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                >
                  <option value="transfer">Chuyển khoản ngân hàng</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="ewallet">Ví điện tử</option>
                </select>
              </div>
            </div>

            {/* Active Switch */}
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Bật tự động ghi nhận
                </span>
                <span className="text-2xs text-slate-500">
                  Đến ngày {dayOfMonth} hàng tháng, tiền lương sẽ tự động cộng vào tài khoản
                </span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 flex-shrink-0">
              {recurringItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
              )}
              <button
                type="submit"
                className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{curItem ? 'Lưu cập nhật' : 'Kích hoạt tự động'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
