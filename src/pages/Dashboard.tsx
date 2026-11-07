import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Plus,
  Target,
  HandCoins,
  ArrowLeftRight,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatVND, formatCompactVND, formatDateVN } from '../utils/formatters';
import { DynamicIcon } from '../components/common/DynamicIcon';
import { subMonths, isSameMonth, parseISO, format } from 'date-fns';
import { calculateFinancialHealthScore, calculate503020Rule } from '../utils/financialAssistant';

export const Dashboard: React.FC = () => {
  const {
    accounts,
    categories,
    transactions,
    filteredTransactions,
    timeFilter,
    budgets,
    savingsGoals,
    debts,
    insights,
    openAddTxModal,
    setCurrentTab,
  } = useFinancial();

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Current date & reference months
  const now = new Date();
  const prevMonth = subMonths(now, 1);

  // Month calculations for comparison
  const prevMonthTx = useMemo(() => {
    return transactions.filter((t) => {
      try {
        return isSameMonth(parseISO(t.date), prevMonth);
      } catch {
        return false;
      }
    });
  }, [transactions, prevMonth]);

  // Active transactions according to user's selected time filter
  const activeTx = filteredTransactions;

  // Metrics
  const totalNetWorth = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  }, [accounts]);

  const curIncome = useMemo(() => {
    return activeTx
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [activeTx]);

  const curExpense = useMemo(() => {
    return activeTx.reduce((sum, t) => {
      if (t.type === 'expense') return sum + t.amount;
      if (t.type === 'transfer' && t.transferFee) return sum + t.transferFee;
      return sum;
    }, 0);
  }, [activeTx]);

  const prevIncome = useMemo(() => {
    return prevMonthTx
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [prevMonthTx]);

  const prevExpense = useMemo(() => {
    return prevMonthTx.reduce((sum, t) => {
      if (t.type === 'expense') return sum + t.amount;
      if (t.type === 'transfer' && t.transferFee) return sum + t.transferFee;
      return sum;
    }, 0);
  }, [prevMonthTx]);

  const curSavings = curIncome - curExpense;
  const savingsRate = curIncome > 0 ? Math.max(0, Math.round((curSavings / curIncome) * 100)) : 0;

  // MoM Percentages
  const incomeMoMPct = prevIncome > 0 ? ((curIncome - prevIncome) / prevIncome) * 100 : 0;
  const expenseMoMPct = prevExpense > 0 ? ((curExpense - prevExpense) / prevExpense) * 100 : 0;

  // Debt Metrics
  const totalLendRemaining = useMemo(
    () => debts.filter((d) => d.type === 'lend').reduce((sum, d) => sum + Math.max(0, d.totalAmount - d.paidAmount), 0),
    [debts]
  );
  const totalBorrowRemaining = useMemo(
    () => debts.filter((d) => d.type === 'borrow').reduce((sum, d) => sum + Math.max(0, d.totalAmount - d.paidAmount), 0),
    [debts]
  );
  const activeDebtsList = useMemo(
    () => debts.filter((d) => d.totalAmount > d.paidAmount),
    [debts]
  );
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [activeInsightIndex, setActiveInsightIndex] = useState(0);

  const overdueDebtsCount = useMemo(() => {
    return debts.filter(
      (d) => d.totalAmount > d.paidAmount && (d.status === 'overdue' || (d.dueDate && d.dueDate < todayStr))
    ).length;
  }, [debts, todayStr]);

  const budgetsExceededCount = useMemo(() => {
    return budgets.filter((b) => {
      const spent = activeTx
        .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      return b.amount > 0 && spent > b.amount;
    }).length;
  }, [budgets, activeTx]);

  const healthScore = useMemo(() => {
    return calculateFinancialHealthScore(curIncome, curExpense, overdueDebtsCount, budgetsExceededCount);
  }, [curIncome, curExpense, overdueDebtsCount, budgetsExceededCount]);

  const rule503020 = useMemo(() => {
    return calculate503020Rule(activeTx, categories, curIncome);
  }, [activeTx, categories, curIncome]);

  // Period display label
  const periodLabelMap: Record<string, string> = {
    today: 'Hôm nay',
    this_week: 'Tuần này',
    this_month: 'Tháng này',
    this_year: 'Năm nay',
    custom: 'Kỳ lọc',
    all: 'Toàn thời gian',
  };
  const periodLabel = periodLabelMap[timeFilter] || 'Kỳ này';

  // Cashflow timeline chart data (Day by day for active period)
  const cashflowChartData = useMemo(() => {
    const daysInMap: Record<string, { date: string; displayDate: string; thu: number; chi: number }> = {};
    
    // Sort transactions ascending for chart
    const sorted = [...activeTx]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((t) => {
      const dayKey = t.date;
      if (!daysInMap[dayKey]) {
        daysInMap[dayKey] = {
          date: dayKey,
          displayDate: format(parseISO(dayKey), 'dd/MM'),
          thu: 0,
          chi: 0,
        };
      }
      if (t.type === 'income') {
        daysInMap[dayKey].thu += t.amount;
      } else if (t.type === 'expense') {
        daysInMap[dayKey].chi += t.amount;
      }
    });

    const result = Object.values(daysInMap);
    if (result.length === 0) {
      return [
        { date: '01/11', displayDate: '01/11', thu: 0, chi: 0 },
        { date: '04/11', displayDate: '04/11', thu: 0, chi: 0 },
      ];
    }
    if (result.length === 1) {
      return [
        { date: 'start', displayDate: '01/11', thu: 0, chi: 0 },
        result[0],
      ];
    }
    return result;
  }, [activeTx]);

  // Category breakdown for Donut Chart
  const categoryExpenseData = useMemo(() => {
    const expenseMap: Record<string, number> = {};
    activeTx.forEach((t) => {
      if (t.type === 'expense') {
        const catKey = t.categoryId || 'debt_other';
        expenseMap[catKey] = (expenseMap[catKey] || 0) + t.amount;
      }
    });

    const data = Object.entries(expenseMap).map(([cId, amount]) => {
      const cat = catMap.get(cId);
      return {
        name: cat?.name || (cId === 'debt_other' ? 'Sổ nợ / Chi khác' : 'Khác'),
        value: amount,
        color: cat?.color || (cId === 'debt_other' ? '#E11D48' : '#94A3B8'),
      };
    });

    return data.sort((a, b) => b.value - a.value);
  }, [activeTx, catMap]);

  // Recent 5 transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  // Top 3 budget previews
  const budgetPreviews = useMemo(() => {
    const curMonthStr = format(now, 'yyyy-MM');
    const curBudgets = budgets.filter((b) => b.month === curMonthStr);

    return curBudgets.slice(0, 4).map((b) => {
      const cat = catMap.get(b.categoryId);
      const spent = activeTx
        .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
        .reduce((sum, t) => sum + t.amount, 0);
      const percent = Math.min(Math.round((spent / (b.amount || 1)) * 100), 200);

      let statusColor = 'bg-emerald-500';
      if (percent >= 100) statusColor = 'bg-rose-500';
      else if (percent >= 80) statusColor = 'bg-amber-500';

      return {
        ...b,
        categoryName: cat?.name || 'Danh mục',
        icon: cat?.icon || 'Tag',
        color: cat?.color || '#64748B',
        spent,
        percent,
        statusColor,
      };
    });
  }, [budgets, activeTx, catMap, now]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Smart Financial Assistant Highlight with Carousel */}
      {insights.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 shadow-xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md text-amber-300 flex-shrink-0 shadow-inner">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xs uppercase tracking-wider font-bold text-blue-300">
                    Trợ lý tài chính thông minh MoneyFlow
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {insights.length > 1 && (
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-white/15 text-blue-100">
                      Gợi ý {((activeInsightIndex % insights.length) + 1)}/{insights.length}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  {insights[activeInsightIndex % insights.length]?.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
                  {insights[activeInsightIndex % insights.length]?.message}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start md:self-center">
              {insights.length > 1 && (
                <div className="flex items-center space-x-1 mr-2 bg-white/10 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveInsightIndex((prev) => (prev - 1 + insights.length) % insights.length)
                    }
                    className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                    title="Gợi ý trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveInsightIndex((prev) => (prev + 1) % insights.length)
                    }
                    className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                    title="Gợi ý tiếp theo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {insights[activeInsightIndex % insights.length]?.actionText && (
                <button
                  type="button"
                  onClick={() => {
                    const tab = insights[activeInsightIndex % insights.length]?.actionTab;
                    if (tab) setCurrentTab(tab);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 rounded-xl transition-all shadow-md flex-shrink-0 cursor-pointer"
                >
                  <span>{insights[activeInsightIndex % insights.length].actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4 Financial Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Tổng tài sản hiện có */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs card-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng tài sản hiện có
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatVND(totalNetWorth)}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              Phân bổ trên {accounts.length} tài khoản & ví
            </p>
            {(totalLendRemaining > 0 || totalBorrowRemaining > 0) && (
              <div className="text-3xs text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 font-medium">
                <span>Thu nợ: <strong className="text-blue-600">+{formatCompactVND(totalLendRemaining)}</strong></span>
                <span>Trả nợ: <strong className="text-amber-600">-{formatCompactVND(totalBorrowRemaining)}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Thu nhập trong kỳ */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs card-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Thu nhập ({periodLabel})
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
              {formatVND(curIncome)}
            </h3>
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs">
              {incomeMoMPct >= 0 ? (
                <span className="text-emerald-600 font-semibold flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  +{incomeMoMPct.toFixed(1)}%
                </span>
              ) : (
                <span className="text-rose-600 font-semibold flex items-center">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                  {incomeMoMPct.toFixed(1)}%
                </span>
              )}
              <span className="text-slate-400">so với tháng trước</span>
            </div>
          </div>
        </div>

        {/* Card 3: Chi tiêu trong kỳ */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs card-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chi tiêu ({periodLabel})
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-rose-600 tracking-tight">
              {formatVND(curExpense)}
            </h3>
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs">
              {expenseMoMPct > 0 ? (
                <span className="text-rose-600 font-semibold flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  +{expenseMoMPct.toFixed(1)}%
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                  {expenseMoMPct.toFixed(1)}%
                </span>
              )}
              <span className="text-slate-400">so với tháng trước</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tích lũy & Tỷ lệ tiết kiệm */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs card-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tiết kiệm & Tỷ lệ
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {formatVND(curSavings)}
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {savingsRate}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {curSavings >= 0
                ? 'Dòng tiền thặng dư tích cực'
                : 'Cảnh báo: Dòng tiền đang thâm hụt'}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Health Score & 50/30/20 Rule Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 1 col: Financial Health Score */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sức khỏe Tài chính</h3>
              </div>
              <span
                className={`text-3xs font-bold px-2.5 py-0.5 rounded-full ${
                  !healthScore.hasData
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    : healthScore.rating === 'excellent'
                    ? 'bg-emerald-100 text-emerald-700'
                    : healthScore.rating === 'good'
                    ? 'bg-blue-100 text-blue-700'
                    : healthScore.rating === 'average'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {healthScore.title}
              </span>
            </div>

            <div className="flex items-center space-x-4 my-4">
              <div
                className={`w-16 h-16 rounded-2xl text-white flex flex-col items-center justify-center shadow-md shrink-0 ${
                  !healthScore.hasData
                    ? 'bg-slate-400 dark:bg-slate-700'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                }`}
              >
                <span className="text-xl font-black">{healthScore.hasData ? healthScore.score : '--'}</span>
                <span className="text-3xs uppercase tracking-wider opacity-80">/ 100</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{healthScore.title}</h4>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {healthScore.description}
                </p>
              </div>
            </div>

            {/* Sub-scores */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-2xs">
              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                  <span>Tích lũy thu nhập</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {healthScore.hasData ? `${healthScore.savingsScore}/40đ` : '--/40đ'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${healthScore.hasData ? (healthScore.savingsScore / 40) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                  <span>Kiểm soát nghĩa vụ nợ</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {healthScore.hasData ? `${healthScore.debtScore}/30đ` : '--/30đ'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${healthScore.hasData ? (healthScore.debtScore / 30) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                  <span>Kỷ luật ngân sách</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {healthScore.hasData ? `${healthScore.budgetScore}/30đ` : '--/30đ'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${healthScore.hasData ? (healthScore.budgetScore / 30) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 cols: 50/30/20 Rule Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <PieChartIcon className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Phân bổ Dòng tiền theo Quy tắc 50/30/20
                  </h3>
                  <p className="text-3xs text-slate-400">
                    Mô hình chuẩn: 50% Nhu cầu thiết yếu • 30% Sở thích & Linh hoạt • 20% Tích lũy
                  </p>
                </div>
              </div>
              <span className="text-3xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {periodLabel}
              </span>
            </div>

            {/* 3-segment progress bar */}
            <div className="my-4 space-y-2">
              {!rule503020.hasData ? (
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xs text-slate-400 font-medium">
                  Chưa phát sinh chi tiêu trong kỳ này
                </div>
              ) : (
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    className="bg-blue-600 h-full transition-all"
                    style={{ width: `${Math.min(100, rule503020.needsPct)}%` }}
                    title={`Thiết yếu: ${rule503020.needsPct}%`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{ width: `${Math.min(100, rule503020.wantsPct)}%` }}
                    title={`Sở thích: ${rule503020.wantsPct}%`}
                  />
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${Math.min(100, rule503020.savingsPct)}%` }}
                    title={`Tích lũy: ${rule503020.savingsPct}%`}
                  />
                </div>
              )}

              {/* Legend & Amounts */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-2xl bg-blue-50/70 border border-blue-100/80">
                  <div className="flex items-center justify-center space-x-1 text-3xs font-semibold text-blue-700">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Thiết yếu (50%)</span>
                  </div>
                  <span className="text-sm sm:text-base font-black text-blue-900 block mt-1">
                    {rule503020.hasData ? `${rule503020.needsPct}%` : '0%'}
                  </span>
                  <span className="text-3xs text-blue-600 block mt-0.5 font-medium truncate">
                    {formatCompactVND(rule503020.needsAmount)}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-100/80">
                  <div className="flex items-center justify-center space-x-1 text-3xs font-semibold text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Sở thích (30%)</span>
                  </div>
                  <span className="text-sm sm:text-base font-black text-amber-900 block mt-1">
                    {rule503020.hasData ? `${rule503020.wantsPct}%` : '0%'}
                  </span>
                  <span className="text-3xs text-amber-600 block mt-0.5 font-medium truncate">
                    {formatCompactVND(rule503020.wantsAmount)}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-100/80">
                  <div className="flex items-center justify-center space-x-1 text-3xs font-semibold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Tích lũy (20%)</span>
                  </div>
                  <span className="text-sm sm:text-base font-black text-emerald-900 block mt-1">
                    {rule503020.hasData ? `${rule503020.savingsPct}%` : '0%'}
                  </span>
                  <span className="text-3xs text-emerald-600 block mt-0.5 font-medium truncate">
                    {formatCompactVND(rule503020.savingsAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Advice note */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-2xs text-slate-600 dark:text-slate-300 flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Nhận định chuyên gia:</strong> {rule503020.advice}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Charts: Cashflow Line/Area & Category Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cashflow Dynamics Chart (2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Biểu đồ dòng tiền (Thu nhập & Chi tiêu)
              </h3>
              <p className="text-xs text-slate-400">
                Theo dõi biến động dòng tiền thực tế theo các ngày trong tháng
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600">Thu nhập</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="text-slate-600">Chi tiêu</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorThu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorChi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(val) => formatCompactVND(val)}
                  width={60}
                />
                <Tooltip
                  formatter={(val: any) => [formatVND(Number(val)), '']}
                  labelFormatter={(lbl) => `Ngày ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="thu"
                  name="Thu nhập"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorThu)"
                />
                <Area
                  type="monotone"
                  dataKey="chi"
                  name="Chi tiêu"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorChi)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Category Spending Structure Donut Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Cơ cấu chi tiêu</h3>
            <p className="text-xs text-slate-400">Tỷ trọng chi tiêu theo từng danh mục</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            {categoryExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryExpenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryExpenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatVND(Number(val)), 'Số tiền']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Chưa có giao dịch chi tiêu tháng này</div>
            )}
            {categoryExpenseData.length > 0 && (
              <div className="absolute text-center pointer-events-none">
                <span className="text-2xs text-slate-400 font-medium block">Tổng chi</span>
                <span className="text-xs font-bold text-slate-800">
                  {formatCompactVND(curExpense)}
                </span>
              </div>
            )}
          </div>

          {/* Compact Legend list */}
          <div className="space-y-2 max-h-36 overflow-y-auto pt-2 border-t border-slate-100">
            {categoryExpenseData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 truncate">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800">
                  {curExpense > 0 ? Math.round((item.value / curExpense) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom 4 Sections: Giao dịch gần đây, Sổ nợ, Ngân sách, Mục tiêu tiết kiệm (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget 1: Giao dịch gần đây */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">Giao dịch gần đây</h3>
              <p className="text-2xs text-slate-400">Các khoản thu chi & chuyển khoản mới nhất</p>
            </div>
            <button
              onClick={() => setCurrentTab('transactions')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 whitespace-nowrap"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1 my-3">
            {recentTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <ArrowLeftRight className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">Chưa có giao dịch nào được ghi nhận</p>
                <p className="text-3xs text-slate-400">Bắt đầu bằng cách thêm giao dịch thu nhập hoặc chi tiêu đầu tiên</p>
              </div>
            ) : (
              recentTransactions.map((t) => {
                const cat = catMap.get(t.categoryId || '');
                const acc = accMap.get(t.accountId);

                let catName = cat?.name;
                let catIcon = cat?.icon || 'Tag';
                let catColor = cat?.color || '#64748B';

                if (t.type === 'transfer') {
                  catName = t.note?.includes('[Tự động bù trừ]') ? 'Cấn trừ số dư âm' : 'Chuyển khoản';
                  catIcon = t.note?.includes('[Tự động bù trừ]') ? 'Zap' : 'ArrowLeftRight';
                  catColor = t.note?.includes('[Tự động bù trừ]') ? '#8B5CF6' : '#3B82F6';
                } else if (!catName) {
                  const noteLower = (t.note || '').toLowerCase();
                  if (noteLower.includes('cho') && (noteLower.includes('mượn') || noteLower.includes('vay'))) {
                    catName = 'Cho mượn tiền';
                    catIcon = 'HandCoins';
                    catColor = '#2563EB';
                  } else if (noteLower.includes('vay từ')) {
                    catName = 'Đi vay nợ';
                    catIcon = 'HandCoins';
                    catColor = '#D97706';
                  } else if (noteLower.includes('thu hồi nợ') || noteLower.includes('người ta trả')) {
                    catName = 'Thu hồi nợ';
                    catIcon = 'ArrowDownLeft';
                    catColor = '#059669';
                  } else if (noteLower.includes('trả nợ')) {
                    catName = 'Trả nợ';
                    catIcon = 'ArrowUpRight';
                    catColor = '#E11D48';
                  } else if (noteLower.includes('lương')) {
                    catName = 'Lương định kỳ';
                    catIcon = 'Coins';
                    catColor = '#10B981';
                  }
                }

                const displayTitle =
                  t.note?.trim() ||
                  catName ||
                  (t.type === 'transfer' ? 'Chuyển khoản' : t.type === 'income' ? 'Khoản thu' : 'Khoản chi');
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs shadow-2xs shrink-0"
                        style={{ backgroundColor: catColor }}
                      >
                        <DynamicIcon name={catIcon} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {displayTitle}
                        </p>
                        <p className="text-2xs text-slate-400 truncate mt-0.5">
                          {formatDateVN(t.date)} • {acc?.name || 'Ví'} {catName ? `• ${catName}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-bold ${
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
                );
              })
            )}
          </div>

          <button
            onClick={() => openAddTxModal()}
            className="w-full py-2.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm giao dịch ngay</span>
          </button>
        </div>

        {/* Widget 2: Sổ nợ & Cho vay */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">Sổ nợ & Cho vay</h3>
              <p className="text-2xs text-slate-400">Theo dõi công nợ & tiến độ hoàn trả</p>
            </div>
            <button
              onClick={() => setCurrentTab('debts')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 whitespace-nowrap"
            >
              <span>Xem sổ nợ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Debt KPI Cards */}
          <div className="grid grid-cols-2 gap-3 my-3">
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-2xs font-semibold text-slate-500 block truncate">Người khác nợ tôi</span>
                <span className="text-sm font-black text-blue-700 block truncate">
                  {formatVND(totalLendRemaining)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-2xs font-semibold text-slate-500 block truncate">Tôi nợ người khác</span>
                <span className="text-sm font-black text-amber-700 block truncate">
                  {formatVND(totalBorrowRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* List or Rich Empty State */}
          <div className="space-y-2.5 my-2 flex-1">
            {activeDebtsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-4">
                <HandCoins className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">Chưa có khoản nợ nào đang ghi nhận</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Ghi chép ai nợ bạn hoặc bạn nợ ai để theo dõi tiến độ trả nợ và nhận cảnh báo khi đến hạn.
                </p>
              </div>
            ) : (
              activeDebtsList.slice(0, 3).map((d) => {
                const rem = Math.max(0, d.totalAmount - d.paidAmount);
                const isOverdue = d.dueDate && d.dueDate < todayStr;
                return (
                  <div
                    key={d.id}
                    onClick={() => setCurrentTab('debts')}
                    className="p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {d.personName}
                        </p>
                        {d.relationship && (
                          <span className="text-2xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                            {d.relationship}
                          </span>
                        )}
                        <span
                          className={`text-2xs font-bold px-2 py-0.5 rounded-md ${
                            d.type === 'lend'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {d.type === 'lend' ? 'Cho vay' : 'Đi vay'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>
                          {d.dueDate
                            ? isOverdue
                              ? 'Quá hạn trả'
                              : `Hạn: ${formatDateVN(d.dueDate)}`
                            : 'Không hạn trả'}
                        </span>
                        {d.phoneNumber && <span>• {d.phoneNumber}</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs sm:text-sm font-black ${
                          d.type === 'lend' ? 'text-blue-600' : 'text-amber-600'
                        }`}
                      >
                        {formatVND(rem)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => setCurrentTab('debts')}
            className="w-full py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors mt-2 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <HandCoins className="w-4 h-4 text-slate-500" />
            <span>Quản lý chi tiết Sổ nợ</span>
          </button>
        </div>

        {/* Widget 3: Cảnh báo & Tình hình ngân sách */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">Cảnh báo ngân sách</h3>
              <p className="text-2xs text-slate-400">Kiểm soát định mức chi tiêu các danh mục</p>
            </div>
            <button
              onClick={() => setCurrentTab('budgets')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 whitespace-nowrap"
            >
              <span>Chi tiết</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 my-3 flex-1">
            {budgetPreviews.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-4">
                <PieChartIcon className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">Chưa thiết lập ngân sách chi tiêu tháng này</p>
                <p className="text-3xs text-slate-400 max-w-xs mx-auto">
                  Đặt giới hạn cho Ăn uống, Mua sắm, Đi lại để MoneyFlow tự động cảnh báo khi bạn chi tiêu chạm ngưỡng 80%.
                </p>
              </div>
            ) : (
              budgetPreviews.map((b) => (
                <div key={b.id} className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                      {b.categoryName}
                    </span>
                    <span className="text-2xs text-slate-500 font-medium">
                      {formatVND(b.spent)} / {formatVND(b.amount)}
                    </span>
                  </div>

                  {/* Progress bar with alert color */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${b.statusColor}`}
                      style={{ width: `${Math.min(b.percent, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-2xs">
                    <span
                      className={`font-semibold ${
                        b.percent >= 100
                          ? 'text-rose-600'
                          : b.percent >= 80
                          ? 'text-amber-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {b.percent >= 100
                        ? 'Đã vượt ngân sách!'
                        : b.percent >= 80
                        ? 'Chạm ngưỡng 80% cảnh báo'
                        : 'Trong giới hạn an toàn'}
                    </span>
                    <span className="font-bold text-slate-700">{b.percent}%</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setCurrentTab('budgets')}
            className="w-full py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer mt-2"
          >
            Quản lý ngân sách danh mục
          </button>
        </div>

        {/* Widget 4: Mục tiêu tiết kiệm */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">Mục tiêu tiết kiệm</h3>
              <p className="text-2xs text-slate-400">Tiến độ tích lũy cho những dự định tương lai</p>
            </div>
            <button
              onClick={() => setCurrentTab('savings')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 whitespace-nowrap"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5 my-3 flex-1">
            {savingsGoals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-4">
                <Target className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">Chưa có mục tiêu tiết kiệm nào</p>
                <p className="text-3xs text-slate-400 max-w-xs mx-auto">
                  Bạn muốn mua điện thoại, mua xe hay quỹ khẩn cấp? Đặt mục tiêu để theo dõi tích lũy mỗi ngày.
                </p>
              </div>
            ) : (
              savingsGoals.slice(0, 3).map((goal) => {
                const pct = Math.min(
                  100,
                  Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100)
                );
                return (
                  <div
                    key={goal.id}
                    className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: goal.color || '#3B82F6' }}
                        >
                          <DynamicIcon name={goal.icon || 'Target'} className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate max-w-44">
                          {goal.name}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-blue-600">{pct}%</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-2xs text-slate-500">
                      <span>Đã có: {formatVND(goal.currentAmount)}</span>
                      <span>Mục tiêu: {formatVND(goal.targetAmount)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => setCurrentTab('savings')}
            className="w-full py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors flex items-center justify-center space-x-1 cursor-pointer mt-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nạp thêm vào quỹ tiết kiệm</span>
          </button>
        </div>
      </div>
    </div>
  );
};

