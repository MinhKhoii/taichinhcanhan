import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Category, RecurringItem } from '../types';
import {
  Settings,
  User as UserIcon,
  Tag,
  Database,
  Cloud,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Plus,
  Check,
  Copy,
  ShieldCheck,
  AlertTriangle,
  Coins,
  Play,
  Edit2,
  Calendar,
  Type,
  RefreshCw,
  Sun,
  Moon,
  Lock,
  KeyRound,
  LogOut,
  Search,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  Sparkles,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { DynamicIcon } from '../components/common/DynamicIcon';
import { dataService } from '../services/dataService';
import { RecurringModal } from '../components/modals/RecurringModal';
import { formatVND } from '../utils/formatters';
import { exportComprehensiveReportToExcel } from '../utils/exportData';
import schemaSql from '../../supabase/schema.sql?raw';
import { ConfirmClearDataModal } from '../components/modals/ConfirmClearDataModal';
import { ConfirmResetDataModal } from '../components/modals/ConfirmResetDataModal';
import { ChangePasswordModal } from '../components/modals/ChangePasswordModal';

type SettingsTab = 'account' | 'categories' | 'recurring' | 'cloud';

export const SettingsPage: React.FC = () => {
  const {
    user,
    updateUser,
    accounts,
    categories,
    transactions,
    budgets,
    debts,
    savingsGoals,
    createCategory,
    deleteCategory,
    resetAllData,
    clearAllData,
    recurringItems,
    deleteRecurringItem,
    toggleRecurringItem,
    checkAndProcessRecurring,
    showToast,
    isCloudConfigured,
    syncToCloud,
    pullFromCloud,
    theme,
    setTheme,
    session,
    isAdmin,
    openAuthModal,
    logout,
    setPinCode,
    removePinCode,
    lockApp,
  } = useFinancial();

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  // Change Password Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // PIN Management State
  const [pinInput, setPinInput] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  // Recurring Items State
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringItem | null>(null);

  // Safety Confirmation Modals for Clear & Reset Data
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  // Cloud Sync Status
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Profile Form
  const [fullName, setFullName] = useState(user.fullName || 'Khôi');
  const [isEditingName, setIsEditingName] = useState(false);

  // Category Filter & Search
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryFilterType, setCategoryFilterType] = useState<'all' | 'expense' | 'income'>('all');

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Supabase Copy SQL & Guide Toggle
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  // Gemini AI Key states
  const [geminiKeyInput, setGeminiKeyInput] = useState(aiService.getApiKey());
  const [hasGeminiKey, setHasGeminiKey] = useState(aiService.hasApiKey());
  const [isTestingGemini, setIsTestingGemini] = useState(false);

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKeyInput.trim()) {
      showToast('Vui lòng nhập API Key Google Gemini!', 'error');
      return;
    }
    setIsTestingGemini(true);
    const res = await aiService.testConnection(geminiKeyInput.trim());
    setIsTestingGemini(false);
    if (res.success) {
      aiService.setApiKey(geminiKeyInput.trim());
      setHasGeminiKey(true);
      showToast('Kích hoạt Google Gemini AI thành công! 🎉', 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleClearGeminiKey = () => {
    aiService.setApiKey('');
    setGeminiKeyInput('');
    setHasGeminiKey(false);
    showToast('Đã xóa API Key. Trợ lý chuyển sang phân tích nội bộ!', 'info');
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pinInput)) {
      showToast('Vui lòng nhập đúng 6 chữ số (0-9)!', 'error');
      return;
    }
    const success = setPinCode(pinInput);
    if (success) {
      setPinInput('');
      setIsChangingPin(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast('Vui lòng nhập tên danh mục', 'error');
      return;
    }
    createCategory({
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: newCatIcon,
    });
    setNewCatName('');
    setIsAddingCategory(false);
    showToast(`Đã tạo danh mục "${newCatName.trim()}"!`, 'success');
  };

  const handleExportJSON = () => {
    const dataStr = dataService.exportDataJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MoneyFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('Tải file sao lưu JSON thành công!', 'success');
  };

  const handleExportExcel = () => {
    exportComprehensiveReportToExcel(
      transactions,
      accounts,
      categories,
      budgets,
      savingsGoals,
      debts,
      `MoneyFlow_Toan_Bo_Du_Lieu_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    showToast('Xuất toàn bộ dữ liệu ra Excel (.xlsx) thành công!', 'success');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const res = dataService.importFromExcel(buffer);
        if (res.success) {
          showToast(res.message, 'success');
        } else {
          showToast(res.message || 'Lỗi nhập dữ liệu từ Excel', 'error');
        }
      } catch (err: any) {
        showToast(`Lỗi xử lý file Excel: ${err.message || err}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = dataService.importDataJSON(content);
      if (success) {
        showToast('Khôi phục dữ liệu từ file sao lưu thành công!', 'success');
      } else {
        showToast('File dữ liệu không đúng định dạng MoneyFlow!', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    showToast('Đã sao chép toàn bộ mã SQL (10 bảng và bảo mật RLS) vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(categorySearch.toLowerCase().trim());
      const matchType = categoryFilterType === 'all' || c.type === categoryFilterType;
      return matchSearch && matchType;
    });
  }, [categories, categorySearch, categoryFilterType]);

  const iconOptions = [
    'Tag', 'Utensils', 'Car', 'Home', 'Zap', 'ShoppingBag', 'Film', 'HeartPulse', 'BookOpen',
    'Briefcase', 'Award', 'Laptop', 'TrendingUp', 'Gift', 'Plane', 'ShieldCheck'
  ];

  const colorOptions = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B'
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          Cài đặt hệ thống
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Tùy chỉnh thông tin tài khoản, bảo mật mã PIN, danh mục thu chi, giao diện và sao lưu dữ liệu
        </p>
      </div>

      {/* Modern Navigation Tabs - Zero Layout Jump */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'account'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-slate-200/70 dark:ring-slate-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Tài khoản & Giao diện</span>
          {user.isPinEnabled && (
            <span className="text-3xs font-semibold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              PIN 6 số
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'categories'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-slate-200/70 dark:ring-slate-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Danh mục Thu / Chi</span>
          <span className="text-3xs font-semibold px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
            {categories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recurring')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'recurring'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-slate-200/70 dark:ring-slate-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Lương & Định kỳ</span>
          {recurringItems.length > 0 && (
            <span className="text-3xs font-semibold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {recurringItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'cloud'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-slate-200/70 dark:ring-slate-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Sao lưu & Đám mây</span>
          {isAdmin && isCloudConfigured && (
            <span className="text-3xs font-semibold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Cloud
            </span>
          )}
        </button>
      </div>

      {/* ==================== TAB 1: TÀI KHOẢN & GIAO DIỆN ==================== */}
      {activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
          {/* Column 1: Unified Profile & 6-digit PIN Security */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            {/* Header with User Badge */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Hồ sơ tài khoản & Bảo mật
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {isAdmin ? (
                  <span className="text-3xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    👑 Quản trị viên
                  </span>
                ) : (
                  <span className="text-3xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Thành viên
                  </span>
                )}
                <span className="text-3xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {session.loginMethod === 'supabase' ? 'Supabase Cloud' : 'Tài khoản nội bộ'}
                </span>
              </div>
            </div>

            {/* User Info Bar */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 truncate">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                  {user.fullName?.slice(0, 2).toUpperCase() || 'MF'}
                </div>
                <div className="truncate">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {user.fullName}
                  </h4>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email || 'Chưa liên kết email'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Đổi tài khoản
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Bạn có chắc muốn đăng xuất khỏi tài khoản này?')) {
                      await logout();
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Account Details & Secure Protected View */}
            <div className="space-y-3">
              {/* Họ và tên với nút Sửa tên */}
              <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <span className="text-3xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Tên hiển thị hồ sơ:
                  </span>
                  {isEditingName ? (
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-blue-500 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden ring-2 ring-blue-500/20"
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 block truncate">
                      {user.fullName || 'Khôi'}
                    </span>
                  )}
                </div>

                {isEditingName ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!fullName.trim()) return;
                        updateUser({ fullName: fullName.trim() });
                        setIsEditingName(false);
                        showToast('Đã lưu tên hiển thị mới!', 'success');
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFullName(user.fullName || 'Khôi');
                        setIsEditingName(false);
                      }}
                      className="px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="px-3 py-1.5 text-2xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-50 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Sửa tên</span>
                  </button>
                )}
              </div>

              {/* Địa chỉ Email - Khóa cố định bảo mật */}
              <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 truncate">
                  <span className="text-3xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Email tài khoản (Khóa bảo vệ):
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 font-mono block truncate">
                    {user.email || 'email@example.com'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-2xs bg-emerald-100/80 dark:bg-emerald-950/50 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Định danh cố định</span>
                </div>
              </div>

              {/* Thông tin Tiền tệ & Ngày */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
                  <span className="text-3xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Đơn vị tiền tệ
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 block">
                    VNĐ (Việt Nam Đồng)
                  </span>
                </div>
                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
                  <span className="text-3xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Định dạng ngày
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 block">
                    DD/MM/YYYY
                  </span>
                </div>
              </div>
            </div>

            {/* Mật khẩu đăng nhập tài khoản */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Mật khẩu tài khoản đăng nhập</span>
                </label>
                <p className="text-2xs text-slate-400 mt-0.5">
                  Dùng khi đăng nhập trên các máy khác hoặc đổi thiết bị
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Đổi mật khẩu
              </button>
            </div>

            {/* Mã PIN 6 số Bảo mật */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span>Khóa mã PIN 6 số bảo vệ</span>
                  </label>
                  <p className="text-2xs text-slate-400 mt-0.5">
                    Khóa số dư & sổ nợ an toàn khi cho người khác mượn máy
                  </p>
                </div>
                <span
                  className={`text-3xs font-bold px-2 py-0.5 rounded-full ${
                    user.isPinEnabled
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {user.isPinEnabled ? 'Đang bật (6 số)' : 'Chưa cài đặt'}
                </span>
              </div>

              {user.isPinEnabled && !isChangingPin ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <span className="text-2xs text-amber-800 dark:text-amber-300 block font-semibold">
                          Mã PIN đang bảo vệ:
                        </span>
                        {/* Display PIN masked as •••••• */}
                        <span className="font-mono text-base font-black tracking-widest text-slate-800 dark:text-slate-100">
                          ••••••
                        </span>
                      </div>
                    </div>
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đã mã hóa SHA-256
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => lockApp()}
                      className="flex-1 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/50 hover:bg-amber-200/80 border border-amber-200 dark:border-amber-800 rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Khóa ngay màn hình</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingPin(true)}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      Đổi PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Bạn có chắc muốn gỡ bỏ mã PIN 6 số bảo vệ?')) {
                          removePinCode();
                        }
                      }}
                      className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl transition-colors cursor-pointer"
                    >
                      Tắt PIN
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSavePin} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="password"
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Nhập 6 số PIN mới (VD: 123456)"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 font-mono tracking-wider"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {isChangingPin ? 'Lưu PIN mới' : 'Đặt PIN 6 số'}
                    </button>
                    {isChangingPin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingPin(false);
                          setPinInput('');
                        }}
                        className="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                  <p className="text-3xs text-slate-400">
                    💡 Hãy nhập đúng 6 chữ số. Sau khi lưu, mã PIN sẽ tự động mã hóa bí mật thành •••••• để bảo vệ tuyệt đối.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Column 2: Theme & Font Size Preference */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Type className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Giao diện & Cỡ chữ hiển thị
                  </h3>
                  <p className="text-2xs text-slate-500 dark:text-slate-400">
                    Tùy chọn chế độ sáng / tối và kích thước chữ to nhỏ vừa mắt bạn
                  </p>
                </div>
              </div>
              {user.fontSize && user.fontSize !== 'medium' && (
                <button
                  type="button"
                  onClick={() => {
                    updateUser({ fontSize: 'medium' });
                    showToast('Đã khôi phục cỡ chữ mặc định (Vừa vặn - 100%)', 'info');
                  }}
                  className="flex items-center gap-1 text-2xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Khôi phục cỡ chữ mặc định"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Cỡ mặc định</span>
                </button>
              )}
            </div>

            {/* Theme Mode: Light / Dark */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Chế độ màu nền (Sáng / Tối):
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTheme('light');
                    showToast('Đã kích hoạt Chế độ Sáng (Ban ngày)!', 'info');
                  }}
                  className={`p-3 rounded-2xl border flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs">☀️ Chế độ Sáng</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTheme('dark');
                    showToast('Đã kích hoạt Chế độ Tối (Dark Mode)!', 'info');
                  }}
                  className={`p-3 rounded-2xl border flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-blue-600 bg-blue-950/50 text-blue-200 font-bold ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs">🌙 Chế độ Tối</span>
                </button>
              </div>
            </div>

            {/* Font Size Selector */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Kích thước chữ hệ thống:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    id: 'small',
                    name: 'Nhỏ gọn',
                    scale: '90%',
                    desc: 'Chứa nhiều nội dung',
                    sample: 'Aa',
                    sampleClass: 'text-xs',
                  },
                  {
                    id: 'medium',
                    name: 'Vừa vặn',
                    scale: '100% (Chuẩn)',
                    desc: 'Chuẩn tối ưu nhất',
                    sample: 'Aa',
                    sampleClass: 'text-sm font-semibold',
                    isDefault: true,
                  },
                  {
                    id: 'large',
                    name: 'Lớn',
                    scale: '110%',
                    desc: 'Dễ đọc, thoáng mắt',
                    sample: 'Aa',
                    sampleClass: 'text-base font-bold',
                  },
                  {
                    id: 'xlarge',
                    name: 'Rất lớn',
                    scale: '120%',
                    desc: 'To rõ ràng',
                    sample: 'Aa',
                    sampleClass: 'text-lg font-black',
                  },
                ].map((item) => {
                  const isSelected = (user.fontSize || 'medium') === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        updateUser({ fontSize: item.id as any });
                        showToast(`Đã chuyển cỡ chữ sang "${item.name}"!`, 'success');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs ring-2 ring-blue-500/20 font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600" />
                      )}
                      <span className={`${item.sampleClass} text-slate-800 dark:text-slate-100 my-0.5`}>
                        {item.sample}
                      </span>
                      <span className="text-xs font-bold block">{item.name}</span>
                      <span
                        className={`text-3xs block mt-0.5 ${
                          item.isDefault ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {item.scale}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="space-y-0.5 truncate">
                <span className="text-3xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Xem trước trực quan:
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  Số dư ví: 10.305.000 ₫ • Chi tiêu: 3.500.000 ₫
                </p>
              </div>
              <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
                Tự động lưu
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: DANH MỤC THU / CHI ==================== */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
            <div className="flex items-center space-x-2.5">
              <Tag className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Danh mục thu nhập & chi tiêu ({categories.length})
                </h3>
                <p className="text-2xs text-slate-400">
                  Tùy biến các hạng mục phù hợp với thói quen tài chính của bạn
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingCategory(!isAddingCategory)}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer w-fit"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingCategory ? 'Đóng tạo mới' : 'Thêm danh mục mới'}</span>
            </button>
          </div>

          {/* Add Category Form */}
          {isAddingCategory && (
            <form
              onSubmit={handleAddCategory}
              className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 space-y-3 animate-in slide-in-from-top duration-200"
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Tạo danh mục mới
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Tên danh mục
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cà phê, Nuôi thú cưng..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Phân loại
                  </label>
                  <select
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  >
                    <option value="expense">Chi tiêu (-)</option>
                    <option value="income">Thu nhập (+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Biểu tượng
                  </label>
                  <select
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  >
                    {iconOptions.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Màu sắc nhận diện
                </label>
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  {colorOptions.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewCatColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        newCatColor === c ? 'scale-125 border-slate-900 dark:border-white shadow-xs' : 'border-white dark:border-slate-800'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
                >
                  Tạo danh mục
                </button>
              </div>
            </form>
          )}

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCategoryFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  categoryFilterType === 'all'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tất cả ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilterType('expense')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  categoryFilterType === 'expense'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Chi tiêu ({categories.filter((c) => c.type === 'expense').length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilterType('income')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  categoryFilterType === 'income'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Thu nhập ({categories.filter((c) => c.type === 'income').length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm nhanh danh mục..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category List Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredCategories.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                Không tìm thấy danh mục nào phù hợp
              </div>
            ) : (
              filteredCategories.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs shadow-2xs shrink-0"
                      style={{ backgroundColor: c.color }}
                    >
                      <DynamicIcon name={c.icon} className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">
                        {c.name}
                      </span>
                      <span className="text-2xs text-slate-400 capitalize">
                        {c.type === 'income' ? '+ Thu nhập' : '- Chi tiêu'}
                      </span>
                    </div>
                  </div>

                  {!c.isDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa danh mục "${c.name}"?`)) {
                          deleteCategory(c.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                      title="Xóa danh mục"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: LƯƠNG & ĐỊNH KỲ ==================== */}
      {activeTab === 'recurring' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
            <div className="flex items-center space-x-2.5">
              <Coins className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Lương & Thu chi định kỳ tự động
                  </h3>
                  <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    🔗 Đồng bộ với trang Giao dịch
                  </span>
                </div>
                <p className="text-2xs text-slate-400">
                  Cài đặt ngày nhận lương mặc định trong tháng. Tự động cộng tiền vào ví khi đến ngày.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {recurringItems.length > 0 && (
                <button
                  type="button"
                  onClick={checkAndProcessRecurring}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                  title="Kiểm tra và tự động ghi nhận ngay"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Ghi nhận ngay</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingRecurring(null);
                  setIsRecurringModalOpen(true);
                }}
                className="flex items-center space-x-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cài đặt lương định kỳ</span>
              </button>
            </div>
          </div>

          {/* List of Recurring Items */}
          <div className="space-y-3">
            {recurringItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Chưa thiết lập lương định kỳ nào
                </p>
                <p className="text-2xs text-slate-400 max-w-md mx-auto">
                  Bấm <strong>"+ Cài đặt lương định kỳ"</strong> để đặt mức lương nhận hàng tháng (ví dụ: ngày 5 hoặc 10 hàng tháng). Khi đến ngày đó, hệ thống sẽ tự động cộng tiền vào ví của bạn.
                </p>
              </div>
            ) : (
              recurringItems.map((item) => {
                const acc = accounts.find((a) => a.id === item.accountId);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                        N{item.dayOfMonth}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                            {item.name}
                          </h4>
                          <span
                            className={`text-3xs font-semibold px-2 py-0.5 rounded-full ${
                              item.isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.isActive ? 'Đang tự động' : 'Tạm tắt'}
                          </span>
                        </div>
                        <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Ngày {item.dayOfMonth} hàng tháng • Nhận vào: <strong>{acc?.name || 'Tài khoản'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-4">
                      <span className="text-sm sm:text-base font-black text-emerald-600">
                        +{formatVND(item.amount)}
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => toggleRecurringItem(item.id)}
                          className={`px-2.5 py-1 text-2xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            item.isActive
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {item.isActive ? 'Tắt' : 'Bật'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecurring(item);
                            setIsRecurringModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer"
                          title="Sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Xóa cấu hình lương định kỳ "${item.name}"?`)) {
                              deleteRecurringItem(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: SAO LƯU & ĐÁM MÂY ==================== */}
      {activeTab === 'cloud' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
          {/* Card 1: Local Data Management */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Quản lý & Sao lưu dữ liệu
              </h3>
            </div>

            <div className="space-y-3">
              {/* Xuất Excel */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất dữ liệu toàn diện (Excel .xlsx)</span>
                  </h4>
                  <p className="text-2xs text-slate-500 dark:text-slate-400">
                    Bao gồm ví tài khoản, thu chi, ngân sách, mục tiêu & sổ nợ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Excel</span>
                </button>
              </div>

              {/* Nhập từ Excel */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nhập & Khôi phục từ Excel (.xlsx)</span>
                  </h4>
                  <p className="text-2xs text-slate-500 dark:text-slate-400">
                    Tự động nhận diện và <strong className="text-emerald-700 dark:text-emerald-300">chống trùng lặp giao dịch</strong>
                  </p>
                </div>
                <label className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100/60 rounded-xl cursor-pointer transition-colors shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Chọn file Excel</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Xuất JSON */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Xuất file sao lưu (JSON)
                  </h4>
                  <p className="text-2xs text-slate-400">
                    Lưu trữ dự phòng toàn bộ dữ liệu trên máy
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải JSON</span>
                </button>
              </div>

              {/* Nhập JSON */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Khôi phục từ file JSON
                  </h4>
                  <p className="text-2xs text-slate-400">
                    Tải lên file sao lưu JSON đã lưu trước đó
                  </p>
                </div>
                <label className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Chọn JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Dữ liệu mẫu phong phú
                  </h4>
                  <p className="text-2xs text-slate-400">
                    Nạp lại 50+ giao dịch mẫu thực tế để trải nghiệm
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmResetOpen(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Nạp mẫu</span>
                </button>
              </div>

              <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Xóa dữ liệu mẫu (Bắt đầu nhập mới)
                  </h4>
                  <p className="text-2xs text-rose-600 dark:text-rose-400">
                    Dọn sạch toàn bộ thu chi & mục tiêu mẫu để tự nhập
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmClearOpen(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl border border-rose-300 dark:border-rose-800 shadow-2xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Xóa sạch</span>
                </button>
              </div>
            </div>

            {/* Storage Info Banner */}
            <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="text-2xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong className="text-slate-800 dark:text-slate-100 font-semibold">Lưu trữ cục bộ an toàn:</strong> Dữ liệu tài chính được lưu trữ trực tiếp trên trình duyệt của máy bạn (LocalStorage), phân tách độc lập theo từng tài khoản. Khuyến nghị bấm <strong>Tải file</strong> định kỳ để sao lưu dữ liệu.
              </div>
            </div>
          </div>

          {/* Card: Trợ lý AI Gemini (Google AI Studio) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-2xs">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Trợ lý AI Gemini (Google AI)
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Tích hợp trí tuệ nhân tạo đàm thoại & bóc tách giao dịch tiếng Việt
                  </p>
                </div>
              </div>
              <span
                className={`text-3xs font-extrabold uppercase px-2.5 py-1 rounded-full ${
                  hasGeminiKey
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {hasGeminiKey ? 'Gemini 1.5 Flash (Sẵn sàng)' : 'Phân tích Nội bộ'}
              </span>
            </div>

            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Google Gemini API Key
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-3xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 underline"
                >
                  <span>Lấy key miễn phí (Google AI Studio)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-2xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Google cung cấp miễn phí API Key Gemini với hạn mức thoải mái cho người dùng cá nhân. Nhập key tại đây để mở khóa chức năng đàm thoại tự do và phân tích chuyên sâu.
              </p>
            </div>

            <form onSubmit={handleSaveGeminiKey} className="space-y-3">
              <div>
                <input
                  type="password"
                  placeholder="Dán API Key Google Gemini (bắt đầu bằng AIzaSy...)"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isTestingGemini}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  {isTestingGemini ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isTestingGemini ? 'Đang kiểm tra kết nối...' : 'Lưu & Kiểm tra kết nối AI'}</span>
                </button>

                {hasGeminiKey && (
                  <button
                    type="button"
                    onClick={handleClearGeminiKey}
                    className="px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl transition-colors cursor-pointer"
                  >
                    Xóa Key
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Card 2: Supabase Cloud Integration (Admin Only) or Privacy Card (Regular Users) */}
          {!isAdmin ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Bảo mật dữ liệu cá nhân
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Không gian lưu trữ độc lập và an toàn tuyệt đối
                  </p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Lưu trữ cục bộ riêng tư (LocalStorage)
                  </span>
                </div>
                <p className="text-2xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tài khoản của bạn được lưu trữ biệt lập trên trình duyệt của máy bạn, hoàn toàn không chia sẻ với bất kỳ ai. Bạn có thể bấm <strong>"Tải file"</strong> định kỳ để cất giữ file sao lưu JSON an toàn trên máy tính của mình.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center space-x-2.5">
                  <Cloud className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        Cơ sở dữ liệu Supabase Cloud
                      </h3>
                      <span className="text-3xs font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300">
                        👑 Dành cho Quản trị viên
                      </span>
                    </div>
                    <p className="text-2xs text-slate-400">
                      Lưu trữ đám mây an toàn, đồng bộ dữ liệu trên mọi thiết bị
                    </p>
                  </div>
                </div>
                {isCloudConfigured ? (
                  <span className="px-2.5 py-1 text-2xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 w-fit">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Đã kết nối Cloud
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-2xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1 w-fit">
                    Chưa kích hoạt Cloud
                  </span>
                )}
              </div>

              {/* Cloud Sync Actions */}
              {isCloudConfigured && (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Máy chủ Đám mây PostgreSQL:
                      </span>
                      <p className="text-2xs font-mono text-emerald-800/80 dark:text-emerald-300/80">
                        rlqic••••••••.supabase.co (Đã mã hóa SSL 256-bit)
                      </p>
                    </div>
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Bảo mật RLS Cấp Hàng
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-2xs text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tự động đồng bộ 2 chiều (Real-time Cloud Sync)</span>
                    </div>
                    <p className="text-3xs leading-relaxed text-slate-500 dark:text-slate-400">
                      Khi mở app trên điện thoại hoặc máy tính, hệ thống sẽ <strong>tự động kéo dữ liệu mới nhất ngầm từ Cloud</strong> mà không cần bạn phải thao tác. Khi thêm/sửa giao dịch, hệ thống sẽ tự động sao lưu lên Cloud.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-2 pt-1">
                    <button
                      type="button"
                      disabled={isSyncing || isPulling}
                      onClick={async () => {
                        setIsSyncing(true);
                        try {
                          await syncToCloud();
                        } finally {
                          setIsSyncing(false);
                        }
                      }}
                      className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {isSyncing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{isSyncing ? 'Đang tải lên...' : '☁️ Đồng bộ lên Cloud'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing || isPulling}
                      onClick={async () => {
                        if (confirm('Tải dữ liệu từ Supabase Cloud về máy này? Dữ liệu trên máy sẽ được cập nhật đồng bộ.')) {
                          setIsPulling(true);
                          try {
                            await pullFromCloud();
                          } finally {
                            setIsPulling(false);
                          }
                        }
                      }}
                      className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-slate-800 hover:bg-emerald-50 disabled:opacity-50 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      {isPulling ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{isPulling ? 'Đang tải về...' : 'Tải về từ Cloud'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Collapsible Schema SQL Guide */}
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSqlGuide(!showSqlGuide)}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Chi tiết kỹ thuật & Hướng dẫn SQL (Dành cho Quản trị viên)</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      showSqlGuide ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showSqlGuide && (
                  <div className="p-4 bg-slate-900 text-slate-200 text-xs space-y-3 font-mono border-t border-slate-800 animate-in slide-in-from-top duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-white font-bold block font-sans">
                          Khởi tạo bảng cơ sở dữ liệu trên Supabase:
                        </span>
                        <span className="text-slate-400 text-2xs font-sans">
                          Bao gồm 10 bảng dữ liệu và chính sách phân quyền bảo mật RLS cấp hàng.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs text-white font-sans font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedSql ? '✓ Đã sao chép SQL!' : 'Sao chép toàn bộ mã SQL'}</span>
                      </button>
                    </div>
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-slate-400 text-2xs font-sans leading-relaxed space-y-1">
                      <p className="font-semibold text-slate-300">💡 Hướng dẫn 3 bước nhanh trên Supabase:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                        <li>Bấm nút <strong>"Sao chép toàn bộ mã SQL"</strong> ở trên.</li>
                        <li>Mở bảng điều khiển Supabase → mục <strong>SQL Editor</strong> → bấm <strong>"New query"</strong>.</li>
                        <li>Dán (<code>Ctrl + V</code>) và bấm nút <strong>"Run"</strong>. Sau đó bấm <strong>"Đồng bộ lên Cloud"</strong> là xong!</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        editingItem={editingRecurring}
      />

      <ConfirmClearDataModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={clearAllData}
        onAutoBackup={handleExportJSON}
        stats={{
          transactionCount: transactions.length,
          accountCount: accounts.length,
          debtCount: debts.length,
          goalCount: savingsGoals.length,
        }}
      />

      <ConfirmResetDataModal
        isOpen={isConfirmResetOpen}
        onClose={() => setIsConfirmResetOpen(false)}
        onConfirm={resetAllData}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};
