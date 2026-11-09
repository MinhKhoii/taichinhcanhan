import { Account, Category, PaymentMethod } from '../types';
import { formatVND, getLocalDateString, getLocalMonthString } from '../utils/formatters';
import { dataService } from './dataService';
import {
  generateExpertFinancialAnswer,
  detectUserSalary,
  FinancialContextData,
} from '../utils/financialExpertEngine';

const STORAGE_KEY = 'moneyflow_gemini_api_key';

const CANDIDATE_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
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

      // If model not found, rate limited or overloaded, try next candidate
      if (
        res.status === 404 ||
        res.status === 429 ||
        res.status === 503 ||
        msg.includes('no longer available') ||
        msg.includes('not found') ||
        msg.includes('Resource has been exhausted')
      ) {
        continue;
      }
      throw lastError;
    } catch (e: any) {
      lastError = e;
      if (
        e.message &&
        (e.message.includes('no longer available') ||
          e.message.includes('not found') ||
          e.message.includes('404') ||
          e.message.includes('429'))
      ) {
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

  // 2.1 Multimodal Receipt / Bill Scanner via Gemini Vision
  async scanReceiptImage(
    base64Data: string,
    mimeType: string,
    categories: Category[],
    accounts: Account[]
  ): Promise<ParsedTransactionAI> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('Chưa cấu hình API Key Google Gemini. Bạn hãy vào Cài đặt -> Trợ lý AI để nhập key!');
    }

    const categoryNames = categories.map((c) => `${c.id}:${c.name} (${c.type})`).join(', ');
    const accountNames = accounts.map((a) => `${a.id}:${a.name} (${a.type})`).join(', ');
    const todayStr = getLocalDateString();

    const prompt = `Bạn là trợ lý AI chuyên bóc tách thông tin từ ảnh chụp hóa đơn, biên lai tính tiền, bill siêu thị, quán cà phê hoặc ảnh chụp màn hình chuyển khoản ngân hàng Việt Nam.
Ngày hôm nay: ${todayStr}.
Danh sách danh mục thu/chi: [${categoryNames}].
Danh sách tài khoản ví: [${accountNames}].

Hãy quan sát kỹ ảnh hóa đơn này và trích xuất thông tin dưới định dạng JSON thuần túy (không bọc trong markdown hay bất cứ ký tự nào khác):
{
  "type": "expense",
  "amount": 50000,
  "note": "Tên quán hoặc tên mặt hàng chính (ví dụ: Highland Coffee, Cơm tấm, Siêu thị WinMart)",
  "categoryId": "mã danh mục khớp nhất",
  "categoryName": "tên danh mục khớp nhất",
  "paymentMethod": "transfer",
  "date": "${todayStr}",
  "confidence": 0.95,
  "explanation": "Tóm tắt ngắn gọn hóa đơn"
}`;

    const payload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 600,
      },
    };

    const res = await callGeminiAPI(key, payload);
    const textOutput = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      throw new Error('AI không nhận diện được hóa đơn này. Hãy chụp rõ nét hơn hoặc góc đủ sáng!');
    }

    try {
      const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const matchedAccount =
        accounts.find((a) => parsed.paymentMethod === 'ewallet' && (a.type === 'ewallet' || a.name.toLowerCase().includes('momo'))) ||
        accounts.find((a) => parsed.paymentMethod === 'transfer' && a.type === 'bank') ||
        accounts[0];

      return {
        type: parsed.type || 'expense',
        amount: Number(parsed.amount) || 0,
        note: parsed.note || 'Chi tiêu theo hóa đơn',
        categoryId: parsed.categoryId || categories[0]?.id,
        categoryName: parsed.categoryName || categories[0]?.name,
        accountId: matchedAccount?.id || accounts[0]?.id || '',
        accountName: matchedAccount?.name,
        paymentMethod: parsed.paymentMethod || 'transfer',
        date: parsed.date || todayStr,
        confidence: parsed.confidence || 0.9,
        explanation: parsed.explanation,
      };
    } catch (err: any) {
      throw new Error(`Lỗi đọc hóa đơn từ AI: ${err.message || 'Không thể giải mã kết quả'}`);
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
    const todayStr = getLocalDateString();

    // Detect type
    let type: 'expense' | 'income' | 'transfer' = 'expense';
    
    // Check if it's a Vietnamese bank SMS / Notification
    const isBankNotification = /[-+]\s*[\d.,]+\s*(?:vnd|vnđ|d|đ|\b)/i.test(lower) || /nd:|nội dung:|noi dung:|gd:|sodu:|số dư:|so du:/i.test(lower);
    if (/(\+|\bcộng\b|\bnhận\b|\blương\b|\bthưởng\b|\btiền vào\b|\bhoàn tiền\b|\bthu nhập\b)/i.test(lower) && !/-\s*[\d.,]+/i.test(lower)) {
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

    // Extract amount:
    // If it's a bank SMS, prevent picking the "Số dư" (remaining balance)
    let amount = 0;
    let textToScan = lower;
    if (isBankNotification) {
      // Find GD: -xx or GD: +xx or -xxx,xxxVND
      const bankTxMatch = textToScan.match(/(?:gd\s*:\s*)?([+-])\s*([\d.,]+)\s*(?:vnd|vnđ|d|đ|\b)/i);
      if (bankTxMatch) {
        if (bankTxMatch[1] === '+') type = 'income';
        if (bankTxMatch[1] === '-') type = 'expense';
        const rawNum = bankTxMatch[2].replace(/\./g, '').replace(/,/g, '');
        amount = parseInt(rawNum, 10) || 0;
      }
    }

    let amountMatch: RegExpMatchArray | null = null;
    if (amount === 0) {
      // e.g. "45k", "2tr", "1.5tr", "500000", "500.000", "50k", "2 củ", "5 lít"
      const amountRegex = /(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngan|tr|trieu|triệu|m|củ|cu|lít|lit|đ|vnd)?\b/i;
      amountMatch = lower.match(amountRegex);
      if (amountMatch) {
        let num = parseFloat(amountMatch[1].replace(/\./g, '').replace(/,/g, '.'));
        const unit = (amountMatch[2] || '').toLowerCase();
        if (unit === 'k' || unit === 'nghìn' || unit === 'ngan') {
          num *= 1000;
        } else if (unit === 'tr' || unit === 'trieu' || unit === 'triệu' || unit === 'm' || unit === 'củ' || unit === 'cu') {
          num *= 1000000;
        } else if (unit === 'lít' || unit === 'lit') {
          num *= 100000;
        }
        amount = Math.round(num);
      }
    }

    // Detect Account
    let selectedAccount = accounts.find((a) => lower.includes(a.name.toLowerCase()));
    if (!selectedAccount) {
      if (lower.includes('momo')) {
        selectedAccount = accounts.find((a) => a.name.toLowerCase().includes('momo') || a.type === 'ewallet');
      } else if (lower.includes('zalopay')) {
        selectedAccount = accounts.find((a) => a.name.toLowerCase().includes('zalopay') || a.type === 'ewallet');
      } else if (lower.includes('vietcombank') || lower.includes('vcb')) {
        selectedAccount = accounts.find((a) => a.name.toLowerCase().includes('vietcombank') || a.name.toLowerCase().includes('vcb'));
      } else if (lower.includes('techcombank') || lower.includes('tcb')) {
        selectedAccount = accounts.find((a) => a.name.toLowerCase().includes('techcombank') || a.name.toLowerCase().includes('tcb'));
      } else if (lower.includes('mbbank') || lower.includes('mb bank') || lower.includes('mb')) {
        selectedAccount = accounts.find((a) => a.name.toLowerCase().includes('mb'));
      } else if (lower.includes('vpbank') || lower.includes('vpb')) {
        selectedAccount = accounts.find((a) => a.name.toLowerCase().includes('vpbank') || a.name.toLowerCase().includes('vpb'));
      } else if (lower.includes('tpbank') || lower.includes('tpb')) {
        selectedAccount = accounts.find((a) => a.name.toLowerCase().includes('tpbank') || a.name.toLowerCase().includes('tpb'));
      } else if (lower.includes('acb')) {
        selectedAccount = accounts.find((a) => a.name.toLowerCase().includes('acb'));
      } else if (lower.includes('ngân hàng') || lower.includes('vietin')) {
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
      if (/(ăn|uống|phở|cơm|bún|trưa|tối|sáng|cà phê|cafe|trà|bánh|nhậu|lẩu|gà|highland|starbuck|phuc long)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /ăn|uống|thực phẩm/i.test(c.name));
      } else if (/(xăng|xe|grab|be|taxi|gửi xe|rửa xe|vé xe|tàu)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /đi lại|xăng|xe/i.test(c.name));
      } else if (/(nhà|tiền nhà|phòng|thuê nhà|điện|nước|mạng|internet|rác)/i.test(lower)) {
        selectedCat = targetCats.find((c) => /nhà|tiện ích|hóa đơn/i.test(c.name));
      } else if (/(mua|áo|quần|giày|shopee|lazada|tiki|máy|điện thoại|winmart|coop|circle k|bách hóa)/i.test(lower)) {
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
    // Check if there is an explicit bank note like "ND: ...", "Nội dung: ...", "cho ..."
    const ndMatch = raw.match(/(?:nd|nội dung|noi dung|lý do|ly do)\s*:\s*([^.;\n\r]+)/i);
    const merchantMatch = raw.match(/(?:thanh toán|thanh toan)\s+(?:cho\s+)?([^.;\n\r]+)/i);
    if (ndMatch && ndMatch[1].trim()) {
      note = ndMatch[1].trim();
    } else if (merchantMatch && merchantMatch[1].trim()) {
      note = merchantMatch[1].trim();
    } else {
      if (amountMatch) {
        note = note.replace(amountMatch[0], '').trim();
      }
      if (selectedAccount && selectedAccount.name) {
        note = note.replace(new RegExp(selectedAccount.name, 'gi'), '').trim();
      }
      note = note.replace(/^(vừa|đã|mới|hôm nay|chi|tiêu|chuyển|nhận)\s+/i, '').trim();
    }
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
      const todayStr = getLocalDateString();
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

      const systemPrompt = `Bạn là Trợ lý AI Tài chính MoneyFlow chuyên bóc tách câu giao dịch hoặc tin nhắn thông báo biến động số dư ngân hàng tiếng Việt thành JSON có cấu trúc.
Hôm nay là: ${todayStr}.
Danh sách danh mục hợp lệ: ${JSON.stringify(categoriesSummary)}
Danh sách tài khoản hợp lệ: ${JSON.stringify(accountsSummary)}

QUY TẮC PHÂN TÍCH:
1. Xác định "type": "expense" (chi tiêu, tiền trừ -), "income" (thu nhập, tiền cộng +) hoặc "transfer" (chuyển tiền giữa các tài khoản).
2. ĐẶC BIỆT XỬ LÝ TIN NHẮN BIẾN ĐỘNG SỐ DƯ NGÂN HÀNG (Vietcombank, MBBank, Techcombank, VPBank, ACB, Momo, ZaloPay...):
   - Nếu tin nhắn có "GD: -xx" hoặc "-xx VND" hoặc thanh toán tiền -> "type": "expense".
   - Nếu tin nhắn có "GD: +xx" hoặc "+xx VND" hoặc nhận tiền/lương -> "type": "income".
   - Trích xuất ĐÚNG số tiền giao dịch, TUYỆT ĐỐI không lấy số dư sau giao dịch (sau chữ "Số dư" / "So du").
   - Trích xuất nội dung chuyển khoản (sau "ND:" hoặc "Nội dung:" hoặc tên cửa hàng) để làm "note".
   - Tự động nhận diện ngân hàng gửi tin nhắn để gán đúng "accountId".
3. "amount": số tiền dạng số nguyên VND (VD: 45k -> 45000, 2tr/2m -> 2000000, 1.5tr -> 1500000).
4. "categoryId": chọn id khớp nhất từ danh sách danh mục có type tương ứng.
5. "accountId": chọn id khớp nhất từ danh sách tài khoản. Nếu không nói rõ tài khoản, ưu tiên tài khoản có nhiều số dư hoặc tài khoản tiền mặt/ngân hàng phổ biến.
6. "toAccountId": chỉ dùng khi type là "transfer" (tài khoản nhận).
7. "paymentMethod": 'cash'|'transfer'|'card'|'qr'|'ewallet'.
8. "note": mô tả ngắn gọn nội dung chi tiêu bằng tiếng Việt (viết hoa chữ đầu, lược bỏ số tiền và tên tài khoản đã bóc tách).
9. "date": định dạng YYYY-MM-DD. Nếu nói "hôm qua" thì lùi 1 ngày, nếu không nói gì thì dùng hôm nay.

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

  // 4b. Receipt / Bill Image Scanner via Gemini Vision
  async parseReceiptImage(
    base64Data: string,
    mimeType: string,
    categories: Category[],
    accounts: Account[]
  ): Promise<ParsedTransactionAI> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('Bạn cần nhập Google Gemini API Key để sử dụng tính năng bóc tách ảnh hóa đơn.');
    }

    const todayStr = getLocalDateString();
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

    const systemPrompt = `Bạn là Trợ lý AI Tài chính MoneyFlow chuyên nhận diện ảnh chụp Hóa đơn (Bill / Receipt / Siêu thị / Quán ăn) hoặc Ảnh chụp màn hình chuyển khoản ngân hàng Việt Nam.
Hôm nay là: ${todayStr}.
Danh sách danh mục có sẵn: ${JSON.stringify(categoriesSummary)}
Danh sách tài khoản có sẵn: ${JSON.stringify(accountsSummary)}

QUY TẮC NHẬN DIỆN:
1. Đọc kỹ hình ảnh hóa đơn hoặc biên lai chuyển khoản.
2. Tìm số TỔNG TIỀN thanh toán thực tế (Total / Tổng cộng / Thành tiền / Số tiền giao dịch). Dạng số nguyên VND (VD: 150000).
3. "type": Đa số hóa đơn là "expense" (chi tiêu). Nếu là biên lai nhận tiền/cộng tiền thì là "income".
4. "date": Lấy ngày trên hóa đơn định dạng YYYY-MM-DD. Nếu không thấy hoặc mờ, dùng ngày hôm nay (${todayStr}).
5. "note": Tên ngắn gọn của nơi mua sắm hoặc dịch vụ (VD: "Hóa đơn WinMart", "Cà phê Highland", "Ăn nhà hàng", "Chuyển khoản Grab",...).
6. "categoryId": Chọn danh mục khớp nhất từ danh sách danh mục (VD: Ăn uống, Mua sắm, Đi lại,...).
7. "accountId": Chọn tài khoản phù hợp nhất từ danh sách tài khoản (nếu hóa đơn ghi trả tiền mặt -> tiền mặt; quẹt thẻ/chuyển khoản/momo -> ngân hàng/momo).
8. "paymentMethod": 'cash'|'transfer'|'card'|'qr'|'ewallet'.

CHỈ TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ THEO CẤU TRÚC SAU (Không viết thêm chữ nào ngoài JSON):
{
  "type": "expense" | "income" | "transfer",
  "amount": number,
  "categoryId": string,
  "categoryName": string,
  "accountId": string,
  "accountName": string,
  "toAccountId": null,
  "toAccountName": null,
  "note": string,
  "paymentMethod": "cash" | "transfer" | "card" | "qr" | "ewallet",
  "date": "YYYY-MM-DD",
  "confidence": number,
  "explanation": string
}`;

    const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const resData = await callGeminiAPI(key, {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: systemPrompt,
            },
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
      throw new Error('AI không đọc được nội dung trên hóa đơn. Vui lòng chụp rõ nét hơn!');
    }

    const parsed: ParsedTransactionAI = JSON.parse(rawJson);
    return {
      ...parsed,
      confidence: parsed.confidence || 0.95,
    };
  }

  // 5. Conversational Financial Advisor Q&A
  async askFinancialAdvisor(
    userQuestion: string,
    history: { role: 'user' | 'model'; text: string }[],
    contextData: FinancialContextData
  ): Promise<string> {
    const key = this.getApiKey();

    // If no API key, provide our expert financial engine response directly
    if (!key) {
      return generateExpertFinancialAnswer(userQuestion, contextData);
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

      // Detected salary & savings breakdown
      const salaryInfo = detectUserSalary(userQuestion, contextData);
      const estSalary = salaryInfo.salary;
      const recSavings20 = Math.round(estSalary * 0.2);
      const recSavings30 = Math.round(estSalary * 0.3);
      const recNeeds50 = Math.round(estSalary * 0.5);

      // Current month stats
      const nowStr = getLocalMonthString();
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

      const systemPrompt = `Bạn là MoneyFlow AI - Chuyên gia Cố vấn Tài chính Cá nhân Xuất sắc, Tận tâm và Thực tế.
Bạn đang tư vấn cho người dùng tên: "${userName}".
DỮ LIỆU TÀI CHÍNH THỰC TẾ CỦA NGƯỜI DÙNG:
- Tổng tài sản ròng: ${formatVND(totalBalance)} (phân bổ trên ${accounts.length} ví/tài khoản: ${accounts.map((a) => `${a.name}: ${formatVND(a.balance)}`).join(', ')})
- Mức lương / thu nhập hàng tháng: ${formatVND(estSalary)}/tháng (Nguồn: ${salaryInfo.source})
  + Mức tiết kiệm chuẩn 20% khuyên dùng: ${formatVND(recSavings20)}/tháng (~${formatVND(recSavings20 * 12)}/năm)
  + Mức tiết kiệm bứt phá 30%: ${formatVND(recSavings30)}/tháng (~${formatVND(recSavings30 * 12)}/năm)
  + 50% Nhu cầu thiết yếu: ${formatVND(recNeeds50)}/tháng
- Tình hình tài chính tháng này (${nowStr}):
  + Tổng thu nhập: +${formatVND(curIncome)}
  + Tổng chi tiêu: -${formatVND(curExpense)}
  + Thặng dư/Thâm hụt: ${formatVND(curIncome - curExpense, true)}
- Top khoản chi lớn nhất tháng này:
  ${topExpenses.length > 0 ? topExpenses.join('\n  ') : 'Chưa có khoản chi nào'}
- Ngân sách danh mục: ${budgets.length} danh mục đã đặt hạn mức
- Mục tiêu tiết kiệm: ${goals.map((g) => `"${g.name}": đã có ${formatVND(g.currentAmount)} / mục tiêu ${formatVND(g.targetAmount)}`).join('; ') || 'Chưa đặt mục tiêu'}
- Công nợ: Người khác nợ: ${formatVND(totalLend)} | Đang nợ người khác: ${formatVND(totalBorrow)}

HƯỚNG DẪN TRẢ LỜI ĐẶC BIỆT:
1. Bạn là Trợ lý Ảo Thông minh toàn diện: Người dùng có thể chào hỏi, hỏi tên bạn là gì ("bạn tên là gì", "bạn là ai"), tâm sự đời sống, hỏi ăn gì hôm nay, hỏi chuyện vui hoặc kiến thức đời sống. Khi người dùng tán gẫu, chào hỏi hay hỏi chuyện phi tài chính, hãy trả lời tự nhiên, ấm áp, hóm hỉnh như một người bạn tri kỷ, TUYỆT ĐỐI KHÔNG tự động chèn bảng phân tích tiền tệ nếu người dùng không hỏi về tiền bạc!
2. Khi người dùng hỏi về tài chính, tiết kiệm (ví dụ: "lương tôi chừng đó thì tháng nên tiết kiệm bao nhiêu", "tiết kiệm như thế nào"), hãy tính toán cụ thể theo mức lương ${formatVND(estSalary)}:
   * Phân bổ 50/30/20 rõ ràng từng con số: 50% thiết yếu (${formatVND(recNeeds50)}), 30% sở thích (${formatVND(recSavings30)}), 20% tiết kiệm (${formatVND(recSavings20)}/tháng = ${formatVND(recSavings20 * 12)}/năm).
   * Đưa ra các mốc tiết kiệm: Tiêu chuẩn (20%), Bứt phá (30%), Khởi đầu (10-15%).
   * Đưa ra lộ trình 3 bước: Quỹ khẩn cấp, Trả cho mình trước, Gửi tích lũy sinh lời.
3. Trả lời bằng tiếng Việt tự nhiên, nhiệt tình, thực tế, bố cục Markdown rõ ràng với bảng và gạch đầu dòng.
4. Luôn trả lời đúng trọng tâm câu hỏi của người dùng, lắng nghe thấu đáo và thân thiện.`;

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
          maxOutputTokens: 1500,
        },
      });

      const reply = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply && reply.trim()) return reply.trim();

      // If empty response, fallback to local expert engine
      return generateExpertFinancialAnswer(userQuestion, contextData);
    } catch (err: any) {
      console.warn('Gemini chat error, falling back to local expert engine:', err);
      return generateExpertFinancialAnswer(userQuestion, contextData);
    }
  }
}

export const aiService = new AIService();

