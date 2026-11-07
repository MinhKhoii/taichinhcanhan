import { Account, Category, Transaction, Budget, SavingsGoal, DebtItem, PaymentMethod } from '../types';
import { formatVND } from '../utils/formatters';
import { dataService } from './dataService';

const STORAGE_KEY = 'moneyflow_gemini_api_key';

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.8-flash',
];

async function callGeminiAPI(key: string, payload: any): Promise<any> {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${res.status}`;
      lastError = new Error(msg);

      // If model not found or deprecated, try next model in candidate list
      if (res.status === 404 || msg.includes('no longer available') || msg.includes('not found')) {
        continue;
      }
      throw lastError;
    } catch (e: any) {
      lastError = e;
      if (e.message && (e.message.includes('no longer available') || e.message.includes('not found') || e.message.includes('404'))) {
        continue;
      }
      throw e;
    }
  }
  throw lastError || new Error('Không thể kết nối đến máy chủ Google Gemini');
}

export interface ParsedTransactionAI {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  categoryId?: string;
  categoryName?: string;
  accountId: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  note: string;
  paymentMethod: PaymentMethod;
  date: string;
  confidence: number;
  explanation?: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedAction?: {
    type: 'add_transaction';
    data: ParsedTransactionAI;
  };
}

class AIService {
  // 1. API Key Helpers
  getApiKey(): string {
    try {
      const local = localStorage.getItem(STORAGE_KEY)?.trim();
      if (local) return local;
      const userKey = dataService.getUser()?.geminiApiKey?.trim();
      if (userKey) {
        localStorage.setItem(STORAGE_KEY, userKey);
        return userKey;
      }
      return '';
    } catch {
      return '';
    }
  }

  setApiKey(key: string): void {
    const trimmed = (key || '').trim();
    try {
      if (trimmed) {
        localStorage.setItem(STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save Gemini API key:', e);
    }

    try {
      dataService.updateUser({ geminiApiKey: trimmed });
      // Tự động đẩy lên Cloud Supabase để các thiết bị khác (điện thoại, máy tính) đồng bộ luôn!
      dataService.syncToSupabase().catch(() => {});
    } catch {}
  }

  hasApiKey(): boolean {
    return Boolean(this.getApiKey());
  }

  // 2. Test Connection
  async testConnection(apiKey?: string): Promise<{ success: boolean; message: string }> {
    const key = apiKey || this.getApiKey();
    if (!key) {
      return { success: false, message: 'Chưa nhập API Key Google Gemini' };
    }

    try {
      await callGeminiAPI(key, {
        contents: [{ parts: [{ text: 'Trả lời đúng 1 từ "OK" bằng tiếng Việt.' }] }],
        generationConfig: { maxOutputTokens: 15, temperature: 0 },
      });

      return { success: true, message: 'Kết nối Google Gemini AI thành công rực rỡ! 🎉' };
    } catch (err: any) {
      return { success: false, message: `Lỗi kết nối Gemini: ${err?.message || 'Không rõ'}` };
    }
  }

  // 3. Smart Local Heuristic Parser (Offline fallback if no API key yet)
  parseWithLocalHeuristics(
    text: string,
    categories: Category[],
    accounts: Account[]
  ): ParsedTransactionAI {
    const raw = text.trim();
    const lower = raw.toLowerCase();
    const todayStr = new Date().toISOString().split('T')[0];

    // Detect type
    let type: 'expense' | 'income' | 'transfer' = 'expense';
    if (
      lower.includes('nhận') ||
      lower.includes('lương') ||
      lower.includes('thưởng') ||
      lower.includes('thu nhập') ||
      lower.includes('tiền vào') ||
      lower.includes('hoàn tiền')
    ) {
      type = 'income';
    } else if (
      lower.includes('chuyển khoản sang') ||
      lower.includes('chuyển sang') ||
      lower.includes('chuyển tiền cho') ||
      lower.includes('nạp vào') ||
      lower.includes('rút về')
    ) {
      type = 'transfer';
    }

    // Extract amount: e.g. "45k", "2tr", "1.5tr", "500000", "500.000", "50k", "2 củ", "5 lít"
    let amount = 0;
    const amountRegex = /(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngan|tr|trieu|triệu|m|củ|cu|lít|lit|đ|vnd)?\b/i;
    const match = lower.match(amountRegex);
    if (match) {
      let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
      const unit = (match[2] || '').toLowerCase();
      if (unit === 'k' || unit === 'nghìn' || unit === 'ngan') {
        num *= 1000;
      } else if (unit === 'tr' || unit === 'trieu' || unit === 'triệu' || unit === 'm' || unit === 'củ' || unit === 'cu') {
        num *= 1000000;
      } else if (unit === 'lít' || unit === 'lit') {
        num *= 100000;
      }
      amount = Math.round(num);
    }

    // Detect Account
    let selectedAccount = accounts.find((a) => lower.includes(a.name.toLowerCase()));
    if (!selectedAccount) {
      if (lower.includes('momo')) {
        selectedAccount = accounts.find((a) => a.name.toLowerCase().includes('momo') || a.type === 'ewallet');
      } else if (lower.includes('ngân hàng') || lower.includes('vietin') || lower.includes('tech') || lower.includes('vcb') || lower.includes('mb')) {
        selectedAccount = accounts.find((a) => a.type === 'bank');
      } else if (lower.includes('tiền mặt') || lower.includes('ví tiền')) {
        selectedAccount = accounts.find((a) => a.type === 'cash');
      }
    }
    if (!selectedAccount) {
      selectedAccount = accounts.find((a) => a.balance > 0) || accounts[0];
    }

    // Detect Category
    const targetCats = categories.filter((c) => c.type === type);
    let selectedCat: Category | undefined;

    // Keyword mapping
    if (type === 'expense') {
      if (/(ăn|uống|phở|cơm|bún|trưa|tối|sáng|cà phê|cafe|trà|bánh|nhậu|lẩu|gà)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /ăn|uống|thực phẩm/i.test(c.name));
      } else if (/(xăng|xe|grab|be|taxi|gửi xe|rửa xe|vé xe|tàu)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /đi lại|xăng|xe/i.test(c.name));
      } else if (/(nhà|tiền nhà|phòng|thuê nhà|điện|nước|mạng|internet|rác)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /nhà|tiện ích|hóa đơn/i.test(c.name));
      } else if (/(mua|áo|quần|giày|shopee|lazada|tiki|máy|điện thoại)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /mua sắm|tiêu dùng/i.test(c.name));
      } else if (/(thuốc|bệnh|khám|bác sĩ|viện|răng|gym)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /sức khỏe|y tế/i.test(c.name));
      } else if (/(học|sách|khóa học|tiếng anh)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /giáo dục|học/i.test(c.name));
      }
    } else if (type === 'income') {
      if (/(lương|thưởng|hoa hồng|công)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /lương|thu nhập/i.test(c.name));
      } else if (/(bán|thanh lý|lãi|cổ tức)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /đầu tư|kinh doanh|phụ/i.test(c.name));
      }
    }

    if (!selectedCat) {
      selectedCat = targetCats[0] || categories[0];
    }

    // Determine payment method
    let paymentMethod: PaymentMethod = 'transfer';
    if (selectedAccount?.type === 'cash' || lower.includes('tiền mặt')) {
      paymentMethod = 'cash';
    } else if (selectedAccount?.type === 'ewallet' || lower.includes('momo') || lower.includes('zalopay')) {
      paymentMethod = 'ewallet';
    } else if (lower.includes('quẹt thẻ') || lower.includes('thẻ')) {
      paymentMethod = 'card';
    } else if (lower.includes('qr') || lower.includes('quét')) {
      paymentMethod = 'qr';
    }

    // Clean note: remove words like "momo", amount, etc.
    let note = raw;
    if (match) {
      note = note.replace(match[0], '').trim();
    }
    if (selectedAccount && selectedAccount.name) {
      note = note.replace(new RegExp(selectedAccount.name, 'gi'), '').trim();
    }
    note = note.replace(/^(vừa|đã|mới|hôm nay|chi|tiêu|chuyển|nhận)\s+/i, '').trim();
    if (!note) {
      note = selectedCat?.name || (type === 'income' ? 'Khoản thu' : 'Khoản chi');
    }

    return {
      type,
      amount,
      categoryId: selectedCat?.id,
      categoryName: selectedCat?.name,
      accountId: selectedAccount?.id || '',
      accountName: selectedAccount?.name,
      note: note.charAt(0).toUpperCase() + note.slice(1),
      paymentMethod,
      date: todayStr,
      confidence: amount > 0 ? 0.85 : 0.4,
      explanation: 'Phân tích tự động bằng bộ nhận diện ngôn ngữ tự nhiên thông minh',
    };
  }

  // 4. Natural Language Parser via Gemini AI (with smart local fallback)
  async parseNaturalLanguageTransaction(
    text: string,
    categories: Category[],
    accounts: Account[]
  ): Promise<ParsedTransactionAI> {
    const key = this.getApiKey();
    if (!key) {
      return this.parseWithLocalHeuristics(text, categories, accounts);
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const categoriesSummary = categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }));
      const accountsSummary = accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
      }));

      const systemPrompt = `Bạn là Trợ lý AI Tài chính MoneyFlow chuyên bóc tách câu giao dịch tiếng Việt thành JSON có cấu trúc.
Hôm nay là: ${todayStr}.
Danh sách danh mục hợp lệ: ${JSON.stringify(categoriesSummary)}
Danh sách tài khoản hợp lệ: ${JSON.stringify(accountsSummary)}

QUY TẮC PHÂN TÍCH:
1. Xác định "type": "expense" (chi tiêu), "income" (thu nhập) hoặc "transfer" (chuyển tiền giữa các tài khoản).
2. "amount": số tiền dạng số nguyên VND (VD: 45k -> 45000, 2tr/2m -> 2000000, 1.5tr -> 1500000).
3. "categoryId": chọn id khớp nhất từ danh sách danh mục có type tương ứng.
4. "accountId": chọn id khớp nhất từ danh sách tài khoản. Nếu không nói rõ tài khoản, ưu tiên tài khoản có nhiều số dư hoặc tài khoản tiền mặt/ngân hàng phổ biến.
5. "toAccountId": chỉ dùng khi type là "transfer" (tài khoản nhận).
6. "paymentMethod": 'cash'|'transfer'|'card'|'qr'|'ewallet'.
7. "note": mô tả ngắn gọn nội dung chi tiêu bằng tiếng Việt (viết hoa chữ đầu, lược bỏ số tiền và tên tài khoản đã bóc tách).
8. "date": định dạng YYYY-MM-DD. Nếu nói "hôm qua" thì lùi 1 ngày, nếu không nói gì thì dùng hôm nay.

CHỈ TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ THEO CẤU TRÚC SAU (Không viết thêm bất kỳ lời giải thích nào ngoài JSON):
{
  "type": "expense" | "income" | "transfer",
  "amount": number,
  "categoryId": string,
  "categoryName": string,
  "accountId": string,
  "accountName": string,
  "toAccountId": string | null,
  "toAccountName": string | null,
  "note": string,
  "paymentMethod": "cash" | "transfer" | "card" | "qr" | "ewallet",
  "date": "YYYY-MM-DD",
  "confidence": number,
  "explanation": string
}`;

      const resData = await callGeminiAPI(key, {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: `Hãy bóc tách câu giao dịch sau: "${text}"` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const rawJson = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        throw new Error('Không nhận được phản hồi từ AI');
      }

      const parsed: ParsedTransactionAI = JSON.parse(rawJson);
      return {
        ...parsed,
        confidence: parsed.confidence || 0.95,
      };
    } catch (err) {
      console.warn('Gemini AI parse failed, falling back to local heuristics:', err);
      return this.parseWithLocalHeuristics(text, categories, accounts);
    }
  }

  // 5. Conversational Financial Advisor Q&A
  async askFinancialAdvisor(
    userQuestion: string,
    history: { role: 'user' | 'model'; text: string }[],
    contextData: {
      userName: string;
      accounts: Account[];
      transactions: Transaction[];
      categories: Category[];
      budgets: Budget[];
      goals: SavingsGoal[];
      debts: DebtItem[];
    }
  ): Promise<string> {
    const key = this.getApiKey();

    // If no API key, provide helpful algorithmic response & guidance
    if (!key) {
      return this.generateOfflineAdvisorResponse(userQuestion, contextData);
    }

    try {
      const {
        userName,
        accounts,
        transactions,
        categories,
        budgets,
        goals,
        debts,
      } = contextData;

      const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
      const catMap = new Map(categories.map((c) => [c.id, c.name]));

      // Current month stats
      const nowStr = new Date().toISOString().slice(0, 7);
      const curMonthTx = transactions.filter((t) => (t.date || '').startsWith(nowStr));
      const curIncome = curMonthTx
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
      const curExpense = curMonthTx
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);

      // Top 5 expenses this month
      const topExpenses = curMonthTx
        .filter((t) => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map((t) => `${catMap.get(t.categoryId || '') || t.note || 'Chi phí'}: ${formatVND(t.amount)} (${t.date})`);

      // Active debts
      const totalLend = debts
        .filter((d) => d.type === 'lend')
        .reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);
      const totalBorrow = debts
        .filter((d) => d.type === 'borrow')
        .reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);

      const systemPrompt = `Bạn là MoneyFlow AI - Chuyên gia Cố vấn Tài chính Cá nhân Thông minh, Tận tâm và Thực tế.
Bạn đang tư vấn cho người dùng tên: "${userName}".
DỮ LIỆU TÀI CHÍNH THỰC TẾ CỦA NGƯỜI DÙNG:
- Tổng tài sản ròng: ${formatVND(totalBalance)} (phân bổ trên ${accounts.length} ví/tài khoản: ${accounts.map((a) => `${a.name}: ${formatVND(a.balance)}`).join(', ')})
- Tình hình tài chính tháng này (${nowStr}):
  + Tổng thu nhập: +${formatVND(curIncome)}
  + Tổng chi tiêu: -${formatVND(curExpense)}
  + Thặng dư/Thâm hụt: ${formatVND(curIncome - curExpense, true)}
- Top khoản chi lớn nhất tháng này:
  ${topExpenses.length > 0 ? topExpenses.join('\n  ') : 'Chưa có khoản chi nào'}
- Ngân sách danh mục: ${budgets.length} danh mục đã đặt hạn mức
- Mục tiêu tiết kiệm: ${goals.map((g) => `"${g.name}": đã có ${formatVND(g.currentAmount)} / mục tiêu ${formatVND(g.targetAmount)}`).join('; ') || 'Chưa đặt mục tiêu'}
- Công nợ: Người khác nợ: ${formatVND(totalLend)} | Đang nợ người khác: ${formatVND(totalBorrow)}

HƯỚNG DẪN TRẢ LỜI:
1. Luôn trả lời bằng tiếng Việt tự nhiên, thân thiện, lịch thiệp và thực tế.
2. Dựa trực tiếp vào số liệu thực tế được cung cấp ở trên để đưa ra câu trả lời chính xác từng con số và tên ví/mục tiêu.
3. Khi người dùng hỏi cách tiết kiệm, kiểm soát chi tiêu hay lập kế hoạch mua sắm/đầu tư, hãy phân tích cụ thể (ví dụ dựa trên quy tắc 50/30/20 hoặc cắt giảm các khoản chi lớn).
4. Sử dụng định dạng Markdown đẹp mắt: gạch đầu dòng, in đậm các con số quan trọng, ngắt đoạn dễ đọc.
5. Tuyệt đối không bịa đặt số liệu tài chính ngoài các số liệu được cung cấp ở trên.`;

      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: `Dạ chào bạn ${userName}! Mình là Trợ lý Tài chính MoneyFlow AI. Mình đã nắm rõ toàn bộ tình hình ví tiền, ngân sách và giao dịch của bạn. Bạn muốn mình giải đáp hay tư vấn điều gì hôm nay?` }] },
        ...history.map((h) => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
        { role: 'user', parts: [{ text: userQuestion }] },
      ];

      const resData = await callGeminiAPI(key, {
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200,
        },
      });

      return (
        resData?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Xin lỗi, mình chưa thể xử lý câu trả lời lúc này. Bạn thử lại nhé!'
      );
    } catch (err: any) {
      console.error('Gemini chat error:', err);
      return `⚠️ Lỗi kết nối Gemini AI: ${err?.message || 'Không thể kết nối'}. Vui lòng kiểm tra lại API Key hoặc kết nối mạng!`;
    }
  }

  // 6. Offline smart advisor answers if user hasn't configured API key yet
  private generateOfflineAdvisorResponse(
    question: string,
    contextData: {
      userName: string;
      accounts: Account[];
      transactions: Transaction[];
      budgets: Budget[];
      goals: SavingsGoal[];
      debts: DebtItem[];
    }
  ): string {
    const q = question.toLowerCase();
    const { userName, accounts, transactions, debts, goals } = contextData;
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    const nowStr = new Date().toISOString().slice(0, 7);
    const curMonthTx = transactions.filter((t) => (t.date || '').startsWith(nowStr));
    const curIncome = curMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const curExpense = curMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = curIncome - curExpense;

    let responseBody = '';

    if (q.includes('tài sản') || q.includes('tiền') || q.includes('số dư') || q.includes('còn bao nhiêu')) {
      responseBody = `📊 **Tình hình tài sản hiện tại của bạn:**\n- Tổng tài sản khả dụng: **${formatVND(totalBalance)}**\n- Phân bổ qua các ví:\n${accounts.map((a) => `  + **${a.name}**: ${formatVND(a.balance)}`).join('\n')}`;
    } else if (q.includes('chi tiêu') || q.includes('tiêu') || q.includes('thu nhập') || q.includes('tháng này')) {
      responseBody = `📈 **Dòng tiền tháng này (${nowStr}):**\n- Tổng thu nhập: **+${formatVND(curIncome)}**\n- Tổng chi tiêu: **-${formatVND(curExpense)}**\n- Chênh lệch thặng dư: **${formatVND(net, true)}** ${net >= 0 ? '🎉 (Tích lũy tốt)' : '⚠️ (Đang thâm hụt)'}`;
    } else if (q.includes('nợ') || q.includes('vay') || q.includes('đòi')) {
      const lend = debts.filter((d) => d.type === 'lend').reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);
      const borrow = debts.filter((d) => d.type === 'borrow').reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);
      responseBody = `🤝 **Sổ nợ & Cho vay:**\n- Người khác nợ bạn: **${formatVND(lend)}**\n- Bạn nợ người khác: **${formatVND(borrow)}**`;
    } else {
      responseBody = `Chào bạn ${userName}! Hiện tại mình đang trả lời bạn ở chế độ **Phân tích Nội bộ**. Tổng tài sản của bạn đang là **${formatVND(totalBalance)}**, tháng này bạn đã chi tiêu **${formatVND(curExpense)}** và thu nhập **${formatVND(curIncome)}**.`;
    }

    return `${responseBody}\n\n💡 *Mách nhỏ: Bạn có thể dán **Google Gemini API Key** (hoàn toàn Miễn Phí 100% từ Google) vào mục Cài đặt hoặc góc trên hộp thoại để mở khóa toàn bộ trí tuệ nhân tạo đàm thoại tự do, lập kế hoạch đầu tư và trò chuyện chuyên sâu bất kỳ lúc nào nhé!*`;
  }
}

export const aiService = new AIService();

