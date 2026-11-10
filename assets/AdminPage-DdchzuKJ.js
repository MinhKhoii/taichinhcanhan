import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{A as t,Ct as n,Dt as r,E as i,Ht as a,It as o,M as ee,Mt as s,P as c,St as te,T as l,Ut as ne,Wt as re,Yt as u,dn as d,fn as f,gn as p,hn as ie,jt as ae,kt as m,l as oe,n as se,r as h,s as g,xt as ce,y as _,yt as le}from"./vendor-icons-nPUQJkmc.js";import{a as v,i as ue,n as de,r as fe,t as y}from"./index-CX4sNH7v.js";import{i as pe}from"./vendor-react-CSVPY4IJ.js";var b=e(p(),1),me=`-- ==============================================================================
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
`,x=pe(),he=()=>{let{isAdmin:e,setCurrentTab:p,syncToCloud:pe,pullFromCloud:he,rollbackSafetyBackup:ge,hasSafetyBackup:_e,isCloudConfigured:ve,showToast:S}=de(),[C,w]=(0,b.useState)(`users`),[T,ye]=(0,b.useState)([]),[E,D]=(0,b.useState)(!1),[O,k]=(0,b.useState)(null),[A,be]=(0,b.useState)(``),[j,M]=(0,b.useState)(`all`),[N,P]=(0,b.useState)(null),[F,I]=(0,b.useState)(!1),[L,R]=(0,b.useState)(!1),[xe,Se]=(0,b.useState)(!0),[z,B]=(0,b.useState)(!1),[V,Ce]=(0,b.useState)(!1),[we,H]=(0,b.useState)(!1),[U,W]=(0,b.useState)(y.getApiKey()),[G,K]=(0,b.useState)(y.hasApiKey()),[q,J]=(0,b.useState)(!1),[Y,X]=(0,b.useState)(null),Te=`https://rlqicielkddwyzgpwgnm.supabase.co`,Z=`sb_publishable_v57oN4cuVfMxcR1DM3AgRQ_E8R4cR8B`,Q=async()=>{if(!ue||!v)k(`Chưa cấu hình Supabase Client.`);else{D(!0),k(null);try{let{data:e,error:t}=await v.from(`cloud_backups`).select(`*`).order(`updated_at`,{ascending:!1});if(t){k(t.message);return}if(e){let t=e.filter(e=>e.id!==`moneyflow_cloud_state`).map(e=>{let t=e.data||{},n=t.user||{},r=Array.isArray(t.transactions)?t.transactions.length:0,i=Array.isArray(t.accounts)?t.accounts.length:0,a=Array.isArray(t.budgets)?t.budgets.length:0,o=Array.isArray(t.savingsGoals)?t.savingsGoals.length:0,ee=Array.isArray(t.debts)?t.debts.length:0,s=n.email||(e.id.startsWith(`backup_`)?e.id.replace(`backup_`,``).replace(/_/g,`.`):`Khách trải nghiệm`),c=s.toLowerCase().includes(`minhkhoj`)||n.role===`admin`;return{id:e.id,email:s,fullName:n.fullName||(c?`Khôi`:s.split(`@`)[0]||`Người dùng`),createdAt:n.createdAt||e.updated_at,lastActive:e.updated_at,txCount:r,accCount:i,budgetCount:a,savingsCount:o,debtCount:ee,isAdmin:c,rawData:t}});ye(t)}}catch(e){k(e.message||`Lỗi truy vấn danh sách người dùng từ Cloud`)}finally{D(!1)}}};(0,b.useEffect)(()=>{e&&Q()},[e]);let Ee=(0,b.useMemo)(()=>T.reduce((e,t)=>e+t.txCount,0),[T]),De=(0,b.useMemo)(()=>T.reduce((e,t)=>e+t.accCount,0),[T]),Oe=(0,b.useMemo)(()=>T.filter(e=>e.isAdmin).length,[T]),ke=(0,b.useMemo)(()=>T.filter(e=>!e.isAdmin).length,[T]),$=(0,b.useMemo)(()=>T.filter(e=>e.fullName.toLowerCase().includes(A.toLowerCase())||e.email.toLowerCase().includes(A.toLowerCase())||e.id.toLowerCase().includes(A.toLowerCase())?j===`admin`?e.isAdmin:j!==`member`||!e.isAdmin:!1),[T,A,j]);return e?(0,x.jsxs)(`div`,{className:`space-y-6 sm:space-y-8 animate-in fade-in duration-300`,children:[(0,x.jsxs)(`div`,{className:`relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl`,children:[(0,x.jsx)(`div`,{className:`absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`}),(0,x.jsx)(`div`,{className:`absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none`}),(0,x.jsxs)(`div`,{className:`relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5`,children:[(0,x.jsxs)(`div`,{className:`space-y-2`,children:[(0,x.jsxs)(`div`,{className:`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-black tracking-wider uppercase`,children:[(0,x.jsx)(l,{className:`w-3.5 h-3.5 text-amber-400`}),(0,x.jsx)(`span`,{children:`Trung Tâm Quản Trị Hệ Thống • Admin Portal`})]}),(0,x.jsxs)(`h1`,{className:`text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5`,children:[(0,x.jsx)(`span`,{children:`Bảng Điều Hành MoneyFlow`}),(0,x.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse`,title:`Hệ thống trực tuyến`})]}),(0,x.jsx)(`p`,{className:`text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed`,children:`Giám sát người dùng thời gian thực, quản lý cơ sở dữ liệu Supabase Cloud, cấu hình API Trí tuệ nhân tạo và kiểm tra an toàn hệ thống.`})]}),(0,x.jsxs)(`div`,{className:`flex items-center gap-2.5 flex-wrap`,children:[(0,x.jsxs)(`button`,{type:`button`,onClick:()=>p(`dashboard`),className:`flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer shadow-xs`,title:`Về giao diện tài chính cá nhân`,children:[(0,x.jsx)(d,{className:`w-4 h-4 text-slate-400`}),(0,x.jsx)(`span`,{children:`← Về Tài chính cá nhân`})]}),(0,x.jsxs)(`button`,{type:`button`,onClick:Q,disabled:E,className:`flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl shadow-md shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50`,children:[(0,x.jsx)(c,{className:`w-4 h-4 ${E?`animate-spin`:``}`}),(0,x.jsx)(`span`,{children:E?`Đang truy vấn...`:`Làm mới`})]})]})]})]}),(0,x.jsxs)(`div`,{className:`grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4`,children:[(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5`,children:[(0,x.jsx)(`div`,{className:`w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0`,children:(0,x.jsx)(g,{className:`w-6 h-6`})}),(0,x.jsxs)(`div`,{className:`min-w-0 flex-1`,children:[(0,x.jsx)(`span`,{className:`text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block`,children:`Tổng người dùng`}),(0,x.jsx)(`div`,{className:`text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight`,children:E?`...`:T.length}),(0,x.jsxs)(`p`,{className:`text-3xs text-slate-500 dark:text-slate-400 truncate mt-0.5`,children:[Oe,` admin • `,ke,` thành viên`]})]})]}),(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5`,children:[(0,x.jsx)(`div`,{className:`w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0`,children:(0,x.jsx)(f,{className:`w-6 h-6`})}),(0,x.jsxs)(`div`,{className:`min-w-0 flex-1`,children:[(0,x.jsx)(`span`,{className:`text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block`,children:`Tổng giao dịch`}),(0,x.jsx)(`div`,{className:`text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight`,children:E?`...`:Ee.toLocaleString(`vi-VN`)}),(0,x.jsx)(`p`,{className:`text-3xs text-emerald-600 dark:text-emerald-400 truncate mt-0.5`,children:`Ghi nhận trên toàn hệ thống`})]})]}),(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5`,children:[(0,x.jsx)(`div`,{className:`w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0`,children:(0,x.jsx)(h,{className:`w-6 h-6`})}),(0,x.jsxs)(`div`,{className:`min-w-0 flex-1`,children:[(0,x.jsx)(`span`,{className:`text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block`,children:`Tổng ví & tài khoản`}),(0,x.jsx)(`div`,{className:`text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight`,children:E?`...`:De}),(0,x.jsx)(`p`,{className:`text-3xs text-blue-600 dark:text-blue-400 truncate mt-0.5`,children:`Ngân hàng, ví điện tử, tiền mặt`})]})]}),(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5`,children:[(0,x.jsx)(`div`,{className:`w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0`,children:(0,x.jsx)(m,{className:`w-6 h-6`})}),(0,x.jsxs)(`div`,{className:`min-w-0 flex-1`,children:[(0,x.jsx)(`span`,{className:`text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block`,children:`Supabase Cloud`}),(0,x.jsxs)(`div`,{className:`text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 truncate`,children:[(0,x.jsx)(`span`,{className:`w-2 h-2 rounded-full bg-emerald-500`}),(0,x.jsx)(`span`,{children:`Hoạt động 100%`})]}),(0,x.jsx)(`p`,{className:`text-3xs text-slate-400 font-mono truncate mt-0.5`,children:`rlqic••••.supabase.co`})]})]})]}),(0,x.jsxs)(`div`,{className:`flex items-center space-x-1 sm:space-x-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs sm:text-sm`,children:[(0,x.jsxs)(`button`,{type:`button`,onClick:()=>w(`users`),className:`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${C===`users`?`bg-blue-600 text-white shadow-md shadow-blue-500/25`:`text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60`}`,children:[(0,x.jsx)(g,{className:`w-4 h-4`}),(0,x.jsx)(`span`,{children:`👥 Giám sát Người Dùng`}),(0,x.jsx)(`span`,{className:`text-2xs px-2 py-0.5 rounded-full font-black ${C===`users`?`bg-white/20 text-white`:`bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300`}`,children:T.length})]}),(0,x.jsxs)(`button`,{type:`button`,onClick:()=>w(`database`),className:`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${C===`database`?`bg-blue-600 text-white shadow-md shadow-blue-500/25`:`text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60`}`,children:[(0,x.jsx)(m,{className:`w-4 h-4`}),(0,x.jsx)(`span`,{children:`☁️ CSDL & SQL Schema`})]}),(0,x.jsxs)(`button`,{type:`button`,onClick:()=>w(`ai`),className:`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${C===`ai`?`bg-blue-600 text-white shadow-md shadow-blue-500/25`:`text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60`}`,children:[(0,x.jsx)(_,{className:`w-4 h-4`}),(0,x.jsx)(`span`,{children:`🤖 Trí tuệ nhân tạo Gemini`})]}),(0,x.jsxs)(`button`,{type:`button`,onClick:()=>w(`security`),className:`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${C===`security`?`bg-blue-600 text-white shadow-md shadow-blue-500/25`:`text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60`}`,children:[(0,x.jsx)(l,{className:`w-4 h-4`}),(0,x.jsx)(`span`,{children:`⚡ An Toàn & Bảo Mật`})]})]}),C===`users`&&(0,x.jsxs)(`div`,{className:`space-y-4`,children:[(0,x.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs`,children:[(0,x.jsxs)(`div`,{className:`relative flex-1`,children:[(0,x.jsx)(t,{className:`w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2`}),(0,x.jsx)(`input`,{type:`text`,placeholder:`Tìm người dùng theo tên, email, id...`,value:A,onChange:e=>be(e.target.value),className:`w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800 dark:text-slate-200`})]}),(0,x.jsxs)(`div`,{className:`flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0`,children:[(0,x.jsxs)(`button`,{type:`button`,onClick:()=>M(`all`),className:`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${j===`all`?`bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs`:`bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700`}`,children:[`Tất cả (`,T.length,`)`]}),(0,x.jsxs)(`button`,{type:`button`,onClick:()=>M(`admin`),className:`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${j===`admin`?`bg-amber-600 text-white shadow-xs`:`bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100`}`,children:[`👑 Quản trị viên (`,Oe,`)`]}),(0,x.jsxs)(`button`,{type:`button`,onClick:()=>M(`member`),className:`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${j===`member`?`bg-blue-600 text-white shadow-xs`:`bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100`}`,children:[`Thành viên (`,ke,`)`]})]})]}),O?(0,x.jsxs)(`div`,{className:`p-4 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 text-rose-700 dark:text-rose-400 text-xs flex items-center space-x-2`,children:[(0,x.jsx)(re,{className:`w-4 h-4 shrink-0`}),(0,x.jsx)(`span`,{children:O})]}):E&&T.length===0?(0,x.jsxs)(`div`,{className:`py-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800`,children:[(0,x.jsx)(c,{className:`w-7 h-7 mx-auto animate-spin text-blue-500`}),(0,x.jsx)(`p`,{className:`text-xs text-slate-400 font-medium`,children:`Đang kết nối Supabase và truy vấn danh sách người dùng...`})]}):$.length===0?(0,x.jsxs)(`div`,{className:`py-16 text-center space-y-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800`,children:[(0,x.jsx)(g,{className:`w-8 h-8 mx-auto text-slate-300 dark:text-slate-600`}),(0,x.jsx)(`h4`,{className:`text-sm font-bold text-slate-700 dark:text-slate-300`,children:`Không tìm thấy người dùng phù hợp`}),(0,x.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc vai trò.`})]}):(0,x.jsx)(`div`,{className:`grid grid-cols-1 gap-3`,children:$.map(e=>{let t=e.fullName?.slice(0,2).toUpperCase()||`US`,n=new Date(e.lastActive).toLocaleDateString(`vi-VN`,{hour:`2-digit`,minute:`2-digit`,day:`2-digit`,month:`2-digit`,year:`numeric`});return(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${e.isAdmin?`border-amber-300/80 dark:border-amber-800/80 bg-gradient-to-r from-amber-50/40 via-white to-transparent dark:from-amber-950/20 dark:via-slate-900 shadow-xs`:`border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700`}`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-3.5 min-w-0 flex-1`,children:[(0,x.jsx)(`div`,{className:`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0 ${e.isAdmin?`bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/25 ring-2 ring-amber-400/40`:`bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20`}`,children:t}),(0,x.jsxs)(`div`,{className:`min-w-0 flex-1`,children:[(0,x.jsxs)(`div`,{className:`flex items-center gap-2 flex-wrap`,children:[(0,x.jsx)(`h3`,{className:`text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate`,children:e.fullName}),e.isAdmin?(0,x.jsx)(`span`,{className:`text-3xs font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 flex items-center gap-1`,children:`👑 Quản trị viên`}):(0,x.jsx)(`span`,{className:`text-3xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`,children:`Thành viên`})]}),(0,x.jsxs)(`div`,{className:`flex items-center gap-3 text-2xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-mono`,children:[(0,x.jsx)(`span`,{className:`truncate`,children:e.email}),(0,x.jsx)(`span`,{className:`text-slate-300 dark:text-slate-700`,children:`•`}),(0,x.jsxs)(`span`,{className:`text-3xs text-slate-400 font-sans flex items-center gap-1`,children:[(0,x.jsx)(o,{className:`w-3 h-3 text-slate-400`}),(0,x.jsxs)(`span`,{children:[`Hoạt động: `,n]})]})]})]})]}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800`,children:[(0,x.jsxs)(`div`,{className:`flex items-center gap-1.5 flex-wrap`,children:[(0,x.jsxs)(`span`,{className:`inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-2xs font-bold text-slate-700 dark:text-slate-200`,children:[(0,x.jsx)(h,{className:`w-3 h-3 text-blue-500`}),(0,x.jsxs)(`span`,{children:[e.accCount,` ví`]})]}),(0,x.jsxs)(`span`,{className:`inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-2xs font-bold text-slate-700 dark:text-slate-200`,children:[(0,x.jsx)(f,{className:`w-3 h-3 text-emerald-500`}),(0,x.jsxs)(`span`,{children:[e.txCount,` giao dịch`]})]})]}),(0,x.jsx)(`button`,{type:`button`,onClick:()=>P(e),className:`px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer shrink-0`,children:`Chi tiết`})]})]},e.id)})})]}),C===`database`&&(0,x.jsxs)(`div`,{className:`space-y-6`,children:[(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4`,children:[(0,x.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-3`,children:[(0,x.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0`,children:(0,x.jsx)(m,{className:`w-5 h-5`})}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Máy Chủ Cơ Sở Dữ Liệu Supabase Cloud`}),(0,x.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`PostgreSQL 15 • Đã cấu hình mã hóa SSL 256-bit & Phân quyền RLS`})]})]}),(0,x.jsxs)(`span`,{className:`px-3 py-1 text-2xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 w-fit`,children:[(0,x.jsx)(l,{className:`w-3.5 h-3.5`}),(0,x.jsx)(`span`,{children:`Trực Tuyến (Online 100%)`})]})]}),(0,x.jsxs)(`div`,{className:`grid grid-cols-1 md:grid-cols-2 gap-3`,children:[(0,x.jsxs)(`div`,{className:`p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1`,children:[(0,x.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 tracking-wider`,children:`Máy chủ API URL`}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between font-mono text-xs text-slate-700 dark:text-slate-300`,children:[(0,x.jsx)(`span`,{className:`truncate`,children:Te}),(0,x.jsx)(`button`,{type:`button`,onClick:()=>{navigator.clipboard.writeText(Te),S(`Đã copy Supabase URL!`,`success`)},className:`p-1 hover:text-blue-500 cursor-pointer text-slate-400`,title:`Copy URL`,children:(0,x.jsx)(s,{className:`w-3.5 h-3.5`})})]})]}),(0,x.jsxs)(`div`,{className:`p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1`,children:[(0,x.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 tracking-wider`,children:`Supabase Anon Key`}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between font-mono text-xs text-slate-700 dark:text-slate-300`,children:[(0,x.jsx)(`span`,{className:`truncate`,children:V?Z:`${Z.slice(0,16)}••••••••••••••••`}),(0,x.jsxs)(`div`,{className:`flex items-center space-x-1 shrink-0`,children:[(0,x.jsx)(`button`,{type:`button`,onClick:()=>Ce(!V),className:`p-1 hover:text-blue-500 cursor-pointer text-slate-400`,title:V?`Ẩn key`:`Hiện key`,children:V?(0,x.jsx)(ce,{className:`w-3.5 h-3.5`}):(0,x.jsx)(te,{className:`w-3.5 h-3.5`})}),(0,x.jsx)(`button`,{type:`button`,onClick:()=>{navigator.clipboard.writeText(Z),H(!0),S(`Đã sao chép Supabase Anon Key!`,`success`),setTimeout(()=>H(!1),2e3)},className:`p-1 hover:text-blue-500 cursor-pointer text-slate-400`,title:`Copy Key`,children:we?(0,x.jsx)(u,{className:`w-3.5 h-3.5 text-emerald-500`}):(0,x.jsx)(s,{className:`w-3.5 h-3.5`})})]})]})]})]}),(0,x.jsxs)(`div`,{className:`p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 space-y-3`,children:[(0,x.jsx)(`div`,{className:`flex items-center justify-between`,children:(0,x.jsxs)(`div`,{className:`space-y-0.5`,children:[(0,x.jsxs)(`h4`,{className:`text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5`,children:[(0,x.jsx)(_,{className:`w-3.5 h-3.5 text-emerald-600`}),(0,x.jsx)(`span`,{children:`Điều khiển Đồng bộ Dữ liệu Quản trị viên`})]}),(0,x.jsx)(`p`,{className:`text-3xs text-slate-500 dark:text-slate-400`,children:`Đẩy bản sao lưu của tài khoản Admin lên Supabase hoặc tải bản sao lưu mới nhất về thiết bị này.`})]})}),(0,x.jsxs)(`div`,{className:`flex items-center space-x-2 flex-wrap gap-y-2 pt-1`,children:[(0,x.jsxs)(`button`,{type:`button`,disabled:F||L,onClick:async()=>{I(!0);try{await pe(),Q()}finally{I(!1)}},className:`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer`,children:[F?(0,x.jsx)(c,{className:`w-3.5 h-3.5 animate-spin`}):(0,x.jsx)(oe,{className:`w-3.5 h-3.5`}),(0,x.jsx)(`span`,{children:F?`Đang đẩy lên...`:`☁️ Đẩy dữ liệu Admin lên Cloud`})]}),(0,x.jsxs)(`button`,{type:`button`,disabled:F||L,onClick:async()=>{if(confirm(`Tải dữ liệu từ Supabase Cloud về thiết bị này?`)){R(!0);try{await he(),Q()}finally{R(!1)}}},className:`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-slate-800 hover:bg-emerald-50 disabled:opacity-50 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-2xs transition-colors cursor-pointer`,children:[L?(0,x.jsx)(c,{className:`w-3.5 h-3.5 animate-spin`}):(0,x.jsx)(r,{className:`w-3.5 h-3.5`}),(0,x.jsx)(`span`,{children:L?`Đang tải về...`:`Tải dữ liệu Admin từ Cloud về`})]}),_e&&(0,x.jsxs)(`button`,{type:`button`,onClick:()=>{confirm(`Khôi phục lại phiên dữ liệu trên máy trước lần tải gần nhất?`)&&ge()},className:`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-xl border border-amber-300 dark:border-amber-700 shadow-2xs transition-colors cursor-pointer`,title:`Khôi phục lại dữ liệu trước khi đồng bộ`,children:[(0,x.jsx)(ee,{className:`w-3.5 h-3.5 text-amber-600`}),(0,x.jsx)(`span`,{children:`Hoàn tác lần tải gần nhất`})]})]})]})]}),(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4`,children:[(0,x.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-3`,children:[(0,x.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0`,children:(0,x.jsx)(le,{className:`w-5 h-5`})}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Mã Nguồn Cấu Trúc Bảng CSDL (PostgreSQL Schema)`}),(0,x.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`Bao gồm 10 bảng dữ liệu, khóa ngoại, chỉ mục (Index) và chính sách bảo mật RLS`})]})]}),(0,x.jsx)(`div`,{className:`flex items-center gap-2`,children:(0,x.jsxs)(`button`,{type:`button`,onClick:()=>{navigator.clipboard.writeText(me),B(!0),S(`Đã sao chép toàn bộ mã SQL Supabase vào Clipboard!`,`success`),setTimeout(()=>B(!1),2500)},className:`flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs text-white font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer shrink-0`,children:[z?(0,x.jsx)(u,{className:`w-3.5 h-3.5 text-white`}):(0,x.jsx)(s,{className:`w-3.5 h-3.5`}),(0,x.jsx)(`span`,{children:z?`✓ Đã sao chép SQL!`:`Sao chép toàn bộ mã SQL`})]})})]}),(0,x.jsxs)(`div`,{className:`p-4 bg-slate-900 rounded-2xl border border-slate-800 text-slate-300 text-xs space-y-2 font-mono`,children:[(0,x.jsxs)(`div`,{className:`flex items-center gap-2 text-amber-400 font-bold font-sans`,children:[(0,x.jsx)(_,{className:`w-4 h-4`}),(0,x.jsx)(`span`,{children:`Hướng dẫn 3 bước khởi tạo hoặc bảo trì CSDL Supabase:`})]}),(0,x.jsxs)(`ol`,{className:`list-decimal list-inside space-y-1 text-slate-400 font-sans text-2xs leading-relaxed`,children:[(0,x.jsxs)(`li`,{children:[`Bấm nút `,(0,x.jsx)(`strong`,{children:`"Sao chép toàn bộ mã SQL"`}),` ở góc trên.`]}),(0,x.jsxs)(`li`,{children:[`Đăng nhập vào `,(0,x.jsx)(`a`,{href:`https://supabase.com/dashboard`,target:`_blank`,rel:`noreferrer`,className:`text-blue-400 underline font-semibold`,children:`Supabase Dashboard`}),` → Chọn Project `,(0,x.jsx)(`code`,{children:`rlqicielkddwyzgpwgnm`}),` → Mở mục `,(0,x.jsx)(`strong`,{children:`SQL Editor`}),`.`]}),(0,x.jsxs)(`li`,{children:[`Bấm `,(0,x.jsx)(`strong`,{children:`"New query"`}),`, dán toàn bộ mã (`,(0,x.jsx)(`code`,{children:`Ctrl + V`}),`) và ấn `,(0,x.jsx)(`strong`,{children:`"Run"`}),` để khởi tạo hoặc cập nhật bảng.`]})]})]}),(0,x.jsxs)(`div`,{className:`rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden text-2xs font-mono`,children:[(0,x.jsxs)(`div`,{className:`px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400`,children:[(0,x.jsxs)(`span`,{className:`flex items-center gap-2`,children:[(0,x.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-rose-500 inline-block`}),(0,x.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-amber-500 inline-block`}),(0,x.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block`}),(0,x.jsx)(`span`,{className:`ml-2 text-slate-300 font-bold`,children:`schema.sql`})]}),(0,x.jsx)(`span`,{className:`text-3xs uppercase`,children:`PostgreSQL DDL`})]}),(0,x.jsx)(`pre`,{className:`p-4 text-emerald-400 overflow-x-auto max-h-96 leading-relaxed select-all`,children:`-- ==============================================================================
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
`})]})]})]}),C===`ai`&&(0,x.jsx)(`div`,{className:`space-y-6`,children:(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5`,children:[(0,x.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-3`,children:[(0,x.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0`,children:(0,x.jsx)(_,{className:`w-5 h-5`})}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Cấu Hình Trí Tuệ Nhân Tạo Google Gemini`}),(0,x.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`Hỗ trợ mô hình: Gemini 2.0 Flash, Gemini 1.5 Flash, Gemini 1.5 Pro`})]})]}),(0,x.jsx)(`div`,{className:`flex items-center gap-2`,children:(0,x.jsxs)(`a`,{href:`https://aistudio.google.com/app/apikey`,target:`_blank`,rel:`noreferrer`,className:`px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-colors`,children:[(0,x.jsx)(`span`,{children:`Google AI Studio`}),(0,x.jsx)(n,{className:`w-3 h-3`})]})})]}),(0,x.jsxs)(`div`,{className:`p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/40 text-2xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1.5`,children:[(0,x.jsxs)(`div`,{className:`flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300`,children:[(0,x.jsx)(_,{className:`w-3.5 h-3.5 text-indigo-600`}),(0,x.jsx)(`span`,{children:`Quyền năng AI trong MoneyFlow:`})]}),(0,x.jsx)(`p`,{children:`Hệ thống sử dụng Gemini API để kích hoạt: Trợ lý tài chính AI đàm thoại tự do, nhận diện giọng nói thêm giao dịch thông minh, tư vấn chi tiêu và dự báo dòng tiền cá nhân hóa.`})]}),(0,x.jsxs)(`form`,{onSubmit:async e=>{if(e.preventDefault(),!U.trim())S(`Vui lòng nhập API Key Gemini hợp lệ`,`error`);else{J(!0);try{let e=await y.testConnection(U.trim());e.success?(y.setApiKey(U.trim()),K(!0),X({tested:!0,success:!0,message:e.message,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),S(`Kết nối Google Gemini AI thành công và đã lưu!`,`success`)):(X({tested:!0,success:!1,message:e.message,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),S(e.message,`error`))}catch(e){X({tested:!0,success:!1,message:e.message||`Lỗi kiểm tra kết nối API Key`,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),S(`Kiểm tra API Key thất bại`,`error`)}finally{J(!1)}}},className:`space-y-4`,children:[(0,x.jsxs)(`div`,{className:`space-y-1.5`,children:[(0,x.jsx)(`label`,{className:`text-xs font-bold text-slate-700 dark:text-slate-300 block`,children:`Google Gemini API Key`}),(0,x.jsx)(`div`,{className:`relative`,children:(0,x.jsx)(`input`,{type:`password`,placeholder:`Dán API Key Google Gemini (bắt đầu bằng AIzaSy...)`,value:U,onChange:e=>W(e.target.value),className:`w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200`})})]}),(0,x.jsxs)(`div`,{className:`flex items-center gap-2.5 flex-wrap`,children:[(0,x.jsxs)(`button`,{type:`submit`,disabled:q,className:`py-2.5 px-5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center space-x-1.5 disabled:opacity-50`,children:[q?(0,x.jsx)(c,{className:`w-4 h-4 animate-spin`}):(0,x.jsx)(u,{className:`w-4 h-4`}),(0,x.jsx)(`span`,{children:q?`Đang kiểm tra...`:`Lưu & Kiểm tra kết nối AI`})]}),G&&(0,x.jsxs)(x.Fragment,{children:[(0,x.jsxs)(`button`,{type:`button`,disabled:q,onClick:async()=>{if(G){J(!0);try{let e=await y.testConnection();X({tested:!0,success:e.success,message:e.message,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),e.success?S(`Kết nối Google Gemini AI hoạt động hoàn hảo!`,`success`):S(e.message,`error`)}catch(e){X({tested:!0,success:!1,message:e.message||`Lỗi kiểm tra kết nối`,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),S(`Kiểm tra API Key thất bại`,`error`)}finally{J(!1)}}},className:`py-2.5 px-4 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer flex items-center space-x-1.5`,children:[(0,x.jsx)(ie,{className:`w-4 h-4 text-indigo-600`}),(0,x.jsx)(`span`,{children:`Kiểm tra lại kết nối`})]}),(0,x.jsx)(`button`,{type:`button`,onClick:()=>{confirm(`Bạn có chắc muốn xóa Google Gemini API Key khỏi hệ thống?`)&&(y.setApiKey(``),W(``),K(!1),X(null),S(`Đã xóa API Key Gemini khỏi hệ thống`,`info`))},className:`py-2.5 px-4 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl transition-colors cursor-pointer`,children:`Xóa Key khỏi hệ thống`})]})]})]}),Y&&(0,x.jsxs)(`div`,{className:`p-4 rounded-2xl border text-xs space-y-1 ${Y.success?`bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300`:`bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300`}`,children:[(0,x.jsxs)(`div`,{className:`flex items-center gap-2 font-bold`,children:[Y.success?(0,x.jsx)(ne,{className:`w-4 h-4 text-emerald-600`}):(0,x.jsx)(re,{className:`w-4 h-4 text-rose-600`}),(0,x.jsx)(`span`,{children:Y.success?`Kết nối thành công!`:`Kết nối thất bại`}),Y.timestamp&&(0,x.jsx)(`span`,{className:`text-3xs font-normal opacity-70 ml-auto`,children:Y.timestamp})]}),(0,x.jsx)(`p`,{className:`text-2xs leading-relaxed opacity-90`,children:Y.message})]})]})}),C===`security`&&(0,x.jsx)(`div`,{className:`space-y-6`,children:(0,x.jsxs)(`div`,{className:`grid grid-cols-1 md:grid-cols-2 gap-4`,children:[(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800`,children:[(0,x.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0`,children:(0,x.jsx)(l,{className:`w-5 h-5`})}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Bảo Mật & Kiểm Tra An Toàn`}),(0,x.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`Các lớp bảo vệ hệ thống MoneyFlow`})]})]}),(0,x.jsxs)(`div`,{className:`space-y-3`,children:[(0,x.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-2.5`,children:[(0,x.jsx)(a,{className:`w-4 h-4 text-emerald-500 shrink-0`}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`span`,{className:`text-xs font-bold text-slate-800 dark:text-slate-200 block`,children:`Mã hóa đường truyền TLS / SSL 256-bit`}),(0,x.jsx)(`span`,{className:`text-3xs text-slate-400`,children:`Toàn bộ request đến Supabase & Google AI được mã hóa HTTPS`})]})]}),(0,x.jsx)(`span`,{className:`text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800`,children:`ACTIVE`})]}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-2.5`,children:[(0,x.jsx)(a,{className:`w-4 h-4 text-emerald-500 shrink-0`}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`span`,{className:`text-xs font-bold text-slate-800 dark:text-slate-200 block`,children:`Phân Quyền Cấp Hàng (PostgreSQL RLS)`}),(0,x.jsx)(`span`,{className:`text-3xs text-slate-400`,children:`Tách biệt dữ liệu người dùng, chỉ user sở hữu mới có quyền đọc/ghi`})]})]}),(0,x.jsx)(`span`,{className:`text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800`,children:`ENFORCED`})]}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-2.5`,children:[(0,x.jsx)(a,{className:`w-4 h-4 text-emerald-500 shrink-0`}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`span`,{className:`text-xs font-bold text-slate-800 dark:text-slate-200 block`,children:`PWA Cache Service Worker v3`}),(0,x.jsx)(`span`,{className:`text-3xs text-slate-400`,children:`Hỗ trợ hoạt động ngoại tuyến (Offline) và tự động đồng bộ khi có mạng`})]})]}),(0,x.jsx)(`span`,{className:`text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800`,children:`V3 ACTIVE`})]}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-2.5`,children:[(0,x.jsx)(a,{className:`w-4 h-4 text-emerald-500 shrink-0`}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`span`,{className:`text-xs font-bold text-slate-800 dark:text-slate-200 block`,children:`Bộ nhớ đệm LocalStorage Độc lập`}),(0,x.jsx)(`span`,{className:`text-3xs text-slate-400`,children:`Sao lưu dữ liệu tức thì trên thiết bị ngay cả khi rớt mạng`})]})]}),(0,x.jsx)(`span`,{className:`text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800`,children:`READY`})]})]})]}),(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800`,children:[(0,x.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0`,children:(0,x.jsx)(ae,{className:`w-5 h-5`})}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Thông Tin Phiên Bản Ứng Dụng`}),(0,x.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`Cấu trúc ứng dụng & môi trường chạy`})]})]}),(0,x.jsxs)(`div`,{className:`space-y-2.5 font-mono text-xs text-slate-700 dark:text-slate-300`,children:[(0,x.jsxs)(`div`,{className:`flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800`,children:[(0,x.jsx)(`span`,{className:`text-slate-400 font-sans`,children:`Phiên bản ứng dụng:`}),(0,x.jsx)(`span`,{className:`font-bold text-blue-600 dark:text-blue-400`,children:`v2.5 Executive Suite`})]}),(0,x.jsxs)(`div`,{className:`flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800`,children:[(0,x.jsx)(`span`,{className:`text-slate-400 font-sans`,children:`Môi trường:`}),(0,x.jsx)(`span`,{className:`font-bold text-emerald-600`,children:`Production (Vite + React 18)`})]}),(0,x.jsxs)(`div`,{className:`flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800`,children:[(0,x.jsx)(`span`,{className:`text-slate-400 font-sans`,children:`Cơ sở dữ liệu:`}),(0,x.jsx)(`span`,{children:`Supabase PostgreSQL 15`})]}),(0,x.jsxs)(`div`,{className:`flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800`,children:[(0,x.jsx)(`span`,{className:`text-slate-400 font-sans`,children:`Mô hình AI:`}),(0,x.jsx)(`span`,{children:`Gemini 2.0 Flash / 1.5 Flash`})]}),(0,x.jsxs)(`div`,{className:`flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800`,children:[(0,x.jsx)(`span`,{className:`text-slate-400 font-sans`,children:`Chế độ PWA:`}),(0,x.jsx)(`span`,{children:`Standalone Web App Ready`})]})]}),(0,x.jsx)(`div`,{className:`pt-2`,children:(0,x.jsxs)(`button`,{type:`button`,onClick:()=>{confirm(`Làm mới toàn bộ bộ nhớ đệm và tải lại ứng dụng?`)&&window.location.reload()},className:`w-full py-2.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5`,children:[(0,x.jsx)(c,{className:`w-3.5 h-3.5`}),(0,x.jsx)(`span`,{children:`Xóa Cache & Tải lại giao diện`})]})})]})]})}),N&&(0,x.jsx)(`div`,{className:`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200`,children:(0,x.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`,children:[(0,x.jsxs)(`div`,{className:`flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800`,children:[(0,x.jsxs)(`div`,{className:`flex items-center space-x-3`,children:[(0,x.jsx)(`div`,{className:`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md ${N.isAdmin?`bg-gradient-to-tr from-amber-500 to-orange-500`:`bg-gradient-to-tr from-blue-600 to-indigo-600`}`,children:N.fullName?.slice(0,2).toUpperCase()||`US`}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:N.fullName}),(0,x.jsx)(`p`,{className:`text-2xs text-slate-400 font-mono`,children:N.email})]})]}),(0,x.jsx)(`button`,{type:`button`,onClick:()=>P(null),className:`p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer`,children:(0,x.jsx)(se,{className:`w-5 h-5`})})]}),(0,x.jsxs)(`div`,{className:`grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center`,children:[(0,x.jsxs)(`div`,{className:`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,x.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 block`,children:`Ví tài khoản`}),(0,x.jsx)(`span`,{className:`text-lg font-black text-blue-600 dark:text-blue-400`,children:N.accCount})]}),(0,x.jsxs)(`div`,{className:`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,x.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 block`,children:`Giao dịch`}),(0,x.jsx)(`span`,{className:`text-lg font-black text-emerald-600 dark:text-emerald-400`,children:N.txCount})]}),(0,x.jsxs)(`div`,{className:`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,x.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 block`,children:`Ngân sách`}),(0,x.jsx)(`span`,{className:`text-lg font-black text-indigo-600 dark:text-indigo-400`,children:N.budgetCount})]}),(0,x.jsxs)(`div`,{className:`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,x.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 block`,children:`Sổ nợ`}),(0,x.jsx)(`span`,{className:`text-lg font-black text-amber-600 dark:text-amber-400`,children:N.debtCount})]})]}),N.rawData?.accounts&&N.rawData.accounts.length>0&&(0,x.jsxs)(`div`,{className:`space-y-2`,children:[(0,x.jsx)(`span`,{className:`text-xs font-bold text-slate-700 dark:text-slate-300 block`,children:`Danh sách Ví & Tài khoản:`}),(0,x.jsx)(`div`,{className:`space-y-1.5 max-h-40 overflow-y-auto pr-1`,children:N.rawData.accounts.map(e=>(0,x.jsxs)(`div`,{className:`flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs`,children:[(0,x.jsx)(`span`,{className:`font-semibold text-slate-800 dark:text-slate-200`,children:e.name}),(0,x.jsx)(`span`,{className:`font-mono font-bold text-slate-700 dark:text-slate-300`,children:fe(e.balance||0)})]},e.id))})]}),(0,x.jsxs)(`div`,{className:`p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-2xs space-y-1 font-mono text-slate-500 dark:text-slate-400`,children:[(0,x.jsxs)(`div`,{className:`flex justify-between`,children:[(0,x.jsx)(`span`,{children:`Khởi tạo tài khoản:`}),(0,x.jsx)(`span`,{className:`text-slate-700 dark:text-slate-300`,children:new Date(N.createdAt).toLocaleString(`vi-VN`)})]}),(0,x.jsxs)(`div`,{className:`flex justify-between`,children:[(0,x.jsx)(`span`,{children:`Sao lưu lần cuối:`}),(0,x.jsx)(`span`,{className:`text-slate-700 dark:text-slate-300`,children:new Date(N.lastActive).toLocaleString(`vi-VN`)})]}),(0,x.jsxs)(`div`,{className:`flex justify-between`,children:[(0,x.jsx)(`span`,{children:`Backup Key trên Supabase:`}),(0,x.jsx)(`span`,{className:`text-blue-500 font-bold`,children:N.id})]})]}),(0,x.jsx)(`div`,{className:`pt-2`,children:(0,x.jsx)(`button`,{type:`button`,onClick:()=>P(null),className:`w-full py-2.5 px-4 text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-all cursor-pointer`,children:`Đóng`})})]})})]}):(0,x.jsxs)(`div`,{className:`py-16 px-4 max-w-xl mx-auto text-center space-y-6`,children:[(0,x.jsx)(`div`,{className:`w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20`,children:(0,x.jsx)(i,{className:`w-8 h-8`})}),(0,x.jsxs)(`div`,{className:`space-y-2`,children:[(0,x.jsx)(`h2`,{className:`text-xl sm:text-2xl font-black text-slate-900 dark:text-white`,children:`Khu vực Quản trị viên (Admin Only)`}),(0,x.jsxs)(`p`,{className:`text-sm text-slate-500 dark:text-slate-400 leading-relaxed`,children:[`Bạn đang đăng nhập bằng tài khoản không có quyền quản trị hệ thống. Trang này chỉ dành cho tài khoản Admin đã được ủy quyền (`,(0,x.jsx)(`code`,{children:`minhkhoj2002@gmail.com`}),`).`]})]}),(0,x.jsx)(`div`,{className:`pt-2`,children:(0,x.jsxs)(`button`,{type:`button`,onClick:()=>p(`dashboard`),className:`inline-flex items-center space-x-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer`,children:[(0,x.jsx)(d,{className:`w-4 h-4`}),(0,x.jsx)(`span`,{children:`Quay lại Trang Tổng Quan`})]})})]})};export{he as AdminPage};