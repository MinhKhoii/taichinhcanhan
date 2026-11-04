import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { Account, AccountType } from '../../types';
import { X, Check, Building2, Wallet, Smartphone, PiggyBank, Landmark, CircleDot } from 'lucide-react';
import { QuickAmountInput } from '../common/QuickAmountInput';
import { useModalEscape } from '../../hooks/useModalEscape';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount?: Account | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  editingAccount,
}) => {
  const { createAccount, updateAccount } = useFinancial();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balanceStr, setBalanceStr] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#0284C7');
  const [icon, setIcon] = useState('Building2');

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setBalanceStr(editingAccount.balance.toString());
      setBankName(editingAccount.bankName || '');
      setAccountNumber(editingAccount.accountNumber || '');
      setColor(editingAccount.color || '#0284C7');
      setIcon(editingAccount.icon || 'Building2');
    } else {
      setName('');
      setType('bank');
      setBalanceStr('0');
      setBankName('');
      setAccountNumber('');
      setColor('#0284C7');
      setIcon('Building2');
    }
  }, [editingAccount, isOpen]);

  useModalEscape(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên tài khoản hoặc ví');
      return;
    }
    const balance = parseInt(balanceStr || '0', 10);

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name,
        type,
        balance,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        color,
        icon,
      });
    } else {
      createAccount({
        name,
        type,
        balance,
        initialBalance: balance,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        color,
        icon,
      });
    }
    onClose();
  };

  const accountTypes: { id: AccountType; label: string; icon: string }[] = [
    { id: 'bank', label: 'Tài khoản Ngân hàng', icon: 'Building2' },
    { id: 'cash', label: 'Tiền mặt', icon: 'Wallet' },
    { id: 'ewallet', label: 'Ví điện tử', icon: 'Smartphone' },
    { id: 'savings', label: 'Sổ tiết kiệm', icon: 'PiggyBank' },
    { id: 'investment', label: 'Đầu tư / Chứng khoán', icon: 'Landmark' },
    { id: 'other', label: 'Khác', icon: 'CircleDot' },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800">
            {editingAccount ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản / ví mới'}
          </h3>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Loại tài khoản
            </label>
            <div className="grid grid-cols-2 gap-2">
              {accountTypes.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setType(item.id);
                    setIcon(item.icon);
                  }}
                  className={`p-2.5 text-left rounded-xl border text-xs font-medium transition-all ${
                    type === item.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên tài khoản / Ví
            </label>
            <input
              type="text"
              required
              placeholder="VD: Vietcombank Lương, Ví MoMo, ..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <QuickAmountInput
            label={editingAccount ? 'Số dư hiện tại (VNĐ)' : 'Số dư ban đầu (VNĐ)'}
            value={balanceStr}
            onChange={setBalanceStr}
            presets={[
              { label: '500k', value: 500000 },
              { label: '1 Tr', value: 1000000 },
              { label: '2 Tr', value: 2000000 },
              { label: '5 Tr', value: 5000000 },
              { label: '10 Tr', value: 10000000 },
              { label: '20 Tr', value: 20000000 },
              { label: '50 Tr', value: 50000000 },
            ]}
            addChips={[
              { label: '+500k', value: 500000 },
              { label: '+1 Tr', value: 1000000 },
              { label: '+5 Tr', value: 5000000 },
              { label: '+10 Tr', value: 10000000 },
            ]}
          />

          {type === 'bank' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                  Tên ngân hàng
                </label>
                <input
                  type="text"
                  placeholder="Vietcombank, MB, ACB..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                  Số tài khoản
                </label>
                <input
                  type="text"
                  placeholder="****5678"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Màu sắc nhận diện
            </label>
            <div className="flex items-center space-x-2">
              {['#0284C7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#475569'].map(
                (c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      color === c ? 'scale-110 border-slate-800 ring-2 ring-offset-2 ring-blue-500' : 'border-white'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                )
              )}
            </div>
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
              className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{editingAccount ? 'Lưu thay đổi' : 'Tạo tài khoản'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

