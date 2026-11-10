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
  FileSpreadsheet,
  HardDrive,
  Trash2,
  Megaphone,
  Radio,
  Send,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { formatVND } from '../utils/formatters';
import { exportAdminSystemReportToExcel } from '../utils/exportData';
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
  sizeKb: number;
  isAdmin: boolean;
  daysInactive: number;
  status: 'active' | 'away' | 'dormant';
  rawData?: any;
}

interface SystemAnnouncement {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  createdAt: string;
  author?: string;
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
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'database' | 'announcement' | 'ai' | 'security'>('users');

  // Users Monitor State
  const [cloudUsers, setCloudUsers] = useState<CloudUserInfo[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member' | 'active' | 'dormant'>('all');
  const [selectedUserDetail, setSelectedUserDetail] = useState<CloudUserInfo | null>(null);

  // Database Tab & Storage State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isCleaningGuests, setIsCleaningGuests] = useState(false);
  const [isCleaningDormant, setIsCleaningDormant] = useState(false);

  // Live Latency Ping State
  const [pingResult, setPingResult] = useState<{
    latency: number;
    status: 'fast' | 'good' | 'slow';
    timestamp: string;
  } | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // System Broadcast Announcement State
  const [activeAnnouncement, setActiveAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'success'>('info');
  const [isPublishingAnn, setIsPublishingAnn] = useState(false);

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

  // 1. Fetch all registered users & active announcement from Supabase
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
        // Extract active broadcast announcement if present
        const annRow = rows.find((r) => r.id === 'system_announcement');
        if (annRow && annRow.data) {
          setActiveAnnouncement(annRow.data);
        } else {
          setActiveAnnouncement(null);
        }

        // Parse user backups (excluding special system keys)
        const parsed: CloudUserInfo[] = rows
          .filter((r) => r.id !== 'moneyflow_cloud_state' && r.id !== 'system_announcement')
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
            const sizeBytes = JSON.stringify(r.data || {}).length;
            const sizeKb = sizeBytes / 1024;

            const lastActiveDate = new Date(r.updated_at || r.created_at || Date.now());
            const daysInactive = Math.max(0, Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)));
            let status: 'active' | 'away' | 'dormant' = 'active';
            if (daysInactive >= 30) {
              status = 'dormant';
            } else if (daysInactive >= 7) {
              status = 'away';
            }

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
              sizeKb,
              isAdmin: isAdm,
              daysInactive,
              status,
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
  const totalSizeKb = useMemo(
    () => cloudUsers.reduce((sum, u) => sum + u.sizeKb, 0),
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
  const activeUsersCount = useMemo(
    () => cloudUsers.filter((u) => u.status === 'active').length,
    [cloudUsers]
  );
  const awayUsersCount = useMemo(
    () => cloudUsers.filter((u) => u.status === 'away').length,
    [cloudUsers]
  );
  const dormantUsersCount = useMemo(
    () => cloudUsers.filter((u) => !u.isAdmin && u.status === 'dormant').length,
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
      if (roleFilter === 'active') return u.status === 'active';
      if (roleFilter === 'dormant') return !u.isAdmin && u.status === 'dormant';
      return true;
    });
  }, [cloudUsers, userSearchTerm, roleFilter]);

  // 2. Measure Live Latency to Supabase (Ping Test)
  const handlePingSupabase = async () => {
    if (!isSupabaseConfigured || !supabase) {
      showToast('Chưa kết nối máy chủ Supabase', 'error');
      return;
    }
    setIsPinging(true);
    try {
      const start = performance.now();
      await supabase.from('cloud_backups').select('id').limit(1);
      const latency = Math.round(performance.now() - start);

      let status: 'fast' | 'good' | 'slow' = 'fast';
      if (latency > 300) status = 'slow';
      else if (latency > 120) status = 'good';

      setPingResult({
        latency,
        status,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
      });
      showToast(`⚡ Độ trễ phản hồi Supabase: ${latency}ms`, 'success');
    } catch {
      showToast('Không thể kết nối đo độ trễ tới Supabase', 'error');
    } finally {
      setIsPinging(false);
    }
  };

  // 3. Export System Data to Excel (.xlsx)
  const handleExportSystemExcel = () => {
    if (cloudUsers.length === 0) {
      showToast('Chưa có dữ liệu người dùng để xuất!', 'error');
      return;
    }
    try {
      const summary = {
        totalUsers: cloudUsers.length,
        adminCount: adminUsersCount,
        memberCount: memberUsersCount,
        totalTx: totalSystemTransactions,
        totalAcc: totalSystemAccounts,
        totalSizeKb,
        supabaseHost: supabaseUrl,
      };
      exportAdminSystemReportToExcel(cloudUsers, summary);
      showToast('✓ Đã xuất báo cáo Excel toàn hệ thống thành công!', 'success');
    } catch {
      showToast('Lỗi khi xuất file Excel', 'error');
    }
  };

  // 4. Download Full System Database Backup (JSON)
  const handleDownloadFullSystemBackup = async () => {
    if (!isSupabaseConfigured || !supabase) {
      showToast('Chưa kết nối Supabase Cloud', 'error');
      return;
    }

    setIsDownloadingBackup(true);
    try {
      const { data: rows, error } = await supabase.from('cloud_backups').select('*');
      if (error) throw error;

      const payload = {
        system: 'MoneyFlow Executive Suite',
        version: '2.5',
        exportType: 'full_database_snapshot',
        exportedAt: new Date().toISOString(),
        exportedBy: 'minhkhoj2002@gmail.com',
        totalRecords: rows?.length || 0,
        data: rows || [],
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MoneyFlow_Full_System_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✓ Đã tải bản sao lưu toàn bộ CSDL Supabase về máy!', 'success');
    } catch (err: any) {
      showToast('Lỗi tải bản sao lưu CSDL: ' + err.message, 'error');
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  // 5. Delete a specific user's cloud backup
  const handleDeleteUserBackup = async (userToDelete: CloudUserInfo) => {
    if (!isSupabaseConfigured || !supabase) {
      showToast('Chưa kết nối Supabase Cloud', 'error');
      return;
    }
    if (userToDelete.isAdmin) {
      showToast('Không thể xóa tài khoản Quản trị viên!', 'error');
      return;
    }
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa bản sao lưu của "${userToDelete.fullName}" (${userToDelete.email}) khỏi Supabase Cloud?\nDữ liệu trên Cloud sẽ được giải phóng hoàn toàn.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from('cloud_backups').delete().eq('id', userToDelete.id);
      if (error) throw error;
      showToast(`Đã xóa bản sao lưu của "${userToDelete.fullName}" khỏi Cloud!`, 'success');
      if (selectedUserDetail?.id === userToDelete.id) {
        setSelectedUserDetail(null);
      }
      fetchCloudUsers();
    } catch (err: any) {
      showToast('Lỗi xóa bản sao lưu: ' + err.message, 'error');
    }
  };

  // 6. Batch Clean Guest / Test Backups
  const handleCleanGuestBackups = async () => {
    if (!isSupabaseConfigured || !supabase) {
      showToast('Chưa kết nối Supabase Cloud', 'error');
      return;
    }
    if (
      !confirm(
        'Bạn có chắc muốn dọn dẹp các tài khoản khách thử nghiệm vãng lai (guest) và bản ghi test trên Cloud?'
      )
    ) {
      return;
    }

    setIsCleaningGuests(true);
    try {
      const { data: rows } = await supabase.from('cloud_backups').select('id');
      const guestIds = (rows || [])
        .map((r: any) => r.id)
        .filter(
          (id: string) => id.includes('guest') || id === 'moneyflow_cloud_state'
        );

      if (guestIds.length === 0) {
        showToast('Không có bản ghi khách thử nghiệm nào cần dọn dẹp.', 'info');
        return;
      }

      for (const gid of guestIds) {
        await supabase.from('cloud_backups').delete().eq('id', gid);
      }

      showToast(`✓ Đã dọn dẹp sạch ${guestIds.length} bản ghi khách thử nghiệm khỏi Cloud!`, 'success');
      fetchCloudUsers();
    } catch (err: any) {
      showToast('Lỗi dọn dẹp: ' + err.message, 'error');
    } finally {
      setIsCleaningGuests(false);
    }
  };

  // 7. Batch Clean Dormant Users (> 30 days inactive)
  const handleCleanDormantBackups = async () => {
    if (!isSupabaseConfigured || !supabase) {
      showToast('Chưa kết nối Supabase Cloud', 'error');
      return;
    }

    const dormantUsers = cloudUsers.filter((u) => !u.isAdmin && u.daysInactive >= 30);

    if (dormantUsers.length === 0) {
      showToast('Không có tài khoản nào ngừng hoạt động quá 30 ngày.', 'info');
      return;
    }

    const totalDormantKb = dormantUsers.reduce((sum, u) => sum + u.sizeKb, 0).toFixed(1);
    const userNames = dormantUsers
      .map((u) => `• ${u.fullName} (${u.email}) - Vắng mặt ${u.daysInactive} ngày`)
      .join('\n');

    const confirmed = confirm(
      `Phát hiện ${dormantUsers.length} tài khoản không hoạt động hơn 30 ngày (chiếm ~${totalDormantKb} KB dung lượng):\n\n${userNames}\n\n🛡️ CƠ CHẾ BẢO VỆ DỮ LIỆU AN TOÀN:\n1. Dữ liệu trên thiết bị của người dùng (LocalStorage điện thoại/máy tính) vẫn NGUYÊN VẸN 100% không bị ảnh hưởng.\n2. Khi người dùng mở lại MoneyFlow trong tương lai, hệ thống sẽ tự động thông báo rõ ràng và tái tạo bản sao lưu mới lên Cloud.\n\nBạn có muốn giải phóng ${dormantUsers.length} bản sao lưu Cloud này ngay không?`
    );

    if (!confirmed) return;

    setIsCleaningDormant(true);
    try {
      for (const u of dormantUsers) {
        await supabase.from('cloud_backups').delete().eq('id', u.id);
      }
      showToast(`✓ Đã giải phóng an toàn ${dormantUsers.length} bản sao lưu không hoạt động >30 ngày!`, 'success');
      fetchCloudUsers();
    } catch (err: any) {
      showToast('Lỗi khi dọn dẹp: ' + err.message, 'error');
    } finally {
      setIsCleaningDormant(false);
    }
  };

  // 7. Publish / Broadcast System Announcement
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      showToast('Chưa kết nối Supabase Cloud', 'error');
      return;
    }
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!', 'error');
      return;
    }

    setIsPublishingAnn(true);
    try {
      const payload: SystemAnnouncement = {
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        type: announcementType,
        createdAt: new Date().toISOString(),
        author: 'Admin Khôi',
      };

      const { error } = await supabase.from('cloud_backups').upsert({
        id: 'system_announcement',
        data: payload,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setActiveAnnouncement(payload);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      showToast('🚀 Đã phát thông báo toàn hệ thống! Người dùng sẽ nhận được khi mở app.', 'success');
    } catch (err: any) {
      showToast('Lỗi phát thông báo: ' + err.message, 'error');
    } finally {
      setIsPublishingAnn(false);
    }
  };

  // 8. Delete / Withdraw Announcement
  const handleDeleteAnnouncement = async () => {
    if (!isSupabaseConfigured || !supabase) {
      showToast('Chưa kết nối Supabase Cloud', 'error');
      return;
    }
    if (!confirm('Bạn có chắc muốn thu hồi / xóa thông báo toàn hệ thống này?')) return;
    try {
      await supabase.from('cloud_backups').delete().eq('id', 'system_announcement');
      setActiveAnnouncement(null);
      showToast('Đã thu hồi thông báo toàn hệ thống!', 'info');
    } catch (err: any) {
      showToast('Lỗi thu hồi thông báo: ' + err.message, 'error');
    }
  };

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
              <span>Trung Tâm Quản Trị Hệ Thống • MoneyFlow Pro Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Bảng Điều Hành MoneyFlow</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Hệ thống trực tuyến" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Giám sát người dùng thời gian thực, quản lý sao lưu CSDL Supabase, phát thông báo toàn hệ thống và xuất báo cáo phân tích.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Ping Button */}
            <button
              type="button"
              onClick={handlePingSupabase}
              disabled={isPinging}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Đo độ trễ mạng thực tế tới Supabase"
            >
              <Zap className={`w-3.5 h-3.5 ${isPinging ? 'animate-bounce text-amber-400' : 'text-amber-400'}`} />
              <span>
                {isPinging
                  ? 'Đang đo...'
                  : pingResult
                  ? `${pingResult.latency}ms`
                  : 'Đo Ping'}
              </span>
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportSystemExcel}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md shadow-emerald-600/25"
              title="Xuất danh sách và thống kê toàn hệ thống ra Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            {/* Full JSON Backup Download */}
            <button
              type="button"
              onClick={handleDownloadFullSystemBackup}
              disabled={isDownloadingBackup}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-md shadow-indigo-600/25 disabled:opacity-50"
              title="Tải toàn bộ snapshot CSDL Supabase về máy"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Backup JSON</span>
            </button>

            {/* Back to Personal Finance */}
            <button
              type="button"
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800/90 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Về giao diện tài chính cá nhân"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>← Về Tài chính</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchCloudUsers}
              disabled={isLoadingUsers}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl shadow-md shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              <span>{isLoadingUsers ? 'Tải...' : 'Làm mới'}</span>
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
              Toàn hệ thống Cloud
            </p>
          </div>
        </div>

        {/* Card 3: Storage & Accounts */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Dung lượng CSDL
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoadingUsers ? '...' : `${totalSizeKb.toFixed(1)} KB`}
            </div>
            <p className="text-3xs text-blue-600 dark:text-blue-400 truncate mt-0.5">
              {totalSystemAccounts} ví • &lt;0.05% quota
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
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {pingResult ? `${pingResult.latency}ms (Online)` : 'Hoạt động 100%'}
              </span>
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
          <span>☁️ CSDL & Sao Lưu Cloud</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('announcement')}
          className={`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'announcement'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>📢 Phát Thông Báo</span>
          {activeAnnouncement && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" title="Đang có thông báo hoạt động" />
          )}
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
      {/* TAB 1: USERS MONITOR & MANAGEMENT */}
      {/* ========================================================================= */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          {/* Search, Filter & Quick Action Toolbar */}
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
              <button
                type="button"
                onClick={() => setRoleFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  roleFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                🟢 Hoạt động ({activeUsersCount})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('dormant')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  roleFilter === 'dormant'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                }`}
              >
                💤 Vắng mặt &gt;30 ngày ({dormantUsersCount})
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

                          {/* Activity Status Badge */}
                          {u.status === 'active' ? (
                            <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Hoạt động ({u.daysInactive === 0 ? 'Hôm nay' : `${u.daysInactive} ngày trước`})</span>
                            </span>
                          ) : u.status === 'away' ? (
                            <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-amber-500" />
                              <span>Vắng mặt ({u.daysInactive} ngày)</span>
                            </span>
                          ) : (
                            <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                              <span>💤 Không hoạt động ({u.daysInactive} ngày)</span>
                            </span>
                          )}

                          <span className="text-3xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {u.sizeKb.toFixed(1)} KB
                          </span>
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

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedUserDetail(u)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                        >
                          Chi tiết
                        </button>

                        {!u.isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUserBackup(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Xóa bản sao lưu người này khỏi Cloud"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Maintenance Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs gap-3">
            <span className="text-slate-600 dark:text-slate-400">
              Tổng cộng <strong>{cloudUsers.length}</strong> tài khoản ({dormantUsersCount} tài khoản vắng mặt &gt;30 ngày, <strong>{totalSizeKb.toFixed(1)} KB</strong>).
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCleanGuestBackups}
                disabled={isCleaningGuests}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 rounded-xl border border-slate-300 dark:border-slate-600 transition-all cursor-pointer disabled:opacity-50"
                title="Dọn dẹp tài khoản guest hoặc bản ghi test"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{isCleaningGuests ? 'Đang dọn...' : 'Dọn dẹp bản ghi khách/test'}</span>
              </button>

              <button
                type="button"
                onClick={handleCleanDormantBackups}
                disabled={isCleaningDormant || dormantUsersCount === 0}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-xl border border-rose-200 dark:border-rose-900 transition-all cursor-pointer disabled:opacity-50"
                title="Dọn dẹp các tài khoản không hoạt động quá 30 ngày (dữ liệu trên máy họ vẫn an toàn 100%)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isCleaningDormant ? 'Đang giải phóng...' : `💤 Dọn tài khoản vắng mặt >30 ngày (${dormantUsersCount})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATABASE, STORAGE & SQL SCHEMA */}
      {/* ========================================================================= */}
      {activeAdminTab === 'database' && (
        <div className="space-y-6">
          {/* Card: Connection Status & Storage Overview */}
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePingSupabase}
                  disabled={isPinging}
                  className="px-3 py-1 text-2xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{isPinging ? 'Đo...' : pingResult ? `${pingResult.latency} ms` : 'Đo Ping'}</span>
                </button>

                <span className="px-3 py-1 text-2xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 w-fit">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Online 100%</span>
                </span>
              </div>
            </div>

            {/* Storage Quota Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-blue-600" />
                  <span>Dung lượng CSDL đang sử dụng:</span>
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {totalSizeKb.toFixed(2)} KB / 500,000 KB (500 MB Free Tier)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                  style={{ width: `${Math.max(1, (totalSizeKb / 500000) * 100)}%` }}
                />
              </div>
              <p className="text-3xs text-slate-400">
                Chỉ mới sử dụng <strong>{((totalSizeKb / 500000) * 100).toFixed(3)}%</strong> hạn mức gói Cloud miễn phí của Supabase.
              </p>
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
      {/* TAB 3: SYSTEM BROADCAST ANNOUNCEMENT */}
      {/* ========================================================================= */}
      {activeAdminTab === 'announcement' && (
        <div className="space-y-6">
          {/* Active Announcement Status */}
          {activeAnnouncement ? (
            <div
              className={`p-5 rounded-3xl border shadow-sm space-y-3 ${
                activeAnnouncement.type === 'warning'
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : activeAnnouncement.type === 'success'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Đang phát trên toàn hệ thống
                  </span>
                  <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-800">
                    Loại: {activeAnnouncement.type}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-3xs opacity-80">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(activeAnnouncement.createdAt).toLocaleString('vi-VN')}</span>
                  <button
                    type="button"
                    onClick={handleDeleteAnnouncement}
                    className="px-2.5 py-1 text-2xs font-bold text-rose-600 bg-white dark:bg-slate-900 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer ml-2"
                  >
                    Thu hồi thông báo
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold">{activeAnnouncement.title}</h3>
                <p className="text-xs leading-relaxed opacity-90">{activeAnnouncement.message}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-500 flex items-center space-x-2">
              <Megaphone className="w-4 h-4 text-slate-400" />
              <span>Hiện tại chưa có thông báo phát thanh nào hoạt động trên hệ thống.</span>
            </div>
          )}

          {/* Form Create Announcement */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Phát Thông Báo Toàn Hệ Thống
                </h3>
                <p className="text-2xs text-slate-400">
                  Gửi thông báo tới chuông thông báo của tất cả người dùng khi họ mở ứng dụng
                </p>
              </div>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Tiêu đề thông báo
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 🎉 Chào mừng phiên bản MoneyFlow v2.5!"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800 dark:text-slate-200 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Nội dung thông báo
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập nội dung thông điệp muốn nhắn gửi tới người dùng..."
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800 dark:text-slate-200 leading-relaxed font-sans"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xs font-bold text-slate-500 uppercase">Mức độ:</span>
                  <button
                    type="button"
                    onClick={() => setAnnouncementType('info')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      announcementType === 'info'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Thông tin
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnouncementType('success')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      announcementType === 'success'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Cập nhật mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnouncementType('warning')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      announcementType === 'warning'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Bảo trì / Chú ý
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isPublishingAnn}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isPublishingAnn ? 'Đang phát...' : 'Phát thông báo ngay'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AI GEMINI SERVICE */}
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
      {/* TAB 5: SYSTEM HEALTH & SECURITY */}
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

              <div className="flex items-center space-x-1">
                {!selectedUserDetail.isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUserBackup(selectedUserDetail)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Xóa bản sao lưu người này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedUserDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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
                <span className="text-3xs uppercase font-bold text-slate-400 block">Dung lượng</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {selectedUserDetail.sizeKb.toFixed(1)} KB
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-3xs uppercase font-bold text-slate-400 block">Sổ nợ</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {selectedUserDetail.debtCount}
                </span>
              </div>
            </div>

            {/* Dormancy Warning Notice if inactive >= 30 days */}
            {selectedUserDetail.daysInactive >= 30 && !selectedUserDetail.isAdmin && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-2xs text-rose-700 dark:text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Tài khoản không hoạt động trong {selectedUserDetail.daysInactive} ngày (&gt;30 ngày)</span>
                </div>
                <p className="leading-relaxed opacity-90">
                  Bản sao lưu Cloud này có thể được giải phóng an toàn để tiết kiệm tài nguyên máy chủ. Toàn bộ dữ liệu của người dùng trên thiết bị cá nhân của họ vẫn an toàn tuyệt đối 100%! Khi họ mở lại MoneyFlow trong tương lai, hệ thống sẽ tự động thông báo rõ ràng và tái tạo bản sao lưu mới lên Cloud.
                </p>
              </div>
            )}

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
