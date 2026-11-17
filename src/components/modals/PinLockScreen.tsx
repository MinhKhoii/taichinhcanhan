import React, { useState, useEffect } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import {
  Lock,
  Unlock,
  Delete,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import {
  getLockoutState,
  recordFailedAttempt,
  resetLockout,
  formatCountdown,
  PIN_LOCKOUT_KEY,
  MAX_LOGIN_ATTEMPTS,
} from '../../utils/security';

export const PinLockScreen: React.FC = () => {
  const { unlockWithPin, unlockWithPassword, user, logout } = useFinancial();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [pinAttemptsLeft, setPinAttemptsLeft] = useState<number | null>(null);
  const [pinLockoutSeconds, setPinLockoutSeconds] = useState(0);

  // Forgot PIN state
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Sync lockout state on mount
  useEffect(() => {
    const lock = getLockoutState(PIN_LOCKOUT_KEY);
    if (lock.isLocked) {
      setPinLockoutSeconds(lock.remainingSeconds);
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (pinLockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setPinLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          resetLockout(PIN_LOCKOUT_KEY);
          setError(false);
          setPinAttemptsLeft(null);
          setVerifyError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pinLockoutSeconds]);

  const handleDigit = (digit: string) => {
    if (showForgotPin || pinLockoutSeconds > 0) return;
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 6) {
        // Attempt unlock immediately
        const success = unlockWithPin(nextPin);
        if (success) {
          resetLockout(PIN_LOCKOUT_KEY);
          setPinLockoutSeconds(0);
        } else {
          const lock = recordFailedAttempt(PIN_LOCKOUT_KEY);
          setError(true);
          if (lock.isLocked) {
            setPinLockoutSeconds(lock.remainingSeconds);
            setPin('');
          } else {
            setPinAttemptsLeft(lock.attemptsLeft);
            setTimeout(() => setPin(''), 500);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (showForgotPin || pinLockoutSeconds > 0) return;
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  useEffect(() => {
    if (showForgotPin || pinLockoutSeconds > 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, showForgotPin, pinLockoutSeconds]);

  const handleLogout = async () => {
    if (confirm('Bạn muốn đăng xuất khỏi ứng dụng?')) {
      await logout();
      window.location.reload();
    }
  };

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinLockoutSeconds > 0) {
      setVerifyError(`Tạm thời bị khóa do sai quá 5 lần. Vui lòng chờ ${formatCountdown(pinLockoutSeconds)}`);
      return;
    }

    setVerifyError('');
    setIsVerifying(true);
    try {
      const res = await unlockWithPassword(passwordInput);
      if (res.success) {
        resetLockout(PIN_LOCKOUT_KEY);
        setPinLockoutSeconds(0);
      } else {
        const lock = recordFailedAttempt(PIN_LOCKOUT_KEY);
        if (lock.isLocked) {
          setPinLockoutSeconds(lock.remainingSeconds);
          setVerifyError('Sai mật khẩu quá 5 lần! Hệ thống tạm khóa 60 giây.');
        } else {
          setVerifyError(`${res.message} (Còn ${lock.attemptsLeft} lần thử trước khi bị khóa tạm thời)`);
        }
      }
    } catch (err: any) {
      const lock = recordFailedAttempt(PIN_LOCKOUT_KEY);
      if (lock.isLocked) {
        setPinLockoutSeconds(lock.remainingSeconds);
        setVerifyError('Sai mật khẩu quá 5 lần! Hệ thống tạm khóa 60 giây.');
      } else {
        setVerifyError((err.message || 'Lỗi xác thực mật khẩu') + ` (Còn ${lock.attemptsLeft} lần thử)`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl border border-slate-100 flex flex-col items-center">
        {/* Logo Brand */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
          <TrendingUp className="w-8 h-8 stroke-[2.5]" />
        </div>

        <h3 className="text-xl font-black text-slate-800 tracking-tight">MoneyFlow</h3>
        <p className="text-xs text-slate-400 mt-1">Ứng dụng đang được khóa bảo mật</p>

        <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
          <Lock className="w-3.5 h-3.5 text-blue-600" />
          <span>{user.fullName || 'Tài khoản của bạn'}</span>
        </div>

        {!showForgotPin ? (
          <>
            {pinLockoutSeconds > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl w-full text-center space-y-1.5 my-4 animate-in fade-in duration-200">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>Tạm khóa do nhập sai quá 5 lần</span>
                </div>
                <div className="text-2xl font-black font-mono text-amber-600 tracking-wider">
                  {formatCountdown(pinLockoutSeconds)}
                </div>
                <p className="text-3xs text-amber-700 leading-relaxed">
                  Bảo vệ chống dò mã PIN. Làm mới trang sẽ không bỏ qua thời gian chờ.
                </p>
              </div>
            ) : (
              <>
                {/* 6-dot PIN indicator */}
                <div className="flex items-center justify-center space-x-3.5 my-6">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const isFilled = pin.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                          error
                            ? 'bg-rose-500 scale-110 animate-shake'
                            : isFilled
                            ? 'bg-blue-600 scale-110 shadow-xs'
                            : 'bg-slate-200'
                        }`}
                      />
                    );
                  })}
                </div>

                {error && (
                  <p className="text-xs font-bold text-rose-600 mb-4 animate-in fade-in">
                    Mã PIN không đúng! {pinAttemptsLeft !== null ? `(Còn ${pinAttemptsLeft} lần thử)` : 'Vui lòng thử lại'}
                  </p>
                )}
              </>
            )}

            {/* 3x4 Number Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={pinLockoutSeconds > 0}
                  onClick={() => handleDigit(digit)}
                  className={`h-14 rounded-2xl bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-600 font-bold text-lg border border-slate-200/80 transition-all active:scale-95 shadow-2xs flex items-center justify-center ${
                    pinLockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed hover:bg-slate-50 hover:text-slate-800' : 'cursor-pointer'
                  }`}
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                type="button"
                disabled={pinLockoutSeconds > 0}
                onClick={() => handleDigit('0')}
                className={`h-14 rounded-2xl bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-600 font-bold text-lg border border-slate-200/80 transition-all active:scale-95 shadow-2xs flex items-center justify-center ${
                  pinLockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed hover:bg-slate-50 hover:text-slate-800' : 'cursor-pointer'
                }`}
              >
                0
              </button>
              <button
                type="button"
                disabled={pinLockoutSeconds > 0}
                onClick={handleDelete}
                title="Xóa số vừa nhập"
                className={`h-14 rounded-2xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold text-lg border border-slate-200/80 transition-all active:scale-95 shadow-2xs flex items-center justify-center ${
                  pinLockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed hover:bg-slate-50 hover:text-slate-500' : 'cursor-pointer'
                }`}
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Forgot PIN Link */}
            <div className="mb-4 w-full">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPin(true);
                  setVerifyError('');
                  setPasswordInput('');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                <span>Quên mã PIN? Mở khóa bằng Mật khẩu</span>
              </button>
            </div>
          </>
        ) : (
          /* Forgot PIN -> Unlock with Account Password */
          <div className="w-full space-y-4 my-6 animate-in fade-in duration-200">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-2xs text-slate-600 leading-relaxed text-left">
              💡 Nhập <strong>mật khẩu tài khoản</strong> của bạn để mở khóa ứng dụng ngay lập tức và tự động xóa mã PIN cũ.
            </div>

            {pinLockoutSeconds > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium text-left flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Đang tạm khóa bảo mật: còn {formatCountdown(pinLockoutSeconds)}</span>
              </div>
            )}

            {verifyError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium text-left">
                {verifyError}
              </div>
            )}

            <form onSubmit={handlePasswordUnlock} className="space-y-3">
              <div className="relative text-left">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isVerifying || pinLockoutSeconds > 0}
                  placeholder="Nhập mật khẩu tài khoản"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPin(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Quay lại mã PIN
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || pinLockoutSeconds > 0}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {pinLockoutSeconds > 0 ? `Chờ ${formatCountdown(pinLockoutSeconds)}` : isVerifying ? 'Đang kiểm tra...' : 'Mở khóa'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 w-full flex items-center justify-between text-2xs text-slate-400">
          <button
            type="button"
            onClick={handleLogout}
            className="text-slate-500 hover:text-rose-600 font-semibold hover:underline cursor-pointer"
          >
            Đăng xuất tài khoản
          </button>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Bảo mật PIN 6 số
          </span>
        </div>
      </div>
    </div>
  );
};
