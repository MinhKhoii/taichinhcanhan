import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { DebtItem, DebtType, DebtStatus } from '../types';
import {
  HandCoins,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  AlertCircle,
  Copy,
  Wallet,
  HeartHandshake,
  FileSpreadsheet,
} from 'lucide-react';
import {
  formatVND,
  formatCompactVND,
  formatDateVN,
  getNameInitials,
  getRelationshipIcon,
} from '../utils/formatters';
import { DebtModal } from '../components/modals/DebtModal';
import { DebtPaymentModal } from '../components/modals/DebtPaymentModal';
import { exportDebtsToExcel } from '../utils/exportData';
import { differenceInDays, parseISO, isAfter, isBefore, addDays } from 'date-fns';

export const DebtsPage: React.FC = () => {
  const { debts, deleteDebt, accounts, showToast } = useFinancial();

  const [activeTab, setActiveTab] = useState<'lend' | 'borrow' | 'all'>('lend');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'overdue' | 'due_soon' | 'no_due' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<DebtType>('lend');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtItem | null>(null);

  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});

  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const today = new Date();

  // Aggregate stats
  const totalLend = useMemo(
    () => debts.filter((d) => d.type === 'lend').reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
    [debts]
  );
  const totalBorrow = useMemo(
    () => debts.filter((d) => d.type === 'borrow').reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
    [debts]
  );

  const totalLendRecovered = useMemo(
    () => debts.filter((d) => d.type === 'lend').reduce((sum, d) => sum + d.paidAmount, 0),
    [debts]
  );
  const totalLendOriginal = useMemo(
    () => debts.filter((d) => d.type === 'lend').reduce((sum, d) => sum + d.totalAmount, 0),
    [debts]
  );
  const recoveryRate = totalLendOriginal > 0 ? Math.round((totalLendRecovered / totalLendOriginal) * 100) : 0;

  // Overdue and Due soon counts
  const overdueDebts = useMemo(() => {
    return debts.filter((d) => {
      const remaining = d.totalAmount - d.paidAmount;
      if (remaining <= 0 || !d.dueDate) return false;
      try {
        return isBefore(parseISO(d.dueDate), today);
      } catch {
        return false;
      }
    });
  }, [debts, today]);

  const dueSoonDebts = useMemo(() => {
    const in7Days = addDays(today, 7);
    return debts.filter((d) => {
      const remaining = d.totalAmount - d.paidAmount;
      if (remaining <= 0 || !d.dueDate) return false;
      try {
        const dueDate = parseISO(d.dueDate);
        return isAfter(dueDate, today) && isBefore(dueDate, in7Days);
      } catch {
        return false;
      }
    });
  }, [debts, today]);

  // Filtering
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      // Type Tab
      if (activeTab !== 'all' && d.type !== activeTab) return false;

      const remaining = d.totalAmount - d.paidAmount;
      const isPaid = remaining <= 0;

      let isOverdue = false;
      let isDueSoon = false;
      if (!isPaid && d.dueDate) {
        try {
          const due = parseISO(d.dueDate);
          isOverdue = isBefore(due, today);
          isDueSoon = !isOverdue && isBefore(due, addDays(today, 7));
        } catch {}
      }

      // Status sub-filter
      if (statusFilter === 'unpaid' && isPaid) return false;
      if (statusFilter === 'overdue' && (!isOverdue || isPaid)) return false;
      if (statusFilter === 'due_soon' && (!isDueSoon || isPaid)) return false;
      if (statusFilter === 'no_due' && (d.dueDate || isPaid)) return false;
      if (statusFilter === 'paid' && !isPaid) return false;

      // Keyword search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = d.personName.toLowerCase().includes(term);
        const relMatch = (d.relationship || '').toLowerCase().includes(term);
        const noteMatch = (d.note || '').toLowerCase().includes(term);
        const phoneMatch = (d.phoneNumber || '').includes(term);
        if (!nameMatch && !relMatch && !noteMatch && !phoneMatch) return false;
      }

      return true;
    });
  }, [debts, activeTab, statusFilter, searchTerm, today]);

  const handleOpenCreate = (type: DebtType = 'lend') => {
    setEditingDebt(null);
    setModalDefaultType(type);
    setIsDebtModalOpen(true);
  };

  const handleOpenEdit = (debt: DebtItem) => {
    setEditingDebt(debt);
    setIsDebtModalOpen(true);
  };

  const handleOpenPayment = (debt: DebtItem) => {
    setSelectedDebtForPayment(debt);
    setIsPaymentModalOpen(true);
  };

  const toggleHistory = (debtId: string) => {
    setExpandedHistories((prev) => ({
      ...prev,
      [debtId]: !prev[debtId],
    }));
  };

  const copyPhone = (phone?: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    showToast(`Đã sao chép số điện thoại ${phone}!`, 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-blue-600" />
            Sổ Nợ & Cho vay
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Theo dõi chi tiết ai đang nợ tiền bạn, bạn đang nợ ai, hạn trả nợ và tiến độ thu hồi
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (debts.length === 0) {
                showToast('Chưa có dữ liệu nợ để xuất Excel', 'info');
                return;
              }
              exportDebtsToExcel(debts, accounts);
              showToast('Đã tải xuống file Excel Sổ nợ thành công!', 'success');
            }}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all shadow-2xs"
            title="Tải xuống toàn bộ danh sách nợ & lịch sử trả dạng Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
          <button
            onClick={() => handleOpenCreate('borrow')}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all shadow-2xs"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Tôi đi vay</span>
          </button>
          <button
            onClick={() => handleOpenCreate('lend')}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Người nợ tôi</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Người nợ tôi */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Người khác nợ tôi
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-blue-600 tracking-tight">
              {formatVND(totalLend)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {debts.filter((d) => d.type === 'lend' && d.totalAmount > d.paidAmount).length} khoản cần thu hồi
            </p>
          </div>
        </div>

        {/* Card 2: Tôi nợ người khác */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tôi đang nợ người khác
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-amber-600 tracking-tight">
              {formatVND(totalBorrow)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {debts.filter((d) => d.type === 'borrow' && d.totalAmount > d.paidAmount).length} khoản cần chuẩn bị trả
            </p>
          </div>
        </div>

        {/* Card 3: Tỷ lệ thu hồi nợ */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đã thu hồi được
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
                {formatVND(totalLendRecovered)}
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {recoveryRate}%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Trên tổng {formatCompactVND(totalLendOriginal)} cho vay
            </p>
          </div>
        </div>

        {/* Card 4: Cảnh báo Quá hạn */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tình trạng hạn nợ
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              {overdueDebts.length > 0 ? (
                <span className="text-sm font-bold text-rose-600 px-2 py-1 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {overdueDebts.length} khoản quá hạn!
                </span>
              ) : dueSoonDebts.length > 0 ? (
                <span className="text-sm font-bold text-amber-700 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {dueSoonDebts.length} khoản sắp đến hạn
                </span>
              ) : (
                <span className="text-sm font-bold text-emerald-700 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Hạn trả đúng hạn
                </span>
              )}
            </div>
            <p className="text-2xs text-slate-400 mt-1.5">
              Hệ thống tự động theo dõi hạn chót thanh toán
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area: Tabs, Search & List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        {/* Navigation & Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Main Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl self-start">
            <button
              onClick={() => setActiveTab('lend')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'lend'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Người nợ tôi</span>
              <span className={`text-2xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'lend' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {debts.filter((d) => d.type === 'lend').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('borrow')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'borrow'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Tôi nợ người khác</span>
              <span className={`text-2xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'borrow' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {debts.filter((d) => d.type === 'borrow').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Tất cả</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, lý do..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Sub Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'Tất cả trạng thái' },
            { id: 'unpaid', label: 'Đang còn nợ' },
            { id: 'overdue', label: '⚠️ Đã quá hạn' },
            { id: 'due_soon', label: '🔔 Sắp đến hạn' },
            { id: 'no_due', label: '♾️ Không hạn trả (Tin tưởng)' },
            { id: 'paid', label: '✓ Đã thanh toán xong' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Debts List Grid */}
        {filteredDebts.length === 0 ? (
          <div className="py-16 text-center space-y-3 border-2 border-dashed border-slate-200 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <HandCoins className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Không tìm thấy khoản nợ nào
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Chưa có khoản nợ nào trong danh mục này hoặc không khớp với bộ lọc tìm kiếm.
            </p>
            <button
              onClick={() => handleOpenCreate(activeTab === 'borrow' ? 'borrow' : 'lend')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              + Ghi nhận khoản nợ mới
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDebts.map((debt) => {
              const remaining = Math.max(0, debt.totalAmount - debt.paidAmount);
              const pct = Math.min(100, Math.round((debt.paidAmount / (debt.totalAmount || 1)) * 100));
              const isPaid = remaining <= 0;

              // Deadline logic
              let daysDiff = 0;
              let isOverdue = false;
              let isDueSoon = false;
              if (debt.dueDate && !isPaid) {
                try {
                  const dueDate = parseISO(debt.dueDate);
                  daysDiff = differenceInDays(dueDate, today);
                  isOverdue = daysDiff < 0;
                  isDueSoon = daysDiff >= 0 && daysDiff <= 7;
                } catch {}
              }

              const linkedAcc = debt.accountId ? accMap.get(debt.accountId) : null;
              const isExpanded = !!expandedHistories[debt.id];

              return (
                <div
                  key={debt.id}
                  className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between relative overflow-hidden group shadow-2xs hover:shadow-md ${
                    isOverdue
                      ? 'border-rose-300 bg-rose-50/10'
                      : isPaid
                      ? 'border-emerald-200 bg-emerald-50/5'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Header: Person & Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-2xs shrink-0 ${
                            debt.type === 'lend' ? 'bg-blue-600' : 'bg-amber-600'
                          }`}
                          title={`Đối tác: ${debt.personName}`}
                        >
                          {getNameInitials(debt.personName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-800 shrink-0">
                              {debt.personName}
                            </h3>
                            {debt.relationship && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-2xs font-bold bg-blue-50 text-blue-800 border border-blue-200/90 shadow-2xs whitespace-nowrap shrink-0">
                                <span className="text-xs leading-none">{getRelationshipIcon(debt.relationship)}</span>
                                <span>{debt.relationship}</span>
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${
                                debt.type === 'lend'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {debt.type === 'lend' ? 'Nợ tôi' : 'Tôi nợ'}
                            </span>
                          </div>

                          {debt.phoneNumber && (
                            <div className="flex items-center space-x-1.5 mt-1 text-2xs text-slate-500">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{debt.phoneNumber}</span>
                              <button
                                onClick={() => copyPhone(debt.phoneNumber)}
                                className="text-blue-500 hover:text-blue-600 p-0.5 shrink-0 cursor-pointer"
                                title="Copy SĐT"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleOpenEdit(debt)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa khoản nợ của "${debt.personName}"?`)) {
                              deleteDebt(debt.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Xóa khoản nợ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Amount & Progress */}
                    <div className="mt-4 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block">
                            Số tiền nợ
                          </span>
                          <span className="text-base font-extrabold text-slate-800">
                            {formatVND(debt.totalAmount)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block">
                            {isPaid
                              ? 'Trạng thái'
                              : debt.type === 'lend'
                              ? 'Chưa thu về'
                              : 'Còn phải trả'}
                          </span>
                          <span
                            className={`text-base font-extrabold ${
                              isPaid
                                ? 'text-emerald-600'
                                : debt.type === 'lend'
                                ? 'text-blue-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {isPaid ? 'Đã xong 100%' : formatVND(remaining)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPaid
                              ? 'bg-emerald-500'
                              : isOverdue
                              ? 'bg-rose-500'
                              : debt.type === 'lend'
                              ? 'bg-blue-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                        <span>Đã trả: {formatVND(debt.paidAmount)} ({pct}%)</span>
                        <span>Ngày mượn: {formatDateVN(debt.startDate)}</span>
                      </div>
                    </div>

                    {/* Deadline Highlight Box */}
                    <div className="mt-3">
                      {debt.dueDate ? (
                        <div
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            isPaid
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                              : isOverdue
                              ? 'bg-rose-50 border-rose-200 text-rose-800'
                              : isDueSoon
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-blue-50/50 border-blue-100 text-blue-800'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span className="font-semibold">
                              Hạn trả nợ: {formatDateVN(debt.dueDate)}
                            </span>
                          </div>

                          <span className="text-2xs font-bold px-2 py-0.5 rounded-md bg-white shadow-2xs">
                            {isPaid
                              ? '✓ Hoàn thành'
                              : isOverdue
                              ? `⚠️ Đã quá hạn ${Math.abs(daysDiff)} ngày!`
                              : daysDiff === 0
                              ? 'Hôm nay đến hạn!'
                              : `Còn ${daysDiff} ngày`}
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1.5">
                            <HeartHandshake className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="font-semibold text-slate-700">
                              Không hạn trả cố định (Khi nào có thì trả)
                            </span>
                          </div>
                          <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-white text-slate-500 shadow-2xs border border-slate-200/60">
                            Đã vay {Math.max(0, differenceInDays(today, parseISO(debt.startDate)))} ngày trước
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Note & Account details */}
                    {debt.note && (
                      <p className="text-xs text-slate-600 mt-2.5 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                        "{debt.note}"
                      </p>
                    )}

                    {linkedAcc && (
                      <div className="flex items-center space-x-1.5 mt-2 text-2xs text-slate-400">
                        <Wallet className="w-3 h-3 text-slate-400" />
                        <span>Tài khoản liên kết: {linkedAcc.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment History Toggle & Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    {debt.payments && debt.payments.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleHistory(debt.id)}
                          className="flex items-center justify-between w-full text-2xs font-semibold text-slate-500 hover:text-slate-700 py-1"
                        >
                          <span className="flex items-center gap-1">
                            <History className="w-3 h-3" />
                            Lịch sử các đợt trả ({debt.payments.length} lần)
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-2xs animate-in fade-in duration-150">
                            {debt.payments.map((pmt) => (
                              <div
                                key={pmt.id}
                                className="flex items-center justify-between py-1 border-b border-slate-200/50 last:border-0"
                              >
                                <div>
                                  <span className="font-semibold text-slate-700 block">
                                    {formatDateVN(pmt.date)}
                                  </span>
                                  {pmt.note && (
                                    <span className="text-slate-400 block truncate max-w-44">
                                      {pmt.note}
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-emerald-600">
                                  +{formatVND(pmt.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Button: Ghi nhận trả nợ */}
                    {!isPaid ? (
                      <button
                        onClick={() => handleOpenPayment(debt)}
                        className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-2xs ${
                          debt.type === 'lend'
                            ? 'text-white bg-blue-600 hover:bg-blue-700'
                            : 'text-white bg-amber-600 hover:bg-amber-700'
                        }`}
                      >
                        <HandCoins className="w-4 h-4" />
                        <span>
                          {debt.type === 'lend'
                            ? 'Ghi nhận thu nợ (Từng đợt / Trả hết)'
                            : 'Ghi nhận trả nợ (Từng đợt / Trả hết)'}
                        </span>
                      </button>
                    ) : (
                      <div className="py-2 text-center text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Khoản nợ này đã được thanh toán đầy đủ</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Debt Creation & Edit Modal */}
      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        editingDebt={editingDebt}
        defaultType={modalDefaultType}
      />

      {/* Debt Payment Modal */}
      <DebtPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        debt={selectedDebtForPayment}
      />
    </div>
  );
};

