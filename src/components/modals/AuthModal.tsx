import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Cloud,
  KeyRound,
  HelpCircle,
} from 'lucide-react';
import { useModalEscape } from '../../hooks/useModalEscape';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
}) => {
  const { login, register, resetPassword, loginAsDemo, isCloudConfigured, showToast, setCurrentTab } = useFinancial();

  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberAccount, setRememberAccount] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const passwordInputRef = useRef<HTMLInputElement>(null);

  useModalEscape(onClose, isOpen);

  // When modal is opened, clear temporary input so stranger / public users see a 100% clean blank form
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      try {
        localStorage.removeItem('moneyflow_recent_accounts_v1');
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        setCurrentTab('dashboard');
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        showToast(res.message, 'success');
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi đăng nhập, vui lòng kiểm tra lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register(fullName, email, password);
      if (res.success) {
        setCurrentTab('dashboard');
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        showToast(res.message, 'success');
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi đăng ký tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp nhau');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword(email, password);
      if (res.success) {
        // Automatically sign in with new password
        const loginRes = await login(email, password);
        if (loginRes.success) {
          setCurrentTab('dashboard');
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          showToast('Đặt lại mật khẩu và đăng nhập thành công!', 'success');
          onClose();
        } else {
          showToast(res.message, 'success');
          setTab('login');
        }
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khôi phục mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    loginAsDemo('Khách Trải Nghiệm', 'guest@moneyflow.vn');
    setCurrentTab('dashboard');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    showToast('Đã đăng nhập với tài khoản Dùng thử (Khách)!', 'success');
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden my-auto border border-slate-100 flex flex-col">
        {/* Brand Header */}
        <div className="relative bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-600 p-6 text-white text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Đóng (Phím Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 shadow-inner">
            <TrendingUp className="w-6 h-6 text-white stroke-[2.5]" />
          </div>

          <h3 className="text-xl font-bold tracking-tight">MoneyFlow Account</h3>
          <p className="text-xs text-blue-100 mt-1">
            Đăng nhập để đồng bộ dữ liệu tài chính đa thiết bị & đám mây
          </p>

          {isCloudConfigured && (
            <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-3xs font-semibold text-white border border-white/20">
              <Cloud className="w-3.5 h-3.5 text-emerald-300" />
              <span>Supabase Cloud Sync Sẵn sàng</span>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        {tab !== 'forgot' ? (
          <div className="flex border-b border-slate-100 px-6 pt-3 bg-slate-50/50">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMessage('');
              }}
              className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                tab === 'login'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setErrorMessage('');
              }}
              className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                tab === 'register'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Đăng ký tài khoản
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3 bg-slate-50/50">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMessage('');
              }}
              className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>← Quay lại Đăng nhập</span>
            </button>
            <span className="text-xs font-bold text-blue-600">Khôi phục mật khẩu</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium animate-in fade-in duration-150">
              {errorMessage}
            </div>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} autoComplete="on" className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="login-email"
                    name="username"
                    type="email"
                    autoComplete="username email"
                    required
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="login-password"
                    name="password"
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2.5">
                  <label className="flex items-center gap-1.5 text-2xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberAccount}
                      onChange={(e) => setRememberAccount(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Ghi nhớ đăng nhập trên trình duyệt</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setErrorMessage('');
                    }}
                    className="text-2xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Quên mật khẩu?</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
              >
                <span>{isLoading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="w-full py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dùng thử nhanh (Tài khoản Khách)</span>
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên của bạn
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu (tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Tối thiểu 6 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác nhận lại mật khẩu
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 mt-1"
              >
                <span>{isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản ngay'}</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-3.5">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-2xs text-slate-600 leading-relaxed">
                💡 Nhập địa chỉ email tài khoản của bạn để thiết lập lại mật khẩu mới ngay lập tức.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ Email tài khoản
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Nhập mật khẩu mới"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác nhận lại mật khẩu mới
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 mt-1"
              >
                <span>{isLoading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu & Đăng nhập ngay'}</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center space-x-2 text-3xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Mọi dữ liệu tài chính của bạn đều được mã hóa và bảo mật riêng tư tuyệt đối trên máy tính và Supabase Cloud.
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
