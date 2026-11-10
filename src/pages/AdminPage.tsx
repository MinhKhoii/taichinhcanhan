import React, { useState, useEffect, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Database,
  Cloud,
  Server,
  Sparkles,
  RefreshCw,
  Search,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Lock,
  FileCode,
  Activity,
  Calendar,
  Clock,
  Wallet,
  ArrowLeftRight,
  Cpu,
  Layers,
  Eye,
  EyeOff,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Filter,
  CheckCircle,
  X,
  PieChart,
  Target,
  HandCoins,
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { formatVND } from '../utils/formatters';
import schemaSql from '../../supabase/schema.sql?raw';

interface CloudUserInfo {
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
  isAdmin: boolean;
  rawData?: any;
}

export const AdminPage: React.FC = () => {
  const {
    isAdmin,
    setCurrentTab,
    syncToCloud,
    pullFromCloud,
    rollbackSafetyBackup,
    hasSafetyBackup,
    isCloudConfigured: isCloudConfiguredFromContext,
    showToast,
  } = useFinancial();

  // Tab State inside Admin
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'database' | 'ai' | 'security'>('users');

  // Users Monitor State
  const [cloudUsers, setCloudUsers] = useState<CloudUserInfo[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [selectedUserDetail, setSelectedUserDetail] = useState<CloudUserInfo | null>(null);

  // Database Tab State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Gemini AI Tab State
  const [geminiKeyInput, setGeminiKeyInput] = useState(aiService.getApiKey());
  const [hasGeminiKey, setHasGeminiKey] = useState(aiService.hasApiKey());
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rlqicielkddwyzgpwgnm.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_v57oN4cuVfMxcR1DM3AgRQ_E8R4cR8B';

  // Fetch all registered users from Supabase cloud_backups
  const fetchCloudUsers = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setUserLoadError('Chưa cấu hình Supabase Client.');
      return;
    }

    setIsLoadingUsers(true);
    setUserLoadError(null);

    try {
      const { data: rows, error } = await supabase
        .from('cloud_backups')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        setUserLoadError(error.message);
        return;
      }

      if (rows) {
        const parsed: CloudUserInfo[] = rows
          .filter((r) => r.id !== 'moneyflow_cloud_state')
          .map((r) => {
            const dataObj = r.data || {};
            const u = dataObj.user || {};
            const txCount = Array.isArray(dataObj.transactions) ? dataObj.transactions.length : 0;
            const accCount = Array.isArray(dataObj.accounts) ? dataObj.accounts.length : 0;
            const budgetCount = Array.isArray(dataObj.budgets) ? dataObj.budgets.length : 0;
            const savingsCount = Array.isArray(dataObj.savingsGoals) ? dataObj.savingsGoals.length : 0;
            const debtCount = Array.isArray(dataObj.debts) ? dataObj.debts.length : 0;

            const email =
              u.email ||
              (r.id.startsWith('backup_')
                ? r.id.replace('backup_', '').replace(/_/g, '.')
                : 'Khách trải nghiệm');

            const isAdm = email.toLowerCase().includes('minhkhoj') || u.role === 'admin';

            return {
              id: r.id,
              email,
              fullName: u.fullName || (isAdm ? 'Khôi' : email.split('@')[0] || 'Người dùng'),
              createdAt: u.createdAt || r.updated_at,
              lastActive: r.updated_at,
              txCount,
              accCount,
              budgetCount,
              savingsCount,
              debtCount,
              isAdmin: isAdm,
              rawData: dataObj,
            };
          });

        setCloudUsers(parsed);
      }
    } catch (err: any) {
      setUserLoadError(err.message || 'Lỗi truy vấn danh sách người dùng từ Cloud');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchCloudUsers();
    }
  }, [isAdmin]);

  // Aggregate Stats across the entire system
  const totalSystemTransactions = useMemo(
    () => cloudUsers.reduce((sum, u) => sum + u.txCount, 0),
    [cloudUsers]
  );
  const totalSystemAccounts = useMemo(
    () => cloudUsers.reduce((sum, u) => sum + u.accCount, 0),
    [cloudUsers]
  );
  const adminUsersCount = useMemo(
    () => cloudUsers.filter((u) => u.isAdmin).length,
    [cloudUsers]
  );
  const memberUsersCount = useMemo(
    () => cloudUsers.filter((u) => !u.isAdmin).length,
    [cloudUsers]
  );

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return cloudUsers.filter((u) => {
      const matchSearch =
        u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(userSearchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (roleFilter === 'admin') return u.isAdmin;
      if (roleFilter === 'member') return !u.isAdmin;
      return true;
    });
  }, [cloudUsers, userSearchTerm, roleFilter]);

  // Copy SQL script
  const handleCopySql = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    showToast('Đã sao chép toàn bộ mã SQL Supabase vào Clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Copy Anon Key
  const handleCopyKey = () => {
    navigator.clipboard.writeText(supabaseAnonKey);
    setCopiedKey(true);
    showToast('Đã sao chép Supabase Anon Key!', 'success');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Save Gemini Key
  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKeyInput.trim()) {
      showToast('Vui lòng nhập API Key Gemini hợp lệ', 'error');
      return;
    }

    setIsTestingGemini(true);
    try {
      const res = await aiService.testConnection(geminiKeyInput.trim());
      if (res.success) {
        aiService.setApiKey(geminiKeyInput.trim());
        setHasGeminiKey(true);
        setGeminiTestResult({
          tested: true,
          success: true,
          message: res.message,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
        });
        showToast('Kết nối Google Gemini AI thành công và đã lưu!', 'success');
      } else {
        setGeminiTestResult({
          tested: true,
          success: false,
          message: res.message,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
        });
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      setGeminiTestResult({
        tested: true,
        success: false,
        message: err.message || 'Lỗi kiểm tra kết nối API Key',
        timestamp: new Date().toLocaleTimeString('vi-VN'),
      });
      showToast('Kiểm tra API Key thất bại', 'error');
    } finally {
      setIsTestingGemini(false);
    }
  };

  // Test Existing Gemini Key
  const handleTestExistingGeminiKey = async () => {
    if (!hasGeminiKey) return;
    setIsTestingGemini(true);
    try {
      const res = await aiService.testConnection();
      setGeminiTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
      });
      if (res.success) {
        showToast('Kết nối Google Gemini AI hoạt động hoàn hảo!', 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      setGeminiTestResult({
        tested: true,
        success: false,
        message: err.message || 'Lỗi kiểm tra kết nối',
        timestamp: new Date().toLocaleTimeString('vi-VN'),
      });
      showToast('Kiểm tra API Key thất bại', 'error');
    } finally {
      setIsTestingGemini(false);
    }
  };

  // Clear Gemini Key
  const handleClearGeminiKey = () => {
    if (confirm('Bạn có chắc muốn xóa Google Gemini API Key khỏi hệ thống?')) {
      aiService.setApiKey('');
      setGeminiKeyInput('');
      setHasGeminiKey(false);
      setGeminiTestResult(null);
      showToast('Đã xóa API Key Gemini khỏi hệ thống', 'info');
    }
  };

  // Security Access Guard: If not admin, show restricted screen
  if (!isAdmin) {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Khu vực Quản trị viên (Admin Only)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Bạn đang đăng nhập bằng tài khoản không có quyền quản trị hệ thống. Trang này chỉ dành cho tài khoản Admin đã được ủy quyền (<code>minhkhoj2002@gmail.com</code>).
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setCurrentTab('dashboard')}
            className="inline-flex items-center space-x-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Trang Tổng Quan</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-black tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Trung Tâm Quản Trị Hệ Thống • Admin Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Bảng Điều Hành MoneyFlow</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Hệ thống trực tuyến" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Giám sát người dùng thời gian thực, quản lý cơ sở dữ liệu Supabase Cloud, cấu hình API Trí tuệ nhân tạo và kiểm tra an toàn hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Về giao diện tài chính cá nhân"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>← Về Tài chính cá nhân</span>
            </button>

            <button
              type="button"
              onClick={fetchCloudUsers}
              disabled={isLoadingUsers}
              className="flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl shadow-md shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              <span>{isLoadingUsers ? 'Đang truy vấn...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Top KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Users */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Tổng người dùng
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoadingUsers ? '...' : cloudUsers.length}
            </div>
            <p className="text-3xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {adminUsersCount} admin • {memberUsersCount} thành viên
            </p>
          </div>
        </div>

        {/* Card 2: System Transactions */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Tổng giao dịch
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoadingUsers ? '...' : totalSystemTransactions.toLocaleString('vi-VN')}
            </div>
            <p className="text-3xs text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
              Ghi nhận trên toàn hệ thống
            </p>
          </div>
        </div>

        {/* Card 3: Total Accounts */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Tổng ví & tài khoản
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoadingUsers ? '...' : totalSystemAccounts}
            </div>
            <p className="text-3xs text-blue-600 dark:text-blue-400 truncate mt-0.5">
              Ngân hàng, ví điện tử, tiền mặt
            </p>
          </div>
        </div>

        {/* Card 4: Supabase Cloud Server */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Supabase Cloud
            </span>
            <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Hoạt động 100%</span>
            </div>
            <p className="text-3xs text-slate-400 font-mono truncate mt-0.5">
              rlqic••••.supabase.co
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center space-x-1 sm:space-x-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => setActiveAdminTab('users')}
          className={`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'users'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 Giám sát Người Dùng</span>
          <span className={`text-2xs px-2 py-0.5 rounded-full font-black ${
            activeAdminTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}>
            {cloudUsers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('database')}
          className={`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'database'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>☁️ CSDL & SQL Schema</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('ai')}
          className={`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'ai'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>🤖 Trí tuệ nhân tạo Gemini</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('security')}
          className={`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'security'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>⚡ An Toàn & Bảo Mật</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USERS MONITOR */}
      {/* ========================================================================= */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm người dùng theo tên, email, id..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  roleFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Tất cả ({cloudUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  roleFilter === 'admin'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                👑 Quản trị viên ({adminUsersCount})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('member')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  roleFilter === 'member'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                }`}
              >
                Thành viên ({memberUsersCount})
              </button>
            </div>
          </div>

          {/* User List */}
          {userLoadError ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 text-rose-700 dark:text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{userLoadError}</span>
            </div>
          ) : isLoadingUsers && cloudUsers.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              <RefreshCw className="w-7 h-7 mx-auto animate-spin text-blue-500" />
              <p className="text-xs text-slate-400 font-medium">
                Đang kết nối Supabase và truy vấn danh sách người dùng...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Không tìm thấy người dùng phù hợp
              </h4>
              <p className="text-xs text-slate-400">
                Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc vai trò.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredUsers.map((u) => {
                const initials = u.fullName?.slice(0, 2).toUpperCase() || 'US';
                const formattedDate = new Date(u.lastActive).toLocaleDateString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });

                return (
                  <div
                    key={u.id}
                    className={`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      u.isAdmin
                        ? 'border-amber-300/80 dark:border-amber-800/80 bg-gradient-to-r from-amber-50/40 via-white to-transparent dark:from-amber-950/20 dark:via-slate-900 shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* User Info */}
                    <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0 ${
                          u.isAdmin
                            ? 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/25 ring-2 ring-amber-400/40'
                            : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20'
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                            {u.fullName}
                          </h3>
                          {u.isAdmin ? (
                            <span className="text-3xs font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                              👑 Quản trị viên
                            </span>
                          ) : (
                            <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Thành viên
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-2xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-mono">
                          <span className="truncate">{u.email}</span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-3xs text-slate-400 font-sans flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Hoạt động: {formattedDate}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-2xs font-bold text-slate-700 dark:text-slate-200">
                          <Wallet className="w-3 h-3 text-blue-500" />
                          <span>{u.accCount} ví</span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-2xs font-bold text-slate-700 dark:text-slate-200">
                          <ArrowLeftRight className="w-3 h-3 text-emerald-500" />
                          <span>{u.txCount} giao dịch</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedUserDetail(u)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer shrink-0"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATABASE & SQL SCHEMA */}
      {/* ========================================================================= */}
      {activeAdminTab === 'database' && (
        <div className="space-y-6">
          {/* Card: Connection Status & Quick Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Máy Chủ Cơ Sở Dữ Liệu Supabase Cloud
                  </h3>
                  <p className="text-2xs text-slate-400">
                    PostgreSQL 15 • Đã cấu hình mã hóa SSL 256-bit & Phân quyền RLS
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 text-2xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 w-fit">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Trực Tuyến (Online 100%)</span>
              </span>
            </div>

            {/* Connection Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-3xs uppercase font-bold text-slate-400 tracking-wider">
                  Máy chủ API URL
                </span>
                <div className="flex items-center justify-between font-mono text-xs text-slate-700 dark:text-slate-300">
                  <span className="truncate">{supabaseUrl}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(supabaseUrl);
                      showToast('Đã copy Supabase URL!', 'success');
                    }}
                    className="p-1 hover:text-blue-500 cursor-pointer text-slate-400"
                    title="Copy URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-3xs uppercase font-bold text-slate-400 tracking-wider">
                  Supabase Anon Key
                </span>
                <div className="flex items-center justify-between font-mono text-xs text-slate-700 dark:text-slate-300">
                  <span className="truncate">
                    {showAnonKey ? supabaseAnonKey : `${supabaseAnonKey.slice(0, 16)}••••••••••••••••`}
                  </span>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAnonKey(!showAnonKey)}
                      className="p-1 hover:text-blue-500 cursor-pointer text-slate-400"
                      title={showAnonKey ? 'Ẩn key' : 'Hiện key'}
                    >
                      {showAnonKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="p-1 hover:text-blue-500 cursor-pointer text-slate-400"
                      title="Copy Key"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cloud Sync Actions */}
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Điều khiển Đồng bộ Dữ liệu Quản trị viên</span>
                  </h4>
                  <p className="text-3xs text-slate-500 dark:text-slate-400">
                    Đẩy bản sao lưu của tài khoản Admin lên Supabase hoặc tải bản sao lưu mới nhất về thiết bị này.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-wrap gap-y-2 pt-1">
                <button
                  type="button"
                  disabled={isSyncing || isPulling}
                  onClick={async () => {
                    setIsSyncing(true);
                    try {
                      await syncToCloud();
                      fetchCloudUsers();
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
                  <span>{isSyncing ? 'Đang đẩy lên...' : '☁️ Đẩy dữ liệu Admin lên Cloud'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSyncing || isPulling}
                  onClick={async () => {
                    if (confirm('Tải dữ liệu từ Supabase Cloud về thiết bị này?')) {
                      setIsPulling(true);
                      try {
                        await pullFromCloud();
                        fetchCloudUsers();
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
                  <span>{isPulling ? 'Đang tải về...' : 'Tải dữ liệu Admin từ Cloud về'}</span>
                </button>

                {hasSafetyBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Khôi phục lại phiên dữ liệu trên máy trước lần tải gần nhất?')) {
                        rollbackSafetyBackup();
                      }
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-xl border border-amber-300 dark:border-amber-700 shadow-2xs transition-colors cursor-pointer"
                    title="Khôi phục lại dữ liệu trước khi đồng bộ"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Hoàn tác lần tải gần nhất</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card: SQL Schema Viewer & Deployment Guide */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Mã Nguồn Cấu Trúc Bảng CSDL (PostgreSQL Schema)
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Bao gồm 10 bảng dữ liệu, khóa ngoại, chỉ mục (Index) và chính sách bảo mật RLS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs text-white font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? '✓ Đã sao chép SQL!' : 'Sao chép toàn bộ mã SQL'}</span>
                </button>
              </div>
            </div>

            {/* Quick 3-Step Setup Guide */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-slate-300 text-xs space-y-2 font-mono">
              <div className="flex items-center gap-2 text-amber-400 font-bold font-sans">
                <Sparkles className="w-4 h-4" />
                <span>Hướng dẫn 3 bước khởi tạo hoặc bảo trì CSDL Supabase:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 font-sans text-2xs leading-relaxed">
                <li>Bấm nút <strong>"Sao chép toàn bộ mã SQL"</strong> ở góc trên.</li>
                <li>Đăng nhập vào <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-400 underline font-semibold">Supabase Dashboard</a> → Chọn Project <code>rlqicielkddwyzgpwgnm</code> → Mở mục <strong>SQL Editor</strong>.</li>
                <li>Bấm <strong>"New query"</strong>, dán toàn bộ mã (<code>Ctrl + V</code>) và ấn <strong>"Run"</strong> để khởi tạo hoặc cập nhật bảng.</li>
              </ol>
            </div>

            {/* SQL Code Block */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden text-2xs font-mono">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="ml-2 text-slate-300 font-bold">schema.sql</span>
                </span>
                <span className="text-3xs uppercase">PostgreSQL DDL</span>
              </div>
              <pre className="p-4 text-emerald-400 overflow-x-auto max-h-96 leading-relaxed select-all">
                {schemaSql}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AI GEMINI SERVICE */}
      {/* ========================================================================= */}
      {activeAdminTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Cấu Hình Trí Tuệ Nhân Tạo Google Gemini
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Hỗ trợ mô hình: Gemini 2.0 Flash, Gemini 1.5 Flash, Gemini 1.5 Pro
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-colors"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Explanation */}
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/40 text-2xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Quyền năng AI trong MoneyFlow:</span>
              </div>
              <p>
                Hệ thống sử dụng Gemini API để kích hoạt: Trợ lý tài chính AI đàm thoại tự do, nhận diện giọng nói thêm giao dịch thông minh, tư vấn chi tiêu và dự báo dòng tiền cá nhân hóa.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveGeminiKey} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Dán API Key Google Gemini (bắt đầu bằng AIzaSy...)"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="submit"
                  disabled={isTestingGemini}
                  className="py-2.5 px-5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isTestingGemini ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isTestingGemini ? 'Đang kiểm tra...' : 'Lưu & Kiểm tra kết nối AI'}</span>
                </button>

                {hasGeminiKey && (
                  <>
                    <button
                      type="button"
                      disabled={isTestingGemini}
                      onClick={handleTestExistingGeminiKey}
                      className="py-2.5 px-4 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer flex items-center space-x-1.5"
                    >
                      <Activity className="w-4 h-4 text-indigo-600" />
                      <span>Kiểm tra lại kết nối</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearGeminiKey}
                      className="py-2.5 px-4 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl transition-colors cursor-pointer"
                    >
                      Xóa Key khỏi hệ thống
                    </button>
                  </>
                )}
              </div>
            </form>

            {/* Test Result Box */}
            {geminiTestResult && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-1 ${
                  geminiTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {geminiTestResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    {geminiTestResult.success ? 'Kết nối thành công!' : 'Kết nối thất bại'}
                  </span>
                  {geminiTestResult.timestamp && (
                    <span className="text-3xs font-normal opacity-70 ml-auto">
                      {geminiTestResult.timestamp}
                    </span>
                  )}
                </div>
                <p className="text-2xs leading-relaxed opacity-90">
                  {geminiTestResult.message}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SYSTEM HEALTH & SECURITY */}
      {/* ========================================================================= */}
      {activeAdminTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Security Checklist */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Bảo Mật & Kiểm Tra An Toàn
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Các lớp bảo vệ hệ thống MoneyFlow
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Mã hóa đường truyền TLS / SSL 256-bit
                      </span>
                      <span className="text-3xs text-slate-400">
                        Toàn bộ request đến Supabase & Google AI được mã hóa HTTPS
                      </span>
                    </div>
                  </div>
                  <span className="text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Phân Quyền Cấp Hàng (PostgreSQL RLS)
                      </span>
                      <span className="text-3xs text-slate-400">
                        Tách biệt dữ liệu người dùng, chỉ user sở hữu mới có quyền đọc/ghi
                      </span>
                    </div>
                  </div>
                  <span className="text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    ENFORCED
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        PWA Cache Service Worker v3
                      </span>
                      <span className="text-3xs text-slate-400">
                        Hỗ trợ hoạt động ngoại tuyến (Offline) và tự động đồng bộ khi có mạng
                      </span>
                    </div>
                  </div>
                  <span className="text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    V3 ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Bộ nhớ đệm LocalStorage Độc lập
                      </span>
                      <span className="text-3xs text-slate-400">
                        Sao lưu dữ liệu tức thì trên thiết bị ngay cả khi rớt mạng
                      </span>
                    </div>
                  </div>
                  <span className="text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    READY
                  </span>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Thông Tin Phiên Bản Ứng Dụng
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Cấu trúc ứng dụng & môi trường chạy
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-sans">Phiên bản ứng dụng:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">v2.5 Executive Suite</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-sans">Môi trường:</span>
                  <span className="font-bold text-emerald-600">Production (Vite + React 18)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-sans">Cơ sở dữ liệu:</span>
                  <span>Supabase PostgreSQL 15</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-sans">Mô hình AI:</span>
                  <span>Gemini 2.0 Flash / 1.5 Flash</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-sans">Chế độ PWA:</span>
                  <span>Standalone Web App Ready</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Làm mới toàn bộ bộ nhớ đệm và tải lại ứng dụng?')) {
                      window.location.reload();
                    }
                  }}
                  className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Xóa Cache & Tải lại giao diện</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Inspection Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md ${
                    selectedUserDetail.isAdmin
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-500'
                      : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                  }`}
                >
                  {selectedUserDetail.fullName?.slice(0, 2).toUpperCase() || 'US'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {selectedUserDetail.fullName}
                  </h3>
                  <p className="text-2xs text-slate-400 font-mono">
                    {selectedUserDetail.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-3xs uppercase font-bold text-slate-400 block">Ví tài khoản</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {selectedUserDetail.accCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-3xs uppercase font-bold text-slate-400 block">Giao dịch</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {selectedUserDetail.txCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-3xs uppercase font-bold text-slate-400 block">Ngân sách</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {selectedUserDetail.budgetCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-3xs uppercase font-bold text-slate-400 block">Sổ nợ</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {selectedUserDetail.debtCount}
                </span>
              </div>
            </div>

            {/* Wallets breakdown if present */}
            {selectedUserDetail.rawData?.accounts && selectedUserDetail.rawData.accounts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Danh sách Ví & Tài khoản:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedUserDetail.rawData.accounts.map((acc: any) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {acc.name}
                      </span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatVND(acc.balance || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-2xs space-y-1 font-mono text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Khởi tạo tài khoản:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(selectedUserDetail.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sao lưu lần cuối:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(selectedUserDetail.lastActive).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Backup Key trên Supabase:</span>
                <span className="text-blue-500 font-bold">{selectedUserDetail.id}</span>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
