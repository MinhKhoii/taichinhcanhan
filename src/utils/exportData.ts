import * as XLSX from 'xlsx';
import { Transaction, Account, Category, Budget, SavingsGoal, DebtItem } from '../types';
import { formatDateVN } from './formatters';

export function exportTransactionsToExcel(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  fileName = 'MoneyFlow_Giao_Dich.xlsx'
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  const data = transactions.map((t, idx) => {
    let typeLabel = 'Chi tiêu';
    if (t.type === 'income') typeLabel = 'Thu nhập';
    if (t.type === 'transfer') typeLabel = 'Chuyển khoản';

    return {
      STT: idx + 1,
      'Ngày giao dịch': formatDateVN(t.date),
      'Loại giao dịch': typeLabel,
      'Số tiền (VNĐ)': t.amount,
      'Danh mục': t.categoryId ? catMap.get(t.categoryId) || 'Khác' : 'Chuyển khoản',
      'Tài khoản nguồn': accMap.get(t.accountId) || t.accountId,
      'Tài khoản đích': t.toAccountId ? accMap.get(t.toAccountId) || t.toAccountId : '-',
      'Phương thức': t.paymentMethod,
      'Ghi chú': t.note || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'GiaoDich');
  XLSX.writeFile(workbook, fileName);
}

export function exportDebtsToExcel(
  debts: DebtItem[],
  accounts: Account[],
  fileName = 'MoneyFlow_So_No.xlsx'
) {
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  // Sheet 1: Danh sách các khoản nợ
  const debtRows = debts.map((d, idx) => {
    const remaining = Math.max(0, d.totalAmount - d.paidAmount);
    let statusLabel = 'Đang nợ';
    if (d.status === 'paid' || remaining === 0) statusLabel = 'Đã thanh toán xong';
    else if (d.status === 'overdue') statusLabel = 'Quá hạn';
    else if (d.paidAmount > 0) statusLabel = 'Đã trả một phần';

    return {
      STT: idx + 1,
      'Phân loại': d.type === 'lend' ? 'Người khác nợ tôi (Cho vay)' : 'Tôi nợ người khác (Đi vay)',
      'Họ tên đối tác': d.personName,
      'Số điện thoại': d.phoneNumber || '-',
      'Tổng tiền nợ (VNĐ)': d.totalAmount,
      'Đã trả (VNĐ)': d.paidAmount,
      'Còn nợ lại (VNĐ)': remaining,
      'Ngày bắt đầu': formatDateVN(d.startDate),
      'Hạn chót trả nợ': d.dueDate ? formatDateVN(d.dueDate) : 'Không có hạn (Tin tưởng)',
      'Trạng thái': statusLabel,
      'Tài khoản giải ngân': d.accountId ? accMap.get(d.accountId) || d.accountId : '-',
      'Ghi chú cam kết': d.note || '',
    };
  });

  // Sheet 2: Chi tiết các đợt trả nợ
  const paymentRows: any[] = [];
  let pIdx = 1;
  debts.forEach((d) => {
    (d.payments || []).forEach((p) => {
      paymentRows.push({
        STT: pIdx++,
        'Đối tác': d.personName,
        'Hình thức': d.type === 'lend' ? 'Thu hồi nợ' : 'Hoàn trả nợ',
        'Số tiền thanh toán (VNĐ)': p.amount,
        'Ngày thanh toán': formatDateVN(p.date),
        'Tài khoản ví': p.accountId ? accMap.get(p.accountId) || p.accountId : '-',
        'Ghi chú đợt trả': p.note || '',
      });
    });
  });

  const workbook = XLSX.utils.book_new();
  const wsDebts = XLSX.utils.json_to_sheet(debtRows);
  XLSX.utils.book_append_sheet(workbook, wsDebts, 'DanhSachNo');

  if (paymentRows.length > 0) {
    const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
    XLSX.utils.book_append_sheet(workbook, wsPayments, 'LichSuTraNo');
  }

  XLSX.writeFile(workbook, fileName);
}

export function exportComprehensiveReportToExcel(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  budgets: Budget[],
  goals: SavingsGoal[],
  debts: DebtItem[] = [],
  fileName = 'MoneyFlow_Bao_Cao_Tai_Chinh.xlsx'
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const workbook = XLSX.utils.book_new();

  // 1. Sheet Tổng quan tài sản
  const accountData = accounts.map((a, i) => ({
    STT: i + 1,
    'Tên tài khoản': a.name,
    'Loại': a.type,
    'Số dư hiện tại (VNĐ)': a.balance,
    'Ngân hàng / Đơn vị': a.bankName || '-',
  }));
  const wsAccounts = XLSX.utils.json_to_sheet(accountData);
  XLSX.utils.book_append_sheet(workbook, wsAccounts, 'TaiKhoan');

  // 2. Sheet Giao dịch
  const txData = transactions.map((t, i) => ({
    STT: i + 1,
    'Ngày': formatDateVN(t.date),
    'Loại': t.type === 'income' ? 'Thu nhập' : t.type === 'expense' ? 'Chi tiêu' : 'Chuyển khoản',
    'Số tiền (VNĐ)': t.amount,
    'Danh mục': t.categoryId ? catMap.get(t.categoryId) || 'Khác' : '-',
    'Tài khoản': accMap.get(t.accountId) || '',
    'Ghi chú': t.note || '',
  }));
  const wsTx = XLSX.utils.json_to_sheet(txData);
  XLSX.utils.book_append_sheet(workbook, wsTx, 'GiaoDich');

  // 3. Sheet Ngân sách
  const budgetData = budgets.map((b, i) => ({
    STT: i + 1,
    'Tháng': b.month,
    'Danh mục': catMap.get(b.categoryId) || b.categoryId,
    'Hạn mức (VNĐ)': b.amount,
  }));
  const wsBudgets = XLSX.utils.json_to_sheet(budgetData);
  XLSX.utils.book_append_sheet(workbook, wsBudgets, 'NganSach');

  // 4. Sheet Mục tiêu tiết kiệm
  const goalData = goals.map((g, i) => ({
    STT: i + 1,
    'Tên mục tiêu': g.name,
    'Mục tiêu (VNĐ)': g.targetAmount,
    'Đã tích lũy (VNĐ)': g.currentAmount,
    'Tỷ lệ hoàn thành': `${((g.currentAmount / (g.targetAmount || 1)) * 100).toFixed(1)}%`,
    'Thời hạn': formatDateVN(g.deadline),
    'Trạng thái': g.isCompleted ? 'Đã hoàn thành' : 'Đang thực hiện',
  }));
  const wsGoals = XLSX.utils.json_to_sheet(goalData);
  XLSX.utils.book_append_sheet(workbook, wsGoals, 'MucTieuTietKiem');

  // 5. Sheet Sổ nợ & Cho vay (nếu có)
  if (debts.length > 0) {
    const debtData = debts.map((d, i) => ({
      STT: i + 1,
      'Phân loại': d.type === 'lend' ? 'Người khác nợ tôi' : 'Tôi nợ người khác',
      'Đối tác': d.personName,
      'Số điện thoại': d.phoneNumber || '-',
      'Tổng tiền (VNĐ)': d.totalAmount,
      'Đã trả (VNĐ)': d.paidAmount,
      'Còn lại (VNĐ)': Math.max(0, d.totalAmount - d.paidAmount),
      'Hạn trả': d.dueDate ? formatDateVN(d.dueDate) : 'Không hạn',
      'Trạng thái': d.status === 'paid' ? 'Đã trả hết' : d.status === 'overdue' ? 'Quá hạn' : 'Đang nợ',
    }));
    const wsDebts = XLSX.utils.json_to_sheet(debtData);
    XLSX.utils.book_append_sheet(workbook, wsDebts, 'SoNo');
  }

  XLSX.writeFile(workbook, fileName);
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  fileName = 'MoneyFlow_Giao_Dich.csv'
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = ['STT', 'Ngay', 'Loai', 'So_Tien_VND', 'Danh_Muc', 'Tai_Khoan', 'Ghi_Chu'];
  const rows = transactions.map((t, idx) => {
    const typeLabel = t.type === 'income' ? 'Thu nhap' : t.type === 'expense' ? 'Chi tieu' : 'Chuyen khoan';
    const cat = t.categoryId ? catMap.get(t.categoryId) || 'Khac' : 'Chuyen khoan';
    const acc = accMap.get(t.accountId) || '';
    const note = (t.note || '').replace(/"/g, '""');
    return [
      idx + 1,
      formatDateVN(t.date),
      typeLabel,
      t.amount,
      `"${cat}"`,
      `"${acc}"`,
      `"${note}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportAdminSystemReportToExcel(
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    createdAt: string;
    lastActive: string;
    txCount: number;
    accCount: number;
    budgetCount: number;
    savingsCount: number;
    debtCount: number;
    sizeKb: number;
    isAdmin: boolean;
  }>,
  summary: {
    totalUsers: number;
    adminCount: number;
    memberCount: number;
    totalTx: number;
    totalAcc: number;
    totalSizeKb: number;
    supabaseHost: string;
  },
  fileName = 'MoneyFlow_Bao_Cao_He_Thong.xlsx'
) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Danh sách người dùng
  const usersData = users.map((u, idx) => ({
    STT: idx + 1,
    'Họ và Tên': u.fullName,
    Email: u.email,
    'Vai trò': u.isAdmin ? 'Quản trị viên' : 'Thành viên',
    'Số ví tài khoản': u.accCount,
    'Số giao dịch': u.txCount,
    'Số ngân sách': u.budgetCount,
    'Số mục tiêu': u.savingsCount,
    'Số khoản nợ': u.debtCount,
    'Dung lượng Cloud (KB)': Number(u.sizeKb.toFixed(2)),
    'Ngày khởi tạo': new Date(u.createdAt).toLocaleDateString('vi-VN'),
    'Hoạt động lần cuối': new Date(u.lastActive).toLocaleString('vi-VN'),
    'Mã Backup Cloud': u.id,
  }));
  const sheetUsers = XLSX.utils.json_to_sheet(usersData);
  XLSX.utils.book_append_sheet(workbook, sheetUsers, 'Nguoi_Dung');

  // Sheet 2: Tổng quan hệ thống
  const summaryData = [
    { 'Chỉ Số Hệ Thống': 'Tổng số người dùng đăng ký', 'Giá Trị': String(summary.totalUsers) },
    { 'Chỉ Số Hệ Thống': 'Số lượng Quản trị viên', 'Giá Trị': String(summary.adminCount) },
    { 'Chỉ Số Hệ Thống': 'Số lượng Thành viên thường', 'Giá Trị': String(summary.memberCount) },
    { 'Chỉ Số Hệ Thống': 'Tổng số giao dịch toàn hệ thống', 'Giá Trị': String(summary.totalTx) },
    { 'Chỉ Số Hệ Thống': 'Tổng số ví / tài khoản toàn hệ thống', 'Giá Trị': String(summary.totalAcc) },
    { 'Chỉ Số Hệ Thống': 'Tổng dung lượng CSDL sử dụng (KB)', 'Giá Trị': summary.totalSizeKb.toFixed(2) + ' KB' },
    { 'Chỉ Số Hệ Thống': 'Máy chủ Đám mây Supabase', 'Giá Trị': summary.supabaseHost },
    { 'Chỉ Số Hệ Thống': 'Thời điểm xuất báo cáo', 'Giá Trị': new Date().toLocaleString('vi-VN') },
  ];
  const sheetSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, sheetSummary, 'Tong_Quan');

  XLSX.writeFile(workbook, fileName);
}


