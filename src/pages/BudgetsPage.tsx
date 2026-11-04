import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Budget } from '../types';
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Calendar,
  Sparkles,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { formatVND, formatCompactVND, formatMonthYearVN } from '../utils/formatters';
import { DynamicIcon } from '../components/common/DynamicIcon';
import { BudgetModal } from '../components/modals/BudgetModal';
import { parseISO, isSameMonth, format } from 'date-fns';

export const BudgetsPage: React.FC = () => {
  const {
    budgets,
    categories,
    transactions,
    deleteBudget,
  } = useFinancial();

  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), 'yyyy-MM')
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Filter transactions for selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      try {
        const txMonth = t.date.slice(0, 7);
        return txMonth === selectedMonth && t.type === 'expense';
      } catch {
        return false;
      }
    });
  }, [transactions, selectedMonth]);

  // Budgets for selected month
  const monthBudgets = useMemo(() => {
    return budgets.filter((b) => b.month === selectedMonth);
  }, [budgets, selectedMonth]);

  // Aggregate stats
  const totalBudgeted = useMemo(
    () => monthBudgets.reduce((sum, b) => sum + b.amount, 0),
    [monthBudgets]
  );

  const budgetItemsWithStats = useMemo(() => {
    return monthBudgets.map((b) => {
      const cat = catMap.get(b.categoryId);
      const spent = monthTransactions
        .filter((t) => t.categoryId === b.categoryId)
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = b.amount - spent;
      const percent = Math.round((spent / (b.amount || 1)) * 100);

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (percent >= 100) status = 'danger';
      else if (percent >= 80) status = 'warning';

      return {
        ...b,
        categoryName: cat?.name || 'Danh mục',
        icon: cat?.icon || 'Tag',
        color: cat?.color || '#64748B',
        spent,
        remaining,
        percent,
        status,
      };
    });
  }, [monthBudgets, monthTransactions, catMap]);

  const totalSpentInBudgetedCats = useMemo(
    () => budgetItemsWithStats.reduce((sum, item) => sum + item.spent, 0),
    [budgetItemsWithStats]
  );

  const totalRemaining = totalBudgeted - totalSpentInBudgetedCats;
  const overallPercent = totalBudgeted > 0 ? Math.round((totalSpentInBudgetedCats / totalBudgeted) * 100) : 0;

  const warningCount = budgetItemsWithStats.filter((i) => i.status === 'warning').length;
  const dangerCount = budgetItemsWithStats.filter((i) => i.status === 'danger').length;

  const handleOpenCreate = () => {
    setEditingBudget(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setEditingBudget(b);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Quản lý ngân sách chi tiêu
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Đặt giới hạn chi tiêu từng danh mục để kiểm soát tài chính và ngăn ngừa thâm hụt
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Month Picker */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <Calendar className="w-4 h-4 text-blue-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-slate-700 bg-transparent focus:outline-hidden"
            />
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thiết lập ngân sách</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng ngân sách tháng
          </span>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatVND(totalBudgeted)}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">
              Phân bổ trên {monthBudgets.length} danh mục
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Đã chi tiêu
          </span>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-600 tracking-tight">
              {formatVND(totalSpentInBudgetedCats)}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">
              Đạt {overallPercent}% tổng hạn mức
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Hạn mức còn lại
          </span>
          <div className="mt-3">
            <h3
              className={`text-2xl font-black tracking-tight ${
                totalRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatVND(Math.abs(totalRemaining))}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">
              {totalRemaining >= 0 ? 'Khả dụng an toàn' : 'Bội chi vượt ngân sách'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Tình trạng cảnh báo
          </span>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              {dangerCount > 0 ? (
                <span className="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {dangerCount} vượt mức
                </span>
              ) : null}
              {warningCount > 0 ? (
                <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {warningCount} chạm 80%
                </span>
              ) : null}
              {dangerCount === 0 && warningCount === 0 && (
                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tất cả an toàn
                </span>
              )}
            </div>
            <p className="text-2xs text-slate-400 mt-1.5">
              Tự động giám sát theo thời gian thực
            </p>
          </div>
        </div>
      </div>

      {/* Budget Items Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-800">
          Chi tiết ngân sách từng danh mục ({formatMonthYearVN(selectedMonth)})
        </h2>

        {budgetItemsWithStats.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <PieChart className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Chưa có ngân sách cho {formatMonthYearVN(selectedMonth)}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Hãy thiết lập định mức chi tiêu cho các danh mục như Ăn uống, Mua sắm, Đi lại để bắt đầu theo dõi.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              + Tạo ngân sách ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetItemsWithStats.map((item) => {
              let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              let barColor = 'bg-emerald-500';
              let statusLabel = 'An toàn';

              if (item.status === 'danger') {
                badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                barColor = 'bg-rose-500';
                statusLabel = 'Vượt ngân sách!';
              } else if (item.status === 'warning') {
                badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                barColor = 'bg-amber-500';
                statusLabel = 'Cảnh báo: Đã dùng > 80%';
              }

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs card-hover flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-2xs"
                          style={{ backgroundColor: item.color }}
                        >
                          <DynamicIcon name={item.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">
                            {item.categoryName}
                          </h3>
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.5 text-2xs font-semibold rounded-md border ${badgeColor}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Sửa ngân sách"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa ngân sách danh mục "${item.categoryName}"?`)) {
                              deleteBudget(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa ngân sách"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          Đã chi: {formatVND(item.spent)}
                        </span>
                        <span className="font-bold text-slate-800">
                          {item.percent}%
                        </span>
                      </div>

                      <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(item.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Metrics */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-medium">
                        Hạn mức giao
                      </span>
                      <p className="font-bold text-slate-800">
                        {formatVND(item.amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xs text-slate-400 uppercase font-medium">
                        {item.remaining >= 0 ? 'Còn lại' : 'Bội chi'}
                      </span>
                      <p
                        className={`font-bold ${
                          item.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatVND(Math.abs(item.remaining))}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingBudget={editingBudget}
        defaultMonth={selectedMonth}
      />
    </div>
  );
};

