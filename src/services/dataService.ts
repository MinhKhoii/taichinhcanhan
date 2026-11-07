import {
  Account,
  Category,
  Transaction,
  Budget,
  SavingsGoal,
  User,
  NotificationItem,
  RecurringItem,
  DebtItem,
  DebtBalanceAction,
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { importExcelToMoneyFlow, ExcelImportResult } from '../utils/excelImport';
import {
  initialAccounts,
  initialCategories,
  initialTransactions,
  initialBudgets,
  initialSavingsGoals,
  initialUser,
  initialNotifications,
  initialDebts,
} from './seedData';

const STORAGE_KEY = 'moneyflow_app_state_v1';

export interface AppDatabase {
  user: User;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  notifications: NotificationItem[];
  recurringItems: RecurringItem[];
  debts: DebtItem[];
}

export class DataService {
  private static instance: DataService;
  private db: AppDatabase;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.db = this.loadState();
    this.processRecurringTransactions();
    this.processDailyYield();
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  private getStorageKey(userEmail?: string): string {
    const email = (userEmail || this.db?.user?.email || 'default').toLowerCase().trim();
    const clean = email.replace(/[^a-z0-9]/g, '_');
    return `moneyflow_state_${clean}`;
  }

  public switchUser(user: User): AppDatabase {
    return this.loadUserState(user.email, user.fullName);
  }

  public loadUserState(userEmail: string, userFullName?: string): AppDatabase {
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    const key = this.getStorageKey(cleanEmail);

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.transactions && parsed.accounts && parsed.categories) {
          // If Khôi and saved has 0 transactions, recover from legacy storage
          if (cleanEmail.includes('minhkhoj') && parsed.transactions.length === 0) {
            const legacy = localStorage.getItem(STORAGE_KEY);
            if (legacy) {
              try {
                const parsedLegacy = JSON.parse(legacy);
                if (parsedLegacy.transactions && parsedLegacy.transactions.length > 0) {
                  parsed.transactions = parsedLegacy.transactions;
                  parsed.accounts = parsedLegacy.accounts;
                  parsed.debts = parsedLegacy.debts || initialDebts;
                  parsed.savingsGoals = parsedLegacy.savingsGoals || [];
                  parsed.recurringItems = parsedLegacy.recurringItems || [];
                  parsed.budgets = parsedLegacy.budgets || [];
                }
              } catch { }
            }
          }

          if (!parsed.recurringItems) parsed.recurringItems = [];
          if (!parsed.debts) parsed.debts = initialDebts;
          if (this.healAccountsState(parsed)) {
            localStorage.setItem(key, JSON.stringify(parsed));
          }
          this.db = parsed;
          this.notifyListeners();
          return this.db;
        }
      }

      // Check if this is Khôi and legacy storage exists
      if (cleanEmail.includes('minhkhoj') || cleanEmail.includes('khoi')) {
        const legacy = localStorage.getItem(STORAGE_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (parsed.transactions && parsed.accounts) {
            if (!parsed.recurringItems) parsed.recurringItems = [];
            if (!parsed.debts) parsed.debts = initialDebts;
            parsed.user.email = 'minhkhoj2002@gmail.com';
            parsed.user.fullName = userFullName || 'Khôi';
            if (this.healAccountsState(parsed)) {
              localStorage.setItem(key, JSON.stringify(parsed));
            }
            this.db = parsed;
            this.saveState();
            this.notifyListeners();
            return this.db;
          }
        }

        // If no legacy, initialize Khôi with full rich initial data
        const khoiFullState: AppDatabase = {
          user: {
            id: 'usr_khoi_primary',
            fullName: userFullName || 'Khôi',
            email: 'minhkhoj2002@gmail.com',
            currency: 'VND',
            dateFormat: 'DD/MM/YYYY',
            autoOffsetNegative: true,
            fontSize: 'medium',
            createdAt: '2026-09-01T00:00:00.000Z',
          },
          accounts: initialAccounts,
          categories: initialCategories,
          transactions: initialTransactions,
          budgets: initialBudgets,
          savingsGoals: initialSavingsGoals,
          notifications: initialNotifications,
          recurringItems: [],
          debts: initialDebts,
        };
        this.db = khoiFullState;
        this.saveState();
        this.notifyListeners();
        return this.db;
      }
    } catch (e) {
      console.error('Failed to load user state:', e);
    }

    // New user initial state: clean, zero transactions, zero debts, individual fresh accounts
    const newUserState: AppDatabase = {
      user: {
        id: `usr_${Date.now()}`,
        fullName: userFullName || cleanEmail.split('@')[0],
        email: cleanEmail,
        currency: 'VND',
        dateFormat: 'DD/MM/YYYY',
        autoOffsetNegative: true,
        fontSize: 'medium',
        createdAt: new Date().toISOString(),
      },
      accounts: [
        {
          id: `acc_cash_${Date.now()}`,
          userId: `usr_${Date.now()}`,
          name: 'Tiền mặt ví cá nhân',
          type: 'cash',
          balance: 0,
          initialBalance: 0,
          color: '#10B981',
          icon: 'Wallet',
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
        },
        {
          id: `acc_bank_${Date.now()}`,
          userId: `usr_${Date.now()}`,
          name: 'Tài khoản ngân hàng',
          type: 'bank',
          balance: 0,
          initialBalance: 0,
          color: '#0284C7',
          icon: 'Building2',
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
        },
      ],
      categories: initialCategories,
      transactions: [],
      budgets: [],
      savingsGoals: [],
      notifications: [
        {
          id: `notif_${Date.now()}`,
          userId: `usr_${Date.now()}`,
          title: 'Chào mừng bạn đến với MoneyFlow!',
          message: 'Tài khoản cá nhân của bạn đã được khởi tạo an toàn. Dữ liệu hoàn toàn bảo mật và độc lập!',
          type: 'info',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      recurringItems: [],
      debts: [],
    };

    this.db = newUserState;
    this.saveState();
    this.notifyListeners();
    return this.db;
  }

  /**
   * Tự động kiểm tra và phục hồi số dư an toàn nếu tài khoản bị âm hoặc số dư bị lệch do lỗi tính toán cũ
   * Cam kết: Tuyệt đối KHÔNG tự động trừ tiền của người dùng và giữ nguyên vẹn 100% số dư thực tế
   */
  public healAccountsState(db: AppDatabase): boolean {
    if (!db || !db.accounts) return false;
    let changed = false;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Kiểm tra và loại bỏ các giao dịch cấn trừ tự động bị kích hoạt lỗi trước đây (nếu có)
    const hasNegativeAcc = db.accounts.some((a) => a.balance < 0);
    if (hasNegativeAcc && db.transactions) {
      const originalTxCount = db.transactions.length;
      db.transactions = db.transactions.filter((t) => !t.note?.includes('⚡ Bù trừ số dư âm'));
      if (db.transactions.length !== originalTxCount) {
        changed = true;
      }
    }

    // 2. Bảo toàn và chuẩn hóa số dư cho từng tài khoản, không trừ tiền, không can thiệp số dư hợp lệ
    for (const acc of db.accounts) {
      // Đảm bảo các ví sinh lời có ngày chốt để không tự cộng dồn trùng lặp trong ngày hôm nay
      if (acc.isYieldEnabled && !acc.lastYieldDate) {
        acc.lastYieldDate = todayStr;
        changed = true;
      }

      // Tính tổng dòng tiền giao dịch thực tế của tài khoản này
      let txSum = 0;
      if (db.transactions) {
        for (const tx of db.transactions) {
          if (tx.accountId === acc.id) {
            if (tx.type === 'income') txSum += tx.amount;
            else if (tx.type === 'expense') txSum -= tx.amount;
            else if (tx.type === 'transfer') txSum -= (tx.amount + (tx.transferFee || 0));
          }
          if (tx.toAccountId === acc.id && tx.type === 'transfer') {
            txSum += tx.amount;
          }
        }
      }

      // Nếu số dư bị âm do lỗi logic cũ: Phục hồi để không bị âm
      if (acc.balance < 0) {
        acc.initialBalance = Math.max(0, Math.abs(txSum));
        acc.balance = 0;
        changed = true;
      } else {
        // Chuẩn hóa initialBalance = balance - txSum để đảm bảo cân bằng tuyệt đối
        // Giữ nguyên 100% số dư acc.balance của người dùng, không bao giờ trừ bớt
        const expectedInitial = acc.balance - txSum;
        if (acc.initialBalance !== expectedInitial) {
          acc.initialBalance = expectedInitial;
          changed = true;
        }
      }
    }

    return changed;
  }

  private loadState(): AppDatabase {
    // Check if an auth session exists
    let activeEmail = 'minhkhoj2002@gmail.com';
    try {
      const sessStr = localStorage.getItem('moneyflow_auth_session_v1');
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        if (sess?.user?.email) activeEmail = sess.user.email;
      }
    } catch { }

    const key = this.getStorageKey(activeEmail);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.transactions && parsed.accounts && parsed.categories) {
          if (!parsed.recurringItems) parsed.recurringItems = [];
          if (!parsed.debts) parsed.debts = initialDebts;
          if (parsed.user) {
            if (parsed.user.autoOffsetNegative === undefined) {
              parsed.user.autoOffsetNegative = true;
            }
            if (!parsed.user.fontSize) {
              parsed.user.fontSize = 'medium';
            }
            // Tự động đồng bộ API Key Gemini giữa LocalStorage và Tài khoản User
            const localApiKey = localStorage.getItem('moneyflow_gemini_api_key')?.trim();
            if (localApiKey && !parsed.user.geminiApiKey) {
              parsed.user.geminiApiKey = localApiKey;
            } else if (parsed.user.geminiApiKey && !localApiKey) {
              localStorage.setItem('moneyflow_gemini_api_key', parsed.user.geminiApiKey);
            }
          }
          if (this.healAccountsState(parsed)) {
            localStorage.setItem(key, JSON.stringify(parsed));
          }
          return parsed;
        }
      }

      // Check legacy storage for Khôi
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed.transactions && parsed.accounts && parsed.categories) {
          if (!parsed.recurringItems) parsed.recurringItems = [];
          if (!parsed.debts) parsed.debts = initialDebts;
          if (this.healAccountsState(parsed)) {
            localStorage.setItem(key, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load local MoneyFlow state:', e);
    }

    // Default seed data
    return {
      user: initialUser,
      accounts: initialAccounts,
      categories: initialCategories,
      transactions: initialTransactions,
      budgets: initialBudgets,
      savingsGoals: initialSavingsGoals,
      notifications: initialNotifications,
      recurringItems: [],
      debts: initialDebts,
    };
  }

  private autoSyncTimer: ReturnType<typeof setTimeout> | null = null;

  private triggerAutoCloudSync(): void {
    if (!isSupabaseConfigured || !supabase) return;
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }
    this.autoSyncTimer = setTimeout(async () => {
      try {
        await this.syncToSupabase();
      } catch (err) {
        console.warn('Auto cloud sync notice:', err);
      }
    }, 1500);
  }

  private saveState(): void {
    try {
      const nowIso = new Date().toISOString();
      localStorage.setItem('moneyflow_last_local_updated_at', nowIso);
      const key = this.getStorageKey();
      localStorage.setItem(key, JSON.stringify(this.db));

      // Also sync to legacy key for backwards compatibility if Khôi
      const email = (this.db.user.email || '').toLowerCase();
      if (email.includes('minhkhoj') || email.includes('khoi')) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      }

      this.notifyListeners();
      this.triggerAutoCloudSync();
    } catch (e) {
      console.error('Failed to save MoneyFlow state to local storage:', e);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Listener notification error:', err);
      }
    });
  }

  // ===================== USER =====================
  public getUser(): User {
    const localApiKey = localStorage.getItem('moneyflow_gemini_api_key')?.trim();
    if (localApiKey && !this.db.user.geminiApiKey) {
      this.db.user.geminiApiKey = localApiKey;
    }
    return { ...this.db.user };
  }

  public updateUser(userUpdate: Partial<User>): User {
    this.db.user = { ...this.db.user, ...userUpdate };
    if (userUpdate.geminiApiKey !== undefined) {
      if (userUpdate.geminiApiKey) {
        localStorage.setItem('moneyflow_gemini_api_key', userUpdate.geminiApiKey.trim());
      } else {
        localStorage.removeItem('moneyflow_gemini_api_key');
      }
    }
    this.saveState();
    return this.getUser();
  }

  // ===================== ACCOUNTS =====================
  public getAccounts(): Account[] {
    return [...this.db.accounts];
  }

  public getAccountById(id: string): Account | undefined {
    return this.db.accounts.find((a) => a.id === id);
  }

  public createAccount(accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Account {
    const newAccount: Account = {
      ...accountData,
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: this.db.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.accounts.push(newAccount);
    this.saveState();
    return newAccount;
  }

  public getAccountNetTransactions(accountId: string): number {
    if (!this.db.transactions) return 0;
    let sum = 0;
    for (const tx of this.db.transactions) {
      if (tx.accountId === accountId) {
        if (tx.type === 'income') sum += tx.amount;
        else if (tx.type === 'expense') sum -= tx.amount;
        else if (tx.type === 'transfer') sum -= (tx.amount + (tx.transferFee || 0));
      }
      if (tx.toAccountId === accountId && tx.type === 'transfer') {
        sum += tx.amount;
      }
    }
    return sum;
  }

  public updateAccount(id: string, updates: Partial<Account>): Account {
    const index = this.db.accounts.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Account not found');

    // Nếu người dùng cập nhật số dư mới, tự động chuẩn hóa initialBalance để số dư này luôn được bảo toàn
    if (updates.balance !== undefined && updates.initialBalance === undefined) {
      const netTx = this.getAccountNetTransactions(id);
      updates.initialBalance = updates.balance - netTx;
    }

    this.db.accounts[index] = {
      ...this.db.accounts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState();
    return this.db.accounts[index];
  }

  public deleteAccount(id: string): void {
    // Check if account has transactions
    const hasTx = this.db.transactions.some((t) => t.accountId === id || t.toAccountId === id);
    if (hasTx) {
      throw new Error('Không thể xóa tài khoản đã có lịch sử giao dịch. Bạn có thể lưu trữ (archive) thay thế.');
    }
    this.db.accounts = this.db.accounts.filter((a) => a.id !== id);
    this.saveState();
  }

  // ===================== BALANCE OFFSET & SYNC =====================
  public recalculateAccountBalances(): void {
    for (const acc of this.db.accounts) {
      const txSum = this.getAccountNetTransactions(acc.id);

      // Nếu số dư tài khoản hợp lệ, chuẩn hóa initialBalance để số dư luôn giữ nguyên vẹn
      if (acc.balance >= 0) {
        if (acc.initialBalance === undefined || acc.initialBalance === null || (acc.initialBalance + txSum) !== acc.balance) {
          acc.initialBalance = acc.balance - txSum;
        }
      } else {
        // Nếu số dư bị âm (chi vượt quá số tiền có)
        acc.initialBalance = Math.max(0, Math.abs(txSum));
        acc.balance = 0;
      }
    }
    this.saveState();
    this.notifyListeners();
  }

  public autoOffsetNegativeAccount(negativeAccountId: string, sourceAccountId?: string): boolean {
    const negAcc = this.db.accounts.find((a) => a.id === negativeAccountId);
    if (!negAcc || negAcc.balance >= 0) return false;

    const deficit = Math.abs(negAcc.balance);

    // Tìm ví nguồn (hoặc do chỉ định, hoặc lấy ví có số dư khả dụng cao nhất)
    let sourceAcc: Account | undefined;
    if (sourceAccountId && sourceAccountId !== negAcc.id) {
      sourceAcc = this.db.accounts.find((a) => a.id === sourceAccountId && a.balance > 0);
    }

    if (!sourceAcc) {
      const candidates = this.db.accounts
        .filter((a) => a.id !== negAcc.id && a.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      sourceAcc = candidates[0];
    }

    if (!sourceAcc || sourceAcc.balance <= 0) {
      return false;
    }

    const offsetAmount = Math.min(deficit, sourceAcc.balance);
    if (offsetAmount <= 0) return false;

    const today = new Date().toISOString().split('T')[0];

    // Tạo giao dịch chuyển khoản cấn trừ nội bộ
    this.createTransaction({
      type: 'transfer',
      accountId: sourceAcc.id,
      toAccountId: negAcc.id,
      amount: offsetAmount,
      date: today,
      note: `⚡ Bù trừ số dư âm: Cấn trừ ${offsetAmount.toLocaleString('vi-VN')} ₫ từ ${sourceAcc.name} sang ${negAcc.name}`,
      paymentMethod: 'transfer',
    });

    this.addNotification(
      'Cân bằng số dư ví thành công ✨',
      `Đã tự động cấn trừ ${offsetAmount.toLocaleString('vi-VN')} ₫ từ ví "${sourceAcc.name}" sang ví "${negAcc.name}" để đưa số dư về mức an toàn.`,
      'info',
      'accounts'
    );

    return true;
  }

  public autoOffsetAllNegativeAccounts(): number {
    const negativeAccounts = this.db.accounts.filter((a) => a.balance < 0);
    let resolvedCount = 0;
    for (const neg of negativeAccounts) {
      const success = this.autoOffsetNegativeAccount(neg.id);
      if (success) resolvedCount++;
    }
    return resolvedCount;
  }

  // ===================== CATEGORIES =====================
  public getCategories(): Category[] {
    return [...this.db.categories];
  }

  public createCategory(categoryData: Omit<Category, 'id' | 'createdAt'>): Category {
    const newCategory: Category = {
      ...categoryData,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.categories.push(newCategory);
    this.saveState();
    return newCategory;
  }

  public updateCategory(id: string, updates: Partial<Category>): Category {
    const index = this.db.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Category not found');
    this.db.categories[index] = {
      ...this.db.categories[index],
      ...updates,
    };
    this.saveState();
    return this.db.categories[index];
  }

  public deleteCategory(id: string): void {
    this.db.categories = this.db.categories.filter((c) => c.id !== id);
    // Unlink from transactions
    this.db.transactions = this.db.transactions.map((t) =>
      t.categoryId === id ? { ...t, categoryId: undefined } : t
    );
    // Remove associated budgets
    this.db.budgets = this.db.budgets.filter((b) => b.categoryId !== id);
    this.saveState();
  }

  // ===================== TRANSACTIONS & BALANCE SYNC =====================
  public getTransactions(): Transaction[] {
    return [...this.db.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  private applyTransactionToAccounts(tx: Transaction, reverse = false): void {
    const multiplier = reverse ? -1 : 1;

    if (tx.type === 'income') {
      const acc = this.db.accounts.find((a) => a.id === tx.accountId);
      if (acc) {
        acc.balance = Math.round((acc.balance + tx.amount * multiplier) * 100) / 100;
      }
    } else if (tx.type === 'expense') {
      const acc = this.db.accounts.find((a) => a.id === tx.accountId);
      if (acc) {
        acc.balance = Math.round((acc.balance - tx.amount * multiplier) * 100) / 100;
      }
    } else if (tx.type === 'transfer') {
      const fromAcc = this.db.accounts.find((a) => a.id === tx.accountId);
      const toAcc = tx.toAccountId ? this.db.accounts.find((a) => a.id === tx.toAccountId) : null;
      const totalDeduction = tx.amount + (tx.transferFee || 0);

      if (fromAcc) {
        fromAcc.balance = Math.round((fromAcc.balance - totalDeduction * multiplier) * 100) / 100;
      }
      if (toAcc) {
        toAcc.balance = Math.round((toAcc.balance + tx.amount * multiplier) * 100) / 100;
      }
    }
  }

  public createTransaction(txData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Transaction {
    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: this.db.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Apply effect to account balance
    this.applyTransactionToAccounts(newTx, false);

    this.db.transactions.unshift(newTx);
    this.saveState();

    // Tự động cấn trừ từ tài khoản có tiền nếu ví này bị âm sau giao dịch
    if (this.db.user.autoOffsetNegative !== false && newTx.type !== 'transfer') {
      const changedAcc = this.db.accounts.find((a) => a.id === newTx.accountId);
      if (changedAcc && changedAcc.balance < 0) {
        this.autoOffsetNegativeAccount(changedAcc.id);
      }
    }

    return newTx;
  }

  public updateTransaction(id: string, updates: Partial<Transaction>): Transaction {
    const index = this.db.transactions.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Transaction not found');

    const oldTx = this.db.transactions[index];
    // Reverse old balance
    this.applyTransactionToAccounts(oldTx, true);

    const updatedTx: Transaction = {
      ...oldTx,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Apply new balance
    this.applyTransactionToAccounts(updatedTx, false);

    this.db.transactions[index] = updatedTx;
    this.saveState();
    return updatedTx;
  }

  public deleteTransaction(id: string): void {
    const index = this.db.transactions.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Transaction not found');

    const tx = this.db.transactions[index];
    // Reverse balance
    this.applyTransactionToAccounts(tx, true);

    this.db.transactions.splice(index, 1);
    this.saveState();
  }

  // ===================== BUDGETS =====================
  public getBudgets(): Budget[] {
    return [...this.db.budgets];
  }

  public saveBudget(
    categoryId: string,
    amount: number,
    month: string,
    alertThreshold = 0.8,
    budgetId?: string
  ): Budget {
    if (budgetId) {
      const idx = this.db.budgets.findIndex((b) => b.id === budgetId);
      if (idx >= 0) {
        this.db.budgets[idx] = {
          ...this.db.budgets[idx],
          categoryId,
          amount,
          month,
          alertThreshold,
          updatedAt: new Date().toISOString(),
        };
        this.saveState();
        return this.db.budgets[idx];
      }
    }

    const existingIndex = this.db.budgets.findIndex(
      (b) => b.categoryId === categoryId && b.month === month
    );

    if (existingIndex >= 0) {
      this.db.budgets[existingIndex] = {
        ...this.db.budgets[existingIndex],
        amount,
        alertThreshold,
        updatedAt: new Date().toISOString(),
      };
      this.saveState();
      return this.db.budgets[existingIndex];
    } else {
      const newBudget: Budget = {
        id: `bg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        userId: this.db.user.id,
        categoryId,
        amount,
        month,
        alertThreshold,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.db.budgets.push(newBudget);
      this.saveState();
      return newBudget;
    }
  }

  public deleteBudget(id: string): void {
    this.db.budgets = this.db.budgets.filter((b) => b.id !== id);
    this.saveState();
  }

  // ===================== SAVINGS GOALS =====================
  public getSavingsGoals(): SavingsGoal[] {
    return [...this.db.savingsGoals];
  }

  public createSavingsGoal(goalData: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): SavingsGoal {
    const newGoal: SavingsGoal = {
      ...goalData,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: this.db.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.savingsGoals.push(newGoal);
    this.saveState();
    return newGoal;
  }

  public updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): SavingsGoal {
    const index = this.db.savingsGoals.findIndex((g) => g.id === id);
    if (index === -1) throw new Error('Goal not found');

    const updated = {
      ...this.db.savingsGoals[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Auto mark completed if target reached
    if (updated.currentAmount >= updated.targetAmount) {
      updated.isCompleted = true;
    }

    this.db.savingsGoals[index] = updated;
    this.saveState();
    return updated;
  }

  public depositToGoal(goalId: string, amount: number, accountId?: string): SavingsGoal {
    const goal = this.db.savingsGoals.find((g) => g.id === goalId);
    if (!goal) throw new Error('Goal not found');

    goal.currentAmount += amount;
    if (goal.currentAmount >= goal.targetAmount) {
      goal.isCompleted = true;
    }
    goal.updatedAt = new Date().toISOString();

    // Deduct from account if provided
    if (accountId) {
      const acc = this.db.accounts.find((a) => a.id === accountId);
      if (acc) {
        // createTransaction already applies transaction to accounts
        this.createTransaction({
          type: 'expense',
          amount,
          date: new Date().toISOString().split('T')[0],
          accountId,
          note: `Nạp tiền vào mục tiêu tiết kiệm: ${goal.name}`,
          paymentMethod: 'transfer',
        });
      }
    }

    this.saveState();
    return goal;
  }

  public deleteSavingsGoal(id: string): void {
    this.db.savingsGoals = this.db.savingsGoals.filter((g) => g.id !== id);
    this.saveState();
  }

  // ===================== NOTIFICATIONS =====================
  public getNotifications(): NotificationItem[] {
    return [...this.db.notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public markNotificationAsRead(id: string): void {
    const notif = this.db.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.saveState();
    }
  }

  public markAllNotificationsAsRead(): void {
    this.db.notifications.forEach((n) => (n.isRead = true));
    this.saveState();
  }

  public addNotification(title: string, message: string, type: NotificationItem['type'], link?: string): NotificationItem {
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: this.db.user.id,
      title,
      message,
      type,
      isRead: false,
      link,
      createdAt: new Date().toISOString(),
    };
    this.db.notifications.unshift(newNotif);
    this.saveState();
    return newNotif;
  }

  // ===================== BACKUP / RESTORE =====================
  public exportDataJSON(): string {
    return JSON.stringify(this.db, null, 2);
  }

  public importDataJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.transactions && parsed.accounts && parsed.categories) {
        this.db = parsed;
        this.recalculateAccountBalances();
        this.saveState();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import parse error:', e);
      return false;
    }
  }

  public importFromExcel(fileBuffer: ArrayBuffer): ExcelImportResult {
    const { updatedDb, result } = importExcelToMoneyFlow(fileBuffer, this.db);
    this.db = updatedDb;
    this.saveState();
    this.notifyListeners();
    return result;
  }

  // ===================== CLOUD SUPABASE SYNC =====================
  public isCloudConfigured(): boolean {
    return isSupabaseConfigured;
  }

  public async syncToSupabase(): Promise<{ success: boolean; message: string }> {
    if (!supabase || !isSupabaseConfigured) {
      return { success: false, message: 'Chưa cấu hình thông tin Supabase trong .env!' };
    }
    const userEmail = (this.db.user.email || 'default').toLowerCase().trim();

    try {
      let supaUserId: string | null = null;
      try {
        const { data } = await supabase.auth.getUser();
        if (data && data.user) {
          supaUserId = data.user.id;
        }
      } catch { }

      const effectiveUserId = supaUserId || this.db.user.id || 'usr_default';
      const backupId = supaUserId ? `backup_${supaUserId}` : `backup_${userEmail.replace(/[^a-z0-9]/g, '_')}`;
      const nowIso = new Date().toISOString();

      // Đảm bảo API Key của người dùng được sao lưu lên Cloud
      const localApiKey = localStorage.getItem('moneyflow_gemini_api_key')?.trim();
      if (localApiKey && !this.db.user.geminiApiKey) {
        this.db.user.geminiApiKey = localApiKey;
      }

      // Phòng ngừa phiên làm việc rỗng ghi đè mất dữ liệu trên Cloud
      if (this.db.transactions.length === 0 && this.db.accounts.every((a) => a.balance === 0)) {
        const checkCloud = await supabase
          .from('cloud_backups')
          .select('data')
          .eq('id', backupId)
          .single();
        if (checkCloud.data?.data?.transactions?.length > 0) {
          console.warn('Skipping sync: Local is empty but Cloud has rich data. Pulling from Cloud instead!');
          return await this.pullFromSupabase();
        }
      }

      const { error } = await supabase
        .from('cloud_backups')
        .upsert({
          id: backupId,
          user_id: effectiveUserId,
          data: {
            ...this.db,
            user: {
              ...this.db.user,
              id: effectiveUserId,
              updatedAt: nowIso,
            },
          },
          updated_at: nowIso,
        });

      // Cập nhật hàng mặc định nếu là tài khoản chính Khôi
      if (userEmail.includes('minhkhoj') || userEmail.includes('khoi')) {
        try {
          await supabase
            .from('cloud_backups')
            .upsert({
              id: 'moneyflow_cloud_state',
              user_id: effectiveUserId,
              data: this.db,
              updated_at: nowIso,
            });
        } catch { }
      }

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('not find the table') || error.message.includes('cloud_backups')) {
          return {
            success: false,
            message: 'Chưa khởi tạo bảng trên Supabase! Vui lòng vào SQL Editor trên Supabase và chạy file schema.sql.',
          };
        }
        if (error.code === '42501' || error.message.includes('row-level security policy')) {
          return {
            success: false,
            message: 'Bị chặn bởi RLS: Bảng cloud_backups chưa cho phép lưu trữ. Vui lòng chạy lệnh SQL mở quyền cloud_backups trên Supabase!',
          };
        }
        return { success: false, message: `Lỗi Supabase: ${error.message}` };
      }

      localStorage.setItem('moneyflow_last_local_updated_at', nowIso);
      localStorage.setItem('moneyflow_last_cloud_sync_at', nowIso);
      return { success: true, message: 'Đồng bộ toàn bộ dữ liệu lên Supabase Cloud thành công!' };
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối: ${e.message || e}` };
    }
  }

  public async pullFromSupabase(): Promise<{ success: boolean; message: string }> {
    if (!supabase || !isSupabaseConfigured) {
      return { success: false, message: 'Chưa cấu hình thông tin Supabase trong .env!' };
    }
    const userEmail = (this.db.user.email || 'default').toLowerCase().trim();

    try {
      let supaUserId: string | null = null;
      try {
        const { data } = await supabase.auth.getUser();
        if (data && data.user) {
          supaUserId = data.user.id;
        }
      } catch { }

      const backupId = supaUserId ? `backup_${supaUserId}` : `backup_${userEmail.replace(/[^a-z0-9]/g, '_')}`;

      let { data, error } = await supabase
        .from('cloud_backups')
        .select('data, updated_at')
        .eq('id', backupId)
        .single();

      // Nếu là tài khoản Khôi và bản sao lưu scoped chưa có thì kiểm tra hàng legacy
      if (error && (userEmail.includes('minhkhoj') || userEmail.includes('khoi'))) {
        const legacyRes = await supabase
          .from('cloud_backups')
          .select('data, updated_at')
          .eq('id', 'moneyflow_cloud_state')
          .single();
        if (!legacyRes.error && legacyRes.data) {
          data = legacyRes.data;
          error = null;
        }
      }

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, message: 'Chưa có bản sao lưu nào trên đám mây Supabase!' };
        }
        if (error.code === 'PGRST205' || error.message.includes('not find the table') || error.message.includes('cloud_backups')) {
          return {
            success: false,
            message: 'Chưa khởi tạo bảng trên Supabase! Vui lòng vào SQL Editor trên Supabase và chạy file schema.sql.',
          };
        }
        return { success: false, message: `Lỗi Supabase: ${error.message}` };
      }

      if (data && data.data) {
        const cloudDb = data.data as AppDatabase;

        // 1. Tự động lưu bản sao lưu an toàn của Local trước khi hợp nhất
        try {
          localStorage.setItem('moneyflow_backup_before_pull', JSON.stringify(this.db));
          localStorage.setItem('moneyflow_last_recovery_snapshot', JSON.stringify(this.db));
        } catch {}

        // 2. HỢP NHẤT THÔNG MINH 2 CHIỀU (BIDIRECTIONAL MERGE):
        // Tuyệt đối KHÔNG xóa các giao dịch, tài khoản mới tạo trên máy này chưa kịp đồng bộ!
        
        // Hợp nhất Tài khoản:
        const mergedAccounts = [...(cloudDb.accounts || [])];
        for (const localAcc of (this.db.accounts || [])) {
          const exists = mergedAccounts.some((a) => a.id === localAcc.id || a.name.trim().toLowerCase() === localAcc.name.trim().toLowerCase());
          if (!exists) {
            mergedAccounts.push(localAcc);
          }
        }

        // Hợp nhất Giao dịch theo ID:
        const cloudTxMap = new Map((cloudDb.transactions || []).map((t) => [t.id, t]));
        const mergedTransactions = [...(cloudDb.transactions || [])];
        for (const localTx of (this.db.transactions || [])) {
          if (!cloudTxMap.has(localTx.id)) {
            mergedTransactions.push(localTx);
          }
        }

        // Sắp xếp giao dịch mới nhất lên đầu
        mergedTransactions.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

        // Hợp nhất Sổ nợ theo ID:
        const cloudDebtMap = new Map((cloudDb.debts || []).map((d) => [d.id, d]));
        const mergedDebts = [...(cloudDb.debts || [])];
        for (const localDebt of (this.db.debts || [])) {
          if (!cloudDebtMap.has(localDebt.id)) {
            mergedDebts.push(localDebt);
          }
        }

        // Hợp nhất Lương & Thu chi định kỳ theo ID:
        const cloudRecurMap = new Map((cloudDb.recurringItems || []).map((r) => [r.id, r]));
        const mergedRecurring = [...(cloudDb.recurringItems || [])];
        for (const localRecur of (this.db.recurringItems || [])) {
          if (!cloudRecurMap.has(localRecur.id)) {
            mergedRecurring.push(localRecur);
          }
        }

        // Hợp nhất Mục tiêu tiết kiệm theo ID:
        const cloudGoalMap = new Map((cloudDb.savingsGoals || []).map((g) => [g.id, g]));
        const mergedGoals = [...(cloudDb.savingsGoals || [])];
        for (const localGoal of (this.db.savingsGoals || [])) {
          if (!cloudGoalMap.has(localGoal.id)) {
            mergedGoals.push(localGoal);
          }
        }

        // Cập nhật state nội bộ
        this.db = {
          ...cloudDb,
          user: {
            ...cloudDb.user,
            geminiApiKey: this.db.user?.geminiApiKey || cloudDb.user?.geminiApiKey,
          },
          accounts: mergedAccounts,
          transactions: mergedTransactions,
          debts: mergedDebts,
          recurringItems: mergedRecurring,
          savingsGoals: mergedGoals,
          budgets: cloudDb.budgets && cloudDb.budgets.length > 0 ? cloudDb.budgets : this.db.budgets,
        };

        this.healAccountsState(this.db);
        this.recalculateAccountBalances();

        const key = this.getStorageKey();
        localStorage.setItem(key, JSON.stringify(this.db));

        // Tự động đồng bộ API Key Gemini về máy mới/điện thoại
        if (this.db.user?.geminiApiKey) {
          localStorage.setItem('moneyflow_gemini_api_key', this.db.user.geminiApiKey);
        }

        const syncTime = data.updated_at || new Date().toISOString();
        localStorage.setItem('moneyflow_last_local_updated_at', syncTime);
        localStorage.setItem('moneyflow_last_cloud_sync_at', syncTime);

        // Nếu máy này có nhiều giao dịch hơn Cloud sau khi hợp nhất, đẩy ngược bản mới nhất lên Cloud
        if (mergedTransactions.length > (cloudDb.transactions?.length || 0)) {
          this.triggerAutoCloudSync();
        }

        this.notifyListeners();
        return { success: true, message: 'Đồng bộ & Hợp nhất dữ liệu Supabase Cloud an toàn thành công!' };
      }
      return { success: false, message: 'Dữ liệu trên Cloud rỗng!' };
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối: ${e.message || e}` };
    }
  }

  /**
   * Tự động kiểm tra và tải bản dữ liệu mới nhất từ Supabase Cloud về máy (nếu trên Cloud mới hơn máy này)
   */
  public async autoPullFromSupabase(): Promise<{ updated: boolean; message?: string }> {
    if (!supabase || !isSupabaseConfigured) {
      return { updated: false };
    }

    const userEmail = (this.db.user.email || 'default').toLowerCase().trim();

    try {
      let supaUserId: string | null = null;
      try {
        const { data } = await supabase.auth.getUser();
        if (data && data.user) {
          supaUserId = data.user.id;
        }
      } catch { }

      const backupId = supaUserId ? `backup_${supaUserId}` : `backup_${userEmail.replace(/[^a-z0-9]/g, '_')}`;

      // 1. Kiểm tra nhanh updated_at trên Cloud
      let cloudRes = await supabase
        .from('cloud_backups')
        .select('updated_at')
        .eq('id', backupId)
        .single();

      if (cloudRes.error && (userEmail.includes('minhkhoj') || userEmail.includes('khoi'))) {
        cloudRes = await supabase
          .from('cloud_backups')
          .select('updated_at')
          .eq('id', 'moneyflow_cloud_state')
          .single();
      }

      if (cloudRes.error || !cloudRes.data?.updated_at) {
        return { updated: false };
      }

      const cloudTime = new Date(cloudRes.data.updated_at).getTime();
      const localTimeStr = localStorage.getItem('moneyflow_last_local_updated_at');
      const localTime = localTimeStr ? new Date(localTimeStr).getTime() : 0;

      // Nếu trên Cloud mới hơn dữ liệu trên máy hiện tại ít nhất 2 giây:
      if (cloudTime > localTime + 2000) {
        const pullRes = await this.pullFromSupabase();
        if (pullRes.success) {
          return { updated: true, message: 'Đã tự động đồng bộ dữ liệu mới nhất từ Cloud!' };
        }
      }

      return { updated: false };
    } catch (e) {
      console.warn('Auto cloud pull notice:', e);
      return { updated: false };
    }
  }

  public hasSafetyBackup(): boolean {
    return Boolean(
      localStorage.getItem('moneyflow_backup_before_pull') ||
      localStorage.getItem('moneyflow_last_recovery_snapshot')
    );
  }

  public rollbackFromSafetyBackup(): { success: boolean; message: string } {
    try {
      const saved =
        localStorage.getItem('moneyflow_backup_before_pull') ||
        localStorage.getItem('moneyflow_last_recovery_snapshot');
      if (!saved) {
        return { success: false, message: 'Không tìm thấy bản sao lưu dự phòng trước khi đồng bộ!' };
      }
      const parsed = JSON.parse(saved);
      if (parsed.transactions && parsed.accounts) {
        this.db = parsed;
        this.healAccountsState(this.db);
        this.recalculateAccountBalances();
        this.saveState();
        this.notifyListeners();
        return { success: true, message: 'Đã hoàn tác và phục hồi dữ liệu trước khi đồng bộ thành công!' };
      }
      return { success: false, message: 'Bản sao lưu không hợp lệ.' };
    } catch (e: any) {
      return { success: false, message: `Lỗi phục hồi: ${e.message || e}` };
    }
  }

  public resetToDefaultSeedData(): void {
    this.db = {
      user: initialUser,
      accounts: initialAccounts,
      categories: initialCategories,
      transactions: initialTransactions,
      budgets: initialBudgets,
      savingsGoals: initialSavingsGoals,
      notifications: initialNotifications,
      recurringItems: [],
      debts: initialDebts,
    };
    this.saveState();
  }

  public clearAllData(): void {
    this.db = {
      user: {
        ...initialUser,
        fullName: 'Người dùng MoneyFlow',
      },
      accounts: [
        {
          id: 'acc_cash_clean',
          userId: initialUser.id,
          name: 'Tiền mặt',
          type: 'cash',
          balance: 0,
          initialBalance: 0,
          color: '#10B981',
          icon: 'Wallet',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'acc_bank_clean',
          userId: initialUser.id,
          name: 'Tài khoản Ngân hàng',
          type: 'bank',
          balance: 0,
          initialBalance: 0,
          color: '#0284C7',
          icon: 'Building2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      categories: initialCategories,
      transactions: [],
      budgets: [],
      savingsGoals: [],
      notifications: [
        {
          id: `notif_${Date.now()}`,
          userId: initialUser.id,
          title: 'Chào mừng bạn đến với MoneyFlow!',
          message: 'Dữ liệu mẫu đã được dọn sạch. Bạn có thể bắt đầu cập nhật số dư tài khoản và thêm các khoản thu chi thực tế.',
          type: 'info',
          isRead: false,
          link: 'transactions',
          createdAt: new Date().toISOString(),
        },
      ],
      recurringItems: [],
      debts: [],
    };
    this.saveState();
  }

  // ===================== RECURRING SALARY & TRANSACTIONS =====================
  public getRecurringItems(): RecurringItem[] {
    return [...(this.db.recurringItems || [])];
  }

  public saveRecurringItem(
    itemData: Omit<RecurringItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string },
    applyToCurrentMonth = true
  ): RecurringItem {
    if (!this.db.recurringItems) this.db.recurringItems = [];

    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = today.getDate();

    let targetItem: RecurringItem;

    if (itemData.id) {
      const idx = this.db.recurringItems.findIndex((r) => r.id === itemData.id);
      if (idx >= 0) {
        const oldItem = { ...this.db.recurringItems[idx] };
        this.db.recurringItems[idx] = {
          ...this.db.recurringItems[idx],
          ...itemData,
          updatedAt: new Date().toISOString(),
        };
        targetItem = this.db.recurringItems[idx];

        // Tìm giao dịch đã phát sinh trong tháng này ứng với mục định kỳ
        const existingTx = this.db.transactions.find((t) => {
          const matchMonth = t.date.startsWith(currentYearMonth);
          const matchId = t.recurringItemId === targetItem.id;
          const matchOldNote = t.note === `[Tự động] ${oldItem.name}` || t.note === `[Tự động] ${targetItem.name}`;
          return matchMonth && (matchId || matchOldNote);
        });

        if (existingTx) {
          if (targetItem.isActive) {
            // Cập nhật giao dịch đã có cho khớp với số tiền, ví nhận và danh mục mới
            this.updateTransaction(existingTx.id, {
              type: targetItem.type,
              amount: targetItem.amount,
              accountId: targetItem.accountId,
              categoryId: targetItem.categoryId,
              paymentMethod: targetItem.paymentMethod,
              note: `[Tự động] ${targetItem.name}`,
              recurringItemId: targetItem.id,
            });
          } else {
            // Nếu tạm tắt mục này, hoàn lại giao dịch tự động của tháng này
            this.deleteTransaction(existingTx.id);
          }
        } else if (targetItem.isActive && (applyToCurrentMonth || currentDay >= targetItem.dayOfMonth)) {
          // Chưa có giao dịch tháng này -> Tự động tạo mới ngay
          const txDay = Math.min(targetItem.dayOfMonth, 28);
          const txDate = `${currentYearMonth}-${String(txDay).padStart(2, '0')}`;
          this.createTransaction({
            type: targetItem.type,
            amount: targetItem.amount,
            accountId: targetItem.accountId,
            categoryId: targetItem.categoryId,
            date: txDate,
            paymentMethod: targetItem.paymentMethod,
            note: `[Tự động] ${targetItem.name}`,
            recurringItemId: targetItem.id,
          });
          targetItem.lastProcessedMonth = currentYearMonth;
        }

        this.recalculateAccountBalances();
        this.saveState();
        return targetItem;
      }
    }

    // Tạo mới hoàn toàn
    const newItem: RecurringItem = {
      ...itemData,
      id: `recur_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: this.db.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.recurringItems.push(newItem);

    // Tự động ghi nhận cho tháng này nếu được kích hoạt
    if (newItem.isActive && (applyToCurrentMonth || currentDay >= newItem.dayOfMonth)) {
      const txDay = Math.min(newItem.dayOfMonth, 28);
      const txDate = `${currentYearMonth}-${String(txDay).padStart(2, '0')}`;
      this.createTransaction({
        type: newItem.type,
        amount: newItem.amount,
        accountId: newItem.accountId,
        categoryId: newItem.categoryId,
        date: txDate,
        paymentMethod: newItem.paymentMethod,
        note: `[Tự động] ${newItem.name}`,
        recurringItemId: newItem.id,
      });
      newItem.lastProcessedMonth = currentYearMonth;
    }

    this.recalculateAccountBalances();
    this.saveState();
    return newItem;
  }

  public deleteRecurringItem(id: string, removeCurrentMonthTx = true): void {
    if (!this.db.recurringItems) return;
    const item = this.db.recurringItems.find((r) => r.id === id);
    if (!item) return;

    if (removeCurrentMonthTx) {
      const today = new Date();
      const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const existingTx = this.db.transactions.find((t) => {
        const matchMonth = t.date.startsWith(currentYearMonth);
        const matchId = t.recurringItemId === id;
        const matchNote = t.note === `[Tự động] ${item.name}`;
        return matchMonth && (matchId || matchNote);
      });
      if (existingTx) {
        this.deleteTransaction(existingTx.id);
      }
    }

    this.db.recurringItems = this.db.recurringItems.filter((r) => r.id !== id);
    this.recalculateAccountBalances();
    this.saveState();
  }

  public toggleRecurringItem(id: string): void {
    if (!this.db.recurringItems) return;
    const item = this.db.recurringItems.find((r) => r.id === id);
    if (item) {
      item.isActive = !item.isActive;
      item.updatedAt = new Date().toISOString();

      const today = new Date();
      const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const existingTx = this.db.transactions.find((t) => {
        const matchMonth = t.date.startsWith(currentYearMonth);
        const matchId = t.recurringItemId === item.id;
        const matchNote = t.note === `[Tự động] ${item.name}`;
        return matchMonth && (matchId || matchNote);
      });

      if (!item.isActive && existingTx) {
        // Tắt thì hoàn trả giao dịch tháng này
        this.deleteTransaction(existingTx.id);
      } else if (item.isActive && !existingTx) {
        // Bật lại thì tạo giao dịch cho tháng này
        const txDay = Math.min(item.dayOfMonth, 28);
        const txDate = `${currentYearMonth}-${String(txDay).padStart(2, '0')}`;
        this.createTransaction({
          type: item.type,
          amount: item.amount,
          accountId: item.accountId,
          categoryId: item.categoryId,
          date: txDate,
          paymentMethod: item.paymentMethod,
          note: `[Tự động] ${item.name}`,
          recurringItemId: item.id,
        });
        item.lastProcessedMonth = currentYearMonth;
      }

      this.recalculateAccountBalances();
      this.saveState();
    }
  }

  public processRecurringTransactions(forceCurrentMonth = false): number {
    if (!this.db.recurringItems || this.db.recurringItems.length === 0) return 0;

    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = today.getDate();
    let processedCount = 0;

    this.db.recurringItems.forEach((item) => {
      if (!item.isActive) return;

      // Tìm giao dịch đã có trong tháng này
      const existingTx = this.db.transactions.find((t) => {
        const matchMonth = t.date.startsWith(currentYearMonth);
        const matchId = t.recurringItemId === item.id;
        const matchNote = t.note === `[Tự động] ${item.name}`;
        return matchMonth && (matchId || matchNote);
      });

      if (existingTx) {
        // Nếu số tiền hoặc tài khoản ví bị lệch với cấu hình lương hiện tại -> Tự động đồng bộ
        if (
          existingTx.amount !== item.amount ||
          existingTx.accountId !== item.accountId ||
          existingTx.categoryId !== item.categoryId ||
          existingTx.type !== item.type
        ) {
          this.updateTransaction(existingTx.id, {
            type: item.type,
            amount: item.amount,
            accountId: item.accountId,
            categoryId: item.categoryId,
            paymentMethod: item.paymentMethod,
            note: `[Tự động] ${item.name}`,
            recurringItemId: item.id,
          });
          processedCount++;
        }
      } else if (forceCurrentMonth || (item.lastProcessedMonth !== currentYearMonth && currentDay >= item.dayOfMonth)) {
        const txDay = Math.min(item.dayOfMonth, 28);
        const txDate = `${currentYearMonth}-${String(txDay).padStart(2, '0')}`;

        this.createTransaction({
          type: item.type,
          amount: item.amount,
          accountId: item.accountId,
          categoryId: item.categoryId,
          date: txDate,
          paymentMethod: item.paymentMethod,
          note: `[Tự động] ${item.name}`,
          recurringItemId: item.id,
        });

        item.lastProcessedMonth = currentYearMonth;
        item.updatedAt = new Date().toISOString();
        processedCount++;

        this.addNotification(
          'Đã tự động ghi nhận lương định kỳ! 🎉',
          `Hệ thống vừa tự động cộng ${item.amount.toLocaleString('vi-VN')} ₫ (${item.name}) vào tài khoản của bạn cho tháng ${today.getMonth() + 1}/${today.getFullYear()}.`,
          'goal_milestone',
          'transactions'
        );
      }
    });

    if (processedCount > 0) {
      this.saveState();
      this.notifyListeners();
    }
    return processedCount;
  }

  // ===================== DAILY YIELD (TÍCH LŨY SINH LỜI HÀNG NGÀY - VÍ MOMO) =====================
  /**
   * Tự động sinh lời hàng ngày cho các ví / tài khoản tích lũy (Ví dụ: Ví MoMo Túi Thần Tài 4%/năm)
   * Công thức: Lãi ngày = Math.round(Số dư * (Lãi suất % / 100) / 365)
   * Mỗi ngày chỉ cộng 1 lần duy nhất, tạo giao dịch Thu nhập "Tiền lời tích lũy" và cộng thẳng vào số dư ví.
   */
  public processDailyYield(): number {
    if (!this.db.accounts || this.db.accounts.length === 0) return 0;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let processedCount = 0;

    // Tìm danh mục Đầu tư & Lãi tiết kiệm
    let investCategory = this.db.categories.find(
      (c) => c.id === 'cat_inc_invest' || c.name.toLowerCase().includes('lãi') || c.name.toLowerCase().includes('tiết kiệm')
    );
    if (!investCategory) {
      investCategory = this.db.categories.find((c) => c.type === 'income') || this.db.categories[0];
    }

    this.db.accounts.forEach((acc) => {
      // Chỉ tính cho tài khoản bật sinh lời, có % lãi suất > 0, số dư > 0 và chưa lưu trữ
      if (!acc.isYieldEnabled || !acc.yieldRate || acc.yieldRate <= 0 || acc.balance <= 0 || acc.isArchived) {
        return;
      }

      // Nếu ví mới tạo hoặc vừa bật sinh lời mà chưa có ngày chốt:
      // Đánh dấu ngày hôm nay là ngày chốt tiền gửi, ngày mai mới bắt đầu sinh lời (chuẩn quy tắc MoMo)
      if (!acc.lastYieldDate) {
        acc.lastYieldDate = todayStr;
        return;
      }

      // Kiểm tra nếu hôm nay đã tính lãi rồi (hoặc ví mới nạp hôm nay) thì bỏ qua
      if (acc.lastYieldDate >= todayStr) {
        return;
      }

      // Tính lãi ngày: Lãi suất năm chia cho 365 ngày
      // Ví dụ: 10.000.000đ x 4% / 365 = 1.096đ
      const dailyYield = Math.round((acc.balance * (acc.yieldRate / 100)) / 365);
      if (dailyYield < 1) {
        acc.lastYieldDate = todayStr;
        return;
      }

      // Kiểm tra trong danh sách giao dịch xem đã có giao dịch sinh lời của ví này ngày hôm nay chưa (phòng tránh trùng lặp)
      const existingYieldTx = this.db.transactions.find((t) => {
        const isToday = t.date === todayStr;
        const isSameAcc = t.accountId === acc.id;
        const isYield = t.note?.includes('[Tự động sinh lời]') || t.note?.includes('Túi Thần Tài') || t.note?.includes('Sinh lời');
        return isToday && isSameAcc && isYield;
      });

      if (!existingYieldTx) {
        this.createTransaction({
          type: 'income',
          amount: dailyYield,
          date: todayStr,
          accountId: acc.id,
          categoryId: investCategory?.id || 'cat_inc_invest',
          paymentMethod: 'ewallet',
          note: `[Tự động sinh lời] ${acc.name} (${acc.yieldRate}%/năm)`,
        });

        // Thêm thông báo
        this.addNotification(
          'Ví MoMo sinh lời tự động! 💰',
          `Ví ${acc.name} vừa tự động sinh lời +${dailyYield.toLocaleString('vi-VN')} ₫ hôm nay theo mức lãi ${acc.yieldRate}%/năm.`,
          'goal_milestone',
          'accounts'
        );

        processedCount++;
      }

      // Cập nhật ngày sinh lời gần nhất
      acc.lastYieldDate = todayStr;
    });

    if (processedCount > 0) {
      this.saveState();
      this.notifyListeners();
    }

    return processedCount;
  }

  /**
   * Kích hoạt tính tiền lời ngay cho một ví tích lũy (dành cho người dùng muốn thử nghiệm hoặc kiểm tra ngay)
   */
  public forceCalculateYield(accountId: string, forceToday = false): { success: boolean; amount: number; message: string; alreadyDoneToday?: boolean } {
    const acc = this.db.accounts.find((a) => a.id === accountId);
    if (!acc) return { success: false, amount: 0, message: 'Không tìm thấy tài khoản/ví này' };
    if (!acc.isYieldEnabled) return { success: false, amount: 0, message: 'Tài khoản chưa bật tính năng tích lũy sinh lời hàng ngày' };
    if (acc.balance <= 0) return { success: false, amount: 0, message: 'Số dư hiện tại phải lớn hơn 0 để tính lãi' };

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Kiểm tra xem ví này hôm nay đã nhận tiền lời chưa
    const hasYieldToday = this.db.transactions.some(
      (t) => t.date === todayStr && t.accountId === acc.id && (t.note?.includes('[Tự động sinh lời]') || t.note?.includes('Sinh lời'))
    );

    if ((acc.lastYieldDate === todayStr || hasYieldToday) && !forceToday) {
      return {
        success: false,
        amount: 0,
        alreadyDoneToday: true,
        message: `Ví "${acc.name}" hôm nay đã được chốt số dư rồi! Theo quy tắc MoMo (nạp hôm nay, nhận lãi ngày mai), tiền lời tiếp theo sẽ tự động cộng vào ngày mai.`,
      };
    }

    const rate = acc.yieldRate || 4.0;
    const dailyYield = Math.round((acc.balance * (rate / 100)) / 365);
    if (dailyYield < 1) return { success: false, amount: 0, message: 'Số dư quá nhỏ để sinh lời tối thiểu 1 ₫/ngày' };

    let investCategory = this.db.categories.find(
      (c) => c.id === 'cat_inc_invest' || c.name.toLowerCase().includes('lãi') || c.name.toLowerCase().includes('tiết kiệm')
    );
    if (!investCategory) {
      investCategory = this.db.categories.find((c) => c.type === 'income') || this.db.categories[0];
    }

    // createTransaction đã tự động cộng dailyYield vào acc.balance thông qua applyTransactionToAccounts
    this.createTransaction({
      type: 'income',
      amount: dailyYield,
      date: todayStr,
      accountId: acc.id,
      categoryId: investCategory?.id || 'cat_inc_invest',
      paymentMethod: 'ewallet',
      note: `[Tự động sinh lời] ${acc.name} (${rate}%/năm)`,
    });

    acc.lastYieldDate = todayStr;
    this.saveState();
    this.notifyListeners();

    return {
      success: true,
      amount: dailyYield,
      message: `Đã cộng +${dailyYield.toLocaleString('vi-VN')} ₫ tiền lời vào ${acc.name} (${rate}%/năm)!`,
    };
  }

  // ===================== DEBTS (SỔ NỢ / CHO VAY & ĐI VAY) =====================
  public getDebts(): DebtItem[] {
    const today = new Date().toISOString().split('T')[0];
    if (!this.db.debts) this.db.debts = [];
    return this.db.debts.map((d) => {
      if (d.paidAmount >= d.totalAmount) {
        d.status = 'paid';
      } else if (d.dueDate && d.dueDate < today) {
        d.status = 'overdue';
      } else if (d.paidAmount > 0) {
        d.status = 'partial';
      } else {
        d.status = 'pending';
      }
      return d;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createDebt(
    data: Omit<DebtItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
    options?: { balanceAction?: DebtBalanceAction; syncAccount?: boolean }
  ): DebtItem {
    const today = new Date().toISOString().split('T')[0];
    let status = data.status || 'pending';
    if (data.paidAmount >= data.totalAmount) {
      status = 'paid';
    } else if (data.dueDate && data.dueDate < today) {
      status = 'overdue';
    } else if (data.paidAmount > 0) {
      status = 'partial';
    }

    const newDebt: DebtItem = {
      ...data,
      id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: this.db.user.id,
      status,
      payments: data.payments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Determine balance action:
    // If balanceAction is explicitly provided, respect it.
    // Otherwise fallback to legacy syncAccount boolean.
    let action: DebtBalanceAction = options?.balanceAction || 'none';
    if (!options?.balanceAction && options?.syncAccount) {
      action = data.type === 'lend' ? 'debit' : 'credit';
    }

    if (action !== 'none' && data.accountId) {
      const acc = this.db.accounts.find((a) => a.id === data.accountId);
      if (acc) {
        if (action === 'debit') {
          // Trừ tiền khỏi ví của tôi (createTransaction tự động cập nhật số dư qua applyTransactionToAccounts)
          this.createTransaction({
            type: 'expense',
            amount: data.totalAmount,
            date: data.startDate || today,
            accountId: data.accountId,
            note: data.type === 'lend'
              ? `Cho ${data.personName} mượn: ${data.note || 'Khoản vay nợ'}`
              : `Trả tiền / Xuất ví cho ${data.personName}: ${data.note || 'Khoản vay nợ'}`,
            paymentMethod: 'transfer',
          });
        } else if (action === 'credit') {
          // Cộng tiền vào ví của tôi (createTransaction tự động cập nhật số dư qua applyTransactionToAccounts)
          this.createTransaction({
            type: 'income',
            amount: data.totalAmount,
            date: data.startDate || today,
            accountId: data.accountId,
            note: data.type === 'borrow'
              ? `Vay từ ${data.personName}: ${data.note || 'Khoản vay nợ'}`
              : `Nhận tiền từ ${data.personName}: ${data.note || 'Khoản vay nợ'}`,
            paymentMethod: 'transfer',
          });
        }
      }
    }

    if (!this.db.debts) this.db.debts = [];
    this.db.debts.unshift(newDebt);
    this.saveState();
    return newDebt;
  }

  public updateDebt(id: string, data: Partial<DebtItem>): DebtItem | null {
    if (!this.db.debts) this.db.debts = [];
    const debt = this.db.debts.find((d) => d.id === id);
    if (!debt) return null;

    Object.assign(debt, data, { updatedAt: new Date().toISOString() });
    const today = new Date().toISOString().split('T')[0];
    if (debt.paidAmount >= debt.totalAmount) {
      debt.status = 'paid';
    } else if (debt.dueDate && debt.dueDate < today) {
      debt.status = 'overdue';
    } else if (debt.paidAmount > 0) {
      debt.status = 'partial';
    } else {
      debt.status = 'pending';
    }

    this.saveState();
    return debt;
  }

  public recordDebtPayment(
    debtId: string,
    amount: number,
    accountId?: string,
    note?: string,
    date?: string,
    balanceAction?: DebtBalanceAction
  ): DebtItem | null {
    if (!this.db.debts) this.db.debts = [];
    const debt = this.db.debts.find((d) => d.id === debtId);
    if (!debt) return null;

    const paymentDate = date || new Date().toISOString().split('T')[0];
    const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    debt.paidAmount = Math.min(debt.totalAmount, debt.paidAmount + amount);
    if (!debt.payments) debt.payments = [];
    debt.payments.push({
      id: paymentId,
      amount,
      date: paymentDate,
      note,
      accountId,
    });

    const today = new Date().toISOString().split('T')[0];
    if (debt.paidAmount >= debt.totalAmount) {
      debt.status = 'paid';
    } else if (debt.dueDate && debt.dueDate < today) {
      debt.status = 'overdue';
    } else {
      debt.status = 'partial';
    }
    debt.updatedAt = new Date().toISOString();

    // Determine balance action:
    // If balanceAction is explicitly provided, use it.
    // If not provided and accountId exists: fallback to default:
    // lend (người ta trả mình) -> credit (cộng tiền ví)
    // borrow (mình đi trả nợ) -> debit (trừ tiền ví)
    let action: DebtBalanceAction = balanceAction !== undefined
      ? balanceAction
      : (accountId ? (debt.type === 'lend' ? 'credit' : 'debit') : 'none');

    // If accountId provided and action !== 'none', update account balance & create transaction
    if (accountId && action !== 'none') {
      const acc = this.db.accounts.find((a) => a.id === accountId);
      if (acc) {
        if (action === 'credit') {
          // Thu nợ: người ta trả tiền -> cộng tiền vào ví của tôi (createTransaction tự động cập nhật số dư)
          this.createTransaction({
            type: 'income',
            amount,
            date: paymentDate,
            accountId,
            note: `Thu hồi nợ từ ${debt.personName}: ${note || 'Trả nợ'}`,
            paymentMethod: 'transfer',
          });
        } else if (action === 'debit') {
          // Tôi trả nợ: trừ tiền trong ví của tôi (createTransaction tự động cập nhật số dư)
          this.createTransaction({
            type: 'expense',
            amount,
            date: paymentDate,
            accountId,
            note: `Trả nợ cho ${debt.personName}: ${note || 'Hoàn trả nợ'}`,
            paymentMethod: 'transfer',
          });
        }
      }
    }

    this.saveState();
    return debt;
  }

  public deleteDebt(id: string): void {
    if (!this.db.debts) this.db.debts = [];
    this.db.debts = this.db.debts.filter((d) => d.id !== id);
    this.saveState();
  }
}

export const dataService = DataService.getInstance();

