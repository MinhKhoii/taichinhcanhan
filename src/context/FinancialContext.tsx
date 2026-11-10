import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Account,
  Category,
  Transaction,
  Budget,
  SavingsGoal,
  User,
  NotificationItem,
  TimeRangeFilter,
  RecurringItem,
  DebtItem,
  DebtBalanceAction,
  AuthSession,
} from '../types';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { generateFinancialInsights, FinancialInsight } from '../utils/financialAssistant';
import { formatVND } from '../utils/formatters';
import {
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  parseISO,
  startOfMonth,
  endOfMonth,
  format,
} from 'date-fns';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface FinancialContextType {
  // Navigation & View
  currentTab: string;
  setCurrentTab: (tab: string) => void;

  // Filter
  timeFilter: TimeRangeFilter;
  setTimeFilter: (f: TimeRangeFilter) => void;
  customDateRange: { start: string; end: string };
  setCustomDateRange: (range: { start: string; end: string }) => void;

  // State
  user: User;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  notifications: NotificationItem[];
  recurringItems: RecurringItem[];
  debts: DebtItem[];
  unreadNotificationCount: number;
  insights: FinancialInsight[];

  // Modals & Action
  isAddTxOpen: boolean;
  openAddTxModal: (tx?: Transaction) => void;
  closeAddTxModal: () => void;
  editingTransaction: Transaction | null;

  // AI Assistant Modal
  isAIModalOpen: boolean;
  openAIModal: () => void;
  closeAIModal: () => void;

  // Toast
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Actions
  createTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string, options?: { revertBalance?: boolean }) => void;
  cleanupDuplicateTransactions: () => void;

  createAccount: (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  updateAccount: (id: string, data: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  transferFunds: (fromId: string, toId: string, amount: number, note?: string, date?: string) => void;

  createCategory: (data: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  saveBudget: (categoryId: string, amount: number, month: string, budgetId?: string) => void;
  deleteBudget: (id: string) => void;

  createSavingsGoal: (data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  updateSavingsGoal: (id: string, data: Partial<SavingsGoal>) => void;
  depositToGoal: (goalId: string, amount: number, accountId?: string) => void;
  deleteSavingsGoal: (id: string) => void;

  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;

  updateUser: (data: Partial<User>) => void;
  resetAllData: () => void;
  clearAllData: () => void;

  saveRecurringItem: (
    item: Omit<RecurringItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string },
    applyToCurrentMonth?: boolean
  ) => void;
  deleteRecurringItem: (id: string) => void;
  toggleRecurringItem: (id: string) => void;
  checkAndProcessRecurring: () => void;
  processDailyYield: () => number;
  forceCalculateYield: (accountId: string, forceToday?: boolean) => { success: boolean; amount: number; message: string; alreadyDoneToday?: boolean };

  createDebt: (
    data: Omit<DebtItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
    options?: { balanceAction?: DebtBalanceAction; syncAccount?: boolean }
  ) => void;
  updateDebt: (id: string, data: Partial<DebtItem>) => void;
  deleteDebt: (id: string) => void;
  recordDebtPayment: (
    debtId: string,
    amount: number,
    accountId?: string,
    note?: string,
    date?: string,
    balanceAction?: DebtBalanceAction
  ) => void;

  // Auto-offset & Balance Sync
  autoOffsetNegativeAccount: (negativeAccountId: string, sourceAccountId?: string) => boolean;
  autoOffsetAllNegativeAccounts: () => number;
  recalculateAccountBalances: () => void;

  // Cloud Sync
  isCloudConfigured: boolean;
  isCloudSyncing: boolean;
  lastCloudSyncTime: string;
  syncToCloud: () => Promise<{ success: boolean; message: string }>;
  pullFromCloud: () => Promise<{ success: boolean; message: string }>;
  hasSafetyBackup: boolean;
  rollbackSafetyBackup: () => void;

  // Theme Preference (Sáng / Tối)
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Privacy Mode (Ẩn số tiền riêng tư)
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  formatMoney: (amount: number, showSign?: boolean) => string;

  // Authentication & Security
  session: AuthSession;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAppLocked: boolean;
  isAuthModalOpen: boolean;
  authModalDefaultTab: 'login' | 'register';
  openAuthModal: (defaultTab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: User }>;
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; message: string; user?: User }>;
  loginAsDemo: (name?: string, email?: string) => void;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  setPinCode: (pin: string) => boolean;
  removePinCode: () => void;
  unlockWithPin: (pin: string) => boolean;
  unlockWithPassword: (password: string) => Promise<{ success: boolean; message: string }>;
  lockApp: () => void;

  // PWA & Installation
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
  isInstallGuideOpen: boolean;
  openInstallGuide: () => void;
  closeInstallGuide: () => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('this_month');
  const [customDateRange, setCustomDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Raw data from service
  const [user, setUser] = useState<User>(() => dataService.getUser());
  const [accounts, setAccounts] = useState<Account[]>(() => dataService.getAccounts());
  const [categories, setCategories] = useState<Category[]>(() => dataService.getCategories());
  const [transactions, setTransactions] = useState<Transaction[]>(() => dataService.getTransactions());
  const [budgets, setBudgets] = useState<Budget[]>(() => dataService.getBudgets());
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => dataService.getSavingsGoals());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => dataService.getNotifications());
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>(() => dataService.getRecurringItems());
  const [debts, setDebts] = useState<DebtItem[]>(() => dataService.getDebts());

  // Authentication & Security State
  const [session, setSession] = useState<AuthSession>(() => authService.getSession());
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => authService.isAppLocked());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const unsubAuth = authService.subscribe(() => {
      const sess = authService.getSession();
      setSession(sess);
      setUser(sess.user);
      setIsAppLocked(authService.isAppLocked());
    });
    return unsubAuth;
  }, []);

  const syncState = useCallback(() => {
    setUser(dataService.getUser());
    setAccounts(dataService.getAccounts());
    setCategories(dataService.getCategories());
    setTransactions(dataService.getTransactions());
    setBudgets(dataService.getBudgets());
    setSavingsGoals(dataService.getSavingsGoals());
    setNotifications(dataService.getNotifications());
    setRecurringItems(dataService.getRecurringItems());
    setDebts(dataService.getDebts());
  }, []);

  useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      syncState();
    });
    return unsubscribe;
  }, [syncState]);

  // Apply font size preference globally
  useEffect(() => {
    const size = user.fontSize || 'medium';
    document.documentElement.setAttribute('data-font-size', size);
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge');
    document.documentElement.classList.add(`font-size-${size}`);
  }, [user.fontSize]);

  // Theme Preference State (Light / Dark)
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('moneyflow_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return user.theme || 'light';
  });

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('moneyflow_theme', newTheme);
    dataService.updateUser({ theme: newTheme });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Apply dark mode class to html tag globally
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  // Privacy Mode (Ẩn số tiền nhạy cảm khi ở nơi công cộng)
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('moneyflow_privacy_mode') === 'true';
  });

  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      localStorage.setItem('moneyflow_privacy_mode', String(next));
      return next;
    });
  }, []);

  const formatMoney = useCallback(
    (amount: number, showSign: boolean = false) => {
      if (isPrivacyMode) return '••••••••';
      return formatVND(amount, showSign);
    },
    [isPrivacyMode]
  );

  // Toast handler
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // PWA Installation & Standalone Detection
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showToast('MoneyFlow đã được cài đặt thành công ra màn hình chính!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast]);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          showToast('Đang cài đặt ứng dụng MoneyFlow ra màn hình chính...', 'success');
          return;
        }
      } catch (err) {
        console.warn('PWA install prompt error:', err);
      }
    }
    // If deferredPrompt is not available (e.g. iOS Safari or Chrome before prompt event), open visual guide
    setIsInstallGuideOpen(true);
  }, [deferredPrompt, showToast]);

  const openInstallGuide = useCallback(() => setIsInstallGuideOpen(true), []);
  const closeInstallGuide = useCallback(() => setIsInstallGuideOpen(false), []);

  // Filtered transactions based on global time filter
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    return transactions.filter((t) => {
      try {
        const txDate = parseISO(t.date);
        switch (timeFilter) {
          case 'today':
            return isSameDay(txDate, today);
          case 'this_week':
            return isSameWeek(txDate, today, { weekStartsOn: 1 });
          case 'this_month':
            return isSameMonth(txDate, today);
          case 'this_year':
            return isSameYear(txDate, today);
          case 'custom': {
            const start = parseISO(customDateRange.start);
            const end = parseISO(customDateRange.end);
            return txDate >= start && txDate <= end;
          }
          case 'all':
          default:
            return true;
        }
      } catch {
        return true;
      }
    });
  }, [transactions, timeFilter, customDateRange]);

  // Insights
  const insights = useMemo(() => {
    return generateFinancialInsights(transactions, categories, budgets, savingsGoals, new Date());
  }, [transactions, categories, budgets, savingsGoals]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Modal helpers
  const openAddTxModal = (tx?: Transaction) => {
    setEditingTransaction(tx || null);
    setIsAddTxOpen(true);
  };

  const closeAddTxModal = () => {
    setIsAddTxOpen(false);
    setEditingTransaction(null);
  };

  // AI Modal
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const openAIModal = () => setIsAIModalOpen(true);
  const closeAIModal = () => setIsAIModalOpen(false);

  // Transaction CRUD
  const createTransaction = (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      dataService.createTransaction(data);
      showToast('Giao dịch đã được ghi nhận thành công!', 'success');
      closeAddTxModal();
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi lưu giao dịch', 'error');
    }
  };

  const updateTransaction = (id: string, data: Partial<Transaction>) => {
    try {
      dataService.updateTransaction(id, data);
      showToast('Cập nhật giao dịch thành công!', 'success');
      closeAddTxModal();
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi cập nhật giao dịch', 'error');
    }
  };

  const deleteTransaction = (id: string, options?: { revertBalance?: boolean }) => {
    try {
      const revert = options?.revertBalance !== undefined ? options.revertBalance : true;
      dataService.deleteTransaction(id, { revertBalance: revert });
      if (revert) {
        showToast('Đã xóa giao dịch và hoàn nguyên số dư tài khoản', 'info');
      } else {
        showToast('Đã xóa giao dịch thành công (Bảo toàn 100% số dư tài khoản)', 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi xóa giao dịch', 'error');
    }
  };

  const cleanupDuplicateTransactions = () => {
    try {
      const count = dataService.cleanupDuplicateTransactions();
      if (count > 0) {
        showToast(`Đã dọn dẹp ${count} bản ghi trùng lặp và bảo toàn 100% số dư ví!`, 'success');
      } else {
        showToast('Danh sách giao dịch đã sạch sẽ và không có trùng lặp.', 'info');
      }
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi dọn dẹp giao dịch', 'error');
    }
  };

  // Account CRUD
  const createAccount = (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      dataService.createAccount(data);
      showToast('Tạo tài khoản tài chính mới thành công!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi tạo tài khoản', 'error');
    }
  };

  const updateAccount = (id: string, data: Partial<Account>) => {
    try {
      dataService.updateAccount(id, data);
      showToast('Cập nhật thông tin tài khoản thành công!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi cập nhật', 'error');
    }
  };

  const deleteAccount = (id: string) => {
    try {
      dataService.deleteAccount(id);
      showToast('Đã xóa tài khoản', 'info');
    } catch (e: any) {
      showToast(e.message || 'Không thể xóa tài khoản', 'error');
    }
  };

  const transferFunds = (fromId: string, toId: string, amount: number, note?: string, date?: string) => {
    try {
      const fromAcc = accounts.find((a) => a.id === fromId);
      const toAcc = accounts.find((a) => a.id === toId);
      if (!fromAcc || !toAcc) throw new Error('Không tìm thấy tài khoản chuyển tiền');
      if (fromId === toId) throw new Error('Tài khoản nguồn và đích phải khác nhau');
      if (fromAcc.balance < amount) {
        showToast('Cảnh báo: Số dư tài khoản nguồn không đủ, vẫn tiến hành chuyển.', 'info');
      }

      dataService.createTransaction({
        type: 'transfer',
        amount,
        accountId: fromId,
        toAccountId: toId,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        note: note || `Chuyển từ ${fromAcc.name} sang ${toAcc.name}`,
        paymentMethod: 'transfer',
      });
      showToast(`Chuyển ${amount.toLocaleString('vi-VN')} ₫ thành công!`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi chuyển khoản', 'error');
    }
  };

  // Category CRUD
  const createCategory = (data: Omit<Category, 'id' | 'createdAt'>) => {
    try {
      dataService.createCategory(data);
      showToast('Đã tạo danh mục mới!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi tạo danh mục', 'error');
    }
  };

  const updateCategory = (id: string, data: Partial<Category>) => {
    try {
      dataService.updateCategory(id, data);
      showToast('Đã cập nhật danh mục!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi cập nhật', 'error');
    }
  };

  const deleteCategory = (id: string) => {
    try {
      dataService.deleteCategory(id);
      showToast('Đã xóa danh mục', 'info');
    } catch (e: any) {
      showToast(e.message || 'Lỗi xóa danh mục', 'error');
    }
  };

  // Budget
  const saveBudget = (categoryId: string, amount: number, month: string, budgetId?: string) => {
    try {
      dataService.saveBudget(categoryId, amount, month, 0.8, budgetId);
      showToast('Lưu hạn mức ngân sách thành công!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi lưu ngân sách', 'error');
    }
  };

  const deleteBudget = (id: string) => {
    try {
      dataService.deleteBudget(id);
      showToast('Đã xóa hạn mức ngân sách', 'info');
    } catch (e: any) {
      showToast(e.message || 'Lỗi xóa ngân sách', 'error');
    }
  };

  // Savings Goal
  const createSavingsGoal = (data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      dataService.createSavingsGoal(data);
      showToast('Đã tạo mục tiêu tiết kiệm mới!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi tạo mục tiêu', 'error');
    }
  };

  const updateSavingsGoal = (id: string, data: Partial<SavingsGoal>) => {
    try {
      dataService.updateSavingsGoal(id, data);
      showToast('Đã cập nhật mục tiêu!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi cập nhật mục tiêu', 'error');
    }
  };

  const depositToGoal = (goalId: string, amount: number, accountId?: string) => {
    try {
      dataService.depositToGoal(goalId, amount, accountId);
      showToast(`Đã nạp ${amount.toLocaleString('vi-VN')} ₫ vào mục tiêu!`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi nạp tiền vào mục tiêu', 'error');
    }
  };

  const deleteSavingsGoal = (id: string) => {
    try {
      dataService.deleteSavingsGoal(id);
      showToast('Đã xóa mục tiêu tiết kiệm', 'info');
    } catch (e: any) {
      showToast(e.message || 'Lỗi xóa mục tiêu', 'error');
    }
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    dataService.markNotificationAsRead(id);
  };

  const markAllNotificationsAsRead = () => {
    dataService.markAllNotificationsAsRead();
    showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'info');
  };

  const clearAllNotifications = () => {
    dataService.clearAllNotifications();
    showToast('Đã xóa sạch tất cả thông báo', 'info');
  };

  // Profile & Reset
  const updateUser = (data: Partial<User>) => {
    dataService.updateUser(data);
    showToast('Cập nhật hồ sơ thành công!', 'success');
  };

  const resetAllData = () => {
    dataService.resetToDefaultSeedData();
    showToast('Đã khôi phục dữ liệu mẫu ban đầu!', 'success');
  };

  const clearAllData = () => {
    dataService.clearAllData();
    showToast('Đã xóa dữ liệu mẫu! Giờ bạn có thể bắt đầu nhập dữ liệu của mình.', 'success');
  };

  // Cloud Sync
  const isCloudConfigured = dataService.isCloudConfigured();
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string>(
    () => localStorage.getItem('moneyflow_last_cloud_sync_at') || ''
  );

  const syncToCloud = async () => {
    setIsCloudSyncing(true);
    try {
      // 1. Kéo và hợp nhất bản mới nhất từ Cloud về trước để tránh đè mất dữ liệu từ điện thoại
      await dataService.pullFromSupabase();
      syncState();

      // 2. Đẩy bản đã hợp nhất hoàn chỉnh lên Cloud
      const result = await dataService.syncToSupabase();
      if (result.success) {
        const now = new Date().toISOString();
        setLastCloudSyncTime(now);
        showToast('☁️ Đã đồng bộ 2 chiều dữ liệu với Cloud thành công!', 'success');
      } else {
        showToast(result.message, 'error');
      }
      return result;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const pullFromCloud = async () => {
    setIsCloudSyncing(true);
    try {
      const result = await dataService.pullFromSupabase();
      if (result.success) {
        syncState();
        const now = new Date().toISOString();
        setLastCloudSyncTime(now);
        showToast('☁️ Đã tải và cập nhật số dư mới nhất từ Cloud!', 'success');
      } else {
        showToast(result.message, 'error');
      }
      return result;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const [hasSafetyBackup, setHasSafetyBackup] = useState(() => dataService.hasSafetyBackup());

  const rollbackSafetyBackup = () => {
    const result = dataService.rollbackFromSafetyBackup();
    if (result.success) {
      syncState();
      setHasSafetyBackup(dataService.hasSafetyBackup());
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
  };

  // TỰ ĐỘNG ĐỒNG BỘ 2 CHIỀU VỚI CLOUD SUPABASE (ĐIỆN THOẠI & MÁY TÍNH TỰ CẬP NHẬT TỨC THÌ)
  useEffect(() => {
    if (!isCloudConfigured) return;

    let isMounted = true;

    // 1. Luôn ưu tiên khởi tạo đồng bộ an toàn từ Cloud về trước khi cho phép auto push!
    const initSync = async () => {
      try {
        setIsCloudSyncing(true);
        await dataService.initCloudSync();
        if (isMounted) {
          syncState();
          const syncTime = localStorage.getItem('moneyflow_last_cloud_sync_at') || new Date().toISOString();
          setLastCloudSyncTime(syncTime);
        }

        // Tự động kiểm tra Thông báo toàn hệ thống từ Quản trị viên (nếu có)
        try {
          if (supabase) {
            const { data: annRow } = await supabase
              .from('cloud_backups')
              .select('data, updated_at')
              .eq('id', 'system_announcement')
              .maybeSingle();

            if (annRow && annRow.data?.title) {
              const lastSeen = localStorage.getItem('moneyflow_last_seen_announcement');
              if (!lastSeen || new Date(annRow.updated_at) > new Date(lastSeen)) {
                dataService.addNotification(
                  annRow.data.title,
                  annRow.data.message || '',
                  annRow.data.type || 'info'
                );
                localStorage.setItem('moneyflow_last_seen_announcement', annRow.updated_at);
                if (isMounted) syncState();
              }
            }
          }
        } catch {}
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
      } finally {
        if (isMounted) setIsCloudSyncing(false);
      }
    };

    initSync();

    const performAutoPull = async (silent = true) => {
      try {
        setIsCloudSyncing(true);
        const res = await dataService.autoPullFromSupabase();
        if (res.updated && isMounted) {
          syncState();
          const syncTime = localStorage.getItem('moneyflow_last_cloud_sync_at') || new Date().toISOString();
          setLastCloudSyncTime(syncTime);
          if (!silent) {
            showToast('☁️ Đã tự động đồng bộ dữ liệu mới nhất từ Cloud!', 'info');
          }
        }
      } catch (err) {
        console.warn('Auto cloud sync notice:', err);
      } finally {
        if (isMounted) setIsCloudSyncing(false);
      }
    };

    // 2. Tự động đồng bộ mỗi khi người dùng mở lại điện thoại hoặc quay lại tab này
    let lastCheck = 0;
    const handleVisibilityOrFocus = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && now - lastCheck > 4000) {
        lastCheck = now;
        performAutoPull(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // 3. Định kỳ kiểm tra ngầm mỗi 15 giây nếu đang mở app
    const intervalTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleVisibilityOrFocus();
      }
    }, 15000);

    // 4. LẮNG NGHE THAY ĐỔI THEO THỜI GIAN THỰC (Supabase Realtime)
    let channel: any = null;
    try {
      if (supabase) {
        const userEmail = (dataService.getUser().email || 'default').toLowerCase().trim();
        const backupId = `backup_${userEmail.replace(/[^a-z0-9]/g, '_')}`;

        channel = supabase
          .channel('realtime_device_sync')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'cloud_backups',
            },
            (payload: any) => {
              const newRow = payload?.new;
              if (!newRow) return;
              const isMatch = newRow.id === backupId || newRow.id === 'moneyflow_cloud_state';
              if (!isMatch) return;

              const lastLocalSync = localStorage.getItem('moneyflow_last_cloud_sync_at');
              if (newRow.updated_at && newRow.updated_at !== lastLocalSync) {
                dataService.pullFromSupabase().then((res) => {
                  if (res.success && isMounted) {
                    syncState();
                    setLastCloudSyncTime(newRow.updated_at);
                    showToast('🔄 Dữ liệu tài khoản vừa được đồng bộ tự động từ thiết bị khác!', 'info');
                  }
                });
              }
            }
          )
          .subscribe();
      }
    } catch (e) {
      console.warn('Realtime channel subscription error:', e);
    }

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(intervalTimer);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [isCloudConfigured, syncState]);

  // Recurring Items
  const saveRecurringItem = (
    itemData: Omit<RecurringItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string },
    applyToCurrentMonth = false
  ) => {
    try {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth() + 1;
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

      dataService.saveRecurringItem(itemData, applyToCurrentMonth);

      if (applyToCurrentMonth || currentDay === itemData.dayOfMonth) {
        showToast('Đã lưu cấu hình và ghi nhận vào số dư ví tháng này!', 'success');
      } else if (currentDay < itemData.dayOfMonth) {
        showToast(`Đã lưu cấu hình lương! Sẽ tự động cộng vào ví khi đến ngày ${itemData.dayOfMonth}/${currentMonth}.`, 'success');
      } else {
        showToast(`Đã lưu cấu hình! Sẽ bắt đầu tự động cộng từ ngày ${itemData.dayOfMonth}/${nextMonth} (tháng sau).`, 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Lỗi lưu thông tin định kỳ', 'error');
    }
  };

  const deleteRecurringItem = (id: string, removeCurrentMonthTx = false) => {
    try {
      dataService.deleteRecurringItem(id, removeCurrentMonthTx);
      showToast('Đã xóa cấu hình định kỳ thành công', 'info');
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi xóa', 'error');
    }
  };

  const toggleRecurringItem = (id: string) => {
    try {
      dataService.toggleRecurringItem(id);
      showToast('Đã cập nhật trạng thái tự động', 'info');
    } catch (e: any) {
      showToast(e.message || 'Lỗi', 'error');
    }
  };

  const checkAndProcessRecurring = () => {
    const count = dataService.processRecurringTransactions(true);
    if (count > 0) {
      showToast(`Đã đồng bộ ${count} khoản lương / thu chi định kỳ vào Thu nhập & Số dư ví tháng này!`, 'success');
    } else {
      showToast('Tất cả các khoản lương và thu chi định kỳ của tháng này đã được cập nhật đủ.', 'info');
    }
  };

  const processDailyYield = () => {
    return dataService.processDailyYield();
  };

  const forceCalculateYield = (accountId: string, forceToday?: boolean) => {
    const res = dataService.forceCalculateYield(accountId, forceToday);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'info');
    }
    return res;
  };

  // Debt Handlers
  const createDebt = (
    data: Omit<DebtItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
    options?: { balanceAction?: DebtBalanceAction; syncAccount?: boolean }
  ) => {
    try {
      dataService.createDebt(data, options);
      showToast(
        data.type === 'lend'
          ? `Đã ghi nhận khoản cho "${data.personName}" vay nợ!`
          : `Đã ghi nhận khoản vay từ "${data.personName}"!`,
        'success'
      );
    } catch (e: any) {
      showToast(e.message || 'Lỗi thêm khoản nợ', 'error');
    }
  };

  const updateDebt = (id: string, data: Partial<DebtItem>) => {
    try {
      dataService.updateDebt(id, data);
      showToast('Cập nhật thông tin khoản nợ thành công!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi cập nhật khoản nợ', 'error');
    }
  };

  const deleteDebt = (id: string) => {
    try {
      dataService.deleteDebt(id);
      showToast('Đã xóa khoản nợ', 'info');
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi xóa khoản nợ', 'error');
    }
  };

  const recordDebtPayment = (
    debtId: string,
    amount: number,
    accountId?: string,
    note?: string,
    date?: string,
    balanceAction?: DebtBalanceAction
  ) => {
    try {
      dataService.recordDebtPayment(debtId, amount, accountId, note, date, balanceAction);
      showToast('Đã ghi nhận đợt trả nợ thành công!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi ghi nhận trả nợ', 'error');
    }
  };

  const autoOffsetNegativeAccount = (negativeAccountId: string, sourceAccountId?: string): boolean => {
    try {
      const res = dataService.autoOffsetNegativeAccount(negativeAccountId, sourceAccountId);
      if (res) {
        showToast('Đã cấn trừ bù số dư âm thành công! ✨', 'success');
      } else {
        showToast('Không tìm thấy tài khoản còn đủ số dư dương để cấn trừ.', 'info');
      }
      return res;
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi cấn trừ số dư', 'error');
      return false;
    }
  };

  const autoOffsetAllNegativeAccounts = (): number => {
    try {
      const count = dataService.autoOffsetAllNegativeAccounts();
      if (count > 0) {
        showToast(`Đã tự động cấn trừ thành công cho ${count} tài khoản bị âm! ✨`, 'success');
      } else {
        showToast('Không có tài khoản nào bị âm hoặc không có tài khoản nguồn đủ tiền.', 'info');
      }
      return count;
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi cấn trừ số dư', 'error');
      return 0;
    }
  };

  const recalculateAccountBalances = () => {
    try {
      dataService.recalculateAccountBalances();
      showToast('Đã đồng bộ lại số dư tất cả các ví theo đúng lịch sử giao dịch!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi đồng bộ số dư', 'error');
    }
  };

  // Authentication & Security Handlers
  const openAuthModal = (defaultTab: 'login' | 'register' = 'login') => {
    setAuthModalDefaultTab(defaultTab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    if (res.success && res.user) {
      setUser(res.user);
      setCurrentTab('dashboard');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      pullFromCloud().catch(() => {});
    }
    return res;
  };

  const register = async (fullName: string, email: string, password: string) => {
    const res = await authService.register(fullName, email, password);
    if (res.success && res.user) {
      setUser(res.user);
      setCurrentTab('dashboard');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      syncToCloud().catch(() => {});
    }
    return res;
  };

  const loginAsDemo = (name?: string, email?: string) => {
    authService.loginAsDemo(name, email);
    setUser(authService.getCurrentUser());
    setCurrentTab('dashboard');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const logout = async () => {
    await authService.logout();
    setCurrentTab('dashboard');
    openAuthModal('login');
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    const res = await authService.changePassword(oldPassword, newPassword);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const resetPassword = async (email: string, newPassword: string) => {
    const res = await authService.resetPassword(email, newPassword);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const setPinCode = (pin: string) => {
    const success = authService.setPinCode(pin);
    if (success) {
      showToast('Đã thiết lập mã PIN bảo mật 6 số thành công!', 'success');
      syncState();
    } else {
      showToast('Mã PIN phải gồm đúng 6 chữ số (0-9)', 'error');
    }
    return success;
  };

  const removePinCode = () => {
    authService.removePinCode();
    showToast('Đã tắt khóa mã PIN bảo mật', 'info');
    syncState();
  };

  const unlockWithPin = (pin: string) => {
    const ok = authService.unlockWithPin(pin);
    if (ok) {
      setIsAppLocked(false);
      showToast('Mở khóa thành công!', 'success');
    }
    return ok;
  };

  const unlockWithPassword = async (password: string) => {
    const res = await authService.unlockWithPassword(password);
    if (res.success) {
      setIsAppLocked(false);
      syncState();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const lockApp = () => {
    authService.lockApp();
    setIsAppLocked(true);
  };

  return (
    <FinancialContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        timeFilter,
        setTimeFilter,
        customDateRange,
        setCustomDateRange,
        user,
        accounts,
        categories,
        transactions,
        filteredTransactions,
        budgets,
        savingsGoals,
        notifications,
        recurringItems,
        debts,
        unreadNotificationCount,
        insights,
        isAddTxOpen,
        openAddTxModal,
        closeAddTxModal,
        editingTransaction,
        isAIModalOpen,
        openAIModal,
        closeAIModal,
        toasts,
        showToast,
        removeToast,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        cleanupDuplicateTransactions,
        createAccount,
        updateAccount,
        deleteAccount,
        transferFunds,
        createCategory,
        updateCategory,
        deleteCategory,
        saveBudget,
        deleteBudget,
        createSavingsGoal,
        updateSavingsGoal,
        depositToGoal,
        deleteSavingsGoal,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        updateUser,
        resetAllData,
        clearAllData,
        saveRecurringItem,
        deleteRecurringItem,
        toggleRecurringItem,
        checkAndProcessRecurring,
        processDailyYield,
        forceCalculateYield,
        createDebt,
        updateDebt,
        deleteDebt,
        recordDebtPayment,
        autoOffsetNegativeAccount,
        autoOffsetAllNegativeAccounts,
        recalculateAccountBalances,
        isCloudConfigured,
        isCloudSyncing,
        lastCloudSyncTime,
        syncToCloud,
        pullFromCloud,
        hasSafetyBackup,
        rollbackSafetyBackup,
        theme,
        toggleTheme,
        setTheme,
        isPrivacyMode,
        togglePrivacyMode,
        formatMoney,
        session,
        isAuthenticated: session.isLoggedIn,
        isAdmin: authService.isAdmin(),
        isAppLocked,
        isAuthModalOpen,
        authModalDefaultTab,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        loginAsDemo,
        logout,
        changePassword,
        resetPassword,
        setPinCode,
        removePinCode,
        unlockWithPin,
        unlockWithPassword,
        lockApp,
        isInstallable: !!deferredPrompt,
        isInstalled,
        promptInstall,
        isInstallGuideOpen,
        openInstallGuide,
        closeInstallGuide,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export function useFinancial(): FinancialContextType {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
}

