import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';

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

