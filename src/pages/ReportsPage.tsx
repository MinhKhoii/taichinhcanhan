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

export const ReportsPage: React.FC = () => {
  const {
    transactions,
    accounts,
    categories,
    budgets,
    savingsGoals,
    debts,
  } = useFinancial();

  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'categories' | 'top_expenses'>('overview');

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Total sums
  const totalIncomeAll = useMemo(
    () => transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const totalExpenseAll = useMemo(
    () => transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const totalSavingsAll = totalIncomeAll - totalExpenseAll;
  const overallSavingsRate = totalIncomeAll > 0 ? Math.round((totalSavingsAll / totalIncomeAll) * 100) : 0;

  // Monthly Comparison Data (Last 6 months)
  const monthlyComparisonData = useMemo(() => {
    const monthsMap: Record<string, { month: string; display: string; income: number; expense: number; savings: number }> = {};
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
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
        }
      }
    });

    Object.values(monthsMap).forEach((m) => {
      m.savings = m.income - m.expense;
    });

    return Object.values(monthsMap);
  }, [transactions]);

  // Category Expenses Breakdown
  const categoryExpenses = useMemo(() => {
    const expenseMap: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const catKey = t.categoryId || 'uncategorized';
        expenseMap[catKey] = (expenseMap[catKey] || 0) + t.amount;
      });

    const list = Object.entries(expenseMap).map(([cId, amount]) => {
      const cat = catMap.get(cId);
      return {
        id: cId,
        name: cat?.name || (cId === 'uncategorized' ? 'Sổ nợ / Chi khác' : 'Chưa phân loại'),
        color: cat?.color || '#94A3B8',
        icon: cat?.icon || 'Tag',
        amount,
        percent: totalExpenseAll > 0 ? ((amount / totalExpenseAll) * 100).toFixed(1) : '0',
      };
    });

    return list.sort((a, b) => b.amount - a.amount);
  }, [transactions, catMap, totalExpenseAll]);

  // Top 10 Largest Expenses
  const top10Expenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [transactions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Báo cáo & Phân tích tài chính
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Phân tích số liệu dòng tiền, xu hướng thu chi và đánh giá sức khỏe tài chính
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
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
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-500/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất toàn bộ báo cáo Excel</span>
          </button>
          <button
            onClick={() => exportTransactionsToCSV(transactions, categories, accounts)}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng thu nhập ghi nhận
          </span>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
              +{formatVND(totalIncomeAll)}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">Toàn bộ lịch sử</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng chi tiêu ghi nhận
          </span>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-600 tracking-tight">
              -{formatVND(totalExpenseAll)}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">Toàn bộ lịch sử</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Tích lũy ròng rực rỡ
          </span>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatVND(totalSavingsAll, true)}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">Chênh lệch thu - chi</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Tỷ lệ tiết kiệm bình quân
          </span>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <h3 className="text-2xl font-black text-blue-600 tracking-tight">
                {overallSavingsRate}%
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                {overallSavingsRate >= 20 ? 'Rất tốt' : 'Cần cải thiện'}
              </span>
            </div>
            <p className="text-2xs text-slate-400 mt-1">
              Khuyến nghị chuẩn tài chính: 20%
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveReportTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeReportTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>So sánh các tháng & Xu hướng</span>
        </button>

        <button
          onClick={() => setActiveReportTab('categories')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeReportTab === 'categories'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PieIcon className="w-4 h-4" />
          <span>Chi tiêu theo danh mục</span>
        </button>

        <button
          onClick={() => setActiveReportTab('top_expenses')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeReportTab === 'top_expenses'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Top 10 khoản chi lớn nhất</span>
        </button>
      </div>

      {/* Tab 1: So sánh các tháng & Xu hướng */}
      {activeReportTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Biểu đồ so sánh Thu nhập - Chi tiêu 6 tháng gần nhất
                </h3>
                <p className="text-xs text-slate-400">
                  Quan sát xu hướng tương quan thu chi để kiểm soát mức độ tích lũy
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
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Xu hướng tiết kiệm ròng theo các tháng
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Dòng tiền thặng dư thực tế sau khi trừ toàn bộ sinh hoạt phí
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
                    formatter={(val: any) => [formatVND(Number(val)), 'Tiết kiệm']}
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

      {/* Tab 2: Chi tiêu theo danh mục */}
      {activeReportTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Biểu đồ cơ cấu</h3>
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
                    formatter={(val: any) => [formatVND(Number(val)), 'Số tiền']}
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
                <span className="text-2xs text-slate-400 block">Tổng chi</span>
                <span className="text-xs font-bold text-slate-800">
                  {formatCompactVND(totalExpenseAll)}
                </span>
              </div>
            </div>

            <div className="text-2xs text-slate-400 text-center">
              Dữ liệu tính trên toàn bộ các giao dịch chi tiêu đã ghi nhận
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Bảng chi tiết chi tiêu theo danh mục
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Xếp hạng từ danh mục tốn nhiều ngân sách nhất đến thấp nhất
            </p>

            <div className="space-y-3">
              {categoryExpenses.map((c, idx) => (
                <div key={c.id} className="space-y-1.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
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
                      <span className="font-bold text-slate-800">{c.name}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-slate-900">
                        {formatVND(c.amount)}
                      </span>
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {c.percent}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
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

      {/* Tab 3: Top 10 Khoản chi lớn nhất */}
      {activeReportTab === 'top_expenses' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Top 10 khoản chi lớn nhất lịch sử
              </h3>
              <p className="text-xs text-slate-400">
                Các khoản chi tiêu trọng yếu có ảnh hưởng lớn nhất tới dòng tiền
              </p>
            </div>
            <Award className="w-6 h-6 text-amber-500" />
          </div>

          <div className="divide-y divide-slate-100">
            {top10Expenses.map((t, idx) => {
              const cat = catMap.get(t.categoryId || '');
              const acc = accMap.get(t.accountId);
              return (
                <div
                  key={t.id}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">
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
    </div>
  );
};

