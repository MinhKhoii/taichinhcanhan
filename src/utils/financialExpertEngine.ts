import { Account, Category, Transaction, Budget, SavingsGoal, DebtItem, RecurringItem } from '../types';
import { formatVND, getLocalDateString, getLocalMonthString } from './formatters';

export interface FinancialContextData {
  userName: string;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: SavingsGoal[];
  debts: DebtItem[];
  recurringItems?: RecurringItem[];
}

/**
 * Bóc tách số tiền từ câu nói tự nhiên của người dùng
 * Ví dụ: "lương 10 triệu", "lương 15tr", "lương 9.6tr", "mua iphone 25 triệu", "lương 8 củ"
 */
export function extractAmountFromQuery(text: string): number | null {
  const t = text.toLowerCase();

  // Pattern: "10 triệu", "10.5 triệu", "10tr", "10 củ", "10m", "500k", "500 nghìn"
  const millionMatch = t.match(/([\d]+(?:[.,]\d+)?)\s*(?:triệu|tr|củ|m\b)/i);
  if (millionMatch) {
    const val = parseFloat(millionMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return Math.round(val * 1000000);
  }

  const thousandMatch = t.match(/([\d]+(?:[.,]\d+)?)\s*(?:nghìn|k\b)/i);
  if (thousandMatch) {
    const val = parseFloat(thousandMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return Math.round(val * 1000);
  }

  // Raw number with dots or commas (e.g., 10.000.000 or 10000000)
  const rawNumberMatch = t.match(/(?:lương|giá|tiền|chi|khoản)?\s*[:=]?\s*([1-9]\d{0,2}(?:\.\d{3}){1,3}|[1-9]\d{5,9})\s*(?:đ|vnd|đồng)?\b/i);
  if (rawNumberMatch) {
    const val = parseInt(rawNumberMatch[1].replace(/\./g, ''), 10);
    if (!isNaN(val) && val > 50000) return val;
  }

  return null;
}

/**
 * Xác định mức lương hàng tháng của người dùng từ hệ thống hoặc câu hỏi
 */
export function detectUserSalary(
  query: string,
  context: FinancialContextData
): { salary: number; source: 'query' | 'recurring' | 'transactions' | 'income' | 'default' } {
  // 1. Kiểm tra xem người dùng có gõ số lương cụ thể trong câu hỏi không
  const queryAmount = extractAmountFromQuery(query);
  if (queryAmount && queryAmount >= 1000000) {
    return { salary: queryAmount, source: 'query' };
  }

  // 2. Tìm trong cấu hình lương định kỳ (Recurring Items)
  if (context.recurringItems && context.recurringItems.length > 0) {
    const salaryRecur = context.recurringItems.find(
      (r) => r.isActive && r.type === 'income' && (r.name.toLowerCase().includes('lương') || r.categoryId === 'cat_inc_salary')
    );
    if (salaryRecur && salaryRecur.amount > 0) {
      return { salary: salaryRecur.amount, source: 'recurring' };
    }
  }

  // 3. Tìm giao dịch lương gần nhất trong lịch sử giao dịch
  const salaryTx = context.transactions
    .filter(
      (t) =>
        t.type === 'income' &&
        (t.categoryId === 'cat_inc_salary' || (t.note || '').toLowerCase().includes('lương'))
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  if (salaryTx && salaryTx.amount > 0) {
    return { salary: salaryTx.amount, source: 'transactions' };
  }

  // 4. Lấy tổng thu nhập tháng này
  const nowMonth = getLocalMonthString();
  const curMonthIncome = context.transactions
    .filter((t) => (t.date || '').startsWith(nowMonth) && t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  if (curMonthIncome > 0) {
    return { salary: curMonthIncome, source: 'income' };
  }

  // 5. Mặc định thực tế phổ biến
  return { salary: 10000000, source: 'default' };
}

/**
 * Chuyên gia tài chính nội bộ: Phân tích sâu mức tiết kiệm theo lương
 */
export function analyzeSalarySavings(
  query: string,
  context: FinancialContextData
): string {
  const { salary, source } = detectUserSalary(query, context);
  const { userName, accounts, transactions } = context;
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const nowMonth = getLocalMonthString();
  const curMonthTx = transactions.filter((t) => (t.date || '').startsWith(nowMonth));
  const curExpense = curMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Tính toán theo mô hình 50/30/20
  const needs50 = Math.round(salary * 0.5);
  const wants30 = Math.round(salary * 0.3);
  const savings20 = Math.round(salary * 0.2);
  const savings25 = Math.round(salary * 0.25);
  const savings30 = Math.round(salary * 0.3);
  const savings10 = Math.round(salary * 0.1);

  // Quỹ dự phòng khẩn cấp lý tưởng (3 tháng nhu cầu thiết yếu)
  const emergencyFundTarget = needs50 * 3;
  const isEmergencyFundReady = totalBalance >= emergencyFundTarget;

  let salaryIntro = '';
  if (source === 'query') {
    salaryIntro = `Với mức lương **${formatVND(salary)}/tháng** mà bạn vừa đề cập:`;
  } else if (source === 'recurring' || source === 'transactions' || source === 'income') {
    salaryIntro = `Dựa trên mức thu nhập thực tế trong hệ thống của bạn là **${formatVND(salary)}/tháng**:`;
  } else {
    salaryIntro = `Với mức thu nhập ước tính khoảng **${formatVND(salary)}/tháng**:`;
  }

  return `Chào ${userName}! 🎯 Đây là **Bản phân tích kế hoạch tiết kiệm chi tiết** dành riêng cho bạn:

${salaryIntro}

---

### 1. 📊 Công thức phân bổ ngân sách chuẩn Quốc tế (Quy tắc 50/30/20)

* 🔴 **50% Nhu cầu thiết yếu (Tối đa ${formatVND(needs50)}/tháng)**:
  * Chi trả tiền thuê nhà, ăn uống, điện nước, xăng xe, hóa đơn cố định.
* 🟡 **30% Sở thích cá nhân (Tối đa ${formatVND(wants30)}/tháng)**:
  * Mua sắm, giải trí, cà phê, xem phim, giao lưu bạn bè.
* 🟢 **20% Tích lũy & Tiết kiệm (MỨC TIÊU CHUẨN KHUYÊN DÙNG)**:
  * 👉 Bạn nên tiết kiệm **tối thiểu ${formatVND(savings20)} mỗi tháng**!
  * 📈 **1 năm tích lũy được: ${formatVND(savings20 * 12)}** (chưa tính tiền lời sinh sôi).

---

### 2. 🎯 Các mức tiết kiệm linh hoạt theo từng hoàn cảnh:

| Cấp độ mục tiêu | Tỷ lệ | Số tiền tiết kiệm / tháng | Tích lũy sau 1 năm | Đối tượng phù hợp |
| :--- | :---: | :---: | :---: | :--- |
| **Bứt phá (Aggressive)** | **30%** | **${formatVND(savings30)}** | **${formatVND(savings30 * 12)}** | Ở cùng gia đình, ít gánh nặng tiền trọ |
| **Tiêu chuẩn (Khuyên dùng)** | **20%** | **${formatVND(savings20)}** | **${formatVND(savings20 * 12)}** | Tự lập, chi phí sinh hoạt vừa phải |
| **Khởi động (Khởi điểm)** | **10% - 15%** | **${formatVND(savings10)} - ${formatVND(savings25)}** | **${formatVND(savings10 * 12)} - ${formatVND(savings25 * 12)}** | Đang có nhiều khoản chi gấp hoặc trả nợ |

---

### 3. 🚀 Lộ trình 3 bước để số tiền tiết kiệm sinh lời tối đa:

1. **Bước 1 — Xây dựng Quỹ khẩn cấp (${formatVND(emergencyFundTarget)})**:
   * Chuẩn bị sẵn 3 tháng chi tiêu thiết yếu.
   * ${isEmergencyFundReady
       ? `🎉 **Rất tuyệt vời!** Tổng tài sản hiện có của bạn là **${formatVND(totalBalance)}**, đã vượt mức quỹ khẩn cấp cần thiết!`
       : `Hiện tổng tài sản của bạn là **${formatVND(totalBalance)}**, hãy ưu tiên gom đủ mức **${formatVND(emergencyFundTarget)}** trước tiên.`}
2. **Bước 2 — Áp dụng nguyên tắc "Trả cho mình trước"**:
   * Ngay ngày nhận lương, hãy chuyển ngay **${formatVND(savings20)}** sang ví tích lũy (như Ví MoMo Túi Thần Tài ~4%/năm hoặc sổ tiết kiệm), tuyệt đối không để lẫn vào tài khoản chi tiêu hàng ngày.
3. **Bước 3 — Đặt mục tiêu tiết kiệm cụ thể trong MoneyFlow**:
   * Bạn có thể bấm vào menu **"Mục tiêu tiết kiệm"** trên ứng dụng để chia nhỏ số tiền này vào các hũ mục tiêu (mua sắm đồ lớn, đi du lịch, phòng thân...).

💡 *Tháng này bạn mới chỉ chi tiêu **${formatVND(curExpense)}**, tốc độ giữ tiền của bạn đang rất xuất sắc! Hãy duy trì kỷ luật này nhé!*`;
}

/**
 * Tư vấn có nên mua món đồ X không
 */
export function analyzePurchaseDecision(
  query: string,
  context: FinancialContextData
): string {
  const itemPrice = extractAmountFromQuery(query);
  const { salary } = detectUserSalary(query, context);
  const { userName, accounts } = context;
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  if (!itemPrice) {
    return `Chào ${userName}! Để mình phân tích xem bạn có nên mua món đồ này không, bạn hãy cho mình biết **giá tiền dự kiến** của món đồ nhé (Ví dụ: *"Có nên mua điện thoại 15 triệu không?"* hoặc *"Có nên đổi xe máy 35tr không?"*).`;
  }

  const monthsOfSalary = (itemPrice / salary).toFixed(1);
  const balancePercentage = Math.round((itemPrice / Math.max(1, totalBalance)) * 100);

  let recommendation = '';
  let rating = '';

  if (itemPrice > totalBalance) {
    rating = '🚨 CẢNH BÁO: KHÔNG NÊN MUA NGAY';
    recommendation = `Món đồ này trị giá **${formatVND(itemPrice)}**, vượt quá tổng tài sản hiện có (**${formatVND(totalBalance)}**). Việc mua lúc này sẽ khiến bạn rơi vào tình trạng nợ nần hoặc kiệt quệ tài chính. Hãy lập một Mục tiêu tiết kiệm trong MoneyFlow và tích lũy dần.`;
  } else if (balancePercentage > 50) {
    rating = '⚠️ NÊN CÂN NHẮC KỸ';
    recommendation = `Món đồ này chiếm đến **${balancePercentage}%** tổng tài sản của bạn (tương đương **${monthsOfSalary} tháng lương**). Nếu mua, quỹ dự phòng của bạn sẽ bị sụt giảm nghiêm trọng. Trừ khi đây là công cụ bắt buộc để kiếm tiền (như laptop làm việc), bạn nên lùi ngày mua lại 1–2 tháng.`;
  } else if (balancePercentage > 20) {
    rating = '🟡 CÓ THỂ MUA NẾU THỰC SỰ CẦN';
    recommendation = `Khoản chi này bằng khoảng **${monthsOfSalary} tháng lương** của bạn (${balancePercentage}% tổng tài sản). Sau khi mua, bạn vẫn còn **${formatVND(totalBalance - itemPrice)}** để dự phòng an toàn. Hãy áp dụng **Quy tắc 72 giờ**: đợi 3 ngày, nếu vẫn thấy cần thiết thì hãy mua.`;
  } else {
    rating = '🟢 AN TOÀN ĐỂ MUA SẮM';
    recommendation = `Món đồ này chỉ chiếm **${balancePercentage}%** tổng tài sản của bạn. Tình hình tài chính hoàn toàn đủ khả năng chi trả mà không làm xáo trộn cuộc sống hàng ngày.`;
  }

  return `### 🛒 Đánh giá tài chính cho khoản mua sắm: **${formatVND(itemPrice)}**

* 👤 **Thu nhập ước tính**: **${formatVND(salary)}/tháng**
* 💰 **Tổng tài sản hiện có**: **${formatVND(totalBalance)}**
* 📊 **Tỷ trọng**: Bằng **${monthsOfSalary} tháng lương** và chiếm **${balancePercentage}%** tài sản tích lũy.

---

### **Kết luận: ${rating}**
${recommendation}

💡 **Mẹo thông minh:** Trước khi chốt đơn, hãy tự hỏi: *"Nếu không mua món này, mình có cảm thấy thiếu thốn trong 1 tháng tới không?"*`;
}

/**
 * Đánh giá tổng quan dòng tiền và chi tiêu tháng này
 */
export function analyzeMonthlyCashflow(context: FinancialContextData): string {
  const { userName, accounts, transactions, debts, goals, categories = [] } = context;
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const nowMonth = getLocalMonthString();
  const curMonthTx = transactions.filter((t) => (t.date || '').startsWith(nowMonth));
  const curIncome = curMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const curExpense = curMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = curIncome - curExpense;
  const savingsRate = curIncome > 0 ? Math.round((net / curIncome) * 100) : 0;

  // Top spending categories
  const catMap = new Map<string, string>();
  categories.forEach((c) => catMap.set(c.id, c.name));

  const catSpending = new Map<string, number>();
  curMonthTx.filter((t) => t.type === 'expense').forEach((t) => {
    const cName = (t.categoryId ? catMap.get(t.categoryId) : undefined) || t.note || 'Chi tiêu khác';
    catSpending.set(cName, (catSpending.get(cName) || 0) + t.amount);
  });
  const topList = Array.from(catSpending.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const activeDebtsCount = debts.filter((d) => d.totalAmount > d.paidAmount).length;

  return `📊 **BÁO CÁO TÀI CHÍNH THÁNG ${nowMonth.split('-')[1]}/${nowMonth.split('-')[0]} CHO ${userName.toUpperCase()}**

* 💵 **Tổng tài sản khả dụng**: **${formatVND(totalBalance)}** (phân bổ trên ${accounts.length} ví)
* 📈 **Tổng thu nhập tháng này**: **+${formatVND(curIncome)}**
* 📉 **Tổng chi tiêu tháng này**: **-${formatVND(curExpense)}**
* 🎯 **Thặng dư tích lũy**: **${formatVND(net, true)}**
* 🏆 **Tỷ lệ tiết kiệm thực tế**: **${savingsRate}%** thu nhập ${savingsRate >= 20 ? '🌟 (Đạt chuẩn xuất sắc!)' : '⚠️ (Nên tăng cường tích lũy)'}

${topList.length > 0 ? `\n**Top các khoản chi lớn nhất:**\n${topList.map(([name, val]) => `- **${name}**: ${formatVND(val)} (${Math.round((val / Math.max(1, curExpense)) * 100)}%)`).join('\n')}` : '\n*Tháng này bạn chưa phát sinh nhiều khoản chi tiêu lớn.*'}

${goals.length > 0 ? `\n🎯 **Tiến độ mục tiêu tiết kiệm:**\n${goals.map((g) => `- "${g.name}": Đạt **${formatVND(g.currentAmount)}** / ${formatVND(g.targetAmount)} (${Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100)}%)`).join('\n')}` : ''}

${activeDebtsCount > 0 ? `\n🤝 **Công nợ đang theo dõi**: Bạn đang có **${activeDebtsCount}** khoản nợ/cho vay cần quản lý.` : ''}

💡 *Lời khuyên*: Với mức thặng dư hiện tại, bạn có thể trích một phần vào các Mục tiêu tiết kiệm hoặc để trong Ví MoMo sinh lời để hưởng lãi kép hàng ngày!`;
}

/**
 * Tổng hợp câu trả lời chuyên gia nội bộ hoàn hảo cho bất kỳ câu hỏi nào
 */
export function generateExpertFinancialAnswer(
  query: string,
  context: FinancialContextData
): string {
  const q = query.toLowerCase();

  // 1. Câu hỏi về Tiết kiệm theo lương / Phân tích thu nhập
  const isSavingsQuestion =
    (q.includes('tiết kiệm') || q.includes('tích lũy') || q.includes('để dành') || q.includes('giữ tiền')) &&
    (q.includes('lương') || q.includes('tháng') || q.includes('bao nhiêu') || q.includes('cần đó') || q.includes('chừng đó') || q.includes('ngần đó') || q.includes('như thế') || q.includes('như vậy') || q.includes('%') || q.includes('tỷ lệ'));

  const isSalaryAllocationQuestion =
    q.includes('phân tích') && (q.includes('lương') || q.includes('thu nhập') || q.includes('tiền'));

  const isSavingsRuleQuestion =
    q.includes('50/30/20') || q.includes('50 30 20') || q.includes('quy tắc') || q.includes('6 chiếc lọ') || (q.includes('tiết kiệm') && q.includes('bao nhiêu'));

  if (isSavingsQuestion || isSalaryAllocationQuestion || isSavingsRuleQuestion) {
    return analyzeSalarySavings(query, context);
  }

  // 2. Câu hỏi tư vấn mua sắm (Có nên mua X không?)
  if (q.includes('có nên mua') || q.includes('có nên đổi') || q.includes('có nên chi') || q.includes('mua cái') || q.includes('mua con')) {
    return analyzePurchaseDecision(query, context);
  }

  // 3. Câu hỏi về tình hình tài chính, thu chi, tháng này
  if (q.includes('tổng quan') || q.includes('báo cáo') || q.includes('tình hình') || q.includes('thu chi') || q.includes('tháng này ra sao') || q.includes('tiêu nhiều không')) {
    return analyzeMonthlyCashflow(context);
  }

  // 4. Câu hỏi về sổ nợ, công nợ
  if (q.includes('nợ') || q.includes('vay') || q.includes('mượn') || q.includes('đòi')) {
    const totalLend = context.debts
      .filter((d) => d.type === 'lend')
      .reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);
    const totalBorrow = context.debts
      .filter((d) => d.type === 'borrow')
      .reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);

    const lendList = context.debts.filter((d) => d.type === 'lend' && d.totalAmount > d.paidAmount);
    const borrowList = context.debts.filter((d) => d.type === 'borrow' && d.totalAmount > d.paidAmount);

    return `🤝 **QUẢN LÝ CÔNG NỢ & CHO VAY HIỆN TẠI:**

* 🟢 **Người khác đang nợ bạn**: **${formatVND(totalLend)}**
${lendList.map((d) => `  - ${d.personName}: **${formatVND(d.totalAmount - d.paidAmount)}** ${d.dueDate ? `(Hạn trả: ${d.dueDate})` : ''}`).join('\n') || '  *(Hiện không có ai nợ bạn)*'}

* 🔴 **Bạn đang nợ người khác**: **${formatVND(totalBorrow)}**
${borrowList.map((d) => `  - ${d.personName}: **${formatVND(d.totalAmount - d.paidAmount)}** ${d.dueDate ? `(Hạn trả: ${d.dueDate})` : ''}`).join('\n') || '  *(Tuyệt vời! Bạn không nợ ai cả)*'}

💡 *Chiến lược quản lý nợ*: Nếu có nợ, hãy áp dụng phương pháp **Quả cầu tuyết (Snowball)** — ưu tiên trả dứt điểm các khoản nợ nhỏ nhất trước để giải phóng tâm lý, sau đó dồn lực trả các khoản lớn hơn!`;
  }

  // 5. Câu hỏi về tài sản, số dư ví
  if (q.includes('tài sản') || q.includes('số dư') || q.includes('ví') || q.includes('còn bao nhiêu tiền')) {
    const totalBalance = context.accounts.reduce((s, a) => s + a.balance, 0);
    return `💼 **CHI TIẾT TÀI SẢN VÀ CÁC NGUỒN TIỀN CỦA BẠN:**

* 💰 **Tổng tài sản ròng khả dụng**: **${formatVND(totalBalance)}**
* 🏦 **Phân bổ theo từng tài khoản & ví**:
${context.accounts.map((a) => `  - **${a.name}** (${a.type}): **${formatVND(a.balance)}**`).join('\n')}

💡 *Gợi ý*: Tiền để trong tài khoản thông thường không sinh lãi. Hãy cân nhắc giữ một khoản vừa đủ chi tiêu hàng ngày trên thẻ, còn lại chuyển vào Ví MoMo Túi Thần Tài (~4%/năm) để tiền tự động sinh lời mỗi ngày!`;
  }

  // 6. Mặc định: Phân tích đầy đủ và trả lời theo ngữ cảnh tài chính
  return analyzeSalarySavings(query, context);
}
