import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  PieChart as PieIcon,
  Award,
  Filter,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { formatVND, formatCompactVND, formatDateVN } from '../utils/formatters';
import { exportComprehensiveReportToExcel, exportTransactionsToCSV } from '../utils/exportData';
import { DynamicIcon } from '../components/common/DynamicIcon';
import { format, parseISO, subMonths } from 'date-fns';
import { MonthlyWrappedModal } from '../components/modals/MonthlyWrappedModal';

type ReportTab = 'overview' | 'income' | 'categories' | 'month_comparison' | 'top_expenses';

export const ReportsPage: React.FC = () => {
  const {
    transactions,
    accounts,
    categories,
    budgets,
    savingsGoals,
    debts,
  } = useFinancial();

  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('overview');
  const [timeRangeMonths, setTimeRangeMonths] = useState<number>(6);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // 1. Total Financial Health Metrics
  const totalWalletBalances = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );
  const totalLendRemaining = useMemo(
    () => (debts || []).filter((d) => d.type === 'lend').reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0),
    [debts]
  );
  const totalBorrowRemaining = useMemo(
    () => (debts || []).filter((d) => d.type === 'borrow').reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0),
    [debts]
  );
  const totalTrueNetWorth = totalWalletBalances + totalLendRemaining - totalBorrowRemaining;

  const totalIncomeAll = useMemo(
    () => transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const totalExpenseAll = useMemo(
    () =>
      transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) +
      transactions.filter((t) => t.type === 'transfer' && (t.transferFee || 0) > 0).reduce((s, t) => s + (t.transferFee || 0), 0),
    [transactions]
  );
  const totalSavingsAll = totalIncomeAll - totalExpenseAll;
  const overallSavingsRate = totalIncomeAll > 0 ? Math.round((totalSavingsAll / totalIncomeAll) * 100) : 0;

  // 2. Monthly Comparison Data (Dynamic 6 or 12 months)
  const monthlyComparisonData = useMemo(() => {
    const monthsMap: Record<string, { month: string; display: string; income: number; expense: number; savings: number }> = {};
    const today = new Date();

    for (let i = timeRangeMonths - 1; i >= 0; i--) {
      const d = subMonths(today, i);
      const key = format(d, 'yyyy-MM');
      monthsMap[key] = {
        month: key,
        display: `Tháng ${format(d, 'MM/yy')}`,
        income: 0,
        expense: 0,
        savings: 0,
      };
    }

    transactions.forEach((t) => {
      const key = t.date.slice(0, 7);
      if (monthsMap[key]) {
        if (t.type === 'income') {
          monthsMap[key].income += t.amount;
        } else if (t.type === 'expense') {
          monthsMap[key].expense += t.amount;
        } else if (t.type === 'transfer' && (t.transferFee || 0) > 0) {
          monthsMap[key].expense += t.transferFee || 0;
        }
      }
    });

    Object.values(monthsMap).forEach((m) => {
      m.savings = m.income - m.expense;
    });

    return Object.values(monthsMap);
  }, [transactions, timeRangeMonths]);

  // 3. Month-over-Month Comparison with growth rates
  const momComparisonList = useMemo(() => {
    const list = [...monthlyComparisonData].reverse();
    return list.map((m, idx) => {
      const prev = list[idx + 1];
      const expenseChange = prev && prev.expense > 0 ? ((m.expense - prev.expense) / prev.expense) * 100 : null;
      const incomeChange = prev && prev.income > 0 ? ((m.income - prev.income) / prev.income) * 100 : null;
      return {
        ...m,
        expenseChange,
        incomeChange,
      };
    });
  }, [monthlyComparisonData]);

  // 4. Category Expenses Breakdown
  const categoryExpenses = useMemo(() => {
    const expenseMap: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const catKey = t.categoryId || 'uncategorized';
        expenseMap[catKey] = (expenseMap[catKey] || 0) + t.amount;
      });

    // Count transfer fees
    const totalTransferFees = transactions
      .filter((t) => t.type === 'transfer' && (t.transferFee || 0) > 0)
      .reduce((sum, t) => sum + (t.transferFee || 0), 0);
    if (totalTransferFees > 0) {
      expenseMap['transfer_fees'] = totalTransferFees;
    }

    const list = Object.entries(expenseMap).map(([cId, amount]) => {
      if (cId === 'transfer_fees') {
        return {
          id: cId,
          name: 'Phí chuyển khoản ngân hàng',
          color: '#F59E0B',
          icon: 'Zap',
          amount,
          percent: totalExpenseAll > 0 ? ((amount / totalExpenseAll) * 100).toFixed(1) : '0',
        };
      }
      const cat = catMap.get(cId);
      return {
        id: cId,
        name: cat?.name || (cId === 'uncategorized' ? 'Chi khác / Chưa phân loại' : 'Chưa phân loại'),
        color: cat?.color || '#94A3B8',
        icon: cat?.icon || 'Tag',
        amount,
        percent: totalExpenseAll > 0 ? ((amount / totalExpenseAll) * 100).toFixed(1) : '0',
      };
    });

    return list.sort((a, b) => b.amount - a.amount);
  }, [transactions, catMap, totalExpenseAll]);

  // 5. Category Income Breakdown (Nguồn thu nhập)
  const categoryIncomes = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        const catKey = t.categoryId || 'uncategorized';
        map[catKey] = (map[catKey] || 0) + t.amount;
      });

    const list = Object.entries(map).map(([cId, amount]) => {
      const cat = catMap.get(cId);
      return {
        id: cId,
        name: cat?.name || (cId === 'uncategorized' ? 'Thu nhập khác' : 'Chưa phân loại'),
        color: cat?.color || '#10B981',
        icon: cat?.icon || 'TrendingUp',
        amount,
        percent: totalIncomeAll > 0 ? ((amount / totalIncomeAll) * 100).toFixed(1) : '0',
      };
    });

    return list.sort((a, b) => b.amount - a.amount);
  }, [transactions, catMap, totalIncomeAll]);

  // 6. Top 10 Largest Expenses
  const top10Expenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [transactions]);

  // 7. Budget Alerts in Current Month
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const budgetAlerts = useMemo(() => {
    const curMonthTx = transactions.filter(
      (t) => t.type === 'expense' && t.date.startsWith(currentMonthStr)
    );

    return budgets
      .filter((b) => b.month === currentMonthStr)
      .map((b) => {
        const cat = catMap.get(b.categoryId);
        const spent = curMonthTx
          .filter((t) => t.categoryId === b.categoryId)
          .reduce((sum, t) => sum + t.amount, 0);
        const percent = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
        const remaining = b.amount - spent;
        const isOver = spent > b.amount;
        const isWarning = !isOver && percent >= (b.alertThreshold || 0.8) * 100;

        return {
          ...b,
          catName: cat?.name || 'Danh mục',
          catColor: cat?.color || '#64748B',
          catIcon: cat?.icon || 'Tag',
          spent,
          percent,
          remaining,
          isOver,
          isWarning,
        };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [budgets, transactions, catMap, currentMonthStr]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Báo cáo & Phân tích tài chính
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Phân tích số liệu dòng tiền, xu hướng thu chi và đánh giá sức khỏe tài chính toàn diện
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          {/* Button Xem Wrapped */}
          <button
            type="button"
            onClick={() => setIsWrappedOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Xem báo cáo tổng kết tháng phong cách Wrapped"
          >
            <span>🎁</span>
            <span>Wrapped {new Date().getMonth() + 1}</span>
          </button>

          {/* Filter Range */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTimeRangeMonths(6)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                timeRangeMonths === 6
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              6 tháng
            </button>
            <button
              onClick={() => setTimeRangeMonths(12)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                timeRangeMonths === 12
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              12 tháng
            </button>
          </div>

          <button
            onClick={() =>
              exportComprehensiveReportToExcel(
                transactions,
                accounts,
                categories,
                budgets,
                savingsGoals,
                debts
              )
            }
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất toàn bộ Excel</span>
          </button>

          <button
            onClick={() => exportTransactionsToCSV(transactions, categories, accounts)}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 5 Financial Health Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Tổng tài sản ròng thực tế */}
        <div className="bg-gradient-to-tr from-blue-700 to-indigo-600 text-white rounded-3xl p-4.5 shadow-md shadow-blue-500/15 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold uppercase tracking-wider text-blue-100">
              Tài sản ròng thực tế
            </span>
            <Wallet className="w-4 h-4 text-blue-200" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black tracking-tight">
              {formatVND(totalTrueNetWorth)}
            </h3>
            <p className="text-3xs text-blue-200 mt-0.5">
              (Ví + Cho vay) - Tiền đi vay
            </p>
          </div>
        </div>

        {/* Card 2: Thu nhập */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-3xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng thu nhập ghi nhận
          </span>
          <div className="mt-2.5">
            <h3 className="text-lg font-black text-emerald-600 tracking-tight">
              +{formatVND(totalIncomeAll)}
            </h3>
            <p className="text-3xs text-slate-400 mt-0.5">Toàn bộ lịch sử</p>
          </div>
        </div>

        {/* Card 3: Chi tiêu */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-3xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng chi tiêu ghi nhận
          </span>
          <div className="mt-2.5">
            <h3 className="text-lg font-black text-rose-600 tracking-tight">
              -{formatVND(totalExpenseAll)}
            </h3>
            <p className="text-3xs text-slate-400 mt-0.5">Đã gồm phí ngân hàng</p>
          </div>
        </div>

        {/* Card 4: Tích lũy ròng */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-3xs font-semibold uppercase tracking-wider text-slate-500">
            Tích lũy ròng (Thu - Chi)
          </span>
          <div className="mt-2.5">
            <h3 className={`text-lg font-black tracking-tight ${totalSavingsAll >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600'}`}>
              {formatVND(totalSavingsAll, true)}
            </h3>
            <p className="text-3xs text-slate-400 mt-0.5">Chênh lệch thu chi</p>
          </div>
        </div>

        {/* Card 5: Tỷ lệ tiết kiệm */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-3xs font-semibold uppercase tracking-wider text-slate-500">
            Tỷ lệ tiết kiệm
          </span>
          <div className="mt-2.5">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-black text-blue-600 tracking-tight">
                {overallSavingsRate}%
              </h3>
              <span className={`text-3xs px-2 py-0.5 rounded-full font-bold ${
                overallSavingsRate >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {overallSavingsRate >= 20 ? 'Chuẩn' : 'Cần tăng'}
              </span>
            </div>
            <p className="text-3xs text-slate-400 mt-0.5">
              Chuẩn tài chính: ≥ 20%
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveReportTab('overview')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dòng tiền & Xu hướng</span>
        </button>

        <button
          onClick={() => setActiveReportTab('income')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'income'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Cơ cấu Nguồn thu</span>
        </button>

        <button
          onClick={() => setActiveReportTab('categories')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'categories'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PieIcon className="w-4 h-4" />
          <span>Cơ cấu Chi tiêu</span>
        </button>

        <button
          onClick={() => setActiveReportTab('month_comparison')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'month_comparison'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Đối chiếu các tháng & Ngân sách</span>
          {budgetAlerts.some((b) => b.isOver || b.isWarning) && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveReportTab('top_expenses')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'top_expenses'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Top 10 khoản chi lớn</span>
        </button>
      </div>

      {/* ==================== TAB 1: DÒNG TIỀN & XU HƯỚNG ==================== */}
      {activeReportTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Biểu đồ so sánh Thu nhập - Chi tiêu ({timeRangeMonths} tháng gần nhất)
                </h3>
                <p className="text-xs text-slate-400">
                  Quan sát xu hướng tương quan thu chi để kiểm soát mức độ tích lũy hàng tháng
                </p>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparisonData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="display" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => formatCompactVND(val)}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatVND(Number(val)), '']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Thu nhập" fill="#10B981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Chi tiêu" fill="#EF4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Net Savings Trend Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              Xu hướng tiết kiệm ròng theo từng tháng
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Dòng tiền thặng dư thực tế (Thu - Chi) chứng minh sức khỏe tăng trưởng tài chính
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="display" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => formatCompactVND(val)}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatVND(Number(val)), 'Tiết kiệm ròng']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    name="Dòng tiền tích lũy"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#2563EB' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: CƠ CẤU NGUỒN THU ==================== */}
      {activeReportTab === 'income' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Biểu đồ nguồn thu</h3>
              <p className="text-xs text-slate-400">Tỷ trọng các nguồn tiền về</p>
            </div>

            <div className="h-64 w-full relative flex items-center justify-center my-4">
              {categoryIncomes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryIncomes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="amount"
                    >
                      {categoryIncomes.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatVND(Number(val)), 'Thu nhập']}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-400">Chưa có dữ liệu thu nhập</div>
              )}
              <div className="absolute text-center pointer-events-none">
                <span className="text-3xs text-slate-400 block">Tổng thu</span>
                <span className="text-xs font-bold text-emerald-600">
                  {formatCompactVND(totalIncomeAll)}
                </span>
              </div>
            </div>

            <div className="text-3xs text-slate-400 text-center">
              Dựa trên toàn bộ lịch sử các khoản thu đã ghi nhận
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              Chi tiết các nguồn thu nhập
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Phân loại danh mục đóng góp lớn nhất vào dòng tiền của bạn
            </p>

            <div className="space-y-3">
              {categoryIncomes.map((c, idx) => (
                <div key={c.id} className="space-y-1.5 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-400 w-4 text-center">
                        #{idx + 1}
                      </span>
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: c.color }}
                      >
                        <DynamicIcon name={c.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-emerald-600">
                        +{formatVND(c.amount)}
                      </span>
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        {c.percent}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${c.percent}%`,
                        backgroundColor: c.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: CƠ CẤU CHI TIÊU ==================== */}
      {activeReportTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Biểu đồ cơ cấu</h3>
              <p className="text-xs text-slate-400">Tỷ trọng các nhóm chi phí</p>
            </div>

            <div className="h-64 w-full relative flex items-center justify-center my-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryExpenses}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {categoryExpenses.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatVND(Number(val)), 'Chi phí']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <span className="text-3xs text-slate-400 block">Tổng chi</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {formatCompactVND(totalExpenseAll)}
                </span>
              </div>
            </div>

            <div className="text-3xs text-slate-400 text-center">
              Đã bao gồm chi tiêu danh mục và các phí chuyển khoản phát sinh
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              Bảng chi tiết chi tiêu theo danh mục
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Xếp hạng từ danh mục tốn nhiều ngân sách nhất đến thấp nhất
            </p>

            <div className="space-y-3">
              {categoryExpenses.map((c, idx) => (
                <div key={c.id} className="space-y-1.5 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-400 w-4 text-center">
                        #{idx + 1}
                      </span>
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: c.color }}
                      >
                        <DynamicIcon name={c.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                        {formatVND(c.amount)}
                      </span>
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {c.percent}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${c.percent}%`,
                        backgroundColor: c.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: ĐỐI CHIẾU CÁC THÁNG & CẢNH BÁO NGÂN SÁCH ==================== */}
      {activeReportTab === 'month_comparison' && (
        <div className="space-y-6">
          {/* Cảnh báo ngân sách tháng hiện tại */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Theo dõi & Cảnh báo hạn mức ngân sách ({format(new Date(), 'MM/yyyy')})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Cảnh báo sớm các nhóm chi tiêu vượt ngưỡng 80% hoặc đã vượt 100% định mức tháng
                </p>
              </div>
            </div>

            {budgetAlerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {budgetAlerts.map((b) => (
                  <div
                    key={b.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      b.isOver
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                        : b.isWarning
                        ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: b.catColor }}
                        >
                          <DynamicIcon name={b.catIcon} className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{b.catName}</span>
                      </div>
                      <span
                        className={`text-2xs font-extrabold px-2 py-0.5 rounded-full ${
                          b.isOver
                            ? 'bg-rose-100 text-rose-700'
                            : b.isWarning
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {b.isOver ? '⚠️ VƯỢT NGÂN SÁCH' : b.isWarning ? '⚡ GẦN ĐẠT HẠN MỨC' : '✓ AN TOÀN'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-slate-500">
                        Đã chi: <strong>{formatVND(b.spent)}</strong>
                      </span>
                      <span className="text-slate-500">
                        Hạn mức: <strong>{formatVND(b.amount)}</strong>
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.isOver ? 'bg-rose-600' : b.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, b.percent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-3xs text-slate-400 mt-1.5">
                      <span>Đạt {b.percent}%</span>
                      <span>
                        {b.isOver
                          ? `Vượt quá ${formatVND(Math.abs(b.remaining))}`
                          : `Còn lại ${formatVND(b.remaining)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                Chưa có ngân sách nào được thiết lập cho tháng này. Bạn có thể vào tab "Ngân sách" để cài đặt.
              </div>
            )}
          </div>

          {/* Bảng so sánh từng tháng chi tiết */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              Bảng đối chiếu tăng giảm thu chi theo tháng
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Theo dõi tốc độ biến động chi tiêu và tích lũy so với tháng liền kề
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3">Thời gian</th>
                    <th className="py-3 px-3 text-right">Tổng thu</th>
                    <th className="py-3 px-3 text-right">Tổng chi</th>
                    <th className="py-3 px-3 text-right">Tiết kiệm ròng</th>
                    <th className="py-3 px-3 text-center">Biến động chi tiêu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {momComparisonList.map((m) => (
                    <tr key={m.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {m.display}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-semibold">
                        +{formatVND(m.income)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-semibold">
                        -{formatVND(m.expense)}
                      </td>
                      <td className={`py-3 px-3 text-right font-extrabold ${m.savings >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                        {formatVND(m.savings, true)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {m.expenseChange !== null ? (
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-3xs font-bold ${
                              m.expenseChange > 0
                                ? 'bg-rose-100 text-rose-700'
                                : m.expenseChange < 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {m.expenseChange > 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : m.expenseChange < 0 ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : null}
                            {m.expenseChange > 0 ? `+${m.expenseChange.toFixed(1)}%` : `${m.expenseChange.toFixed(1)}%`}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-3xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: TOP 10 KHOẢN CHI LỚN NHẤT ==================== */}
      {activeReportTab === 'top_expenses' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Top 10 khoản chi lớn nhất lịch sử
              </h3>
              <p className="text-xs text-slate-400">
                Các khoản chi tiêu trọng yếu có ảnh hưởng lớn nhất tới dòng tiền
              </p>
            </div>
            <Award className="w-6 h-6 text-amber-500" />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {top10Expenses.map((t, idx) => {
              const cat = catMap.get(t.categoryId || '');
              const acc = accMap.get(t.accountId);
              return (
                <div
                  key={t.id}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/80 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                        {t.note || cat?.name || 'Chi tiêu lớn'}
                      </h4>
                      <p className="text-2xs text-slate-400">
                        {formatDateVN(t.date)} • {cat?.name} • {acc?.name}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-rose-600">
                      -{formatVND(t.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <MonthlyWrappedModal
        isOpen={isWrappedOpen}
        onClose={() => setIsWrappedOpen(false)}
      />
    </div>
  );
};
