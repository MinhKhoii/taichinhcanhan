import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Account, AccountType } from '../types';
import {
  Wallet,
  Building2,
  Smartphone,
  PiggyBank,
  Plus,
  ArrowLeftRight,
  Edit2,
  Trash2,
  History,
  TrendingUp,
  CreditCard,
  Landmark,
  CircleDot,
  Check,
  ChevronRight,
  AlertTriangle,
  Zap,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';
import { formatVND, formatDateVN } from '../utils/formatters';
import { DynamicIcon } from '../components/common/DynamicIcon';
import { AccountModal } from '../components/modals/AccountModal';
import { TransferModal } from '../components/modals/TransferModal';

export const AccountsPage: React.FC = () => {
  const {
    user,
    accounts,
    transactions,
    categories,
    deleteAccount,
    updateUser,
    autoOffsetNegativeAccount,
    autoOffsetAllNegativeAccounts,
    recalculateAccountBalances,
  } = useFinancial();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string>('');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Negative accounts check & Richest positive account
  const negativeAccounts = useMemo(() => accounts.filter((a) => a.balance < 0), [accounts]);
  const totalDeficit = useMemo(
    () => negativeAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0),
    [negativeAccounts]
  );
  const richestAccount = useMemo(() => {
    const positive = accounts.filter((a) => a.balance > 0).sort((a, b) => b.balance - a.balance);
    return positive[0];
  }, [accounts]);

  // Overall statistics
  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  const accountsByType = useMemo(() => {
    const groups: Record<string, { count: number; total: number }> = {};
    accounts.forEach((a) => {
      if (!groups[a.type]) groups[a.type] = { count: 0, total: 0 };
      groups[a.type].count += 1;
      groups[a.type].total += a.balance;
    });
    return groups;
  }, [accounts]);

  // Selected account details
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || accounts[0],
    [accounts, selectedAccountId]
  );

  // Transactions belonging to selected account
  const accountTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions.filter(
      (t) => t.accountId === selectedAccount.id || t.toAccountId === selectedAccount.id
    );
  }, [transactions, selectedAccount]);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setIsAccountModalOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setIsAccountModalOpen(true);
  };

  const handleOpenTransfer = (fromId?: string) => {
    setTransferFromId(fromId || selectedAccount?.id || '');
    setIsTransferModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Tài khoản & Ví thanh toán
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Quản lý tập trung mọi nguồn tiền mặt, thẻ ngân hàng, ví điện tử và sổ tiết kiệm
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nút bật/tắt Tự động bù trừ khi âm */}
          <button
            onClick={() => updateUser({ autoOffsetNegative: user?.autoOffsetNegative === false ? true : false })}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
              user?.autoOffsetNegative !== false
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Khi BẬT: Hệ thống tự động cấn trừ từ tài khoản có tiền sang ví bị âm khi chi tiêu vượt số dư"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${user?.autoOffsetNegative !== false ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Tự cấn trừ khi âm ví: {user?.autoOffsetNegative !== false ? 'BẬT' : 'TẮT'}</span>
          </button>

          {/* Đồng bộ lại số dư theo lịch sử giao dịch */}
          <button
            onClick={() => recalculateAccountBalances()}
            className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            title="Tính toán và đồng bộ lại chính xác số dư từng ví theo toàn bộ lịch sử thu/chi"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Đồng bộ số dư</span>
          </button>

          <button
            onClick={() => handleOpenTransfer()}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            <span>Chuyển tiền nội bộ</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* CẢNH BÁO SỐ DƯ ÂM & CẤN TRỪ TỰ ĐỘNG THÔNG MINH */}
      {negativeAccounts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-2 border-rose-300 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-500/25 flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-rose-900">
                  Phát hiện {negativeAccounts.length} tài khoản đang bị âm số dư
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-3xs font-black uppercase tracking-wider bg-rose-200 text-rose-900 border border-rose-300">
                  Tổng âm: -{formatVND(totalDeficit)}
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 max-w-2xl leading-relaxed">
                {negativeAccounts.map((a) => `"${a.name}" (-${formatVND(Math.abs(a.balance))})`).join(', ')} bị âm do chi tiêu hoặc trả nợ vượt quá số dư tiền mặt. 
                {richestAccount ? (
                  <span> Bạn có thể nhấn cấn trừ tự động để hệ thống trích <strong>{formatVND(Math.min(totalDeficit, richestAccount.balance))}</strong> từ ví <strong>{richestAccount.name}</strong> (đang có {formatVND(richestAccount.balance)}) bù về 0 ₫ ngay lập tức.</span>
                ) : (
                  <span> Vui lòng nạp thêm tiền hoặc cập nhật lại số dư ví ban đầu.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto flex-shrink-0">
            {richestAccount && (
              <button
                onClick={() => autoOffsetAllNegativeAccounts()}
                className="flex-1 md:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-2xl shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>⚡ Cấn trừ tự động từ ví {richestAccount.name}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Asset Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số dư khả dụng (Hero Card) */}
        <div className="bg-white rounded-3xl p-5 border-2 border-blue-500/30 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/60 hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-700">
              Tổng số dư khả dụng
            </span>
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 shadow-2xs group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatVND(totalBalance)}
            </h3>
            <p className="text-2xs text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Đang quản lý {accounts.length} nguồn tiền
            </p>
          </div>
        </div>

        {/* Card 2: Ngân hàng & Thẻ */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
              Ngân hàng & Thẻ
            </span>
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-slate-800">
              {formatVND(accountsByType['bank']?.total || 0)}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">
              {accountsByType['bank']?.count || 0} tài khoản ngân hàng
            </p>
          </div>
        </div>

        {/* Card 3: Sổ tiết kiệm */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
              Sổ tiết kiệm
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-slate-800">
              {formatVND(accountsByType['savings']?.total || 0)}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">
              {accountsByType['savings']?.count || 0} sổ tiết kiệm sinh lời
            </p>
          </div>
        </div>

        {/* Card 4: Ví điện tử & Tiền mặt */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
              Ví điện tử & Tiền mặt
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-slate-800">
              {formatVND(
                (accountsByType['cash']?.total || 0) + (accountsByType['ewallet']?.total || 0)
              )}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">
              {(accountsByType['cash']?.count || 0) + (accountsByType['ewallet']?.count || 0)} ví sẵn sàng chi tiêu
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Account Cards List & Right Detail & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Accounts Cards (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              Danh sách tài khoản ({accounts.length})
            </h2>
            <span className="text-xs text-slate-400">
              Bấm vào để xem biến động chi tiết
            </span>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Chưa có tài khoản nào
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Hãy tạo tài khoản ngân hàng, tiền mặt hoặc ví điện tử đầu tiên để bắt đầu ghi nhận và theo dõi dòng tiền.
              </p>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                + Tạo tài khoản ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {accounts.map((acc) => {
              const isSelected = selectedAccount?.id === acc.id;
              let typeLabel = 'Ngân hàng';
              if (acc.type === 'cash') typeLabel = 'Tiền mặt';
              if (acc.type === 'ewallet') typeLabel = 'Ví điện tử';
              if (acc.type === 'savings') typeLabel = 'Sổ tiết kiệm';
              if (acc.type === 'investment') typeLabel = 'Đầu tư';

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                    acc.balance < 0
                      ? isSelected
                        ? 'border-rose-500 bg-rose-50/60 shadow-md ring-2 ring-rose-500/30'
                        : 'border-rose-300 bg-rose-50/30 hover:bg-rose-50/60 shadow-xs'
                      : isSelected
                        ? 'border-blue-600 bg-white shadow-md ring-2 ring-blue-500/30'
                        : 'border-slate-200/80 bg-white hover:bg-slate-50/80 shadow-xs'
                  }`}
                >
                  {/* Top indicator stripe */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: acc.balance < 0 ? '#E11D48' : acc.color || '#3B82F6' }}
                  />

                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-2xs"
                        style={{ backgroundColor: acc.balance < 0 ? '#E11D48' : acc.color || '#3B82F6' }}
                      >
                        <DynamicIcon name={acc.icon || 'Wallet'} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="text-sm font-bold text-slate-800 leading-tight">
                            {acc.name}
                          </h3>
                          {acc.balance < 0 && (
                            <span className="px-1.5 py-0.5 rounded-md text-3xs font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                              Âm ví
                            </span>
                          )}
                        </div>
                        <span className="text-2xs text-slate-400 font-medium">
                          {typeLabel} {acc.accountNumber ? `• ${acc.accountNumber}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(acc);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Chỉnh sửa tài khoản"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Bạn có chắc muốn xóa tài khoản "${acc.name}"?`)) {
                            deleteAccount(acc.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Xóa tài khoản"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                        Số dư hiện tại
                      </span>
                      {acc.balance < 0 && (
                        <span className="text-2xs font-bold text-rose-600 flex items-center space-x-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Chi vượt số dư</span>
                        </span>
                      )}
                    </div>
                    <div className={`text-xl font-extrabold mt-0.5 tracking-tight ${
                      acc.balance < 0 ? 'text-rose-600' : 'text-slate-900'
                    }`}>
                      {formatVND(acc.balance)}
                    </div>
                  </div>

                  {/* Nút cấn trừ nhanh ngay trên thẻ nếu bị âm */}
                  {acc.balance < 0 && richestAccount && richestAccount.id !== acc.id && (
                    <div className="mt-3 pt-2.5 border-t border-rose-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          autoOffsetNegativeAccount(acc.id, richestAccount.id);
                        }}
                        className="w-full py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-all"
                        title={`Cấn trừ ${formatVND(Math.abs(acc.balance))} từ ví "${richestAccount.name}" để đưa ví này về 0 ₫`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>⚡ Cấn trừ từ ví {richestAccount.name}</span>
                      </button>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs">
                    <span className="text-slate-400">
                      Tạo ngày {formatDateVN(acc.createdAt)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTransfer(acc.id);
                      }}
                      className="font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <span>Chuyển tiền</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Right: Selected Account Details & Transaction History */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          {!selectedAccount ? (
            <div className="py-20 text-center text-xs text-slate-400">
              Chưa có tài khoản nào để hiển thị lịch sử
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shadow-2xs"
                      style={{ backgroundColor: selectedAccount.color || '#3B82F6' }}
                    >
                      <DynamicIcon name={selectedAccount.icon || 'Wallet'} className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {selectedAccount.name}
                      </h3>
                      <p className="text-2xs text-slate-400">
                        Lịch sử biến động số dư ({accountTransactions.length} giao dịch)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Quick Stats Box */}
                <div className="p-4 my-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Số dư ban đầu:</span>
                    <span className="font-semibold text-slate-700">
                      {formatVND(selectedAccount.initialBalance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-500">Số dư hiện tại:</span>
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-bold ${selectedAccount.balance < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                        {formatVND(selectedAccount.balance || 0)}
                      </span>
                      {selectedAccount.balance < 0 && (
                        <span className="px-1.5 py-0.5 rounded text-3xs font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                          Đang âm
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedAccount.bankName && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Đơn vị quản lý:</span>
                      <span className="font-medium text-slate-700">{selectedAccount.bankName}</span>
                    </div>
                  )}

                  {/* Nút cấn trừ nếu tài khoản đang xem bị âm */}
                  {selectedAccount.balance < 0 && richestAccount && richestAccount.id !== selectedAccount.id && (
                    <div className="pt-2 mt-2 border-t border-rose-200 space-y-2">
                      <p className="text-2xs text-rose-700 leading-snug">
                        Ví này đang bị âm <strong>{formatVND(Math.abs(selectedAccount.balance))}</strong>. Cấn trừ tự động từ ví <strong>{richestAccount.name}</strong> để đưa về 0 ₫.
                      </p>
                      <button
                        onClick={() => autoOffsetNegativeAccount(selectedAccount.id, richestAccount.id)}
                        className="w-full py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>⚡ Cấn trừ bù số dư âm ngay</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Transactions List */}
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {accountTransactions.length === 0 ? (
                    <div className="py-10 text-center space-y-2 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-4">
                      <ArrowLeftRight className="w-7 h-7 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">Chưa có giao dịch nào trên tài khoản này</p>
                      <p className="text-3xs text-slate-400">Các khoản thu, chi hoặc chuyển khoản của ví này sẽ hiển thị ở đây.</p>
                    </div>
                  ) : (
                    accountTransactions.map((t) => {
                      const cat = catMap.get(t.categoryId || '');
                      const isSource = t.accountId === selectedAccount.id;
                      const isDestination = t.toAccountId === selectedAccount.id;

                      let isPositive = t.type === 'income' || (t.type === 'transfer' && isDestination);

                      return (
                        <div
                          key={t.id}
                          className="p-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center text-2xs font-bold ${
                                isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}
                            >
                              {isPositive ? '+' : '-'}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800 truncate max-w-40">
                                {t.type === 'transfer'
                                  ? isSource
                                    ? `Chuyển đi`
                                    : `Nhận chuyển khoản`
                                  : cat?.name || 'Giao dịch'}
                              </p>
                              <span className="text-2xs text-slate-400 block">
                                {formatDateVN(t.date)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-xs font-bold ${
                                isPositive ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isPositive ? '+' : '-'}
                              {formatVND(t.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                onClick={() => handleOpenTransfer(selectedAccount.id)}
                className="w-full mt-4 py-2.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Chuyển tiền từ tài khoản này</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        editingAccount={editingAccount}
      />

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        defaultFromAccountId={transferFromId}
      />
    </div>
  );
};

