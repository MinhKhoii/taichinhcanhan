import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Transaction } from '../types';
import {
  BookOpen,
  Calendar,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Edit2,
  Trash2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { formatVND, formatDateVN, formatDateWithDayVN } from '../utils/formatters';
import { DynamicIcon } from '../components/common/DynamicIcon';
import { parseISO, isToday, isYesterday, format } from 'date-fns';

export const JournalPage: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    openAddTxModal,
    deleteTransaction,
  } = useFinancial();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Group transactions by date
  const groupedByDate = useMemo(() => {
    // Filter
    const filtered = transactions.filter((t) => {
      if (selectedMonth && !t.date.startsWith(selectedMonth)) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const noteMatch = (t.note || '').toLowerCase().includes(term);
        const cat = t.categoryId ? catMap.get(t.categoryId) : null;
        const catMatch = cat?.name.toLowerCase().includes(term);
        if (!noteMatch && !catMatch) return false;
      }
      return true;
    });

    // Grouping
    const groups: Record<
      string,
      {
        dateStr: string;
        displayHeader: string;
        items: Transaction[];
        dailyIncome: number;
        dailyExpense: number;
      }
    > = {};

    filtered.forEach((t) => {
      if (!groups[t.date]) {
        let displayHeader = formatDateWithDayVN(t.date);
        try {
          const d = parseISO(t.date);
          if (isToday(d)) {
            displayHeader = `Hôm nay • ${formatDateWithDayVN(t.date)}`;
          } else if (isYesterday(d)) {
            displayHeader = `Hôm qua • ${formatDateWithDayVN(t.date)}`;
          }
        } catch {}

        groups[t.date] = {
          dateStr: t.date,
          displayHeader,
          items: [],
          dailyIncome: 0,
          dailyExpense: 0,
        };
      }

      groups[t.date].items.push(t);
      if (t.type === 'income') groups[t.date].dailyIncome += t.amount;
      if (t.type === 'expense') groups[t.date].dailyExpense += t.amount;
    });

    // Sort descending by date
    return Object.values(groups).sort(
      (a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime()
    );
  }, [transactions, selectedMonth, searchTerm, catMap]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Nhật ký tài chính
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Xem lại hành trình dòng tiền từng ngày như một cuốn nhật ký sống động
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
          <div className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-slate-700 bg-transparent focus:outline-hidden cursor-pointer"
            />
          </div>

          <button
            onClick={() => openAddTxModal()}
            className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Viết nhật ký thu chi</span>
            <span className="sm:hidden">Viết nhật ký</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Tìm kiếm nhật ký theo nội dung, ăn uống, đi lại..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Timeline entries */}
      {groupedByDate.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">
            Chưa có trang nhật ký nào trong tháng {selectedMonth}
          </h3>
          <p className="text-xs text-slate-400">
            Hãy bắt đầu ghi lại các khoản thu, chi hoặc chuyển khoản trong ngày.
          </p>
          <button
            onClick={() => openAddTxModal()}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            + Ghi nhận giao dịch đầu tiên
          </button>
        </div>
      ) : (
        <div className="relative pl-3 sm:pl-6 border-l-2 border-slate-200 ml-2.5 sm:ml-6 space-y-6 sm:space-y-8">
          {groupedByDate.map((group) => {
            const dailyNet = group.dailyIncome - group.dailyExpense;

            return (
              <div key={group.dateStr} className="relative group/day">
                {/* Timeline node icon */}
                <div className="absolute -left-[23px] sm:-left-[35px] top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                </div>

                {/* Day Header Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-800 capitalize">
                      {group.displayHeader}
                    </h3>
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {group.items.length} giao dịch
                    </span>
                  </div>

                  {/* Daily Net Flow */}
                  <div className="flex items-center space-x-2 text-xs font-semibold">
                    <span className="text-slate-400">Biến động ngày:</span>
                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                        dailyNet >= 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {dailyNet >= 0 ? '+' : ''}
                      {formatVND(dailyNet)}
                    </span>
                  </div>
                </div>

                {/* List of transactions for this day */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-slate-200/80 shadow-xs divide-y divide-slate-100 space-y-1">
                  {group.items.map((t) => {
                    const cat = catMap.get(t.categoryId || '');
                    const acc = accMap.get(t.accountId);
                    const toAcc = t.toAccountId ? accMap.get(t.toAccountId) : null;

                    const isYield = t.type === 'income' && (
                      t.note?.includes('[Tự động sinh lời]') ||
                      t.note?.includes('Sinh lời') ||
                      t.note?.includes('Túi Thần Tài')
                    );
                    const isTransfer = t.type === 'transfer';
                    const isDebt = /(nợ|vay|cho mượn|thu hồi)/i.test(t.note || '');
                    const isSalary = /lương/i.test(t.note || '');

                    // Tiêu đề giao dịch tinh gọn, không bị dài dòng hay chèn ép giao diện
                    let displayTitle = t.note || (isTransfer ? 'Chuyển tiền' : cat?.name || 'Giao dịch');
                    if (isYield) {
                      displayTitle = `Tiền lời tích lũy ${acc?.name || 'MoMo'}`;
                    }

                    const iconName = isYield
                      ? 'TrendingUp'
                      : isTransfer
                      ? 'ArrowLeftRight'
                      : cat?.icon || (isDebt ? 'HandCoins' : isSalary ? 'Coins' : 'Tag');

                    const iconColor = isYield
                      ? '#EC4899'
                      : isTransfer
                      ? '#3B82F6'
                      : cat?.color || (isDebt ? '#2563EB' : isSalary ? '#10B981' : '#64748B');

                    const paymentLabel =
                      t.paymentMethod === 'ewallet'
                        ? 'Ví điện tử'
                        : t.paymentMethod === 'cash'
                        ? 'Tiền mặt'
                        : t.paymentMethod === 'transfer'
                        ? 'Chuyển khoản'
                        : t.paymentMethod === 'card'
                        ? 'Thẻ'
                        : t.paymentMethod === 'qr'
                        ? 'Quét QR'
                        : t.paymentMethod;

                    return (
                      <div
                        key={t.id}
                        onClick={() => openAddTxModal(t)}
                        className="py-2.5 px-2.5 sm:px-3 flex items-center justify-between hover:bg-slate-50/80 active:bg-slate-100/70 rounded-2xl transition-all cursor-pointer group/item gap-3"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs shadow-2xs shrink-0"
                            style={{ backgroundColor: iconColor }}
                          >
                            <DynamicIcon name={iconName} className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                {displayTitle}
                              </span>
                              {isYield && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-3xs font-extrabold bg-pink-50 text-pink-700 border border-pink-200 shrink-0">
                                  +{acc?.yieldRate || 4}%/năm
                                </span>
                              )}
                            </div>

                            <p className="text-2xs text-slate-400 mt-0.5 truncate flex items-center space-x-1.5">
                              {cat && !isYield && (
                                <>
                                  <span className="text-slate-500 font-medium">{cat.name}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span className="text-slate-600 font-medium">{acc?.name || 'Ví'}</span>
                              {toAcc && <span>➔ {toAcc.name}</span>}
                              {paymentLabel && (
                                <>
                                  <span>•</span>
                                  <span>{paymentLabel}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 text-right">
                          <span
                            className={`text-xs sm:text-sm font-black ${
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

                          <div
                            className="hidden sm:flex items-center space-x-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => openAddTxModal(t)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded-md"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn xóa giao dịch "${t.note || 'Không có ghi chú'}" (${formatVND(t.amount)})?\n(Hệ thống sẽ xóa bản ghi và BẢO TOÀN NGUYÊN VẸN 100% số dư tài khoản, không trừ tiền của bạn)`)) {
                                  deleteTransaction(t.id, { revertBalance: false });
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                              title="Xóa giao dịch (Bảo toàn số dư ví)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

