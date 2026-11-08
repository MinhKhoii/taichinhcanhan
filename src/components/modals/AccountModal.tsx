import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { Account, AccountType } from '../../types';
import { X, Check, Building2, Wallet, Smartphone, PiggyBank, Landmark, CircleDot, TrendingUp, Sparkles, Percent } from 'lucide-react';
import { QuickAmountInput } from '../common/QuickAmountInput';
import { useModalEscape } from '../../hooks/useModalEscape';
import { formatVND, getLocalDateString } from '../../utils/formatters';

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
  const [isYieldEnabled, setIsYieldEnabled] = useState(false);
  const [yieldRate, setYieldRate] = useState<number>(4.0);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setBalanceStr(editingAccount.balance.toString());
      setBankName(editingAccount.bankName || '');
      setAccountNumber(editingAccount.accountNumber || '');
      setColor(editingAccount.color || '#0284C7');
      setIcon(editingAccount.icon || 'Building2');
      setIsYieldEnabled(editingAccount.isYieldEnabled || false);
      setYieldRate(editingAccount.yieldRate ?? 4.0);
    } else {
      setName('');
      setType('bank');
      setBalanceStr('0');
      setBankName('');
      setAccountNumber('');
      setColor('#0284C7');
      setIcon('Building2');
      setIsYieldEnabled(false);
      setYieldRate(4.0);
    }
  }, [editingAccount, isOpen]);

  // Tự động bật gợi ý MoMo Túi Thần Tài khi người dùng chọn ví điện tử hoặc gõ MoMo
  const handleTypeSelect = (selectedType: AccountType, defaultIcon: string) => {
    setType(selectedType);
    setIcon(defaultIcon);
    if (selectedType === 'ewallet' && !editingAccount) {
      setIsYieldEnabled(true);
      if (!name) setName('Ví MoMo');
      setColor('#D946EF');
    }
  };

  useModalEscape(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên tài khoản hoặc ví');
      return;
    }
    const balance = parseInt(balanceStr || '0', 10);
    const parsedYieldRate = isYieldEnabled ? Math.max(0.1, Number(yieldRate) || 4.0) : undefined;
    const todayStr = getLocalDateString();

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name,
        type,
        balance,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        color,
        icon,
        isYieldEnabled,
        yieldRate: parsedYieldRate,
        lastYieldDate: isYieldEnabled ? (editingAccount.lastYieldDate || todayStr) : undefined,
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
        isYieldEnabled,
        yieldRate: parsedYieldRate,
        lastYieldDate: isYieldEnabled ? todayStr : undefined,
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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center animate-in fade-in duration-200 modal-backdrop-lock"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col modal-content-scroll">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
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

        <form noValidate onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 modal-content-scroll">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Loại tài khoản
            </label>
            <div className="grid grid-cols-2 gap-2">
              {accountTypes.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleTypeSelect(item.id, item.icon)}
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

          {/* TÍCH LŨY SINH LỜI HÀNG NGÀY (VÍ MOMO TÚI THẦN TÀI / TÀI KHOẢN TÍCH LŨY) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50/60 via-purple-50/40 to-blue-50/60 border border-pink-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-pink-500 text-white shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span>Tích lũy sinh lời hàng ngày</span>
                    <span className="px-1.5 py-0.5 rounded-full text-3xs font-extrabold bg-pink-100 text-pink-700 border border-pink-300">
                      Tích lũy tự động
                    </span>
                  </h4>
                  <p className="text-3xs text-slate-500 mt-0.5">
                    Tự động tính lãi theo số dư thực tế và cộng tiền lời vào ví mỗi ngày
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isYieldEnabled}
                  onChange={(e) => setIsYieldEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            {isYieldEnabled && (
              <div className="pt-3 border-t border-pink-100/80 space-y-3 animate-in fade-in duration-200">
                <div className="p-2.5 rounded-xl bg-pink-100/70 border border-pink-200/80 text-3xs text-pink-900 leading-relaxed space-y-1">
                  <div>
                    📅 <strong>Quy tắc MoMo Túi Thần Tài:</strong> Tiền nạp vào cần <strong>1–2 ngày làm việc (T+2, trừ T7, CN)</strong> để đối soát và bắt đầu sinh lời.
                  </div>
                  <div className="text-pink-800">
                    💡 Bạn hoàn toàn có thể <strong>chỉnh sửa số dư ở trên bất cứ lúc nào</strong> để khớp 100% với số tiền thực tế đang hiển thị trong ứng dụng MoMo của bạn.
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Lãi suất sinh lời (% / năm)
                    </label>
                    <span className="text-3xs text-pink-600 font-bold">
                      {yieldRate}%/năm (~{(yieldRate / 365).toFixed(4)}%/ngày)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="100"
                        value={yieldRate}
                        onChange={(e) => setYieldRate(parseFloat(e.target.value) || 0)}
                        placeholder="4.0"
                        className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-hidden bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %/năm
                      </span>
                    </div>

                    {/* Quick rate presets */}
                    {[
                      { label: '3.5%', rate: 3.5 },
                      { label: '4.0%', rate: 4.0 },
                      { label: '5.0%', rate: 5.0 },
                      { label: '6.0%', rate: 6.0 },
                    ].map((p) => (
                      <button
                        type="button"
                        key={p.rate}
                        onClick={() => setYieldRate(p.rate)}
                        className={`px-2.5 py-1.5 rounded-xl text-2xs font-bold transition-all cursor-pointer ${
                          yieldRate === p.rate
                            ? 'bg-pink-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-pink-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Yield Estimation Card */}
                {parseInt(balanceStr || '0', 10) > 0 && (
                  <div className="p-3 rounded-xl bg-white/95 border border-pink-200/80 text-slate-700 space-y-1.5 text-2xs shadow-2xs">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Số dư tính lãi:</span>
                      <span className="font-bold text-slate-800">
                        {formatVND(parseInt(balanceStr || '0', 10))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-pink-700 font-bold pt-1 border-t border-dashed border-pink-100">
                      <span>Tiền lời cộng mỗi ngày:</span>
                      <span className="text-xs">
                        ~+{formatVND(Math.round((parseInt(balanceStr || '0', 10) * (yieldRate / 100)) / 365))}/ngày
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Ước tính 30 ngày:</span>
                      <span className="font-semibold text-slate-700">
                        ~+{formatVND(Math.round(((parseInt(balanceStr || '0', 10) * (yieldRate / 100)) / 365) * 30))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Ước tính 1 năm (365 ngày):</span>
                      <span className="font-semibold text-emerald-600">
                        ~+{formatVND(Math.round(parseInt(balanceStr || '0', 10) * (yieldRate / 100)))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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

