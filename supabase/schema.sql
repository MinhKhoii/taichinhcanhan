-- ==============================================================================
-- MONEYFLOW - PERSONAL FINANCIAL MANAGEMENT SYSTEM
-- PostgreSQL / Supabase Database Schema & RLS Policies (Full Cloud Sync)
-- ==============================================================================

-- 1. CLOUD BACKUPS TABLE (Snapshot toàn diện 1-Click Sync)
CREATE TABLE IF NOT EXISTS public.cloud_backups (
    id TEXT PRIMARY KEY DEFAULT 'moneyflow_cloud_state',
    user_id TEXT DEFAULT 'usr_default',
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. USERS PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT 'usr_default',
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
    user_id TEXT NOT NULL DEFAULT 'usr_default',
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
    user_id TEXT DEFAULT 'usr_default',
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
    user_id TEXT NOT NULL DEFAULT 'usr_default',
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
    user_id TEXT NOT NULL DEFAULT 'usr_default',
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
    user_id TEXT NOT NULL DEFAULT 'usr_default',
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
    user_id TEXT NOT NULL DEFAULT 'usr_default',
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
    user_id TEXT NOT NULL DEFAULT 'usr_default',
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
    user_id TEXT NOT NULL DEFAULT 'usr_default',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (Cho phép kết nối thông qua Anon/Publishable Key)
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

-- Tạo chính sách toàn quyền cho khóa Publishable / Anon
DROP POLICY IF EXISTS "Public access to cloud_backups" ON public.cloud_backups;
CREATE POLICY "Public access to cloud_backups" ON public.cloud_backups FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to users" ON public.users;
CREATE POLICY "Public access to users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to accounts" ON public.accounts;
CREATE POLICY "Public access to accounts" ON public.accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to categories" ON public.categories;
CREATE POLICY "Public access to categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to transactions" ON public.transactions;
CREATE POLICY "Public access to transactions" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to budgets" ON public.budgets;
CREATE POLICY "Public access to budgets" ON public.budgets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to savings_goals" ON public.savings_goals;
CREATE POLICY "Public access to savings_goals" ON public.savings_goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to debts" ON public.debts;
CREATE POLICY "Public access to debts" ON public.debts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to recurring_items" ON public.recurring_items;
CREATE POLICY "Public access to recurring_items" ON public.recurring_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to notifications" ON public.notifications;
CREATE POLICY "Public access to notifications" ON public.notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
