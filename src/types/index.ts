export type TransactionType = 'income' | 'expense' | 'transfer';

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'qr' | 'ewallet' | 'other';

export type AccountType = 'cash' | 'bank' | 'ewallet' | 'savings' | 'investment' | 'other';

export type FontSizePreference = 'small' | 'medium' | 'large' | 'xlarge';

export type ThemePreference = 'light' | 'dark';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  currency: string;
  dateFormat: string;
  autoOffsetNegative?: boolean; // Tự động cấn trừ số dư âm từ tài khoản có tiền
  fontSize?: FontSizePreference; // Tùy chọn cỡ chữ: nhỏ gọn, vừa vặn, lớn, rất lớn
  theme?: ThemePreference; // Chế độ giao diện: sáng / tối
  pinCode?: string; // Mã PIN bảo vệ ứng dụng (6 số)
  isPinEnabled?: boolean;
  geminiApiKey?: string; // Khóa Google Gemini API Key đồng bộ đa thiết bị theo tài khoản
  role?: 'admin' | 'user'; // Quyền hạn: admin (chủ hệ thống) hoặc user (người dùng)
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token?: string;
  isLoggedIn: boolean;
  loginMethod: 'supabase' | 'local' | 'guest';
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  accountNumber?: string;
  bankName?: string;
  color?: string;
  icon?: string;
  isArchived?: boolean;
  isYieldEnabled?: boolean; // Tự động sinh lời hàng ngày (Ví MoMo Túi Thần Tài / Tích lũy)
  yieldRate?: number; // Lãi suất %/năm (mặc định 4.0)
  lastYieldDate?: string; // Ngày gần nhất đã cộng tiền lời (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId?: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  categoryId?: string;
  accountId: string;
  toAccountId?: string; // only for transfer
  transferFee?: number;
  note?: string;
  paymentMethod: PaymentMethod;
  recurringItemId?: string; // ID của mục lương / thu chi định kỳ liên kết
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number; // monthly limit
  month: string; // YYYY-MM
  alertThreshold: number; // default 0.8 (80%)
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
  icon?: string;
  color?: string;
  linkedAccountId?: string;
  isCompleted?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'budget_warning' | 'budget_exceeded' | 'goal_milestone' | 'financial_tip' | 'debt_reminder' | 'info';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export type TimeRangeFilter = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'all' | 'custom';

export interface DateFilterRange {
  startDate: string;
  endDate: string;
  label: string;
}

export interface RecurringItem {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  dayOfMonth: number; // 1 - 31 (ngày nhận lương hàng tháng)
  accountId: string;
  categoryId?: string;
  paymentMethod: PaymentMethod;
  isActive: boolean;
  lastProcessedMonth?: string; // YYYY-MM
  createdAt: string;
  updatedAt: string;
}

export type DebtType = 'lend' | 'borrow'; // lend: Người nợ tôi (Cho vay), borrow: Tôi nợ người khác (Đi vay)
export type DebtStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type DebtBalanceAction = 'debit' | 'credit' | 'none'; // debit: Trừ tiền ví, credit: Cộng tiền ví, none: Không thay đổi số dư ví

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
  accountId?: string;
}

export interface DebtItem {
  id: string;
  userId: string;
  personName: string; // Tên người nợ / người cho vay
  relationship?: string; // Mối quan hệ: Bạn bè, Người thân, Em gái, Đồng nghiệp...
  phoneNumber?: string; // Số điện thoại liên hệ
  type: DebtType; // lend (Người nợ tôi) | borrow (Tôi nợ người khác)
  totalAmount: number; // Tổng số tiền nợ
  paidAmount: number; // Đã trả
  startDate: string; // Ngày vay / cho vay (YYYY-MM-DD)
  dueDate?: string; // Hạn chót cần trả (YYYY-MM-DD)
  accountId?: string; // Tài khoản liên kết
  note?: string; // Ghi chú (lý do mượn nợ, cam kết...)
  status: DebtStatus; // pending, partial, paid, overdue
  payments?: DebtPayment[]; // Lịch sử các đợt trả nợ
  createdAt: string;
  updatedAt: string;
}

