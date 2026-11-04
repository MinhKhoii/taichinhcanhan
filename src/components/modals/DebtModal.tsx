import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { DebtItem, DebtType, DebtBalanceAction } from '../../types';
import {
  X,
  Check,
  HandCoins,
  Calendar,
  User,
  Users,
  Phone,
  Wallet,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  HeartHandshake,
  PlusCircle,
  MinusCircle,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { QuickAmountInput } from '../common/QuickAmountInput';
import { useModalEscape } from '../../hooks/useModalEscape';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDebt?: DebtItem | null;
  defaultType?: DebtType;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  editingDebt,
  defaultType = 'lend',
}) => {
  const { accounts, createDebt, updateDebt } = useFinancial();

  const [type, setType] = useState<DebtType>(defaultType);
  const [personName, setPersonName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('500000');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [hasDueDate, setHasDueDate] = useState(true);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [balanceAction, setBalanceAction] = useState<DebtBalanceAction>(
    defaultType === 'lend' ? 'debit' : 'credit'
  );
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (editingDebt) {
      setType(editingDebt.type);
      setPersonName(editingDebt.personName);
      setRelationship(editingDebt.relationship || '');
      setPhoneNumber(editingDebt.phoneNumber || '');
      setTotalAmountStr(editingDebt.totalAmount.toString());
      setStartDate(editingDebt.startDate);
      setDueDate(editingDebt.dueDate || '');
      setHasDueDate(!!editingDebt.dueDate);
      setAccountId(editingDebt.accountId || accounts[0]?.id || '');
      setBalanceAction('none'); // Không tự ý trừ/cộng lại khi chỉnh sửa
      setNote(editingDebt.note || '');
    } else {
      setType(defaultType);
      setPersonName('');
      setRelationship('');
      setPhoneNumber('');
      setTotalAmountStr('2000000');
      setStartDate(new Date().toISOString().split('T')[0]);
      // default deadline: 30 days later
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split('T')[0]);
      setHasDueDate(true);
      const defaultAcc = accounts.find((a) => a.balance > 0) || accounts[0];
      setAccountId(defaultAcc?.id || '');
      setBalanceAction(defaultType === 'lend' ? 'debit' : 'credit');
      setNote('');
    }
  }, [editingDebt, isOpen, defaultType]);

  useModalEscape(onClose, isOpen);

  if (!isOpen) return null;

  const handleTypeChange = (newType: DebtType) => {
    setType(newType);
    if (!editingDebt) {
      // Tự động gợi ý hợp lý theo loại nợ nhưng người dùng vẫn tự do bấm đổi
      setBalanceAction(newType === 'lend' ? 'debit' : 'credit');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = parseInt(totalAmountStr.replace(/[^0-9]/g, '') || '0', 10);
    if (!personName.trim()) {
      alert('Vui lòng nhập tên người nợ / người cho vay');
      return;
    }
    if (!totalAmount || totalAmount <= 0) {
      alert('Vui lòng nhập số tiền nợ hợp lệ');
      return;
    }

    const finalDueDate = hasDueDate && dueDate ? dueDate : undefined;

    if (editingDebt) {
      updateDebt(editingDebt.id, {
        type,
        personName: personName.trim(),
        relationship: relationship.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        totalAmount,
        startDate,
        dueDate: finalDueDate,
        accountId: balanceAction !== 'none' ? accountId : undefined,
        note: note.trim() || undefined,
      });
    } else {
      createDebt(
        {
          personName: personName.trim(),
          relationship: relationship.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          type,
          totalAmount,
          paidAmount: 0,
          startDate,
          dueDate: finalDueDate,
          accountId: balanceAction !== 'none' ? accountId : undefined,
          note: note.trim() || undefined,
          status: 'pending',
          payments: [],
        },
        { balanceAction }
      );
    }
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl text-white ${type === 'lend' ? 'bg-blue-600' : 'bg-amber-600'}`}>
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {editingDebt ? 'Chỉnh sửa khoản nợ' : 'Ghi nhận Sổ nợ mới'}
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi ai nợ bạn hoặc bạn nợ ai, hạn trả và tiến độ thu hồi
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
          {/* Debt Type Selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => handleTypeChange('lend')}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'lend'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Người khác nợ tôi (Cho vay)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('borrow')}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'borrow'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Tôi nợ người khác (Đi vay)</span>
            </button>
          </div>

          {/* Họ tên & SĐT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5 h-6">
                <label className="flex items-center space-x-1 text-xs font-semibold text-slate-700">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{type === 'lend' ? 'Người nợ bạn' : 'Người bạn nợ'} *</span>
                </label>
                <span className="text-2xs text-rose-500 font-semibold">Bắt buộc</span>
              </div>
              <input
                type="text"
                required
                placeholder="VD: Hoàng Nhật, Huyền..."
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full h-10 px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5 h-6">
                <label className="flex items-center space-x-1 text-xs font-semibold text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Số điện thoại</span>
                </label>
                <span className="text-2xs text-slate-400 font-normal">Không bắt buộc</span>
              </div>
              <input
                type="text"
                placeholder="Để trống nếu không cần..."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full h-10 px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Mối quan hệ */}
          <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-1 text-xs font-semibold text-slate-700">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Mối quan hệ:</span>
              </label>
              <span className="text-2xs text-slate-400">Bấm chọn nhanh hoặc tự nhập</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Bạn bè', icon: '🤝' },
                { label: 'Người thân', icon: '🏠' },
                { label: 'Gia đình', icon: '❤️' },
                { label: 'Anh trai', icon: '👨' },
                { label: 'Chị gái', icon: '👩' },
                { label: 'Em trai', icon: '👦' },
                { label: 'Em gái', icon: '👧' },
                { label: 'Đồng nghiệp', icon: '💼' },
              ].map((item) => {
                const isSelected = relationship === item.label;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => setRelationship(isSelected ? '' : item.label)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="Hoặc tự gõ: Bạn cấp 3, Chị họ, Hàng xóm, Khách hàng..."
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Số tiền nợ */}
          <QuickAmountInput
            label="Số tiền nợ (VNĐ)"
            value={totalAmountStr}
            onChange={setTotalAmountStr}
            presets={[
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

          {/* Ngày vay & Hạn trả */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5 h-6">
                <label className="flex items-center space-x-1 text-xs font-semibold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ngày vay / mượn</span>
                </label>
              </div>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 h-6">
                <label className="flex items-center space-x-1 text-xs font-semibold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  <span>Hạn chót trả nợ</span>
                </label>
                <label className="inline-flex items-center space-x-1 cursor-pointer text-2xs text-slate-500 hover:text-slate-800 select-none">
                  <input
                    type="checkbox"
                    checked={!hasDueDate}
                    onChange={(e) => {
                      const noDue = e.target.checked;
                      setHasDueDate(!noDue);
                      if (noDue) setDueDate('');
                      else {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        setDueDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-3.5 h-3.5 text-blue-600 rounded-sm cursor-pointer accent-blue-600"
                  />
                  <span>Không có hạn</span>
                </label>
              </div>
              {hasDueDate ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-xs sm:text-sm border border-rose-300 bg-rose-50/20 rounded-xl focus:ring-2 focus:ring-rose-500"
                />
              ) : (
                <div className="h-10 px-3 py-2 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600 truncate">
                    <HeartHandshake className="w-4 h-4 text-emerald-600 shrink-0" />
                    Không hạn cố định (khi nào có thì trả)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHasDueDate(true);
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      setDueDate(d.toISOString().split('T')[0]);
                    }}
                    className="text-2xs text-blue-600 font-bold hover:underline shrink-0 ml-2 cursor-pointer"
                  >
                    Đặt hạn
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tác động đến tiền ví */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                <span>Tác động tiền ví của bạn:</span>
              </label>
              <span className="text-2xs text-slate-500 font-medium">Bấm chọn 1 mục</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBalanceAction('debit')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  balanceAction === 'debit'
                    ? 'border-rose-500 bg-rose-50/80 text-rose-950 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">1. Trừ tiền ví</span>
                <span className="text-2xs text-slate-500 block mt-0.5">Xuất ví cho vay</span>
              </button>

              <button
                type="button"
                onClick={() => setBalanceAction('credit')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  balanceAction === 'credit'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">2. Cộng tiền ví</span>
                <span className="text-2xs text-slate-500 block mt-0.5">Nhận tiền vào ví</span>
              </button>

              <button
                type="button"
                onClick={() => setBalanceAction('none')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  balanceAction === 'none'
                    ? 'border-blue-500 bg-blue-50/80 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">3. Giữ nguyên ví</span>
                <span className="text-2xs text-slate-500 block mt-0.5">Chỉ ghi nhớ nợ</span>
              </button>
            </div>

            {balanceAction !== 'none' ? (
              <div className="pt-1 animate-in fade-in duration-150">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {balanceAction === 'debit'
                    ? 'Chọn tài khoản / ví muốn TRỪ TIỀN:'
                    : 'Chọn tài khoản / ví muốn CỘNG TIỀN:'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.balance.toLocaleString('vi-VN')} ₫)
                    </option>
                  ))}
                </select>
                {(() => {
                  const currentAcc = accounts.find((a) => a.id === accountId);
                  const parsedAmount = parseInt(totalAmountStr.replace(/[^0-9]/g, '') || '0', 10);
                  if (currentAcc && balanceAction === 'debit' && parsedAmount > currentAcc.balance) {
                    return (
                      <p className="text-xs text-amber-600 mt-1 font-medium leading-tight">
                        ⚠️ Ví này chỉ có {currentAcc.balance.toLocaleString('vi-VN')} ₫. Khoản thiếu sẽ tự động cấn trừ từ ví có tiền.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            ) : (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Số dư ví giữ nguyên. Khi bấm <strong>"Ghi nhận trả/thu nợ"</strong>, hệ thống sẽ tự động cập nhật số dư ví!
                </span>
              </div>
            )}
          </div>

          {/* Ghi chú */}
          <div>
            <label className="flex items-center space-x-1 text-xs font-semibold text-slate-700 mb-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Ghi chú (Tùy chọn)</span>
            </label>
            <input
              type="text"
              placeholder="VD: Mượn mua điện thoại, hẹn trả trước Tết..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingDebt ? 'Lưu thay đổi' : 'Ghi nhận nợ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

