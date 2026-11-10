import React from 'react';
import { useFinancial } from '../../context/FinancialContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PieChart,
  Target,
  BarChart3,
  BookOpen,
  Settings,
  X,
  TrendingUp,
  Sparkles,
  HandCoins,
  AlertCircle,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { formatVND, getLocalDateString } from '../../utils/formatters';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const {
    currentTab,
    setCurrentTab,
    accounts,
    debts,
    theme,
    toggleTheme,
    openAIModal,
    isAdmin,
  } = useFinancial();

  const totalNetWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
  const activeDebtsCount = debts.filter((d) => d.totalAmount > d.paidAmount).length;
  const todayStr = getLocalDateString();
  const overdueDebtsCount = debts.filter(
    (d) => (d.status === 'overdue' || (d.dueDate && d.dueDate < todayStr)) && d.totalAmount > d.paidAmount
  ).length;

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'transactions', label: 'Giao dịch', icon: ArrowLeftRight },
    { id: 'accounts', label: 'Tài khoản & Ví', icon: Wallet },
    { id: 'budgets', label: 'Ngân sách', icon: PieChart },
    { id: 'savings', label: 'Mục tiêu tiết kiệm', icon: Target },
    { id: 'debts', label: 'Sổ nợ & Cho vay', icon: HandCoins },
    { id: 'reports', label: 'Báo cáo & Phân tích', icon: BarChart3 },
    { id: 'journal', label: 'Nhật ký tài chính', icon: BookOpen },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              setCurrentTab('dashboard');
              onCloseMobile();
            }}
            className="flex items-center space-x-3 text-left hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            title="Về trang Tổng quan"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/30">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                MoneyFlow
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </span>
              <p className="text-2xs text-slate-400 font-medium">Smart Wealth Engine</p>
            </div>
          </button>
          <button
            onClick={onCloseMobile}
            className="p-1 text-slate-400 rounded-lg lg:hidden hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-2xs font-semibold tracking-wider text-slate-500 uppercase">
            Menu Quản Lý
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  onCloseMobile();
                }}
                className={`flex items-center w-full px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mr-3 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {item.id === 'debts' && overdueDebtsCount > 0 && (
                  <span
                    className="ml-auto px-1.5 py-0.5 text-2xs font-bold bg-rose-600 text-white rounded-md flex items-center gap-1 shadow-xs animate-pulse"
                    title={`${overdueDebtsCount} khoản nợ đã quá hạn cần đòi/trả!`}
                  >
                    <AlertCircle className="w-3 h-3" />
                    {overdueDebtsCount}
                  </span>
                )}
                {item.id === 'debts' && overdueDebtsCount === 0 && activeDebtsCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-2xs font-bold bg-blue-500/30 text-blue-300 rounded-md">
                    {activeDebtsCount}
                  </span>
                )}
                {item.id === 'journal' && (
                  <span className="ml-auto px-1.5 py-0.5 text-2xs font-medium bg-slate-800 text-slate-300 rounded-md">
                    Mới
                  </span>
                )}
              </button>
            );
          })}

          {/* Smart Assistant Nav Item */}
          <button
            type="button"
            onClick={() => {
              openAIModal();
              onCloseMobile();
            }}
            className="flex items-center w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 text-slate-300 hover:text-white hover:bg-slate-800/80 group shadow-2xs mt-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 mr-3 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="truncate">Trợ lý giọng nói</span>
          </button>

          {/* Dedicated Admin Portal Nav Item (Visible ONLY to Admin) */}
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-slate-800/90">
              <div className="px-3 pb-2 text-2xs font-bold tracking-wider text-amber-500 uppercase flex items-center justify-between">
                <span>Quản Trị Hệ Thống</span>
                <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  ADMIN
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentTab('admin');
                  onCloseMobile();
                }}
                className={`flex items-center w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group cursor-pointer ${
                  currentTab === 'admin'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/30 font-bold'
                    : 'text-amber-400 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-500/20'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mr-3 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate">Bảng điều hành Admin</span>
              </button>
            </div>
          )}
        </nav>

        {/* Quick Theme Toggle for Mobile Drawer */}
        <div className="px-3 pb-2 lg:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-all flex items-center justify-between border border-slate-700/60 cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              {theme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Giao diện: {theme === 'dark' ? 'Chế độ Tối' : 'Chế độ Sáng'}</span>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
              Đổi
            </span>
          </button>
        </div>

        {/* Bottom Quick Net Worth Card */}
        <div className="p-4 mx-3 mb-4 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-800/40 border border-slate-700/60 shadow-inner">
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Tổng tài sản ròng
            </span>
          </div>
          <div className="text-base font-bold text-white tracking-tight">
            {formatVND(totalNetWorth)}
          </div>
          <p className="text-2xs text-slate-400 mt-1">
            {accounts.length} tài khoản & ví liên kết
          </p>
        </div>

        {/* Footer Tagline */}
        <div className="px-6 py-3 border-t border-slate-800/80 text-center">
          <p className="text-2xs text-slate-500 italic">
            "Hiểu rõ dòng tiền • Làm chủ tương lai"
          </p>
        </div>
      </aside>
    </>
  );
};

