import { User, AuthSession } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { initialUser } from './seedData';
import { dataService } from './dataService';

const SESSION_KEY = 'moneyflow_auth_session_v1';
const REGISTERED_USERS_KEY = 'moneyflow_registered_users_v1';
const PIN_KEY = 'moneyflow_app_pin_v1';
const LOCK_STATE_KEY = 'moneyflow_is_locked_v1';

interface StoredUserAccount {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string; // simple obfuscated hash for local storage
  createdAt: string;
}

export class AuthService {
  private static instance: AuthService;
  private session: AuthSession;
  private isLocked: boolean = false;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    try {
      localStorage.removeItem('moneyflow_recent_accounts_v1');
    } catch {}
    this.session = this.loadSession();
    this.isLocked = this.loadLockState();
    this.setupSupabaseAuthListener();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'mf_' + Math.abs(hash).toString(36) + btoa(str).slice(0, 8);
  }

  private loadSession(): AuthSession {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.user) {
          if (parsed.user.email?.toLowerCase().trim() === 'minhkhoj2002@gmail.com') {
            parsed.user.role = 'admin';
          }
          return parsed;
        }
      }

      // Check if this is Khôi's existing device
      const legacyState = localStorage.getItem('moneyflow_app_state_v1');
      if (legacyState) {
        try {
          const parsedState = JSON.parse(legacyState);
          if (parsedState?.user?.fullName?.includes('Khôi') || parsedState?.user?.email?.includes('minhkhoj')) {
            const creatorSession: AuthSession = {
              user: {
                ...parsedState.user,
                email: 'minhkhoj2002@gmail.com',
                fullName: parsedState.user.fullName || 'Khôi',
                role: 'admin',
              },
              isLoggedIn: true,
              loginMethod: 'local',
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(creatorSession));
            return creatorSession;
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to load auth session:', e);
    }

    // Default for any new device / other people: Logged out!
    return {
      user: {
        id: 'usr_guest',
        fullName: 'Khách',
        email: '',
        currency: 'VND',
        dateFormat: 'DD/MM/YYYY',
        createdAt: new Date().toISOString(),
      },
      isLoggedIn: false,
      loginMethod: 'guest',
    };
  }

  private saveSession(): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save auth session:', e);
    }
  }

  private loadLockState(): boolean {
    const pin = this.getPinCode();
    if (!pin) return false;
    return localStorage.getItem(LOCK_STATE_KEY) === 'true';
  }

  private setupSupabaseAuthListener(): void {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      supabase.auth.onAuthStateChange(async (_event, supaSession) => {
        if (supaSession && supaSession.user) {
          const email = supaSession.user.email || this.session.user.email;
          const fullName =
            supaSession.user.user_metadata?.full_name ||
            supaSession.user.user_metadata?.name ||
            email.split('@')[0];

          const isKhoi = email.toLowerCase().trim() === 'minhkhoj2002@gmail.com';
          this.session = {
            user: {
              ...this.session.user,
              id: supaSession.user.id,
              email,
              fullName,
              role: isKhoi ? 'admin' : 'user',
            },
            token: supaSession.access_token,
            isLoggedIn: true,
            loginMethod: 'supabase',
          };
          this.saveSession();
        }
      });
    } catch (e) {
      console.warn('Supabase auth listener setup error:', e);
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyListeners(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    });
  }

  // ===================== GETTERS =====================
  public getSession(): AuthSession {
    return { ...this.session };
  }

  public getCurrentUser(): User {
    return { ...this.session.user };
  }

  public isAuthenticated(): boolean {
    return this.session.isLoggedIn;
  }

  public isAppLocked(): boolean {
    const hasPin = Boolean(this.getPinCode());
    return hasPin && this.isLocked;
  }

  // ===================== REGISTER =====================
  public async register(
    fullName: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: User }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName) {
      return { success: false, message: 'Vui lòng nhập họ và tên của bạn' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Vui lòng nhập địa chỉ email hợp lệ' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự' };
    }

    let supaUserId: string | null = null;

    // 1. Try Supabase Auth
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: cleanName },
          },
        });

        if (error) {
          // If error is not fatal, or user already registered on supabase, continue local
          console.warn('Supabase sign up notice:', error.message);
        } else if (data?.user) {
          supaUserId = data.user.id;
        }
      } catch (err: any) {
        console.warn('Supabase sign up error:', err);
      }
    }

    // 2. Save to local registered accounts
    const localUsers: StoredUserAccount[] = this.getRegisteredUsers();
    const existingIndex = localUsers.findIndex((u) => u.email === cleanEmail);

    const newUserRecord: StoredUserAccount = {
      id: supaUserId || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      email: cleanEmail,
      fullName: cleanName,
      passwordHash: this.simpleHash(password),
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      localUsers[existingIndex] = newUserRecord;
    } else {
      localUsers.push(newUserRecord);
    }
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(localUsers));

    // 3. Set active session
    const newUser: User = {
      ...this.session.user,
      id: newUserRecord.id,
      email: cleanEmail,
      fullName: cleanName,
    };

    this.session = {
      user: newUser,
      isLoggedIn: true,
      loginMethod: supaUserId ? 'supabase' : 'local',
    };
    this.saveSession();
    dataService.switchUser(newUser);

    return {
      success: true,
      message: 'Đăng ký tài khoản thành công! Đang chuyển hướng...',
      user: newUser,
    };
  }

  // ===================== LOGIN =====================
  public async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: User }> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return { success: false, message: 'Vui lòng nhập đầy đủ Email và Mật khẩu' };
    }

    // 1. Try Supabase Auth first
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data?.user) {
          const fullName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            cleanEmail.split('@')[0];

          const isKhoi = cleanEmail === 'minhkhoj2002@gmail.com';
          const loggedInUser: User = {
            ...this.session.user,
            id: data.user.id,
            email: cleanEmail,
            fullName,
            role: isKhoi ? 'admin' : 'user',
          };

          this.session = {
            user: loggedInUser,
            token: data.session?.access_token,
            isLoggedIn: true,
            loginMethod: 'supabase',
          };
          this.saveSession();
          dataService.switchUser(loggedInUser);

          return {
            success: true,
            message: `Chào mừng ${fullName} trở lại! Đăng nhập Supabase Cloud thành công.`,
            user: loggedInUser,
          };
        }
      } catch (err: any) {
        console.warn('Supabase login error, checking local fallback:', err);
      }
    }

    // 2. Check local accounts fallback
    const localUsers = this.getRegisteredUsers();
    const found = localUsers.find((u) => u.email === cleanEmail);
    const hash = this.simpleHash(password);

    if (found) {
      if (found.passwordHash === hash) {
        const isKhoi = found.email.toLowerCase() === 'minhkhoj2002@gmail.com';
        const loggedInUser: User = {
          ...this.session.user,
          id: found.id,
          email: found.email,
          fullName: found.fullName,
          role: isKhoi ? 'admin' : 'user',
        };

        this.session = {
          user: loggedInUser,
          isLoggedIn: true,
          loginMethod: 'local',
        };
        this.saveSession();
        dataService.switchUser(loggedInUser);

        return {
          success: true,
          message: `Chào mừng ${found.fullName} trở lại! Đăng nhập thành công.`,
          user: loggedInUser,
        };
      }
      return { success: false, message: 'Mật khẩu không chính xác. Vui lòng thử lại!' };
    }

    // 3. Fallback for primary Khôi account with default password
    if (cleanEmail === initialUser.email.toLowerCase() || cleanEmail === 'minhkhoj2002@gmail.com') {
      if (password === '123456') {
        const loggedInUser: User = {
          ...initialUser,
          email: 'minhkhoj2002@gmail.com',
          fullName: 'Khôi',
          role: 'admin',
        };
        this.session = {
          user: loggedInUser,
          isLoggedIn: true,
          loginMethod: 'local',
        };
        this.saveSession();
        dataService.switchUser(loggedInUser);
        return {
          success: true,
          message: 'Chào mừng Khôi trở lại! Đăng nhập thành công.',
          user: loggedInUser,
        };
      }
    }

    return {
      success: false,
      message: 'Không tìm thấy tài khoản với email này hoặc mật khẩu không đúng. Vui lòng thử lại!',
    };
  }

  // ===================== CHANGE PASSWORD =====================
  public async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' };
    }

    const currentEmail = (this.session.user.email || '').trim().toLowerCase();
    if (!currentEmail) {
      return { success: false, message: 'Bạn chưa đăng nhập tài khoản nào' };
    }

    // 1. Supabase update if logged in via cloud
    if (this.session.loginMethod === 'supabase' && isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          return { success: false, message: `Lỗi Supabase: ${error.message}` };
        }
      } catch (err: any) {
        console.warn('Supabase password change error:', err);
      }
    }

    // 2. Update in local storage accounts
    const localUsers = this.getRegisteredUsers();
    let userIndex = localUsers.findIndex((u) => u.email.toLowerCase() === currentEmail);

    if (userIndex === -1 && currentEmail === initialUser.email.toLowerCase()) {
      localUsers.push({
        id: initialUser.id,
        email: initialUser.email.toLowerCase(),
        fullName: initialUser.fullName,
        passwordHash: this.simpleHash('123456'),
        createdAt: initialUser.createdAt,
      });
      userIndex = localUsers.length - 1;
    }

    if (userIndex >= 0) {
      const targetUser = localUsers[userIndex];
      // Verify old password (unless default empty)
      if (targetUser.passwordHash && targetUser.passwordHash !== this.simpleHash(oldPassword)) {
        return { success: false, message: 'Mật khẩu hiện tại không chính xác' };
      }

      targetUser.passwordHash = this.simpleHash(newPassword);
      localUsers[userIndex] = targetUser;
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(localUsers));
      return { success: true, message: 'Đổi mật khẩu tài khoản thành công!' };
    }

    return { success: false, message: 'Không tìm thấy tài khoản trong hệ thống' };
  }

  // ===================== RESET PASSWORD (FORGOT PASSWORD) =====================
  public async resetPassword(
    email: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Vui lòng nhập địa chỉ email của bạn' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' };
    }

    // 1. Send cloud reset if Supabase is active
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(cleanEmail);
      } catch (e) {
        console.warn('Supabase reset request notice:', e);
      }
    }

    // 2. Reset password directly in local storage
    const localUsers = this.getRegisteredUsers();
    let userIndex = localUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1 && cleanEmail === initialUser.email.toLowerCase()) {
      localUsers.push({
        id: initialUser.id,
        email: initialUser.email.toLowerCase(),
        fullName: initialUser.fullName,
        passwordHash: this.simpleHash('123456'),
        createdAt: initialUser.createdAt,
      });
      userIndex = localUsers.length - 1;
    }

    if (userIndex >= 0) {
      localUsers[userIndex].passwordHash = this.simpleHash(newPassword);
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(localUsers));
      return {
        success: true,
        message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.',
      };
    }

    return {
      success: false,
      message: 'Không tìm thấy tài khoản nào khớp với email này. Vui lòng kiểm tra lại!',
    };
  }

  // Quick Demo / Local Login
  public loginAsDemo(name: string = 'Khách Trải Nghiệm', email: string = 'guest@moneyflow.vn'): void {
    const demoUser: User = {
      ...initialUser,
      id: `usr_demo_${Date.now()}`,
      fullName: name,
      email,
    };
    this.session = {
      user: demoUser,
      isLoggedIn: true,
      loginMethod: 'local',
    };
    this.saveSession();
    dataService.switchUser(demoUser);
  }

  // ===================== LOGOUT =====================
  public async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out error:', e);
      }
    }

    const guestUser: User = {
      id: 'usr_guest',
      fullName: 'Khách',
      email: '',
      currency: 'VND',
      dateFormat: 'DD/MM/YYYY',
      createdAt: new Date().toISOString(),
    };

    this.session = {
      user: guestUser,
      isLoggedIn: false,
      loginMethod: 'guest',
    };
    this.saveSession();
  }

  // ===================== PIN CODE SECURITY =====================
  public getPinCode(): string | null {
    return localStorage.getItem(PIN_KEY);
  }

  public setPinCode(pin: string): boolean {
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return false;
    }
    localStorage.setItem(PIN_KEY, this.simpleHash(pin));
    this.session.user.isPinEnabled = true;
    this.saveSession();
    return true;
  }

  public removePinCode(): void {
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(LOCK_STATE_KEY);
    this.isLocked = false;
    this.session.user.isPinEnabled = false;
    this.saveSession();
  }

  public verifyPin(pin: string): boolean {
    const savedHash = this.getPinCode();
    if (!savedHash) return true; // No PIN set
    return savedHash === this.simpleHash(pin);
  }

  public unlockWithPin(pin: string): boolean {
    if (this.verifyPin(pin)) {
      this.isLocked = false;
      localStorage.setItem(LOCK_STATE_KEY, 'false');
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public async unlockWithPassword(password: string): Promise<{ success: boolean; message: string }> {
    const currentEmail = (this.session.user.email || '').trim().toLowerCase();

    // 1. If Supabase login
    if (this.session.loginMethod === 'supabase' && isSupabaseConfigured && supabase && currentEmail) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: currentEmail,
          password,
        });
        if (!error) {
          this.isLocked = false;
          localStorage.setItem(LOCK_STATE_KEY, 'false');
          this.removePinCode();
          this.notifyListeners();
          return {
            success: true,
            message: 'Xác thực mật khẩu thành công! Ứng dụng đã mở khóa và gỡ bỏ mã PIN cũ.',
          };
        }
      } catch (err) {}
    }

    // 2. Check local accounts
    const localUsers = this.getRegisteredUsers();
    let found = localUsers.find((u) => u.email.toLowerCase() === currentEmail);

    if (!found && currentEmail === initialUser.email.toLowerCase()) {
      found = {
        id: initialUser.id,
        email: initialUser.email.toLowerCase(),
        fullName: initialUser.fullName,
        passwordHash: this.simpleHash('123456'),
        createdAt: initialUser.createdAt,
      };
    }

    if (found && found.passwordHash) {
      if (found.passwordHash === this.simpleHash(password)) {
        this.isLocked = false;
        localStorage.setItem(LOCK_STATE_KEY, 'false');
        this.removePinCode();
        this.notifyListeners();
        return {
          success: true,
          message: 'Xác thực mật khẩu thành công! Ứng dụng đã mở khóa và gỡ bỏ mã PIN cũ.',
        };
      }
      return { success: false, message: 'Mật khẩu tài khoản không chính xác. Vui lòng thử lại!' };
    }

    // Default unlock if no password configured
    this.isLocked = false;
    localStorage.setItem(LOCK_STATE_KEY, 'false');
    this.removePinCode();
    this.notifyListeners();
    return { success: true, message: 'Ứng dụng đã được mở khóa thành công!' };
  }

  public lockApp(): void {
    if (this.getPinCode()) {
      this.isLocked = true;
      localStorage.setItem(LOCK_STATE_KEY, 'true');
      this.notifyListeners();
    }
  }

  public isAdmin(): boolean {
    return (
      this.session.isLoggedIn &&
      (this.session.user.email?.toLowerCase().trim() === 'minhkhoj2002@gmail.com' ||
        this.session.user.role === 'admin')
    );
  }

  public getRegisteredUsers(): StoredUserAccount[] {
    const defaultKhoiAccount: StoredUserAccount = {
      id: 'usr_khoi_primary',
      email: 'minhkhoj2002@gmail.com',
      fullName: 'Khôi',
      passwordHash: this.simpleHash('123456'),
      createdAt: '2026-09-01T00:00:00.000Z',
    };

    try {
      const saved = localStorage.getItem(REGISTERED_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasKhoi = parsed.some((u: StoredUserAccount) => u.email.toLowerCase() === 'minhkhoj2002@gmail.com');
          if (!hasKhoi) {
            parsed.unshift(defaultKhoiAccount);
            localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    } catch {}

    const defaultList = [defaultKhoiAccount];
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(defaultList));
    } catch {}
    return defaultList;
  }
}

export const authService = AuthService.getInstance();

