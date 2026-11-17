// Quản lý an toàn đăng nhập và chống dò mật khẩu / mã PIN (Brute-Force Rate Limiter)

export const AUTH_LOGIN_LOCKOUT_KEY = 'moneyflow_login_lockout_v1';
export const PIN_LOCKOUT_KEY = 'moneyflow_pin_lockout_v1';

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 60 * 1000; // Khóa 60 giây khi sai quá 5 lần

export interface LockoutInfo {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
  attemptsLeft: number;
}

export function getLockoutState(
  storageKey: string,
  maxAttempts: number = MAX_LOGIN_ATTEMPTS
): LockoutInfo {
  if (typeof window === 'undefined') {
    return { isLocked: false, remainingSeconds: 0, attempts: 0, attemptsLeft: maxAttempts };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.attempts === 'number' && typeof parsed.lockoutUntil === 'number') {
        const remainingMs = parsed.lockoutUntil - Date.now();
        if (remainingMs > 0 && parsed.attempts >= maxAttempts) {
          return {
            isLocked: true,
            remainingSeconds: Math.ceil(remainingMs / 1000),
            attempts: parsed.attempts,
            attemptsLeft: 0,
          };
        } else if (parsed.lockoutUntil > 0 && Date.now() >= parsed.lockoutUntil) {
          // Đã hết thời gian chờ -> tự động mở khóa và reset lượt sai
          resetLockout(storageKey);
          return { isLocked: false, remainingSeconds: 0, attempts: 0, attemptsLeft: maxAttempts };
        }
        return {
          isLocked: false,
          remainingSeconds: 0,
          attempts: parsed.attempts,
          attemptsLeft: Math.max(0, maxAttempts - parsed.attempts),
        };
      }
    }
  } catch {}

  return { isLocked: false, remainingSeconds: 0, attempts: 0, attemptsLeft: maxAttempts };
}

export function recordFailedAttempt(
  storageKey: string,
  maxAttempts: number = MAX_LOGIN_ATTEMPTS,
  lockoutDurationMs: number = LOCKOUT_DURATION_MS
): LockoutInfo {
  const current = getLockoutState(storageKey, maxAttempts);
  const nextAttempts = current.attempts + 1;
  let lockoutUntil = 0;

  if (nextAttempts >= maxAttempts) {
    lockoutUntil = Date.now() + lockoutDurationMs;
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ attempts: nextAttempts, lockoutUntil })
      );
    } catch {}
  }

  const remainingSeconds = lockoutUntil > 0 ? Math.ceil((lockoutUntil - Date.now()) / 1000) : 0;
  const isLocked = nextAttempts >= maxAttempts && remainingSeconds > 0;
  const attemptsLeft = Math.max(0, maxAttempts - nextAttempts);

  return { isLocked, remainingSeconds, attempts: nextAttempts, attemptsLeft };
}

export function resetLockout(storageKey: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
