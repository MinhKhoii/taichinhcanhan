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
              } catch {}
            }
          }

          if (!parsed.recurringItems) parsed.recurringItems = [];
          if (!parsed.debts) parsed.debts = initialDebts;
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

  private loadState(): AppDatabase {
    // Check if an auth session exists
    let activeEmail = 'minhkhoj2002@gmail.com';
    try {
      const sessStr = localStorage.getItem('moneyflow_auth_session_v1');
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        if (sess?.user?.email) activeEmail = sess.user.email;
      }
    } catch {}

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
          localStorage.setItem(key, JSON.stringify(parsed));
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
    }, 2500);
  }

  private saveState(): void {
    try {
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
    return { ...this.db.user };
  }

  public updateUser(userUpdate: Partial<User>): User {
    this.db.user = { ...this.db.user, ...userUpdate };
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

  public updateAccount(id: string, updates: Partial<Account>): Account {
    const index = this.db.accounts.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Account not found');
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
      let calcBalance = acc.initialBalance || 0;
      for (const tx of this.db.transactions) {
        if (tx.accountId === acc.id) {
          if (tx.type === 'income') calcBalance += tx.amount;
          else if (tx.type === 'expense') calcBalance -= tx.amount;
          else if (tx.type === 'transfer') calcBalance -= (tx.amount + (tx.transferFee || 0));
        }
        if (tx.toAccountId === acc.id && tx.type === 'transfer') {
          calcBalance += tx.amount;
        }
      }
      acc.balance = calcBalance;
    }
    this.saveState();
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
        acc.balance += tx.amount * multiplier;
      }
    } else if (tx.type === 'expense') {
      const acc = this.db.accounts.find((a) => a.id === tx.accountId);
      if (acc) {
        acc.balance -= tx.amount * multiplier;
      }
    } else if (tx.type === 'transfer') {
      const fromAcc = this.db.accounts.find((a) => a.id === tx.accountId);
      const toAcc = tx.toAccountId ? this.db.accounts.find((a) => a.id === tx.toAccountId) : null;
      if (fromAcc) {
        fromAcc.balance -= tx.amount * multiplier;
      }
      if (toAcc) {
        toAcc.balance += tx.amount * multiplier;
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
        this.saveState();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import parse error:', e);
      return false;
    }
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
    const backupId = `backup_${userEmail.replace(/[^a-z0-9]/g, '_')}`;

    try {
      const { error } = await supabase
        .from('cloud_backups')
        .upsert({
          id: backupId,
          user_id: this.db.user.id || 'usr_default',
          data: this.db,
          updated_at: new Date().toISOString(),
        });

      // Đồng thời cập nhật hàng mặc định nếu là tài khoản chính Khôi
      if (userEmail.includes('minhkhoj') || userEmail.includes('khoi')) {
        try {
          await supabase
            .from('cloud_backups')
            .upsert({
              id: 'moneyflow_cloud_state',
              user_id: this.db.user.id || 'usr_default',
              data: this.db,
              updated_at: new Date().toISOString(),
            });
        } catch {}
      }

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('not find the table') || error.message.includes('cloud_backups')) {
          return {
            success: false,
            message: 'Chưa khởi tạo bảng trên Supabase! Vui lòng vào SQL Editor trên Supabase và chạy file schema.sql.',
          };
        }
        return { success: false, message: `Lỗi Supabase: ${error.message}` };
      }
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
    const backupId = `backup_${userEmail.replace(/[^a-z0-9]/g, '_')}`;

    try {
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
        this.db = data.data;
        this.saveState();
        return { success: true, message: 'Khôi phục dữ liệu từ Supabase Cloud thành công!' };
      }
      return { success: false, message: 'Dữ liệu trên Cloud rỗng!' };
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối: ${e.message || e}` };
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
    itemData: Omit<RecurringItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }
  ): RecurringItem {
    if (!this.db.recurringItems) this.db.recurringItems = [];

    if (itemData.id) {
      const idx = this.db.recurringItems.findIndex((r) => r.id === itemData.id);
      if (idx >= 0) {
        this.db.recurringItems[idx] = {
          ...this.db.recurringItems[idx],
          ...itemData,
          updatedAt: new Date().toISOString(),
        };
        this.saveState();
        this.processRecurringTransactions();
        return this.db.recurringItems[idx];
      }
    }

    const newItem: RecurringItem = {
      ...itemData,
      id: `recur_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: this.db.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.recurringItems.push(newItem);
    this.saveState();
    this.processRecurringTransactions();
    return newItem;
  }

  public deleteRecurringItem(id: string): void {
    if (!this.db.recurringItems) return;
    this.db.recurringItems = this.db.recurringItems.filter((r) => r.id !== id);
    this.saveState();
  }

  public toggleRecurringItem(id: string): void {
    if (!this.db.recurringItems) return;
    const item = this.db.recurringItems.find((r) => r.id === id);
    if (item) {
      item.isActive = !item.isActive;
      item.updatedAt = new Date().toISOString();
      this.saveState();
      if (item.isActive) {
        this.processRecurringTransactions();
      }
    }
  }

  public processRecurringTransactions(): number {
    if (!this.db.recurringItems || this.db.recurringItems.length === 0) return 0;

    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = today.getDate();
    let processedCount = 0;

    this.db.recurringItems.forEach((item) => {
      if (!item.isActive) return;
      // Nếu tháng này chưa xử lý VÀ ngày hôm nay >= ngày nhận lương định kỳ
      if (item.lastProcessedMonth !== currentYearMonth && currentDay >= item.dayOfMonth) {
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
    }
    return processedCount;
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

