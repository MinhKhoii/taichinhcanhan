import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Transaction, TransactionType } from '../types';
import {
  Search,
  Filter,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Download,
  Calendar,
  Wallet,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Coins,
  Sparkles,
  List,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatVND, formatDateVN, formatCompactVND, getLocalDateString, getLocalMonthString } from '../utils/formatters';
import { DynamicIcon } from '../components/common/DynamicIcon';
import { exportTransactionsToExcel, exportTransactionsToCSV } from '../utils/exportData';
import { RecurringModal } from '../components/modals/RecurringModal';

export const TransactionsPage: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    openAddTxModal,
    deleteTransaction,
    formatMoney,
    isPrivacyMode,
    togglePrivacyMode,
  } = useFinancial();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<any>(null);

  // View Mode: Table vs Calendar (Spendee style)
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [calendarYearMonth, setCalendarYearMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(() => getLocalDateString());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Filtering logic
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      // Type
      if (selectedType === 'debt') {
        const isDebtTx = /(cho .* mượn|vay từ|thu hồi nợ|trả nợ)/i.test(t.note || '');
        if (!isDebtTx) return false;
      } else if (selectedType !== 'all' && t.type !== selectedType) {
        return false;
      }
      // Category
      if (selectedCategory !== 'all' && t.categoryId !== selectedCategory) return false;
      // Account
      if (selectedAccount !== 'all' && t.accountId !== selectedAccount && t.toAccountId !== selectedAccount) {
        return false;
      }
      // Member filter (Tính năng từ MISA)
      if (selectedMember !== 'all') {
        if (selectedMember === 'Cá nhân') {
          if (t.member && t.member !== 'Cá nhân') return false;
        } else {
          if (t.member !== selectedMember) return false;
        }
      }
      // Min amount
      if (minAmount && t.amount < parseInt(minAmount, 10)) return false;
      // Max amount
      if (maxAmount && t.amount > parseInt(maxAmount, 10)) return false;
      // Date range
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      // Keyword search in note, category name, account name, member
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const noteMatch = (t.note || '').toLowerCase().includes(term);
        const cat = t.categoryId ? catMap.get(t.categoryId) : null;
        const catMatch = cat?.name.toLowerCase().includes(term);
        const acc = accMap.get(t.accountId);
        const accMatch = acc?.name.toLowerCase().includes(term);
        const memberMatch = (t.member || '').toLowerCase().includes(term);
        if (!noteMatch && !catMatch && !accMatch && !memberMatch) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedType,
    selectedCategory,
    selectedAccount,
    selectedMember,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    searchTerm,
    catMap,
    accMap,
  ]);

  // Sorted list
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      if (sortField === 'date') {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortOrder === 'desc' ? db - da : da - db;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });
  }, [filteredList, sortField, sortOrder]);

  // Summary of filtered results
  const summaryIncome = useMemo(
    () => sortedList.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [sortedList]
  );
  const summaryExpense = useMemo(
    () => sortedList.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [sortedList]
  );
  const summaryNet = summaryIncome - summaryExpense;

  // Pagination slice
  const totalPages = Math.ceil(sortedList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedList.slice(start, start + pageSize);
  }, [sortedList, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedAccount('all');
    setSelectedMember('all');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedAccount !== 'all' ||
    selectedMember !== 'all' ||
    Boolean(minAmount || maxAmount || startDate || endDate || searchTerm);

  // Calendar data computation (Tính năng từ Spendee)
  const {
    calendarDays,
    monthTotalIncome,
    monthTotalExpense,
    monthNet,
    calendarMonthName,
  } = useMemo(() => {
    const [yearStr, monthStr] = calendarYearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();

    // Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat -> Mon = 0..6
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const monthPrefix = `${calendarYearMonth}-`;
    const monthTxs = transactions.filter((t) => t.date.startsWith(monthPrefix));

    const totalIncome = monthTxs
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTxs
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const dayMap = new Map<
      string,
      { income: number; expense: number; count: number; txs: Transaction[] }
    >();
    for (const t of monthTxs) {
      if (!dayMap.has(t.date)) {
        dayMap.set(t.date, { income: 0, expense: 0, count: 0, txs: [] });
      }
      const d = dayMap.get(t.date)!;
      if (t.type === 'income') d.income += t.amount;
      if (t.type === 'expense') d.expense += t.amount;
      d.count += 1;
      d.txs.push(t);
    }

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ dayNumber: 0, dateStr: '', data: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calendarYearMonth}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        data: dayMap.get(dateStr) || null,
      });
    }

    return {
      calendarDays: days,
      monthTotalIncome: totalIncome,
      monthTotalExpense: totalExpense,
      monthNet: totalIncome - totalExpense,
      calendarMonthName: `Tháng ${month} năm ${year}`,
    };
  }, [calendarYearMonth, transactions]);

  // Selected Day's transactions in Calendar View
  const selectedDayData = useMemo(() => {
    if (!selectedCalendarDate) return null;
    const txs = transactions.filter((t) => t.date === selectedCalendarDate);
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return {
      date: selectedCalendarDate,
      txs,
      income,
      expense,
      net: income - expense,
    };
  }, [selectedCalendarDate, transactions]);

  const handlePrevMonth = () => {
    const [y, m] = calendarYearMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setCalendarYearMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = calendarYearMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setCalendarYearMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCalendarYearMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setSelectedCalendarDate(getLocalDateString());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Quản lý giao dịch
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Ghi chép và kiểm soát toàn bộ dòng tiền vào, ra và chuyển khoản
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Export Dropdown / Buttons */}
          <button
            onClick={() => exportTransactionsToExcel(sortedList, categories, accounts)}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors"
            title="Xuất file Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
          <button
            onClick={() => exportTransactionsToCSV(sortedList, categories, accounts)}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors"
            title="Xuất file CSV"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>

          <button
            onClick={() => setIsRecurringModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl shadow-2xs transition-colors"
            title="Cài đặt lương định kỳ tự động"
          >
            <Coins className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Lương định kỳ</span>
          </button>

          {/* "+ Thêm giao dịch" */}
          <button
            onClick={() => openAddTxModal()}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm giao dịch</span>
          </button>
        </div>
      </div>

      {/* Ribbon Stats for Filtered Data */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-2xs font-semibold text-emerald-800 uppercase tracking-wider">
                Tổng thu (bộ lọc)
              </span>
              <button
                type="button"
                onClick={togglePrivacyMode}
                className="p-0.5 hover:bg-emerald-200/50 rounded-md text-emerald-700 transition-colors cursor-pointer"
                title={isPrivacyMode ? 'Hiện số tiền' : 'Ẩn số tiền riêng tư (Chống nhìn lén)'}
              >
                {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />}
              </button>
            </div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">
              {isPrivacyMode ? '••••••••' : `+${formatVND(summaryIncome)}`}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-2xs">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-2xs font-semibold text-rose-800 uppercase tracking-wider">
                Tổng chi (bộ lọc)
              </span>
              <button
                type="button"
                onClick={togglePrivacyMode}
                className="p-0.5 hover:bg-rose-200/50 rounded-md text-rose-700 transition-colors cursor-pointer"
                title={isPrivacyMode ? 'Hiện số tiền' : 'Ẩn số tiền riêng tư (Chống nhìn lén)'}
              >
                {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />}
              </button>
            </div>
            <div className="text-lg font-black text-rose-700 mt-0.5">
              {isPrivacyMode ? '••••••••' : `-${formatVND(summaryExpense)}`}
            </div>
          </div>
          <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-2xs">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-2xs font-semibold text-blue-800 uppercase tracking-wider">
                Chênh lệch dòng tiền
              </span>
              <button
                type="button"
                onClick={togglePrivacyMode}
                className="p-0.5 hover:bg-blue-200/50 rounded-md text-blue-700 transition-colors cursor-pointer"
                title={isPrivacyMode ? 'Hiện số tiền' : 'Ẩn số tiền riêng tư (Chống nhìn lén)'}
              >
                {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />}
              </button>
            </div>
            <div className="text-lg font-black text-blue-700 mt-0.5">
              {isPrivacyMode ? '••••••••' : formatVND(summaryNet, true)}
            </div>
          </div>
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-2xs">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung ghi chú, danh mục, tài khoản..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Type Filter Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'expense', label: 'Chi tiêu' },
              { id: 'income', label: 'Thu nhập' },
              { id: 'transfer', label: 'Chuyển khoản' },
              { id: 'debt', label: 'Sổ nợ / Vay' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedType(t.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedType === t.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Advanced Filter Toggle Button */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              hasActiveFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Bộ lọc nâng cao</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            )}
          </button>

          {/* View Mode Toggle: Table vs Calendar (Tính năng từ Spendee) */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem dạng bảng danh sách"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem theo Lịch chi tiêu tháng (Phong cách Spendee)"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lịch tháng</span>
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters Box */}
        {showFilterDrawer && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-in slide-in-from-top duration-150">
            <div>
              <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">
                Danh mục
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type === 'income' ? '[+ Thu] ' : '[- Chi] '}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">
                Tài khoản & Ví
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => {
                  setSelectedAccount(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="all">Tất cả tài khoản</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Member filter (Tính năng từ MISA) */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">
                Thành viên chi
              </label>
              <select
                value={selectedMember}
                onChange={(e) => {
                  setSelectedMember(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
              >
                <option value="all">Tất cả thành viên</option>
                <option value="Cá nhân">👤 Cá nhân</option>
                <option value="Vợ">👩 Vợ</option>
                <option value="Chồng">👨 Chồng</option>
                <option value="Con cái">👶 Con cái</option>
                <option value="Cả gia đình">👨‍👩‍👧 Cả gia đình</option>
                <option value="Bố mẹ">🏡 Bố mẹ</option>
                <option value="Khác">👥 Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">
                Số tiền (Từ - Đến)
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  placeholder="Tối thiểu"
                  value={minAmount}
                  onChange={(e) => {
                    setMinAmount(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-1/2 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Tối đa"
                  value={maxAmount}
                  onChange={(e) => {
                    setMaxAmount(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-1/2 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">
                Khoảng ngày
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-1/2 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-1/2 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="lg:col-span-5 flex justify-end">
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium underline"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Mode Switching: Calendar View vs Data Table View */}
      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
          {/* Calendar Top Navigation & Month Summary Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            {/* Month Switcher */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base sm:text-lg font-black text-slate-800 min-w-44 text-center">
                {calendarMonthName}
              </h2>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCurrentMonth}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all cursor-pointer"
              >
                Hôm nay
              </button>
            </div>

            {/* Monthly Total Stats Pills (Spendee style) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs flex items-center gap-1.5">
                <span className="text-3xs uppercase font-bold text-emerald-600">Thu:</span>
                <span className="font-extrabold">{isPrivacyMode ? '••••••••' : `+${formatVND(monthTotalIncome)}`}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200/70 text-rose-800 text-xs flex items-center gap-1.5">
                <span className="text-3xs uppercase font-bold text-rose-600">Chi:</span>
                <span className="font-extrabold">{isPrivacyMode ? '••••••••' : `-${formatVND(monthTotalExpense)}`}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-800 text-xs flex items-center gap-1.5">
                <span className="text-3xs uppercase font-bold text-blue-600">Dòng tiền:</span>
                <span className="font-black">{isPrivacyMode ? '••••••••' : formatVND(monthNet, true)}</span>
              </div>
            </div>
          </div>

          {/* Monthly Calendar Grid */}
          <div>
            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-400">
              <div className="py-1">Thứ 2</div>
              <div className="py-1">Thứ 3</div>
              <div className="py-1">Thứ 4</div>
              <div className="py-1">Thứ 5</div>
              <div className="py-1">Thứ 6</div>
              <div className="py-1 text-blue-600">Thứ 7</div>
              <div className="py-1 text-rose-600">Chủ nhật</div>
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((cell, idx) => {
                if (!cell.dateStr) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[64px] sm:min-h-[88px] rounded-2xl bg-slate-50/40 border border-transparent"
                    />
                  );
                }

                const isToday = cell.dateStr === getLocalDateString();
                const isSelected = cell.dateStr === selectedCalendarDate;
                const hasIncome = cell.data && cell.data.income > 0;
                const hasExpense = cell.data && cell.data.expense > 0;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedCalendarDate(cell.dateStr)}
                    className={`min-h-[64px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/30'
                        : isToday
                        ? 'border-blue-300 bg-blue-50/20 hover:border-blue-400'
                        : 'border-slate-200/80 bg-white hover:border-blue-300 hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Top: Day number & Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-black ${
                          isSelected
                            ? 'text-blue-700'
                            : isToday
                            ? 'text-blue-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {isToday && (
                        <span className="hidden sm:inline text-3xs px-1 rounded bg-blue-600 text-white font-bold scale-90">
                          Hôm nay
                        </span>
                      )}
                      {cell.data && cell.data.count > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 sm:hidden" />
                      )}
                    </div>

                    {/* Bottom: Daily Income & Expense */}
                    <div className="space-y-0.5 overflow-hidden text-right">
                      {cell.data && cell.data.income > 0 && (
                        <span className="text-3xs sm:text-2xs font-black text-emerald-600 truncate block">
                          {isPrivacyMode ? '•••' : `+${formatCompactVND(cell.data.income)}`}
                        </span>
                      )}
                      {cell.data && cell.data.expense > 0 && (
                        <span className="text-3xs sm:text-2xs font-black text-rose-600 truncate block">
                          {isPrivacyMode ? '•••' : `-${formatCompactVND(cell.data.expense)}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Transaction Details (Spendee style bottom drawer) */}
          {selectedDayData && (
            <div className="pt-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    Giao dịch ngày {formatDateVN(selectedDayData.date)}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                    {selectedDayData.txs.length} giao dịch
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedDayData.income > 0 && (
                    <span className="text-xs font-bold text-emerald-600">
                      Thu: {isPrivacyMode ? '••••••••' : `+${formatVND(selectedDayData.income)}`}
                    </span>
                  )}
                  {selectedDayData.expense > 0 && (
                    <span className="text-xs font-bold text-rose-600">
                      Chi: {isPrivacyMode ? '••••••••' : `-${formatVND(selectedDayData.expense)}`}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openAddTxModal()}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm giao dịch</span>
                  </button>
                </div>
              </div>

              {/* Transactions on Selected Day */}
              {selectedDayData.txs.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  Không có giao dịch nào vào ngày {formatDateVN(selectedDayData.date)}. Bấm "+ Thêm giao dịch" để ghi chép.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {selectedDayData.txs.map((t) => {
                    const cat = catMap.get(t.categoryId || '');
                    const acc = accMap.get(t.accountId);
                    const toAcc = t.toAccountId ? accMap.get(t.toAccountId) : null;
                    return (
                      <div
                        key={t.id}
                        onClick={() => openAddTxModal(t)}
                        className="p-3 bg-slate-50/70 hover:bg-slate-100/80 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shadow-2xs shrink-0"
                            style={{ backgroundColor: cat?.color || '#64748B' }}
                          >
                            <DynamicIcon name={cat?.icon || 'Tag'} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {cat?.name || (t.type === 'transfer' ? 'Chuyển khoản' : 'Giao dịch')}
                              </span>
                              {t.member && t.member !== 'Cá nhân' && (
                                <span className="text-3xs px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">
                                  {t.member}
                                </span>
                              )}
                            </div>
                            <p className="text-2xs text-slate-500 truncate">
                              {t.type === 'transfer' ? `${acc?.name} ➔ ${toAcc?.name}` : acc?.name}
                              {t.note && ` • ${t.note}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs sm:text-sm font-black ${
                              t.type === 'income'
                                ? 'text-emerald-600'
                                : t.type === 'expense'
                                ? 'text-rose-600'
                                : 'text-blue-600'
                            }`}
                          >
                            {isPrivacyMode
                              ? '••••••••'
                              : `${t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}${formatVND(t.amount)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Transactions Professional Data Table & Mobile Cards */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {paginatedList.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="max-w-sm mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {hasActiveFilters ? 'Không tìm thấy giao dịch nào khớp với bộ lọc' : 'Chưa có giao dịch thu chi nào'}
              </h4>
              <p className="text-2xs text-slate-400">
                {hasActiveFilters
                  ? 'Thử xóa bớt các điều kiện lọc thời gian hoặc từ khóa tìm kiếm.'
                  : 'Bắt đầu ghi chép các khoản chi tiêu hoặc thu nhập hàng ngày của bạn.'}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAddTxModal()}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  + Thêm giao dịch đầu tiên
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                      onClick={() => {
                        if (sortField === 'date') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                        } else {
                          setSortField('date');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Ngày {sortField === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">Loại & Danh mục</th>
                    <th className="py-3.5 px-4">Ghi chú & Phương thức</th>
                    <th className="py-3.5 px-4">Tài khoản</th>
                    <th
                      className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800"
                      onClick={() => {
                        if (sortField === 'amount') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                        } else {
                          setSortField('amount');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Số tiền {sortField === 'amount' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {paginatedList.map((t) => {
                  const cat = catMap.get(t.categoryId || '');
                  const acc = accMap.get(t.accountId);
                  const toAcc = t.toAccountId ? accMap.get(t.toAccountId) : null;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {formatDateVN(t.date)}
                      </td>

                      {/* Type & Category */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          let catName = cat?.name;
                          let catIcon = cat?.icon || 'Tag';
                          let catColor = cat?.color || '#64748B';
                          let subType =
                            t.type === 'income' ? 'Thu nhập' : t.type === 'expense' ? 'Chi tiêu' : 'Chuyển khoản';

                          if (t.type === 'transfer') {
                            catName = t.note?.includes('[Tự động bù trừ]') ? 'Cấn trừ số dư âm' : 'Chuyển khoản nội bộ';
                            catIcon = t.note?.includes('[Tự động bù trừ]') ? 'Zap' : 'ArrowLeftRight';
                            catColor = t.note?.includes('[Tự động bù trừ]') ? '#8B5CF6' : '#3B82F6';
                            subType = 'Chuyển nội bộ';
                          } else if (!catName) {
                            const noteLower = (t.note || '').toLowerCase();
                            if (noteLower.includes('cho') && (noteLower.includes('mượn') || noteLower.includes('vay'))) {
                              catName = 'Sổ nợ / Cho vay';
                              catIcon = 'HandCoins';
                              catColor = '#2563EB';
                              subType = 'Cho vay mượn';
                            } else if (noteLower.includes('vay từ')) {
                              catName = 'Sổ nợ / Đi vay';
                              catIcon = 'HandCoins';
                              catColor = '#D97706';
                              subType = 'Vay nợ';
                            } else if (noteLower.includes('thu hồi nợ') || noteLower.includes('người ta trả')) {
                              catName = 'Sổ nợ / Thu nợ';
                              catIcon = 'ArrowDownLeft';
                              catColor = '#059669';
                              subType = 'Thu hồi tiền';
                            } else if (noteLower.includes('trả nợ')) {
                              catName = 'Sổ nợ / Trả nợ';
                              catIcon = 'ArrowUpRight';
                              catColor = '#E11D48';
                              subType = 'Hoàn trả nợ';
                            } else if (noteLower.includes('lương')) {
                              catName = 'Lương định kỳ';
                              catIcon = 'Coins';
                              catColor = '#10B981';
                              subType = 'Thu nhập';
                            } else if (noteLower.includes('tiết kiệm')) {
                              catName = 'Quỹ tiết kiệm';
                              catIcon = 'PiggyBank';
                              catColor = '#0284C7';
                              subType = 'Tích lũy';
                            } else {
                              catName = 'Chưa phân loại';
                              catIcon = 'Tag';
                              catColor = '#94A3B8';
                            }
                          }

                          return (
                            <div className="flex items-center space-x-2.5">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shadow-2xs flex-shrink-0"
                                style={{ backgroundColor: catColor }}
                              >
                                <DynamicIcon name={catIcon} className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-semibold text-slate-800 block truncate max-w-40 sm:max-w-none">
                                  {catName}
                                </span>
                                <span className="text-2xs text-slate-400">
                                  {subType}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Note & Payment Method */}
                      <td className="py-3.5 px-4">
                        <p className="text-slate-800 font-medium truncate max-w-xs">
                          {t.note || '—'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="px-2 py-0.5 text-2xs rounded-md bg-slate-100 text-slate-600">
                            {t.paymentMethod === 'cash'
                              ? 'Tiền mặt'
                              : t.paymentMethod === 'transfer'
                              ? 'Chuyển khoản'
                              : t.paymentMethod === 'card'
                              ? 'Thẻ'
                              : t.paymentMethod === 'qr'
                              ? 'Quét QR'
                              : t.paymentMethod === 'ewallet'
                              ? 'Ví điện tử'
                              : 'Khác'}
                          </span>
                          {t.member && t.member !== 'Cá nhân' && (
                            <span className="px-2 py-0.5 text-2xs rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">
                              {t.member}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {t.type === 'transfer' ? (
                          <div className="text-xs">
                            <span className="font-medium text-slate-800">{acc?.name}</span>
                            <span className="text-blue-600 mx-1">➔</span>
                            <span className="font-medium text-slate-800">{toAcc?.name || 'Tài khoản khác'}</span>
                          </div>
                        ) : (
                          <span className="font-medium">{acc?.name || 'Ví'}</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold">
                        <span
                          className={`text-sm ${
                            t.type === 'income'
                              ? 'text-emerald-600'
                              : t.type === 'expense'
                              ? 'text-rose-600'
                              : 'text-blue-600'
                          }`}
                        >
                          {isPrivacyMode
                            ? '••••••••'
                            : `${t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}${formatVND(t.amount)}`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openAddTxModal(t)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa giao dịch"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setTxToDelete(t)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa giao dịch (Có tùy chọn giữ nguyên số dư ví)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Native Card View (Chạm để xem/sửa, không cần cuộn ngang trên điện thoại) */}
          <div className="md:hidden divide-y divide-slate-100 p-2 sm:p-3">
            {paginatedList.map((t) => {
              const cat = catMap.get(t.categoryId || '');
              const acc = accMap.get(t.accountId);
              const toAcc = t.toAccountId ? accMap.get(t.toAccountId) : null;
              const isYield = t.isYield || (t.note && t.note.includes('[Tự động sinh lời]'));

              let catName = cat?.name;
              let catIcon = cat?.icon || 'Tag';
              let catColor = cat?.color || '#64748B';
              let subType =
                t.type === 'income' ? 'Thu nhập' : t.type === 'expense' ? 'Chi tiêu' : 'Chuyển khoản';

              if (isYield) {
                catName = 'Tiền lời tích lũy';
                catIcon = 'TrendingUp';
                catColor = '#EC4899';
                subType = 'Sinh lời tự động';
              } else if (t.type === 'transfer') {
                catName = t.note?.includes('[Tự động bù trừ]') ? 'Cấn trừ số dư âm' : 'Chuyển khoản nội bộ';
                catIcon = t.note?.includes('[Tự động bù trừ]') ? 'Zap' : 'ArrowLeftRight';
                catColor = t.note?.includes('[Tự động bù trừ]') ? '#8B5CF6' : '#3B82F6';
                subType = 'Chuyển nội bộ';
              } else if (!catName) {
                const noteLower = (t.note || '').toLowerCase();
                if (noteLower.includes('cho') && (noteLower.includes('mượn') || noteLower.includes('vay'))) {
                  catName = 'Sổ nợ / Cho vay';
                  catIcon = 'HandCoins';
                  catColor = '#2563EB';
                  subType = 'Cho vay mượn';
                } else if (noteLower.includes('vay từ')) {
                  catName = 'Sổ nợ / Đi vay';
                  catIcon = 'HandCoins';
                  catColor = '#D97706';
                  subType = 'Vay nợ';
                } else if (noteLower.includes('thu hồi nợ') || noteLower.includes('người ta trả')) {
                  catName = 'Sổ nợ / Thu nợ';
                  catIcon = 'ArrowDownLeft';
                  catColor = '#059669';
                  subType = 'Thu hồi tiền';
                } else if (noteLower.includes('trả nợ')) {
                  catName = 'Sổ nợ / Trả nợ';
                  catIcon = 'ArrowUpRight';
                  catColor = '#E11D48';
                  subType = 'Hoàn trả nợ';
                } else if (noteLower.includes('lương')) {
                  catName = 'Lương định kỳ';
                  catIcon = 'Coins';
                  catColor = '#10B981';
                  subType = 'Thu nhập';
                } else if (noteLower.includes('tiết kiệm')) {
                  catName = 'Quỹ tiết kiệm';
                  catIcon = 'PiggyBank';
                  catColor = '#0284C7';
                  subType = 'Tích lũy';
                } else {
                  catName = 'Chưa phân loại';
                  catIcon = 'Tag';
                  catColor = '#94A3B8';
                }
              }

              return (
                <div
                  key={t.id}
                  onClick={() => openAddTxModal(t)}
                  className="p-3 hover:bg-slate-50/80 active:bg-slate-100/70 rounded-2xl transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs shadow-2xs shrink-0"
                        style={{ backgroundColor: catColor }}
                      >
                        <DynamicIcon name={catIcon} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {isYield ? `Tiền lời ${acc?.name || ''}` : catName}
                          </span>
                          <span className="text-3xs px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 font-medium">
                            {subType}
                          </span>
                          {t.member && t.member !== 'Cá nhân' && (
                            <span className="text-3xs px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">
                              {t.member}
                            </span>
                          )}
                        </div>
                        <span className="text-2xs text-slate-400 block mt-0.5">
                          {formatDateVN(t.date)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-black ${
                          t.type === 'income'
                            ? 'text-emerald-600'
                            : t.type === 'expense'
                            ? 'text-rose-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {isPrivacyMode
                          ? '••••••••'
                          : `${t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}${formatVND(t.amount)}`}
                      </span>
                    </div>
                  </div>

                  {/* Subtitle / Note & Account */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-2xs gap-2">
                    <div className="min-w-0 flex-1 flex items-center space-x-1.5 truncate text-slate-500">
                      {t.type === 'transfer' ? (
                        <span className="font-semibold text-slate-700 truncate">
                          {acc?.name} ➔ {toAcc?.name || 'Tài khoản khác'}
                        </span>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-700 shrink-0">{acc?.name || 'Ví'}</span>
                          {t.note && !isYield && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 truncate">{t.note}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openAddTxModal(t)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Sửa giao dịch"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxToDelete(t)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa giao dịch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

        {/* Table Footer & Pagination */}
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 gap-4 text-xs text-slate-500">
          {/* Left: Summary & Page Size selector */}
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Hiển thị{' '}
              <span className="font-bold text-slate-700">
                {sortedList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{' '}
              đến{' '}
              <span className="font-bold text-slate-700">
                {Math.min(currentPage * pageSize, sortedList.length)}
              </span>{' '}
              trong tổng số <span className="font-bold text-slate-700">{sortedList.length}</span> giao dịch
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-200">
              <span className="text-slate-400">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs"
              >
                <option value={10}>10 dòng / trang</option>
                <option value={20}>20 dòng / trang</option>
                <option value={50}>50 dòng / trang</option>
                <option value={100}>100 dòng / trang</option>
                <option value={999999}>Tất cả giao dịch</option>
              </select>
            </div>
          </div>

          {/* Right: Modern Numbered Pagination Controls */}
          <div className="flex items-center space-x-1.5 sm:mr-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-2xs font-medium">Trước</span>
            </button>

            {/* Direct Page Number Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              if (
                totalPages > 6 &&
                pageNum !== 1 &&
                pageNum !== totalPages &&
                Math.abs(pageNum - currentPage) > 1
              ) {
                if (pageNum === 2 || pageNum === totalPages - 1) {
                  return (
                    <span key={pageNum} className="px-1 text-slate-400 font-semibold">
                      ...
                    </span>
                  );
                }
                return null;
              }

              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                  }`}
                  title={`Chuyển đến trang ${pageNum}`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Trang sau"
            >
              <span className="hidden sm:inline text-2xs font-medium">Sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      )}

      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
      />

      {/* MODAL XÁC NHẬN XÓA GIAO DỊCH VỚI TÙY CHỌN BẢO TOÀN SỐ DƯ TÀI KHOẢN */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa giao dịch</h3>
              </div>
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between items-center font-medium">
                <span className="text-slate-400">Nội dung:</span>
                <span className="font-bold text-slate-900 text-right">{txToDelete.note || 'Không có ghi chú'}</span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span className="text-slate-400">Số tiền:</span>
                <span className={`font-black text-sm ${txToDelete.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {txToDelete.type === 'income' ? '+' : '-'}{formatVND(txToDelete.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span className="text-slate-400">Tài khoản ví:</span>
                <span className="font-semibold text-slate-800">
                  {accMap.get(txToDelete.accountId)?.name || 'Tài khoản'}
                </span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span className="text-slate-400">Ngày ghi:</span>
                <span>{formatDateVN(txToDelete.date)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {/* Nút 1: Bảo toàn số dư - Khuyên dùng và an toàn tuyệt đối */}
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(txToDelete.id, { revertBalance: false });
                  setTxToDelete(null);
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <span>🛡️ Xóa & BẢO TOÀN SỐ DƯ (Không trừ/cộng tiền ví)</span>
              </button>

              {/* Nút 2: Hoàn nguyên số dư ví theo truyền thống */}
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(txToDelete.id, { revertBalance: true });
                  setTxToDelete(null);
                }}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-2xs font-semibold transition-all cursor-pointer"
              >
                Xóa & Hoàn tác lại số dư ví ({txToDelete.type === 'income' ? 'Trừ bớt' : 'Cộng trả lại'} {formatVND(txToDelete.amount)})
              </button>

              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

