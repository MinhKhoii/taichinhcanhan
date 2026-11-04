import React from 'react';
import { useFinancial } from '../../context/FinancialContext';
import {
  TrendingUp,
  ShieldCheck,
  Lock,
  Wallet,
  PieChart,
  Target,
  HandCoins,
  ArrowRight,
  Cloud,
  CheckCircle2,
  Sparkles,
  Users,
} from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const { openAuthModal, loginAsDemo } = useFinancial();

  const handleGuestDemo = () => {
    loginAsDemo('Khách Trải Nghiệm', 'guest@moneyflow.vn');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <TrendingUp className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                MoneyFlow
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              </span>
              <p className="text-3xs text-slate-400 font-medium">Smart Wealth Engine</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              Đăng ký tài khoản
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-16 text-center space-y-8 flex-1 flex flex-col justify-center">
        {/* Security Badge */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs font-semibold mx-auto shadow-inner animate-in fade-in duration-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Bảo mật đa tầng • Mỗi người dùng một không gian tài chính riêng biệt 100%</span>
        </div>

        {/* Heading */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Quản Lý Tài Chính Cá Nhân <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Thông Minh & An Toàn Tuyệt Đối
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Hệ thống hỗ trợ quản lý đa ví ngân hàng, theo dõi sổ nợ từng đợt, lập ngân sách chi tiêu và tự động đồng bộ đám mây Supabase. Dữ liệu của bạn hoàn toàn riêng tư và không ai khác có thể xem được.
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => openAuthModal('register')}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer group"
          >
            <span>Bắt đầu tạo tài khoản mới</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-800 hover:text-white border border-slate-700 rounded-2xl transition-all cursor-pointer"
          >
            Đăng nhập tài khoản của bạn
          </button>

          <button
            type="button"
            onClick={handleGuestDemo}
            className="w-full sm:w-auto px-5 py-3.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Dùng thử với dữ liệu mẫu độc lập trên máy của bạn"
          >
            Dùng thử ẩn danh (Khách)
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left pt-8">
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2 backdrop-blur-xs">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Đa Ví & Ngân Hàng</h4>
            <p className="text-2xs text-slate-400">
              Quản lý tài khoản ngân hàng, ví tiền mặt, tự động cấn trừ số dư âm khi chi tiêu.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2 backdrop-blur-xs">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <HandCoins className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Sổ Nợ Trả Từng Đợt</h4>
            <p className="text-2xs text-slate-400">
              Ghi nợ, cho vay, trả dần từng khoản nhỏ với lịch sử từng lần trả và biểu tượng thân thiện.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2 backdrop-blur-xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Mục Tiêu Tiết Kiệm</h4>
            <p className="text-2xs text-slate-400">
              Tự động tính số tiền cần trích mỗi tháng và mỗi ngày để hoàn thành đúng hạn mục tiêu.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2 backdrop-blur-xs">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Supabase Cloud Sync</h4>
            <p className="text-2xs text-slate-400">
              Tự động sao lưu lên đám mây riêng của từng tài khoản, không lo mất dữ liệu khi đổi máy.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-3xs text-slate-500">
        <p>MoneyFlow Smart Wealth Engine • Dữ liệu được mã hóa và bảo mật riêng tư 100%.</p>
      </footer>
    </div>
  );
};
