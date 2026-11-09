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
  Layers,
  HelpCircle,
  Sliders,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  Heart,
  Utensils,
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

  // Tab switch: Categories or Jars System
  const [activeTab, setActiveTab] = useState<'categories' | 'jars'>('categories');
  const [jarSystem, setJarSystem] = useState<'6jars' | '50_30_20'>('6jars');
  const [customIncome, setCustomIncome] = useState<number | null>(null);

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

  // Month total income
  const monthIncome = useMemo(() => {
    return transactions
      .filter((t) => t.date.slice(0, 7) === selectedMonth && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedMonth]);

  const effectiveIncome = customIncome !== null ? customIncome : (monthIncome > 0 ? monthIncome : 15000000);

  const SIX_JARS = useMemo(() => [
    {
      id: 'nec',
      name: 'Chi tiêu Thiết yếu (NEC)',
      short: 'NEC',
      percent: 55,
      emoji: '🏠',
      color: '#3B82F6',
      desc: 'Ăn uống, thuê nhà, xăng xe, điện nước, internet, sinh hoạt phí gia đình',
      keywords: ['ăn', 'uống', 'nhà', 'thuê', 'điện', 'nước', 'xăng', 'xe', 'đi lại', 'thực phẩm', 'tiện ích', 'hóa đơn', 'chợ', 'siêu thị'],
    },
    {
      id: 'ltss',
      name: 'Tiết kiệm dài hạn (LTSS)',
      short: 'LTSS',
      percent: 10,
      emoji: '🛡️',
      color: '#10B981',
      desc: 'Quỹ khẩn cấp, mua sắm lớn (nhà/xe), bảo hiểm, quỹ phòng ngừa biến cố',
      keywords: ['tiết kiệm', 'bảo hiểm', 'khẩn cấp', 'dự phòng', 'tích lũy', 'mua nhà', 'mua xe'],
    },
    {
      id: 'ffa',
      name: 'Tự do tài chính (FFA)',
      short: 'FFA',
      percent: 10,
      emoji: '📈',
      color: '#8B5CF6',
      desc: 'Đầu tư sinh lời: chứng khoán, bất động sản, gửi tiết kiệm sinh lãi (không rút tiêu)',
      keywords: ['đầu tư', 'chứng khoán', 'cổ phiếu', 'vàng', 'crypto', 'kinh doanh', 'sinh lời'],
    },
    {
      id: 'edu',
      name: 'Phát triển bản thân (EDU)',
      short: 'EDU',
      percent: 10,
      emoji: '📚',
      color: '#F59E0B',
      desc: 'Sách vở, khóa học, nâng cao năng lực chuyên môn, ngoại ngữ, kỹ năng sống',
      keywords: ['học', 'sách', 'khóa học', 'giáo dục', 'đào tạo', 'kỹ năng'],
    },
    {
      id: 'play',
      name: 'Hưởng thụ & Giải trí (PLAY)',
      short: 'PLAY',
      percent: 10,
      emoji: '🎉',
      color: '#EC4899',
      desc: 'Du lịch, mua sắm sở thích, ăn nhà hàng sang trọng, xem phim, spa tự thưởng',
      keywords: ['giải trí', 'du lịch', 'mua sắm', 'quần áo', 'phim', 'spa', 'sở thích', 'chơi', 'cafe', 'cà phê'],
    },
    {
      id: 'give',
      name: 'Cho đi & Thiện nguyện (GIVE)',
      short: 'GIVE',
      percent: 5,
      emoji: '❤️',
      color: '#EF4444',
      desc: 'Biếu bố mẹ, giúp đỡ người thân bạn bè, ủng hộ từ thiện, quà sinh nhật',
      keywords: ['cho đi', 'từ thiện', 'biếu', 'quà', 'giúp đỡ', 'ủng hộ', 'mẹ', 'bố', 'hiếu'],
    },
  ], []);

  const RULE_50_30_20 = useMemo(() => [
    {
      id: 'needs',
      name: 'Nhu cầu thiết yếu (50%)',
      short: 'NEEDS',
      percent: 50,
      emoji: '🛒',
      color: '#3B82F6',
      desc: 'Chi phí bắt buộc: Tiền nhà, thực phẩm, đi lại, hóa đơn tiện ích, y tế',
      keywords: ['ăn', 'uống', 'nhà', 'thuê', 'điện', 'nước', 'xăng', 'xe', 'đi lại', 'thuốc', 'y tế', 'hóa đơn', 'chợ'],
    },
    {
      id: 'wants',
      name: 'Mong muốn & Sở thích (30%)',
      short: 'WANTS',
      percent: 30,
      emoji: '🛍️',
      color: '#EC4899',
      desc: 'Chi phí linh hoạt: Du lịch, shopping, sở thích, cafe, ăn ngoài, giải trí',
      keywords: ['mua sắm', 'quần áo', 'giải trí', 'du lịch', 'cafe', 'phim', 'chơi', 'spa', 'quà'],
    },
    {
      id: 'savings',
      name: 'Tiết kiệm & Đầu tư (20%)',
      short: 'SAVINGS',
      percent: 20,
      emoji: '💰',
      color: '#10B981',
      desc: 'Tích lũy tương lai: Trả hết nợ nần, lập quỹ khẩn cấp, gửi tiết kiệm, đầu tư',
      keywords: ['tiết kiệm', 'đầu tư', 'chứng khoán', 'vàng', 'trả nợ', 'bảo hiểm', 'quỹ', 'học', 'sách'],
    },
  ], []);

  // Compute stats for current jar system
  const jarStats = useMemo(() => {
    const systemItems = jarSystem === '6jars' ? SIX_JARS : RULE_50_30_20;

    return systemItems.map((jar) => {
      const targetAmount = Math.round((effectiveIncome * jar.percent) / 100);

      // Match transactions belonging to this jar
      const matchedTx = monthTransactions.filter((tx) => {
        const cat = catMap.get(tx.categoryId || '');
        const catName = (cat?.name || '').toLowerCase();
        const note = (tx.note || '').toLowerCase();
        return jar.keywords.some((kw) => catName.includes(kw) || note.includes(kw));
      });

      const spent = matchedTx.reduce((sum, tx) => sum + tx.amount, 0);
      const remaining = targetAmount - spent;
      const percentUsed = targetAmount > 0 ? Math.round((spent / targetAmount) * 100) : 0;

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (percentUsed >= 100) status = 'danger';
      else if (percentUsed >= 80) status = 'warning';

      return {
        ...jar,
        targetAmount,
        spent,
        remaining,
        percentUsed,
        status,
        txCount: matchedTx.length,
      };
    });
  }, [jarSystem, SIX_JARS, RULE_50_30_20, effectiveIncome, monthTransactions, catMap]);

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

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
          {/* Month Picker */}
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
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Thiết lập ngân sách</span>
            <span className="sm:hidden">Tạo ngân sách</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher: Danh mục vs 6 Chiếc Hũ */}
      <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Ngân sách danh mục</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('jars')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'jars'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>🏺 6 Chiếc Hũ & 50/30/20</span>
        </button>
      </div>

      {activeTab === 'categories' ? (
        <>
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
      </>
      ) : (
        /* JARS / 50-30-20 CONTENT */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Controls Header: Jars System Switch & Income Simulation */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Chọn phương pháp phân bổ</span>
                </h3>
                <p className="text-2xs text-slate-400 mt-0.5">
                  Các mô hình chuẩn quốc tế giúp bạn cân đối dòng tiền và tự động đạt tự do tài chính
                </p>
              </div>

              {/* Switch between 6 Jars and 50/30/20 */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setJarSystem('6jars')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    jarSystem === '6jars'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🏺 6 Chiếc Hũ (T. Harv Eker)
                </button>
                <button
                  type="button"
                  onClick={() => setJarSystem('50_30_20')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    jarSystem === '50_30_20'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  📐 Quy tắc 50 / 30 / 20
                </button>
              </div>
            </div>

            {/* Base Income Selector */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Thu nhập cơ sở:
                </span>
                <span className="text-base font-black text-blue-600 dark:text-blue-400">
                  {formatVND(effectiveIncome)}
                </span>
                {monthIncome > 0 && (
                  <span className="text-2xs text-slate-400">
                    (Thực tế: {formatVND(monthIncome)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-2xs text-slate-400 font-medium">Mô phỏng nhanh:</span>
                {[10000000, 15000000, 20000000, 30000000].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setCustomIncome(inc)}
                    className={`px-2 py-1 text-2xs rounded-lg border font-semibold transition-all cursor-pointer ${
                      customIncome === inc
                        ? 'bg-blue-50 border-blue-400 text-blue-600 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'
                    }`}
                  >
                    {formatCompactVND(inc)}
                  </button>
                ))}
                {customIncome !== null && (
                  <button
                    type="button"
                    onClick={() => setCustomIncome(null)}
                    className="px-2 py-1 text-2xs text-slate-500 hover:text-rose-600 underline font-medium cursor-pointer"
                  >
                    Đặt lại
                  </button>
                )}
              </div>
            </div>

            {/* Stacked Percentage Allocation Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                {jarStats.map((j) => (
                  <div
                    key={j.id}
                    style={{ width: `${j.percent}%`, backgroundColor: j.color }}
                    className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                    title={`${j.name}: ${j.percent}% (${formatVND(j.targetAmount)})`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-3xs sm:text-2xs text-slate-500 font-semibold flex-wrap gap-x-3 gap-y-1">
                {jarStats.map((j) => (
                  <span key={j.id} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: j.color }} />
                    <span>{j.short} {j.percent}%</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Grid of Jars Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jarStats.map((jar) => {
              let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              let barColor = 'bg-emerald-500';
              let statusText = 'An toàn';

              if (jar.status === 'danger') {
                badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                barColor = 'bg-rose-500';
                statusText = 'Bội chi!';
              } else if (jar.status === 'warning') {
                badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                barColor = 'bg-amber-500';
                statusText = 'Chạm 80%';
              }

              return (
                <div
                  key={jar.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md transition-all space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header of Jar Card */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-2xl sm:text-3xl">{jar.emoji}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                              {jar.name}
                            </h4>
                          </div>
                          <span className="text-2xs font-bold text-blue-600 dark:text-blue-400">
                            Định mức: {jar.percent}% thu nhập
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-3xs sm:text-2xs font-bold rounded-md border ${badgeClass}`}>
                        {statusText}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[32px]">
                      {jar.desc}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-2xs">
                        <span className="text-slate-500">Đã chi: <strong>{formatVND(jar.spent)}</strong> ({jar.txCount} giao dịch)</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{jar.percentUsed}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(jar.percentUsed, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Metrics */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-2xs">
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-3xs block">
                        Hạn mức tháng
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {formatVND(jar.targetAmount)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 uppercase font-semibold text-3xs block">
                        {jar.remaining >= 0 ? 'Còn lại' : 'Bội chi'}
                      </span>
                      <span
                        className={`text-xs font-extrabold ${
                          jar.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatVND(Math.abs(jar.remaining))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Educational Tip */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-850 rounded-2xl border border-blue-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                Nguyên tắc quản lý tài chính kinh điển: "Tích lũy trước, chi tiêu sau"
              </h5>
              <p className="text-2xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Khi nhận bất kỳ khoản thu nhập nào, hãy trích ngay <strong>10% vào Hũ Tự Do Tài Chính (FFA)</strong> hoặc <strong>20% Tiết kiệm/Đầu tư</strong> trước khi phân bổ vào sinh hoạt phí. Thói quen quan trọng hơn số tiền bạn có!
              </p>
            </div>
          </div>
        </div>
      )}

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingBudget={editingBudget}
        defaultMonth={selectedMonth}
      />
    </div>
  );
};

