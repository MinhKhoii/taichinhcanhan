import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Account, PaymentMethod } from '../types';

/**
 * Format currency in Vietnamese Dong (VND)
 * e.g. 15000000 -> 15.000.000 ₫
 */
export function formatVND(amount: number, showSign: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 ₫';
  }

  const sign = showSign && amount > 0 ? '+' : '';
  const formatted = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

  return `${sign}${formatted}`;
}

/**
 * Compact VND format for small badges / charts
 * e.g. 15000000 -> 15 Tr
 */
export function formatCompactVND(amount: number): string {
  if (isNaN(amount)) return '0 ₫';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1).replace('.0', '')} Tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace('.0', '')} Tr`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)} K`;
  }
  return `${amount} ₫`;
}

/**
 * Format currency in readable Vietnamese wording
 * e.g. 11000000 -> 11 Triệu VNĐ
 * e.g. 11500000 -> 11 Triệu 500 Nghìn VNĐ
 */
export function getReadableVNDWords(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return '';
  const ty = Math.floor(amount / 1_000_000_000);
  const trieu = Math.floor((amount % 1_000_000_000) / 1_000_000);
  const nghin = Math.floor((amount % 1_000_000) / 1_000);
  const dong = amount % 1_000;

  const parts: string[] = [];
  if (ty > 0) parts.push(`${ty.toLocaleString('vi-VN')} Tỷ`);
  if (trieu > 0) parts.push(`${trieu} Triệu`);
  if (nghin > 0) parts.push(`${nghin} Nghìn`);
  if (dong > 0 && parts.length === 0) parts.push(`${dong} Đồng`);

  return parts.length > 0 ? `${parts.join(' ')} VNĐ` : '';
}

/**
 * Format Date to DD/MM/YYYY
 */
export function formatDateVN(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!isValid(d)) return typeof dateInput === 'string' ? dateInput : '';
    return format(d, 'dd/MM/yyyy');
  } catch {
    return String(dateInput);
  }
}

/**
 * Format Date with Day of Week: Thứ Hai, 04/11/2026
 */
export function formatDateWithDayVN(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!isValid(d)) return String(dateInput);
    return format(d, 'EEEE, dd/MM/yyyy', { locale: vi });
  } catch {
    return String(dateInput);
  }
}

/**
 * Format Month Year: Tháng 11, 2026
 */
export function formatMonthYearVN(monthInput: string): string {
  try {
    // Expected YYYY-MM
    const parts = monthInput.split('-');
    if (parts.length === 2) {
      return `Tháng ${parseInt(parts[1], 10)}/${parts[0]}`;
    }
    return monthInput;
  } catch {
    return monthInput;
  }
}

/**
 * Parse a raw number string into clean number
 */
export function parseNumberInput(val: string): number {
  const clean = val.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

/**
 * Lấy chữ viết tắt chuẩn từ họ và tên tiếng Việt
 * VD: "Anh Việt" -> "AV"
 * VD: "Nguyễn Minh Khởi" -> "NK"
 * VD: "Khôi" -> "KH"
 */
export function getNameInitials(name?: string, fallback: string = '??'): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Lấy icon / biểu tượng emoji theo mối quan hệ
 * VD: "Em trai" -> "👦"
 * VD: "Em gái" -> "👧"
 * VD: "Anh trai" -> "👨"
 * VD: "Bạn bè" -> "🤝"
 */
export function getRelationshipIcon(rel?: string): string {
  if (!rel) return '';
  const lower = rel.toLowerCase().trim();
  if (lower.includes('em trai')) return '👦';
  if (lower.includes('em gái') || lower.includes('em gai')) return '👧';
  if (lower.includes('anh trai') || lower.includes('anh họ') || lower.startsWith('anh')) return '👨';
  if (lower.includes('chị gái') || lower.includes('chị họ') || lower.startsWith('chị')) return '👩';
  if (lower.includes('bạn') || lower.includes('tri kỷ') || lower.includes('đồng môn')) return '🤝';
  if (lower.includes('gia đình') || lower.includes('bố') || lower.includes('mẹ')) return '❤️';
  if (lower.includes('người thân') || lower.includes('họ hàng') || lower.includes('nhà')) return '🏠';
  if (lower.includes('đồng nghiệp') || lower.includes('công ty') || lower.includes('sếp')) return '💼';
  if (lower.includes('vợ') || lower.includes('chồng') || lower.includes('người yêu')) return '💍';
  if (lower.includes('đối tác') || lower.includes('khách hàng')) return '💼';
  return '👤';
}

/**
 * Tự động xác định phương thức thanh toán phù hợp với tài khoản:
 * - Tài khoản ngân hàng / tiết kiệm -> 'transfer' (Chuyển khoản)
 * - Ví điện tử (MoMo, ZaloPay, ...) -> 'ewallet' (Ví điện tử)
 * - Tiền mặt ví cá nhân -> 'cash' (Tiền mặt)
 * - Thẻ tín dụng / ghi nợ -> 'card' (Thẻ tín dụng / ghi nợ)
 */
export function getDefaultPaymentMethodForAccount(acc?: Account | null): PaymentMethod {
  if (!acc) return 'cash';

  // 1. Kiểm tra theo thuộc tính type
  if (acc.type === 'ewallet') return 'ewallet';
  if (acc.type === 'bank' || acc.type === 'savings' || acc.type === 'investment') return 'transfer';
  if (acc.type === 'cash') return 'cash';

  // 2. Kiểm tra theo tên tài khoản hoặc tên ngân hàng
  const nameLower = (acc.name || '').toLowerCase();
  const bankLower = (acc.bankName || '').toLowerCase();

  if (
    nameLower.includes('thẻ') ||
    nameLower.includes('credit') ||
    nameLower.includes('debit') ||
    nameLower.includes('visa') ||
    nameLower.includes('mastercard')
  ) {
    return 'card';
  }

  if (
    nameLower.includes('momo') ||
    nameLower.includes('zalopay') ||
    nameLower.includes('zalo') ||
    nameLower.includes('viettel') ||
    nameLower.includes('shopee')
  ) {
    return 'ewallet';
  }

  if (
    bankLower ||
    nameLower.includes('bank') ||
    nameLower.includes('ngân hàng') ||
    nameLower.includes('vietin') ||
    nameLower.includes('vcb') ||
    nameLower.includes('mb') ||
    nameLower.includes('techcom') ||
    nameLower.includes('bidv') ||
    nameLower.includes('acb') ||
    nameLower.includes('tpbank')
  ) {
    return 'transfer';
  }

  if (
    nameLower.includes('tiền mặt') ||
    nameLower.includes('ví cá nhân') ||
    nameLower.includes('bóp')
  ) {
    return 'cash';
  }

  return 'transfer';
}

export interface SmartAmountSuggestion {
  label: string;       // e.g. "250.000 ₫"
  amount: number;      // e.g. 250000
  shortLabel: string;  // e.g. "250k" or "2.5tr"
}

/**
 * Sinh gợi ý số tiền thông minh theo phong cách các app ngân hàng (VCB, Techcombank, MB, MoMo):
 * Khi người dùng gõ 1 số (vd: 5, 25, 120), hệ thống tự động suy đoán các mốc tiền thực tế
 * mà người dùng thường giao dịch (nghìn, trăm nghìn, triệu, chục triệu).
 */
export function getSmartAmountSuggestions(val: number): SmartAmountSuggestion[] {
  if (!val || val <= 0) {
    // Mặc định các mốc tiền phổ biến khi chưa gõ
    const defaults = [20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000];
    return defaults.map((amt) => {
      let shortLabel = `${amt.toLocaleString('vi-VN')} ₫`;
      if (amt >= 1000000) shortLabel = `${(amt / 1000000).toLocaleString('vi-VN')}tr`;
      else if (amt >= 1000) shortLabel = `${(amt / 1000).toLocaleString('vi-VN')}k`;
      return {
        label: `${amt.toLocaleString('vi-VN')} ₫`,
        amount: amt,
        shortLabel,
      };
    });
  }

  const results: SmartAmountSuggestion[] = [];
  const seen = new Set<number>();

  let multipliers: number[] = [];
  if (val < 10) {
    // 1 chữ số: 5 -> 5.000, 50.000, 500.000, 5.000.000, 50.000.000
    multipliers = [1000, 10000, 100000, 1000000, 10000000];
  } else if (val < 100) {
    // 2 chữ số: 25 -> 25.000, 250.000, 2.500.000, 25.000.000
    multipliers = [1000, 10000, 100000, 1000000];
  } else if (val < 1000) {
    // 3 chữ số: 150 -> 150.000, 1.500.000, 15.000.000
    multipliers = [1000, 10000, 100000];
  } else if (val < 10000) {
    // 4 chữ số: 2500 -> 25.000, 250.000, 2.500.000
    multipliers = [10, 100, 1000];
  } else if (val < 100000) {
    // 5 chữ số: 25000 -> 250.000, 2.500.000
    multipliers = [10, 100];
  } else if (val < 1000000) {
    // 6 chữ số: 250000 -> 2.500.000
    multipliers = [10];
  }

  for (const m of multipliers) {
    const amt = val * m;
    if (amt <= 2000000000 && !seen.has(amt) && amt !== val) {
      seen.add(amt);
      let shortLabel = `${amt.toLocaleString('vi-VN')} ₫`;
      if (amt >= 1000000000) {
        shortLabel = `${(amt / 1000000000).toLocaleString('vi-VN')} tỷ`;
      } else if (amt >= 1000000) {
        shortLabel = `${(amt / 1000000).toLocaleString('vi-VN')}tr`;
      } else if (amt >= 1000) {
        shortLabel = `${(amt / 1000).toLocaleString('vi-VN')}k`;
      }

      results.push({
        label: `${amt.toLocaleString('vi-VN')} ₫`,
        amount: amt,
        shortLabel,
      });
    }
  }

  return results.slice(0, 4);
}

/**
 * Phân tích cú pháp nhập tiền nhanh:
 * Hỗ trợ gõ tắt 50k, 250k, 2tr, 1.5tr, 2m, v.v.
 */
export function parseQuickAmountInput(rawStr: string): number | null {
  if (!rawStr) return null;
  const clean = rawStr.trim().toLowerCase();

  // 1. Dạng nghìn: 50k, 250 k
  const kMatch = clean.match(/^([0-9]+(?:[\.,][0-9]+)?)\s*k$/);
  if (kMatch) {
    const n = parseFloat(kMatch[1].replace(',', '.'));
    return isNaN(n) ? null : Math.round(n * 1000);
  }

  // 2. Dạng triệu: 2tr, 1.5tr, 2m, 2.5 m
  const trMatch = clean.match(/^([0-9]+(?:[\.,][0-9]+)?)\s*(?:tr|trieu|triệu|m)$/);
  if (trMatch) {
    const n = parseFloat(trMatch[1].replace(',', '.'));
    return isNaN(n) ? null : Math.round(n * 1000000);
  }

  // 3. Dạng tỷ: 1ty, 1.2 tỷ
  const tyMatch = clean.match(/^([0-9]+(?:[\.,][0-9]+)?)\s*(?:ty|tỷ|b)$/);
  if (tyMatch) {
    const n = parseFloat(tyMatch[1].replace(',', '.'));
    return isNaN(n) ? null : Math.round(n * 1000000000);
  }

  const digitsOnly = clean.replace(/[^0-9]/g, '');
  if (!digitsOnly) return null;
  const n = parseInt(digitsOnly, 10);
  return isNaN(n) ? null : n;
}



