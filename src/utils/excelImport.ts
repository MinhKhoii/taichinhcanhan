import * as XLSX from 'xlsx';
import { AppDatabase } from '../services/dataService';
import { Transaction, Account, Category, Budget, SavingsGoal, DebtItem } from '../types';

export interface ExcelImportResult {
  success: boolean;
  message: string;
  summary: {
    accountsAdded: number;
    transactionsAdded: number;
    transactionsSkippedDuplicates: number;
    budgetsAdded: number;
    goalsAdded: number;
    debtsAdded: number;
  };
}

/**
 * Helper to parse dates from various Excel representations:
 * - String "DD/MM/YYYY" or "D/M/YYYY"
 * - String "YYYY-MM-DD"
 * - Numeric Excel serial date (e.g., 45600)
 */
function parseExcelDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];

  // If already YYYY-MM-DD
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }

  // If DD/MM/YYYY
  if (typeof val === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val.trim())) {
    const parts = val.trim().split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  // If Excel numeric serial date code
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        const y = parsed.y;
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {}
  }

  // Fallback try Date object
  const dateObj = new Date(val);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Helper to parse monetary amounts (handles strings with dots, commas, symbols)
 */
function parseAmount(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.abs(val);
  if (typeof val === 'string') {
    // Remove "đ", "VND", spaces, and currency symbols
    const clean = val.replace(/[đ₫VNDvnd\s]/g, '').trim();
    // If format like "1.000.000,50" vs "1,000,000.50"
    if (clean.includes('.') && clean.includes(',')) {
      if (clean.lastIndexOf('.') > clean.lastIndexOf(',')) {
        // American 1,000.50
        const n = parseFloat(clean.replace(/,/g, ''));
        return isNaN(n) ? 0 : Math.abs(n);
      } else {
        // Vietnamese 1.000,50
        const n = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
        return isNaN(n) ? 0 : Math.abs(n);
      }
    } else if (clean.includes('.')) {
      // Could be 1.000.000 (VND integer with dot separators) or 100.50
      const parts = clean.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        const n = parseFloat(clean.replace(/\./g, ''));
        return isNaN(n) ? 0 : Math.abs(n);
      }
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : Math.abs(n);
    } else if (clean.includes(',')) {
      const parts = clean.split(',');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        const n = parseFloat(clean.replace(/,/g, ''));
        return isNaN(n) ? 0 : Math.abs(n);
      }
      const n = parseFloat(clean.replace(',', '.'));
      return isNaN(n) ? 0 : Math.abs(n);
    }
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : Math.abs(n);
  }
  return 0;
}

/**
 * Creates a unique signature for a transaction to prevent duplicate import
 */
function getTxSignature(date: string, type: string, amount: number, accountNameOrId: string, note?: string): string {
  const cleanNote = (note || '').trim().toLowerCase();
  const cleanAcc = (accountNameOrId || '').trim().toLowerCase();
  return `${date}_${type}_${amount}_${cleanAcc}_${cleanNote}`;
}

/**
 * Main importer from Excel ArrayBuffer / File
 */
export function importExcelToMoneyFlow(
  fileBuffer: ArrayBuffer,
  currentDb: AppDatabase
): { updatedDb: AppDatabase; result: ExcelImportResult } {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  const summary = {
    accountsAdded: 0,
    transactionsAdded: 0,
    transactionsSkippedDuplicates: 0,
    budgetsAdded: 0,
    goalsAdded: 0,
    debtsAdded: 0,
  };

  const updatedDb: AppDatabase = {
    ...currentDb,
    accounts: [...currentDb.accounts],
    categories: [...currentDb.categories],
    transactions: [...currentDb.transactions],
    budgets: [...currentDb.budgets],
    savingsGoals: [...currentDb.savingsGoals],
    debts: [...(currentDb.debts || [])],
  };

  const accMapByName = new Map<string, Account>(
    updatedDb.accounts.map((a) => [a.name.trim().toLowerCase(), a])
  );
  const catMapByName = new Map<string, Category>(
    updatedDb.categories.map((c) => [c.name.trim().toLowerCase(), c])
  );

  // 1. IMPORT SHEET TÀI KHOẢN ('TaiKhoan' or similar)
  const accSheetName = sheetNames.find((s) => s.toLowerCase().includes('taikhoan') || s.toLowerCase().includes('account'));
  if (accSheetName) {
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[accSheetName]);
    rows.forEach((row) => {
      const name = (row['Tên tài khoản'] || row['Tên'] || row['Name'] || '').toString().trim();
      if (!name) return;

      const lowerName = name.toLowerCase();
      if (!accMapByName.has(lowerName)) {
        const typeRaw = (row['Loại'] || row['Type'] || 'bank').toString().toLowerCase();
        let accType: any = 'bank';
        if (typeRaw.includes('mặt') || typeRaw.includes('cash')) accType = 'cash';
        else if (typeRaw.includes('tín dụng') || typeRaw.includes('credit')) accType = 'credit';
        else if (typeRaw.includes('đầu tư') || typeRaw.includes('invest')) accType = 'investment';
        else if (typeRaw.includes('tiết kiệm') || typeRaw.includes('saving')) accType = 'savings';
        else if (typeRaw.includes('ví điện tử') || typeRaw.includes('e-wallet')) accType = 'e-wallet';

        const balance = parseAmount(row['Số dư hiện tại (VNĐ)'] || row['Số dư'] || row['Balance'] || 0);

        const newAcc: Account = {
          id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          userId: currentDb.user.id,
          name,
          type: accType,
          balance,
          initialBalance: balance,
          bankName: row['Ngân hàng / Đơn vị'] || row['Ngân hàng'] || undefined,
          color: '#10B981',
          icon: 'Wallet',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        updatedDb.accounts.push(newAcc);
        accMapByName.set(lowerName, newAcc);
        summary.accountsAdded++;
      }
    });
  }

  // Ensure default account exists if none
  if (updatedDb.accounts.length === 0) {
    const defaultAcc: Account = {
      id: `acc_default_${Date.now()}`,
      userId: currentDb.user.id,
      name: 'Ví tiền mặt chính',
      type: 'cash',
      balance: 0,
      initialBalance: 0,
      color: '#10B981',
      icon: 'Wallet',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updatedDb.accounts.push(defaultAcc);
    accMapByName.set(defaultAcc.name.toLowerCase(), defaultAcc);
  }

  const primaryAcc = updatedDb.accounts[0];

  // Build existing transactions signature set for deduplication
  const existingSignatures = new Set<string>();
  const accMapById = new Map<string, Account>(updatedDb.accounts.map((a) => [a.id, a]));

  updatedDb.transactions.forEach((t) => {
    const acc = accMapById.get(t.accountId);
    const accName = acc ? acc.name : t.accountId;
    const sig = getTxSignature(t.date, t.type, t.amount, accName, t.note);
    existingSignatures.add(sig);
  });

  // 2. IMPORT SHEET GIAO DỊCH ('GiaoDich' or 'Transactions')
  const txSheetName = sheetNames.find(
    (s) => s.toLowerCase().includes('giaodich') || s.toLowerCase().includes('transaction')
  );
  if (txSheetName) {
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[txSheetName]);
    const newTransactions: Transaction[] = [];

    rows.forEach((row) => {
      const amount = parseAmount(row['Số tiền (VNĐ)'] || row['Số tiền'] || row['Amount'] || 0);
      if (amount <= 0) return;

      const dateStr = parseExcelDate(row['Ngày giao dịch'] || row['Ngày'] || row['Date']);
      const typeRaw = (row['Loại giao dịch'] || row['Loại'] || row['Type'] || 'Chi tiêu').toString().toLowerCase();

      let txType: 'income' | 'expense' | 'transfer' = 'expense';
      if (typeRaw.includes('thu') || typeRaw.includes('income')) txType = 'income';
      else if (typeRaw.includes('chuyển') || typeRaw.includes('transfer')) txType = 'transfer';

      const note = (row['Ghi chú'] || row['Note'] || '').toString().trim();

      // Find or match Account
      const accField = (row['Tài khoản nguồn'] || row['Tài khoản'] || row['Account'] || '').toString().trim();
      let matchedAcc = accMapByName.get(accField.toLowerCase());
      if (!matchedAcc && accField) {
        // Auto create missing account found in transactions
        const newAcc: Account = {
          id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          userId: currentDb.user.id,
          name: accField,
          type: 'bank',
          balance: 0,
          initialBalance: 0,
          color: '#3B82F6',
          icon: 'Building2',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedDb.accounts.push(newAcc);
        accMapByName.set(accField.toLowerCase(), newAcc);
        accMapById.set(newAcc.id, newAcc);
        matchedAcc = newAcc;
        summary.accountsAdded++;
      }
      const accountId = matchedAcc ? matchedAcc.id : primaryAcc.id;

      // Deduplication check
      const sig = getTxSignature(dateStr, txType, amount, matchedAcc ? matchedAcc.name : primaryAcc.name, note);
      if (existingSignatures.has(sig)) {
        summary.transactionsSkippedDuplicates++;
        return; // SKIP DUPLICATE
      }
      existingSignatures.add(sig);

      // Find or match Category
      const catField = (row['Danh mục'] || row['Category'] || '').toString().trim();
      let catId: string | undefined = undefined;
      if (catField && txType !== 'transfer') {
        let matchedCat = catMapByName.get(catField.toLowerCase());
        if (!matchedCat) {
          // Auto create missing category
          const newCat: Category = {
            id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            userId: currentDb.user.id,
            name: catField,
            type: txType,
            icon: txType === 'income' ? 'TrendingUp' : 'Tag',
            color: txType === 'income' ? '#10B981' : '#EF4444',
            isDefault: false,
            createdAt: new Date().toISOString(),
          };
          updatedDb.categories.push(newCat);
          catMapByName.set(catField.toLowerCase(), newCat);
          matchedCat = newCat;
        }
        catId = matchedCat.id;
      }

      // Check destination account if transfer
      let toAccountId: string | undefined = undefined;
      if (txType === 'transfer') {
        const toAccField = (row['Tài khoản đích'] || row['To Account'] || '').toString().trim();
        if (toAccField) {
          const matchedToAcc = accMapByName.get(toAccField.toLowerCase());
          if (matchedToAcc) toAccountId = matchedToAcc.id;
        }
      }

      const methodRaw = (row['Phương thức'] || row['Payment Method'] || 'transfer').toString().toLowerCase();
      let method: any = 'transfer';
      if (methodRaw.includes('mặt') || methodRaw.includes('cash')) method = 'cash';
      else if (methodRaw.includes('thẻ') || methodRaw.includes('card')) method = 'credit_card';
      else if (methodRaw.includes('ví') || methodRaw.includes('wallet')) method = 'e_wallet';

      const newTx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        userId: currentDb.user.id,
        type: txType,
        amount,
        date: dateStr,
        categoryId: catId,
        accountId,
        toAccountId,
        transferFee: parseAmount(row['Phí chuyển khoản'] || row['Phí'] || 0),
        note,
        paymentMethod: method,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      newTransactions.push(newTx);
      summary.transactionsAdded++;
    });

    if (newTransactions.length > 0) {
      updatedDb.transactions = [...newTransactions, ...updatedDb.transactions];
    }
  }

  // 3. IMPORT SHEET NGÂN SÁCH ('NganSach' or 'Budgets')
  const budgetSheetName = sheetNames.find(
    (s) => s.toLowerCase().includes('ngansach') || s.toLowerCase().includes('budget')
  );
  if (budgetSheetName) {
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[budgetSheetName]);
    rows.forEach((row) => {
      const month = (row['Tháng'] || row['Month'] || new Date().toISOString().slice(0, 7)).toString().trim();
      const amount = parseAmount(row['Hạn mức (VNĐ)'] || row['Hạn mức'] || row['Amount'] || 0);
      const catName = (row['Danh mục'] || row['Category'] || '').toString().trim();
      if (amount <= 0 || !catName) return;

      const cat = catMapByName.get(catName.toLowerCase());
      if (cat) {
        const existingIdx = updatedDb.budgets.findIndex((b) => b.categoryId === cat.id && b.month === month);
        if (existingIdx >= 0) {
          updatedDb.budgets[existingIdx].amount = amount;
        } else {
          updatedDb.budgets.push({
            id: `bgt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            userId: currentDb.user.id,
            categoryId: cat.id,
            amount,
            month,
            alertThreshold: 0.8,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          summary.budgetsAdded++;
        }
      }
    });
  }

  // 4. IMPORT SHEET MỤC TIÊU TIẾT KIỆM ('MucTieuTietKiem' or 'Goals')
  const goalSheetName = sheetNames.find(
    (s) => s.toLowerCase().includes('muctieu') || s.toLowerCase().includes('goal') || s.toLowerCase().includes('tietkiem')
  );
  if (goalSheetName) {
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[goalSheetName]);
    rows.forEach((row) => {
      const name = (row['Tên mục tiêu'] || row['Tên'] || row['Name'] || '').toString().trim();
      const targetAmount = parseAmount(row['Mục tiêu (VNĐ)'] || row['Target'] || 0);
      if (!name || targetAmount <= 0) return;

      const existing = updatedDb.savingsGoals.find((g) => g.name.toLowerCase() === name.toLowerCase());
      if (!existing) {
        updatedDb.savingsGoals.push({
          id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          userId: currentDb.user.id,
          name,
          targetAmount,
          currentAmount: parseAmount(row['Đã tích lũy (VNĐ)'] || row['Current'] || 0),
          deadline: parseExcelDate(row['Thời hạn'] || row['Deadline']),
          icon: 'Target',
          color: '#3B82F6',
          isCompleted: (row['Trạng thái'] || '').toString().toLowerCase().includes('hoàn thành'),
          notes: row['Ghi chú'] || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        summary.goalsAdded++;
      }
    });
  }

  // 5. IMPORT SHEET SỔ NỢ & CHO VAY ('SoNo' or 'Debts')
  const debtSheetName = sheetNames.find(
    (s) => s.toLowerCase().includes('sono') || s.toLowerCase().includes('debt')
  );
  if (debtSheetName) {
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[debtSheetName]);
    rows.forEach((row) => {
      const personName = (row['Đối tác'] || row['Họ tên đối tác'] || row['Người'] || row['Name'] || '').toString().trim();
      const totalAmount = parseAmount(row['Tổng tiền (VNĐ)'] || row['Tổng tiền nợ (VNĐ)'] || row['Total'] || 0);
      if (!personName || totalAmount <= 0) return;

      const typeRaw = (row['Phân loại'] || row['Type'] || 'lend').toString().toLowerCase();
      const debtType: 'lend' | 'borrow' = typeRaw.includes('tôi nợ') || typeRaw.includes('borrow') ? 'borrow' : 'lend';
      const paidAmount = parseAmount(row['Đã trả (VNĐ)'] || row['Đã trả'] || 0);

      const existing = updatedDb.debts.find(
        (d) => d.personName.toLowerCase() === personName.toLowerCase() && d.totalAmount === totalAmount
      );

      if (!existing) {
        updatedDb.debts.push({
          id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          userId: currentDb.user.id,
          personName,
          phoneNumber: row['Số điện thoại'] || undefined,
          type: debtType,
          totalAmount,
          paidAmount,
          startDate: parseExcelDate(row['Ngày bắt đầu'] || row['Start Date']),
          dueDate: row['Hạn trả'] && !row['Hạn trả'].toString().includes('Không') ? parseExcelDate(row['Hạn trả']) : undefined,
          note: row['Ghi chú cam kết'] || row['Ghi chú'] || undefined,
          status: paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending'),
          payments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        summary.debtsAdded++;
      }
    });
  }

  // 6. Recalculate account balances to ensure 100% mathematical integrity
  for (const acc of updatedDb.accounts) {
    let calcBalance = acc.initialBalance || 0;
    for (const tx of updatedDb.transactions) {
      if (tx.accountId === acc.id) {
        if (tx.type === 'income') calcBalance += tx.amount;
        else if (tx.type === 'expense') calcBalance -= tx.amount;
        else if (tx.type === 'transfer') calcBalance -= (tx.amount + (tx.transferFee || 0));
      }
      if (tx.toAccountId === acc.id && tx.type === 'transfer') {
        calcBalance += tx.amount;
      }
    }
    acc.balance = Math.round(calcBalance * 100) / 100;
  }

  const result: ExcelImportResult = {
    success: true,
    message: `Nhập dữ liệu Excel thành công: Thêm mới ${summary.transactionsAdded} giao dịch (bỏ qua ${summary.transactionsSkippedDuplicates} giao dịch trùng lặp), ${summary.accountsAdded} tài khoản ví, ${summary.debtsAdded} khoản nợ.`,
    summary,
  };

  return { updatedDb, result };
}
