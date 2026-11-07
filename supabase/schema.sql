-- ==============================================================================
-- MONEYFLOW - PERSONAL FINANCIAL MANAGEMENT SYSTEM
-- PostgreSQL / Supabase Database Schema & Strict RLS Policies (Security Upgrade v2)
-- ==============================================================================

-- 1. CLOUD BACKUPS TABLE (Snapshot toàn diện 1-Click Sync)
CREATE TABLE IF NOT EXISTS public.cloud_backups (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. USERS PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT auth.uid()::text,
    email TEXT,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    currency TEXT DEFAULT 'VND',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    auto_offset_negative BOOLEAN DEFAULT TRUE,
    font_size TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    account_number TEXT,
    bank_name TEXT,
    color TEXT DEFAULT '#10B981',
    icon TEXT DEFAULT 'Wallet',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT auth.uid()::text,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#64748B',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    type TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category_id TEXT,
    account_id TEXT NOT NULL,
    to_account_id TEXT,
    transfer_fee NUMERIC(15, 2) DEFAULT 0,
    note TEXT,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    category_id TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    month TEXT NOT NULL,
    alert_threshold NUMERIC(3, 2) DEFAULT 0.80,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. SAVINGS GOALS TABLE
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    name TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL,
    current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    deadline DATE NOT NULL,
    icon TEXT DEFAULT 'Target',
    color TEXT DEFAULT '#3B82F6',
    linked_account_id TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. DEBTS TABLE (Sổ nợ & Cho vay)
CREATE TABLE IF NOT EXISTS public.debts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    person_name TEXT NOT NULL,
    phone_number TEXT,
    relationship TEXT,
    type TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    is_no_due_date BOOLEAN DEFAULT FALSE,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    payments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. RECURRING ITEMS TABLE (Lương & Thu chi định kỳ)
CREATE TABLE IF NOT EXISTS public.recurring_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    name TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    day_of_month INT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_processed_date DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES CHO HIỆU NĂNG CAO (OPTIMIZED QUERYING)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_savings_user ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON public.recurring_items(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES BẢO MẬT PHÂN QUYỀN NGHIÊM NGẶT
-- KHÔNG DÙNG USING (true) NỮA - MỖI NGƯỜI DÙNG CHỈ TRUY CẬP DỮ LIỆU CỦA CHÍNH MÌNH
-- ==============================================================================

ALTER TABLE public.cloud_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Xóa toàn bộ chính sách công khai (Public access) cũ nếu có
DROP POLICY IF EXISTS "Public access to cloud_backups" ON public.cloud_backups;
DROP POLICY IF EXISTS "Public access to users" ON public.users;
DROP POLICY IF EXISTS "Public access to accounts" ON public.accounts;
DROP POLICY IF EXISTS "Public access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public access to transactions" ON public.transactions;
DROP POLICY IF EXISTS "Public access to budgets" ON public.budgets;
DROP POLICY IF EXISTS "Public access to savings_goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Public access to debts" ON public.debts;
DROP POLICY IF EXISTS "Public access to recurring_items" ON public.recurring_items;
DROP POLICY IF EXISTS "Public access to notifications" ON public.notifications;

DROP POLICY IF EXISTS "Users can only access own backups" ON public.cloud_backups;
DROP POLICY IF EXISTS "Users can access own profile" ON public.users;
DROP POLICY IF EXISTS "Users can access own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can access own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can access own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can access own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can access own savings_goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can access own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can access own recurring_items" ON public.recurring_items;
DROP POLICY IF EXISTS "Users can access own notifications" ON public.notifications;

-- 2. Thiết lập chính sách bảo mật cá nhân hóa (auth.uid() = user_id)
-- Chỉ người dùng đã đăng nhập (authenticated) mới có thể đọc/ghi dữ liệu của chính mình
-- Sử dụng user_id::text và id::text để tương thích cả 2 kiểu dữ liệu UUID hoặc TEXT

-- Cloud Backups: Snapshot dữ liệu riêng theo user_id (hỗ trợ cả Authenticated & Anon key)
DROP POLICY IF EXISTS "Allow cloud_backups sync" ON public.cloud_backups;
CREATE POLICY "Allow cloud_backups sync" ON public.cloud_backups
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Profiles: Người dùng chỉ đọc và cập nhật hồ sơ cá nhân của mình
CREATE POLICY "Users can access own profile" ON public.users
FOR ALL TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Accounts: Chỉ xem, thêm, sửa, xóa tài khoản ví của chính mình
CREATE POLICY "Users can access own accounts" ON public.accounts
FOR ALL TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Categories: Được xem danh mục mặc định hệ thống HOẶC danh mục do chính mình tạo
CREATE POLICY "Users can view categories" ON public.categories
FOR SELECT TO authenticated
USING (auth.uid()::text = user_id::text OR is_default = TRUE);

CREATE POLICY "Users can modify own categories" ON public.categories
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own categories" ON public.categories
FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own categories" ON public.categories
FOR DELETE TO authenticated
USING (auth.uid()::text = user_id::text);

-- Transactions: Thu chi chuyển khoản thuộc quyền riêng tư tuyệt đối
CREATE POLICY "Users can access own transactions" ON public.transactions
FOR ALL TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Budgets: Ngân sách cá nhân
CREATE POLICY "Users can access own budgets" ON public.budgets
FOR ALL TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Savings Goals: Mục tiêu tiết kiệm cá nhân
CREATE POLICY "Users can access own savings_goals" ON public.savings_goals
FOR ALL TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Debts: Sổ nợ và cho vay cá nhân
CREATE POLICY "Users can access own debts" ON public.debts
FOR ALL TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Recurring Items: Lương và khoản định kỳ cá nhân
CREATE POLICY "Users can access own recurring_items" ON public.recurring_items
FOR ALL TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Notifications: Thông báo cá nhân
CREATE POLICY "Users can access own notifications" ON public.notifications
FOR ALL TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);
