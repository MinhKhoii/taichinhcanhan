import { Transaction, Budget, SavingsGoal, Category } from '../types';
import { formatVND } from './formatters';
import { parseISO, isSameMonth, subMonths } from 'date-fns';

export interface FinancialInsight {
  id: string;
  type: 'positive' | 'warning' | 'alert' | 'tip' | 'info';
  title: string;
  message: string;
  actionText?: string;
  actionTab?: string;
}

export function generateFinancialInsights(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  goals: SavingsGoal[],
  referenceDate: Date = new Date()
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // 1. Current month transactions & previous month transactions
  const prevMonthDate = subMonths(referenceDate, 1);

  const currentMonthTx = transactions.filter((t) => {
    try {
      const d = parseISO(t.date);
      return isSameMonth(d, referenceDate);
    } catch {
      return false;
    }
  });

  const prevMonthTx = transactions.filter((t) => {
    try {
      const d = parseISO(t.date);
      return isSameMonth(d, prevMonthDate);
    } catch {
      return false;
    }
  });

  // Totals current month
  const curIncome = currentMonthTx
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const curExpense = currentMonthTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Totals prev month
  const prevExpense = prevMonthTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // A. MoM Expense Comparison
  if (prevExpense > 0 && curExpense > 0) {
    const diff = curExpense - prevExpense;
    const pct = Math.abs((diff / prevExpense) * 100).toFixed(1);

    if (diff > 0) {
      insights.push({
        id: 'mom-expense-up',
        type: Number(pct) > 20 ? 'alert' : 'warning',
        title: 'Chi tiêu biến động',
        message: `Tháng này bạn đang chi tiêu nhiều hơn tháng trước ${pct}% (${formatVND(diff)}). Hãy kiểm tra lại các khoản chi không cấp thiết.`,
        actionText: 'Xem giao dịch',
        actionTab: 'transactions',
      });
    } else if (diff < 0) {
      insights.push({
        id: 'mom-expense-down',
        type: 'positive',
        title: 'Tối ưu chi tiêu xuất sắc',
        message: `Tháng này bạn đã cắt giảm chi tiêu ${pct}% so với tháng trước (tiết kiệm được ${formatVND(Math.abs(diff))}). Tiếp tục duy trì phong độ này!`,
      });
    }
  }

  // B. Net Savings this month
  const curSavings = curIncome - curExpense;
  if (curIncome > 0) {
    const savingsRate = Math.round((curSavings / curIncome) * 100);
    if (curSavings > 0) {
      insights.push({
        id: 'savings-status',
        type: 'positive',
        title: 'Tích lũy tài chính',
        message: `Bạn đã tiết kiệm được ${formatVND(curSavings)} trong tháng này, đạt tỷ lệ tiết kiệm ${savingsRate}% thu nhập (khuyến nghị chuẩn là 20%).`,
        actionText: 'Đặt mục tiêu',
        actionTab: 'savings',
      });
    } else if (curSavings < 0) {
      insights.push({
        id: 'negative-savings',
        type: 'alert',
        title: 'Dòng tiền thâm hụt',
        message: `Tháng này chi tiêu đang vượt thu nhập ${formatVND(Math.abs(curSavings))}. Hãy xem xét cắt giảm ngay các chi phí linh hoạt.`,
        actionText: 'Quản lý ngân sách',
        actionTab: 'budgets',
      });
    }
  }

  // C. Dominant Spending Category
  if (curExpense > 0) {
    const catExpenses: Record<string, number> = {};
    for (const t of currentMonthTx) {
      if (t.type === 'expense' && t.categoryId) {
        catExpenses[t.categoryId] = (catExpenses[t.categoryId] || 0) + t.amount;
      }
    }

    let topCatId = '';
    let topCatAmount = 0;
    for (const [cId, amt] of Object.entries(catExpenses)) {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatId = cId;
      }
    }

    if (topCatId && topCatAmount > 0) {
      const topCat = catMap.get(topCatId);
      const topCatName = topCat?.name || 'Chi tiêu chính';
      const pct = Math.round((topCatAmount / curExpense) * 100);

      if (pct >= 25) {
        insights.push({
          id: 'dominant-cat',
          type: 'info',
          title: 'Cơ cấu chi tiêu',
          message: `Danh mục "${topCatName}" đang chiếm ${pct}% tổng chi tiêu (${formatVND(topCatAmount)}).`,
          actionText: 'Xem báo cáo',
          actionTab: 'reports',
        });
      }
    }
  }

  // D. Budgets approaching or exceeding limit
  for (const b of budgets) {
    const cat = catMap.get(b.categoryId);
    const catName = cat?.name || 'Danh mục';

    const spent = currentMonthTx
      .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
      .reduce((sum, t) => sum + t.amount, 0);

    const ratio = b.amount > 0 ? spent / b.amount : 0;

    if (ratio >= 1.0) {
      insights.push({
        id: `budget-over-${b.id}`,
        type: 'alert',
        title: 'Vượt ngân sách!',
        message: `Ngân sách "${catName}" đã bội chi ${(ratio * 100).toFixed(0)}% (đã chi ${formatVND(spent)} / hạn mức ${formatVND(b.amount)}).`,
        actionText: 'Điều chỉnh ngân sách',
        actionTab: 'budgets',
      });
    } else if (ratio >= 0.8) {
      insights.push({
        id: `budget-warn-${b.id}`,
        type: 'warning',
        title: 'Cảnh báo ngân sách',
        message: `Ngân sách "${catName}" đã sử dụng ${(ratio * 100).toFixed(0)}% (${formatVND(spent)} / ${formatVND(b.amount)}). Hãy chi tiêu thận trọng.`,
        actionText: 'Kiểm tra ngân sách',
        actionTab: 'budgets',
      });
    }
  }

  // E. Savings Goals Projection
  const activeGoals = goals.filter((g) => !g.isCompleted && g.targetAmount > g.currentAmount);
  if (activeGoals.length > 0 && curSavings > 0) {
    const nearestGoal = activeGoals.sort((a, b) => {
      return parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime();
    })[0];

    const remainingNeeded = nearestGoal.targetAmount - nearestGoal.currentAmount;
    const estimatedMonthsNeeded = remainingNeeded / curSavings;

    if (estimatedMonthsNeeded <= 3) {
      insights.push({
        id: 'goal-speed-up',
        type: 'positive',
        title: 'Mục tiêu tài chính trong tầm tay',
        message: `Nếu duy trì mức tích lũy ${formatVND(curSavings)}/tháng hiện tại, bạn có thể hoàn thành mục tiêu "${nearestGoal.name}" chỉ trong khoảng ${estimatedMonthsNeeded.toFixed(1)} tháng nữa!`,
        actionText: 'Xem mục tiêu',
        actionTab: 'savings',
      });
    }
  }

  // Fallback if no specific insight
  if (insights.length === 0) {
    insights.push({
      id: 'default-welcome',
      type: 'info',
      title: 'Trợ lý MoneyFlow sẵn sàng',
      message: 'Hệ thống đang liên tục phân tích dữ liệu giao dịch thực tế của bạn để đưa ra các đề xuất dòng tiền tối ưu.',
    });
  }

  return insights;
}

export interface FinancialHealthScore {
  score: number; // 0 - 100
  rating: 'excellent' | 'good' | 'average' | 'poor';
  title: string;
  description: string;
  savingsScore: number;
  debtScore: number;
  budgetScore: number;
}

export interface Rule503020Result {
  needsAmount: number;
  needsPct: number;
  wantsAmount: number;
  wantsPct: number;
  savingsAmount: number;
  savingsPct: number;
  totalIncome: number;
  totalExpense: number;
  advice: string;
}

export function calculateFinancialHealthScore(
  income: number,
  expense: number,
  overdueDebtsCount: number,
  budgetsExceededCount: number
): FinancialHealthScore {
  let savingsScore = 0;
  if (income > 0) {
    const savings = income - expense;
    const rate = savings / income;
    if (rate >= 0.25) savingsScore = 40;
    else if (rate >= 0.15) savingsScore = 30;
    else if (rate >= 0.05) savingsScore = 20;
    else if (rate > 0) savingsScore = 10;
    else savingsScore = 0;
  } else {
    savingsScore = expense > 0 ? 0 : 20;
  }

  let debtScore = 30;
  if (overdueDebtsCount > 0) {
    debtScore = Math.max(0, 30 - overdueDebtsCount * 15);
  }

  let budgetScore = 30;
  if (budgetsExceededCount > 0) {
    budgetScore = Math.max(0, 30 - budgetsExceededCount * 10);
  }

  const score = Math.min(100, Math.max(0, savingsScore + debtScore + budgetScore));

  let rating: 'excellent' | 'good' | 'average' | 'poor' = 'good';
  let title = 'Tài chính Vững Vàng';
  let description = 'Dòng tiền của bạn đang được kiểm soát rất tốt, duy trì thói quen tích lũy đều đặn.';

  if (score >= 80) {
    rating = 'excellent';
    title = 'Sức khỏe Tài chính Xuất sắc';
    description = 'Thu nhập vượt trội so với chi tiêu, không nợ quá hạn và ngân sách được tuân thủ nghiêm ngặt!';
  } else if (score >= 60) {
    rating = 'good';
    title = 'Tài chính Ổn định & Kiểm soát';
    description = 'Bạn đang duy trì tỷ lệ tích lũy tốt. Hãy tiếp tục tối ưu hóa các khoản chi không cần thiết.';
  } else if (score >= 40) {
    rating = 'average';
    title = 'Cần Lưu Ý Cân Đối Chi Tiêu';
    description = 'Tỷ lệ chi tiêu đang ở mức khá cao so với thu nhập hoặc có ngân sách chạm ngưỡng cảnh báo.';
  } else {
    rating = 'poor';
    title = 'Báo động Dòng tiền Thâm hụt';
    description = 'Chi tiêu đang vượt quá thu nhập hoặc có khoản nợ quá hạn. Cần rà soát và thắt chặt chi tiêu ngay.';
  }

  return {
    score,
    rating,
    title,
    description,
    savingsScore,
    debtScore,
    budgetScore,
  };
}

export function calculate503020Rule(
  transactions: Transaction[],
  categories: Category[],
  income: number
): Rule503020Result {
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const needsKeywords = ['ăn', 'uống', 'cà phê', 'xăng', 'đi lại', 'nhà', 'thuê', 'hóa đơn', 'điện', 'nước', 'y tế', 'thuốc', 'chợ', 'thiết yếu'];
  const wantsKeywords = ['mua sắm', 'quần áo', 'giải trí', 'du lịch', 'xem phim', 'sở thích', 'quà tặng', 'làm đẹp'];

  let needsAmount = 0;
  let wantsAmount = 0;

  for (const t of transactions) {
    if (t.type === 'expense') {
      const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
      const catName = (cat?.name || t.note || '').toLowerCase();

      const isNeed = needsKeywords.some((k) => catName.includes(k));
      const isWant = wantsKeywords.some((k) => catName.includes(k));

      if (isNeed) {
        needsAmount += t.amount;
      } else if (isWant) {
        wantsAmount += t.amount;
      } else {
        needsAmount += t.amount * 0.6;
        wantsAmount += t.amount * 0.4;
      }
    }
  }

  const totalExpense = needsAmount + wantsAmount;
  const baseTotal = income > 0 ? income : totalExpense;

  const savingsAmount = Math.max(0, income - totalExpense);
  const needsPct = baseTotal > 0 ? Math.round((needsAmount / baseTotal) * 100) : 0;
  const wantsPct = baseTotal > 0 ? Math.round((wantsAmount / baseTotal) * 100) : 0;
  const savingsPct = baseTotal > 0 ? Math.round((savingsAmount / baseTotal) * 100) : 0;

  let advice = '';
  if (needsPct > 60) {
    advice = 'Chi phí thiết yếu đang chiếm trên 60% dòng tiền. Hãy tìm cách tối ưu các khoản điện nước, xăng xe hoặc tiền nhà.';
  } else if (wantsPct > 35) {
    advice = 'Khoản chi tiêu sở thích & mua sắm đang chiếm tỷ lệ hơi cao (>35%). Hãy áp dụng quy tắc cân nhắc 48h trước khi mua sắm.';
  } else if (savingsPct >= 20) {
    advice = 'Tuyệt vời! Bạn đang duy trì tỷ lệ tích lũy chuẩn 50/30/20 quốc tế (>=20% thu nhập).';
  } else {
    advice = 'Tỷ lệ phân bổ tài chính của bạn đang rất cân bằng và hợp lý theo mô hình 50/30/20.';
  }

  return {
    needsAmount,
    needsPct,
    wantsAmount,
    wantsPct,
    savingsAmount,
    savingsPct,
    totalIncome: income,
    totalExpense,
    advice,
  };
}

