import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import {
  Bell,
  Plus,
  Calendar,
  ChevronDown,
  Check,
  Menu,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Info,
  HandCoins,
  ArrowLeftRight,
  Search,
  Sun,
  Moon,
  Cloud,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Lock,
  KeyRound,
  Settings as SettingsIcon,
} from 'lucide-react';
import { formatDateVN, getNameInitials } from '../../utils/formatters';
import { useModalEscape } from '../../hooks/useModalEscape';
import { CommandPalette } from '../modals/CommandPalette';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    timeFilter,
    setTimeFilter,
    customDateRange,
    setCustomDateRange,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    openAddTxModal,
    user,
    setCurrentTab,
    theme,
    toggleTheme,
    isCloudConfigured,
    isCloudSyncing,
    syncToCloud,
    isAuthenticated,
    openAuthModal,
    logout,
    lockApp,
  } = useFinancial();

  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useModalEscape(() => setShowCustomDateModal(false), showCustomDateModal);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setShowTimeDropdown(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (quickAddRef.current && !quickAddRef.current.contains(event.target as Node)) {
        setShowQuickAddMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard shortcuts: Ctrl+K (Quick Search / Command Palette) & N (New Transaction)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (!isInput && e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        openAddTxModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openAddTxModal]);

  // Helper lấy chữ viết tắt từ tên người dùng (VD: Nguyễn Minh Khôi -> NK)
  const getUserInitials = (name?: string) => getNameInitials(name, 'MF');

  const timeFilterLabels: Record<string, string> = {
    today: 'Hôm nay',
    this_week: 'Tuần này',
    this_month: 'Tháng này',
    this_year: 'Năm nay',
    all: 'Tất cả thời gian',
    custom: `Tùy chỉnh: ${formatDateVN(customDateRange.start)} - ${formatDateVN(customDateRange.end)}`,
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-3 sm:px-4 md:px-8 bg-white border-b border-slate-200 shadow-xs max-w-full">
      {/* Left: Mobile hamburger & Greeting */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 text-slate-600 rounded-xl lg:hidden hover:bg-slate-100 cursor-pointer"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <div className="flex items-center space-x-2">
            <p className="text-xs font-medium text-slate-400">Xin chào trở lại,</p>
            {isCloudConfigured && (
              <button
                type="button"
                onClick={() => syncToCloud()}
                disabled={isCloudSyncing}
                className={`inline-flex items-center gap-1 text-3xs font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  isCloudSyncing
                    ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                }`}
                title={isCloudSyncing ? 'Hệ thống đang tự động đồng bộ dữ liệu với Cloud...' : 'Cloud đã đồng bộ tự động. Bấm để đồng bộ tức thì'}
              >
                {isCloudSyncing ? (
                  <RefreshCw className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />
                ) : (
                  <Cloud className="w-3 h-3 text-emerald-500" />
                )}
                <span>{isCloudSyncing ? 'Đang đồng bộ...' : 'Cloud Synced'}</span>
              </button>
            )}
          </div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{user.fullName}</h2>
        </div>

        {/* Mobile Brand Title & Auto-Cloud status */}
        <div className="sm:hidden flex items-center space-x-1.5">
          <span className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 hidden min-[370px]:inline">MoneyFlow</span>
          {isCloudConfigured && (
            <button
              type="button"
              onClick={() => syncToCloud()}
              disabled={isCloudSyncing}
              className={`inline-flex items-center gap-1 text-3xs font-semibold px-1.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                isCloudSyncing
                  ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              }`}
              title={isCloudSyncing ? 'Đang tự động đồng bộ với Cloud...' : 'Bấm để đồng bộ Cloud'}
            >
              {isCloudSyncing ? (
                <RefreshCw className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : (
                <Cloud className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="text-3xs">{isCloudSyncing ? 'Đồng bộ...' : 'Cloud'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1 sm:space-x-2.5 shrink-0">
        {/* Quick Search Button (Desktop: Ctrl+K) */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden md:flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer group"
          title="Tìm kiếm & Thao tác nhanh (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span className="hidden lg:inline">Tìm nhanh...</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-3xs font-semibold text-slate-400 bg-white border border-slate-200 rounded">
            Ctrl K
          </kbd>
        </button>

        {/* Time Filter Dropdown */}
        <div className="relative shrink-0" ref={timeDropdownRef}>
          <button
            onClick={() => setShowTimeDropdown(!showTimeDropdown)}
            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Bộ lọc khoảng thời gian"
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">{timeFilterLabels[timeFilter] || 'Tháng này'}</span>
            <span className="sm:hidden text-2xs font-semibold max-w-[65px] truncate">
              {timeFilter === 'this_month' ? 'Tháng này' : timeFilterLabels[timeFilter] || 'Kỳ này'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {showTimeDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                Khoảng thời gian
              </div>
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: 'this_week', label: 'Tuần này' },
                { id: 'this_month', label: 'Tháng này' },
                { id: 'this_year', label: 'Năm nay' },
                { id: 'all', label: 'Toàn bộ thời gian' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTimeFilter(opt.id as any);
                    setShowTimeDropdown(false);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                    timeFilter === opt.id ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {timeFilter === opt.id && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}

              <div className="border-t border-slate-100 my-1"></div>

              <button
                onClick={() => {
                  setShowTimeDropdown(false);
                  setShowCustomDateModal(true);
                }}
                className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                  timeFilter === 'custom' ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                }`}
              >
                <span>Tùy chỉnh ngày...</span>
                {timeFilter === 'custom' && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative shrink-0" ref={notifDropdownRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-1.5 sm:p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer shrink-0"
            aria-label="Thông báo"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 sm:min-w-5 sm:h-5 px-1 text-3xs sm:text-2xs font-bold text-white bg-rose-500 rounded-full border-2 border-white animate-pulse">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute -right-14 sm:right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold text-slate-800">Thông báo</h3>
                  {unreadNotificationCount > 0 && (
                    <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">
                      {unreadNotificationCount} mới
                    </span>
                  )}
                </div>
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Đọc tất cả
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    Không có thông báo mới
                  </div>
                ) : (
                  notifications.map((n) => {
                    let IconComponent = Info;
                    let iconColor = 'text-blue-500 bg-blue-50';
                    if (n.type === 'budget_warning' || n.type === 'budget_exceeded') {
                      IconComponent = AlertTriangle;
                      iconColor = 'text-amber-500 bg-amber-50';
                    } else if (n.type === 'goal_milestone') {
                      IconComponent = ShieldCheck;
                      iconColor = 'text-emerald-500 bg-emerald-50';
                    } else if (n.type === 'financial_tip') {
                      IconComponent = Lightbulb;
                      iconColor = 'text-indigo-500 bg-indigo-50';
                    } else if (n.type === 'debt_reminder') {
                      IconComponent = HandCoins;
                      iconColor = 'text-rose-500 bg-rose-50';
                    }

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationAsRead(n.id);
                          if (n.link) setCurrentTab(n.link);
                          setShowNotifDropdown(false);
                        }}
                        className={`flex items-start space-x-3 p-3 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                          !n.isRead ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <div className={`p-2 rounded-xl flex-shrink-0 ${iconColor}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${!n.isRead ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>
                            {n.title}
                          </p>
                          <p className="text-2xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                          <span className="text-2xs text-slate-400 mt-1 block">
                            {formatDateVN(n.createdAt)}
                          </span>
                        </div>
                        {!n.isRead && (
                          <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark / Light Mode Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer shrink-0"
          title={theme === 'dark' ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối (Dark Mode)'}
          aria-label="Đổi giao diện sáng/tối"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 hover:text-indigo-600 transition-colors" />
          )}
        </button>

        {/* Quick Add Split Button (Desktop) & Compact Button (Mobile) */}
        <div className="relative shrink-0" ref={quickAddRef}>
          {/* Desktop Split Button */}
          <div className="hidden sm:inline-flex rounded-xl shadow-xs overflow-hidden">
            <button
              onClick={() => openAddTxModal()}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              title="Thêm giao dịch thu chi (Phím tắt: Ctrl + K)"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Thêm giao dịch</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
              className="px-2 py-2 text-white bg-blue-700 hover:bg-blue-800 border-l border-blue-500/40 transition-all flex items-center justify-center cursor-pointer"
              title="Tùy chọn tạo nhanh khác"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Compact Add Button */}
          <button
            type="button"
            onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
            className="sm:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer shrink-0"
            title="Thao tác tạo nhanh (+)"
            aria-label="Thao tác tạo nhanh"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Quick Add Dropdown Menu */}
          {showQuickAddMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-1.5 text-3xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Thao tác tạo nhanh
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuickAddMenu(false);
                  openAddTxModal();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block font-bold">Giao dịch thu / chi</span>
                  <span className="text-3xs text-slate-400 font-normal">Tạo khoản thu hoặc chi</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickAddMenu(false);
                  setCurrentTab('debts');
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 shrink-0">
                  <HandCoins className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block font-bold">Sổ nợ & Cho vay</span>
                  <span className="text-3xs text-slate-400 font-normal">Ghi nợ hoặc đi vay</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickAddMenu(false);
                  setCurrentTab('accounts');
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600 shrink-0">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block font-bold">Chuyển tiền giữa các ví</span>
                  <span className="text-3xs text-slate-400 font-normal">Điều chuyển số dư</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickAddMenu(false);
                  setCurrentTab('transactions');
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block font-bold">Lương & Định kỳ</span>
                  <span className="text-3xs text-slate-400 font-normal">Tự động nạp hàng tháng</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* User Account / Profile Dropdown */}
        {!isAuthenticated ? (
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 cursor-pointer shrink-0"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đăng nhập</span>
          </button>
        ) : (
          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-1 sm:space-x-2 p-0.5 sm:p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group shrink-0"
              title="Tài khoản cá nhân"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs group-hover:ring-2 group-hover:ring-blue-500 transition-all shrink-0">
                {getUserInitials(user.fullName)}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{user.fullName}</p>
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      🟢 Đã đăng nhập
                    </span>
                  </div>
                  <p className="text-2xs text-slate-400 truncate mt-0.5">{user.email}</p>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setCurrentTab('settings');
                    }}
                    className="w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-400" />
                    <span>Cài đặt & Hồ sơ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      openAuthModal('login');
                    }}
                    className="w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-blue-500" />
                    <span>Đổi tài khoản / Đăng ký mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsChangePasswordOpen(true);
                    }}
                    className="w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span>Đổi mật khẩu tài khoản</span>
                  </button>

                  {user.isPinEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        lockApp();
                      }}
                      className="w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-amber-500" />
                      <span>Khóa màn hình (Mã PIN)</span>
                    </button>
                  )}

                  <div className="pt-1 border-t border-slate-100 mt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setShowUserMenu(false);
                        if (confirm('Bạn có chắc muốn đăng xuất khỏi tài khoản này?')) {
                          await logout();
                        }
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Đăng xuất tài khoản</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Date Range Picker Modal rendered at document body */}
      {showCustomDateModal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCustomDateModal(false);
            }}
          >
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 my-auto">
              <h3 className="text-base font-bold text-slate-800 mb-4">
                Chọn khoảng thời gian tùy chỉnh
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) =>
                      setCustomDateRange({ ...customDateRange, start: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) =>
                      setCustomDateRange({ ...customDateRange, end: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomDateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimeFilter('custom');
                    setShowCustomDateModal(false);
                  }}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenTransferModal={() => setCurrentTab('accounts')}
        onOpenDebtModal={() => setCurrentTab('debts')}
        onOpenGoalModal={() => setCurrentTab('savings')}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </header>
  );
};

