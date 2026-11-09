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
} from 'lucide-react';
import { formatVND, formatDateVN } from '../utils/formatters';
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
  } = useFinancial();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
      // Min amount
      if (minAmount && t.amount < parseInt(minAmount, 10)) return false;
      // Max amount
      if (maxAmount && t.amount > parseInt(maxAmount, 10)) return false;
      // Date range
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      // Keyword search in note, category name, account name
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const noteMatch = (t.note || '').toLowerCase().includes(term);
        const cat = t.categoryId ? catMap.get(t.categoryId) : null;
        const catMatch = cat?.name.toLowerCase().includes(term);
        const acc = accMap.get(t.accountId);
        const accMatch = acc?.name.toLowerCase().includes(term);
        if (!noteMatch && !catMatch && !accMatch) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedType,
    selectedCategory,
    selectedAccount,
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
  }, [sortedList, currentPage]);

  const handleResetFilters = () => {
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedAccount('all');
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
    Boolean(minAmount || maxAmount || startDate || endDate || searchTerm);

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
            <span className="text-2xs font-semibold text-emerald-800 uppercase tracking-wider">
              Tổng thu (bộ lọc)
            </span>
            <div className="text-lg font-black text-emerald-700 mt-0.5">
              +{formatVND(summaryIncome)}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-2xs">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-2xs font-semibold text-rose-800 uppercase tracking-wider">
              Tổng chi (bộ lọc)
            </span>
            <div className="text-lg font-black text-rose-700 mt-0.5">
              -{formatVND(summaryExpense)}
            </div>
          </div>
          <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-2xs">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-2xs font-semibold text-blue-800 uppercase tracking-wider">
              Chênh lệch dòng tiền
            </span>
            <div className="text-lg font-black text-blue-700 mt-0.5">
              {formatVND(summaryNet, true)}
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
        </div>

        {/* Expandable Advanced Filters Box */}
        {showFilterDrawer && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in slide-in-from-top duration-150">
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
              <div className="lg:col-span-4 flex justify-end">
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

      {/* Transactions Professional Data Table & Mobile Cards */}
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
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-2xs rounded-md bg-slate-100 text-slate-600">
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
                          {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                          {formatVND(t.amount)}
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
                        {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                        {formatVND(t.amount)}
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
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 gap-3 text-xs text-slate-500">
          <div>
            Hiển thị{' '}
            <span className="font-bold text-slate-700">
              {sortedList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            đến{' '}
            <span className="font-bold text-slate-700">
              {Math.min(currentPage * pageSize, sortedList.length)}
            </span>{' '}
            trong tổng số <span className="font-bold text-slate-700">{sortedList.length}</span> giao dịch
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-800">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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

