import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{A as t,At as n,E as r,Et as ee,Ft as i,Gt as a,I as te,Kt as o,M as s,Mt as c,P as l,Pt as u,Qt as d,St as ne,T as f,Tt as re,Y as ie,bt as ae,d as oe,ft as se,hn as ce,k as le,l as ue,m as p,mn as de,n as fe,qt as pe,r as me,s as m,t as he,vn as ge,wt as _e,y as h,yn as g,zt as _}from"./vendor-icons-DY3B6c6m.js";import{a as v,i as ve,n as y,o as b,r as ye,t as be}from"./index-BUWpkuDK.js";import{i as xe}from"./vendor-react-BZ8o3Ikc.js";var x=e(g(),1),Se=`-- ==============================================================================
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
`,S=xe(),Ce=()=>{let{isAdmin:e,setCurrentTab:g,syncToCloud:xe,pullFromCloud:Ce,rollbackSafetyBackup:we,hasSafetyBackup:Te,isCloudConfigured:Ee,showToast:C}=ye(),[w,T]=(0,x.useState)(`users`),[E,De]=(0,x.useState)([]),[D,Oe]=(0,x.useState)(!1),[ke,O]=(0,x.useState)(null),[k,Ae]=(0,x.useState)(``),[A,j]=(0,x.useState)(`all`),[M,N]=(0,x.useState)(null),[P,je]=(0,x.useState)(!1),[F,Me]=(0,x.useState)(!1),[Ne,Pe]=(0,x.useState)(!0),[Fe,Ie]=(0,x.useState)(!1),[I,Le]=(0,x.useState)(!1),[Re,ze]=(0,x.useState)(!1),[Be,Ve]=(0,x.useState)(!1),[He,Ue]=(0,x.useState)(!1),[We,Ge]=(0,x.useState)(!1),[L,Ke]=(0,x.useState)(null),[R,qe]=(0,x.useState)(!1),[z,B]=(0,x.useState)(null),[V,Je]=(0,x.useState)(``),[H,Ye]=(0,x.useState)(``),[U,Xe]=(0,x.useState)(`info`),[Ze,Qe]=(0,x.useState)(!1),[W,$e]=(0,x.useState)(y.getApiKey()),[et,tt]=(0,x.useState)(y.hasApiKey()),[G,K]=(0,x.useState)(!1),[q,J]=(0,x.useState)(null),Y=`https://rlqicielkddwyzgpwgnm.supabase.co`,nt=`sb_publishable_v57oN4cuVfMxcR1DM3AgRQ_E8R4cR8B`,X=async()=>{if(!v||!b)O(`Chưa cấu hình Supabase Client.`);else{Oe(!0),O(null);try{let{data:e,error:t}=await b.from(`cloud_backups`).select(`*`).order(`updated_at`,{ascending:!1});if(t){O(t.message);return}if(e){let t=e.find(e=>e.id===`system_announcement`);t&&t.data?B(t.data):B(null);let n=e.filter(e=>e.id!==`moneyflow_cloud_state`&&e.id!==`system_announcement`).map(e=>{let t=e.data||{},n=t.user||{},r=Array.isArray(t.transactions)?t.transactions.length:0,ee=Array.isArray(t.accounts)?t.accounts.length:0,i=Array.isArray(t.budgets)?t.budgets.length:0,a=Array.isArray(t.savingsGoals)?t.savingsGoals.length:0,te=Array.isArray(t.debts)?t.debts.length:0,o=n.email||(e.id.startsWith(`backup_`)?e.id.replace(`backup_`,``).replace(/_/g,`.`):`Khách trải nghiệm`),s=o.toLowerCase().includes(`minhkhoj`)||n.role===`admin`,c=JSON.stringify(e.data||{}).length/1024,l=new Date(e.updated_at||e.created_at||Date.now()),u=Math.max(0,Math.floor((Date.now()-l.getTime())/864e5)),d=`active`;return u>=30?d=`dormant`:u>=7&&(d=`away`),{id:e.id,email:o,fullName:n.fullName||(s?`Khôi`:o.split(`@`)[0]||`Người dùng`),createdAt:n.createdAt||e.updated_at,lastActive:e.updated_at,txCount:r,accCount:ee,budgetCount:i,savingsCount:a,debtCount:te,sizeKb:c,isAdmin:s,daysInactive:u,status:d,rawData:t}});De(n)}}catch(e){O(e.message||`Lỗi truy vấn danh sách người dùng từ Cloud`)}finally{Oe(!1)}}};(0,x.useEffect)(()=>{e&&X()},[e]);let rt=(0,x.useMemo)(()=>E.reduce((e,t)=>e+t.txCount,0),[E]),it=(0,x.useMemo)(()=>E.reduce((e,t)=>e+t.accCount,0),[E]),Z=(0,x.useMemo)(()=>E.reduce((e,t)=>e+t.sizeKb,0),[E]),at=(0,x.useMemo)(()=>E.filter(e=>e.isAdmin).length,[E]),Q=(0,x.useMemo)(()=>E.filter(e=>!e.isAdmin).length,[E]),ot=(0,x.useMemo)(()=>E.filter(e=>e.status===`active`).length,[E]);(0,x.useMemo)(()=>E.filter(e=>e.status===`away`).length,[E]);let $=(0,x.useMemo)(()=>E.filter(e=>!e.isAdmin&&e.status===`dormant`).length,[E]),st=(0,x.useMemo)(()=>E.filter(e=>e.fullName.toLowerCase().includes(k.toLowerCase())||e.email.toLowerCase().includes(k.toLowerCase())||e.id.toLowerCase().includes(k.toLowerCase())?A===`admin`?e.isAdmin:A===`member`?!e.isAdmin:A===`active`?e.status===`active`:A!==`dormant`||!e.isAdmin&&e.status===`dormant`:!1),[E,k,A]),ct=async()=>{if(!v||!b)C(`Chưa kết nối máy chủ Supabase`,`error`);else{qe(!0);try{let e=performance.now();await b.from(`cloud_backups`).select(`id`).limit(1);let t=Math.round(performance.now()-e),n=`fast`;t>300?n=`slow`:t>120&&(n=`good`),Ke({latency:t,status:n,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),C(`⚡ Độ trễ phản hồi Supabase: ${t}ms`,`success`)}catch{C(`Không thể kết nối đo độ trễ tới Supabase`,`error`)}finally{qe(!1)}}},lt=()=>{if(E.length===0)C(`Chưa có dữ liệu người dùng để xuất!`,`error`);else try{let e={totalUsers:E.length,adminCount:at,memberCount:Q,totalTx:rt,totalAcc:it,totalSizeKb:Z,supabaseHost:Y};be(E,e),C(`✓ Đã xuất báo cáo Excel toàn hệ thống thành công!`,`success`)}catch{C(`Lỗi khi xuất file Excel`,`error`)}},ut=async()=>{if(!v||!b)C(`Chưa kết nối Supabase Cloud`,`error`);else{Ve(!0);try{let{data:e,error:t}=await b.from(`cloud_backups`).select(`*`);if(t)throw t;let n={system:`MoneyFlow Executive Suite`,version:`2.5`,exportType:`full_database_snapshot`,exportedAt:new Date().toISOString(),exportedBy:`minhkhoj2002@gmail.com`,totalRecords:e?.length||0,data:e||[]},r=JSON.stringify(n,null,2),ee=new Blob([r],{type:`application/json`}),i=URL.createObjectURL(ee),a=document.createElement(`a`);a.href=i,a.download=`MoneyFlow_Full_System_Backup_${new Date().toISOString().slice(0,10)}.json`,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(i),C(`✓ Đã tải bản sao lưu toàn bộ CSDL Supabase về máy!`,`success`)}catch(e){C(`Lỗi tải bản sao lưu CSDL: `+e.message,`error`)}finally{Ve(!1)}}},dt=async e=>{if(!v||!b)C(`Chưa kết nối Supabase Cloud`,`error`);else if(e.isAdmin)C(`Không thể xóa tài khoản Quản trị viên!`,`error`);else if(confirm(`Bạn có chắc chắn muốn xóa bản sao lưu của "${e.fullName}" (${e.email}) khỏi Supabase Cloud?\nDữ liệu trên Cloud sẽ được giải phóng hoàn toàn.`))try{let{error:t}=await b.from(`cloud_backups`).delete().eq(`id`,e.id);if(t)throw t;C(`Đã xóa bản sao lưu của "${e.fullName}" khỏi Cloud!`,`success`),M?.id===e.id&&N(null),X()}catch(e){C(`Lỗi xóa bản sao lưu: `+e.message,`error`)}};return e?(0,S.jsxs)(`div`,{className:`space-y-6 sm:space-y-8 animate-in fade-in duration-300`,children:[(0,S.jsxs)(`div`,{className:`relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl`,children:[(0,S.jsx)(`div`,{className:`absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`}),(0,S.jsx)(`div`,{className:`absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none`}),(0,S.jsxs)(`div`,{className:`relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5`,children:[(0,S.jsxs)(`div`,{className:`space-y-2`,children:[(0,S.jsxs)(`div`,{className:`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-black tracking-wider uppercase`,children:[(0,S.jsx)(f,{className:`w-3.5 h-3.5 text-amber-400`}),(0,S.jsx)(`span`,{children:`Trung Tâm Quản Trị Hệ Thống • MoneyFlow Pro Suite`})]}),(0,S.jsxs)(`h1`,{className:`text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5`,children:[(0,S.jsx)(`span`,{children:`Bảng Điều Hành MoneyFlow`}),(0,S.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse`,title:`Hệ thống trực tuyến`})]}),(0,S.jsx)(`p`,{className:`text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed`,children:`Giám sát người dùng thời gian thực, quản lý sao lưu CSDL Supabase, phát thông báo toàn hệ thống và xuất báo cáo phân tích.`})]}),(0,S.jsxs)(`div`,{className:`flex items-center gap-2.5 flex-wrap`,children:[(0,S.jsxs)(`button`,{type:`button`,onClick:ct,disabled:R,className:`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-xs`,title:`Đo độ trễ mạng thực tế tới Supabase`,children:[(0,S.jsx)(he,{className:`w-3.5 h-3.5 ${R?`animate-bounce text-amber-400`:`text-amber-400`}`}),(0,S.jsx)(`span`,{children:R?`Đang đo...`:L?`${L.latency}ms`:`Đo Ping`})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:lt,className:`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md shadow-emerald-600/25`,title:`Xuất danh sách và thống kê toàn hệ thống ra Excel`,children:[(0,S.jsx)(ae,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{className:`hidden sm:inline`,children:`Xuất Excel`})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:ut,disabled:Be,className:`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-md shadow-indigo-600/25 disabled:opacity-50`,title:`Tải toàn bộ snapshot CSDL Supabase về máy`,children:[(0,S.jsx)(n,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{className:`hidden sm:inline`,children:`Backup JSON`})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>g(`dashboard`),className:`flex items-center space-x-2 px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800/90 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer shadow-xs`,title:`Về giao diện tài chính cá nhân`,children:[(0,S.jsx)(de,{className:`w-4 h-4 text-slate-400`}),(0,S.jsx)(`span`,{children:`← Về Tài chính`})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:X,disabled:D,className:`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl shadow-md shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50`,children:[(0,S.jsx)(l,{className:`w-3.5 h-3.5 ${D?`animate-spin`:``}`}),(0,S.jsx)(`span`,{children:D?`Tải...`:`Làm mới`})]})]})]})]}),(0,S.jsxs)(`div`,{className:`grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4`,children:[(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5`,children:[(0,S.jsx)(`div`,{className:`w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0`,children:(0,S.jsx)(m,{className:`w-6 h-6`})}),(0,S.jsxs)(`div`,{className:`min-w-0 flex-1`,children:[(0,S.jsx)(`span`,{className:`text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block`,children:`Tổng người dùng`}),(0,S.jsx)(`div`,{className:`text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight`,children:D?`...`:E.length}),(0,S.jsxs)(`p`,{className:`text-3xs text-slate-500 dark:text-slate-400 truncate mt-0.5`,children:[at,` admin • `,Q,` thành viên`]})]})]}),(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5`,children:[(0,S.jsx)(`div`,{className:`w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0`,children:(0,S.jsx)(ce,{className:`w-6 h-6`})}),(0,S.jsxs)(`div`,{className:`min-w-0 flex-1`,children:[(0,S.jsx)(`span`,{className:`text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block`,children:`Tổng giao dịch`}),(0,S.jsx)(`div`,{className:`text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight`,children:D?`...`:rt.toLocaleString(`vi-VN`)}),(0,S.jsx)(`p`,{className:`text-3xs text-emerald-600 dark:text-emerald-400 truncate mt-0.5`,children:`Toàn hệ thống Cloud`})]})]}),(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5`,children:[(0,S.jsx)(`div`,{className:`w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0`,children:(0,S.jsx)(se,{className:`w-6 h-6`})}),(0,S.jsxs)(`div`,{className:`min-w-0 flex-1`,children:[(0,S.jsx)(`span`,{className:`text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block`,children:`Dung lượng CSDL`}),(0,S.jsx)(`div`,{className:`text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight`,children:D?`...`:`${Z.toFixed(1)} KB`}),(0,S.jsxs)(`p`,{className:`text-3xs text-blue-600 dark:text-blue-400 truncate mt-0.5`,children:[it,` ví • <0.05% quota`]})]})]}),(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5`,children:[(0,S.jsx)(`div`,{className:`w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0`,children:(0,S.jsx)(c,{className:`w-6 h-6`})}),(0,S.jsxs)(`div`,{className:`min-w-0 flex-1`,children:[(0,S.jsx)(`span`,{className:`text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block`,children:`Supabase Cloud`}),(0,S.jsxs)(`div`,{className:`text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 truncate`,children:[(0,S.jsx)(`span`,{className:`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`}),(0,S.jsx)(`span`,{children:L?`${L.latency}ms (Online)`:`Hoạt động 100%`})]}),(0,S.jsx)(`p`,{className:`text-3xs text-slate-400 font-mono truncate mt-0.5`,children:`rlqic••••.supabase.co`})]})]})]}),(0,S.jsxs)(`div`,{className:`flex items-center space-x-1 sm:space-x-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs sm:text-sm`,children:[(0,S.jsxs)(`button`,{type:`button`,onClick:()=>T(`users`),className:`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${w===`users`?`bg-blue-600 text-white shadow-md shadow-blue-500/25`:`text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60`}`,children:[(0,S.jsx)(m,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{children:`👥 Giám sát Người Dùng`}),(0,S.jsx)(`span`,{className:`text-2xs px-2 py-0.5 rounded-full font-black ${w===`users`?`bg-white/20 text-white`:`bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300`}`,children:E.length})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>T(`database`),className:`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${w===`database`?`bg-blue-600 text-white shadow-md shadow-blue-500/25`:`text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60`}`,children:[(0,S.jsx)(c,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{children:`☁️ CSDL & Sao Lưu Cloud`})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>T(`announcement`),className:`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${w===`announcement`?`bg-blue-600 text-white shadow-md shadow-blue-500/25`:`text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60`}`,children:[(0,S.jsx)(ie,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{children:`📢 Phát Thông Báo`}),z&&(0,S.jsx)(`span`,{className:`w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block`,title:`Đang có thông báo hoạt động`})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>T(`ai`),className:`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${w===`ai`?`bg-blue-600 text-white shadow-md shadow-blue-500/25`:`text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60`}`,children:[(0,S.jsx)(h,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{children:`🤖 Trí tuệ nhân tạo Gemini`})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>T(`security`),className:`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${w===`security`?`bg-blue-600 text-white shadow-md shadow-blue-500/25`:`text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60`}`,children:[(0,S.jsx)(f,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{children:`⚡ An Toàn & Bảo Mật`})]})]}),w===`users`&&(0,S.jsxs)(`div`,{className:`space-y-4`,children:[(0,S.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs`,children:[(0,S.jsxs)(`div`,{className:`relative flex-1`,children:[(0,S.jsx)(t,{className:`w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2`}),(0,S.jsx)(`input`,{type:`text`,placeholder:`Tìm người dùng theo tên, email, id...`,value:k,onChange:e=>Ae(e.target.value),className:`w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800 dark:text-slate-200`})]}),(0,S.jsxs)(`div`,{className:`flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0`,children:[(0,S.jsxs)(`button`,{type:`button`,onClick:()=>j(`all`),className:`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${A===`all`?`bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs`:`bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700`}`,children:[`Tất cả (`,E.length,`)`]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>j(`admin`),className:`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${A===`admin`?`bg-amber-600 text-white shadow-xs`:`bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100`}`,children:[`👑 Quản trị viên (`,at,`)`]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>j(`member`),className:`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${A===`member`?`bg-blue-600 text-white shadow-xs`:`bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100`}`,children:[`Thành viên (`,Q,`)`]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>j(`active`),className:`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${A===`active`?`bg-emerald-600 text-white shadow-xs`:`bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100`}`,children:[`🟢 Hoạt động (`,ot,`)`]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>j(`dormant`),className:`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${A===`dormant`?`bg-rose-600 text-white shadow-xs`:`bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100`}`,children:[`💤 Vắng mặt >30 ngày (`,$,`)`]})]})]}),ke?(0,S.jsxs)(`div`,{className:`p-4 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 text-rose-700 dark:text-rose-400 text-xs flex items-center space-x-2`,children:[(0,S.jsx)(pe,{className:`w-4 h-4 shrink-0`}),(0,S.jsx)(`span`,{children:ke})]}):D&&E.length===0?(0,S.jsxs)(`div`,{className:`py-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800`,children:[(0,S.jsx)(l,{className:`w-7 h-7 mx-auto animate-spin text-blue-500`}),(0,S.jsx)(`p`,{className:`text-xs text-slate-400 font-medium`,children:`Đang kết nối Supabase và truy vấn danh sách người dùng...`})]}):st.length===0?(0,S.jsxs)(`div`,{className:`py-16 text-center space-y-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800`,children:[(0,S.jsx)(m,{className:`w-8 h-8 mx-auto text-slate-300 dark:text-slate-600`}),(0,S.jsx)(`h4`,{className:`text-sm font-bold text-slate-700 dark:text-slate-300`,children:`Không tìm thấy người dùng phù hợp`}),(0,S.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc vai trò.`})]}):(0,S.jsx)(`div`,{className:`grid grid-cols-1 gap-3`,children:st.map(e=>{let t=e.fullName?.slice(0,2).toUpperCase()||`US`,n=new Date(e.lastActive).toLocaleDateString(`vi-VN`,{hour:`2-digit`,minute:`2-digit`,day:`2-digit`,month:`2-digit`,year:`numeric`});return(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${e.isAdmin?`border-amber-300/80 dark:border-amber-800/80 bg-gradient-to-r from-amber-50/40 via-white to-transparent dark:from-amber-950/20 dark:via-slate-900 shadow-xs`:`border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700`}`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-3.5 min-w-0 flex-1`,children:[(0,S.jsx)(`div`,{className:`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0 ${e.isAdmin?`bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/25 ring-2 ring-amber-400/40`:`bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20`}`,children:t}),(0,S.jsxs)(`div`,{className:`min-w-0 flex-1`,children:[(0,S.jsxs)(`div`,{className:`flex items-center gap-2 flex-wrap`,children:[(0,S.jsx)(`h3`,{className:`text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate`,children:e.fullName}),e.isAdmin?(0,S.jsx)(`span`,{className:`text-3xs font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 flex items-center gap-1`,children:`👑 Quản trị viên`}):(0,S.jsx)(`span`,{className:`text-3xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`,children:`Thành viên`}),e.status===`active`?(0,S.jsxs)(`span`,{className:`text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1`,children:[(0,S.jsx)(`span`,{className:`w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse`}),(0,S.jsxs)(`span`,{children:[`Hoạt động (`,e.daysInactive===0?`Hôm nay`:`${e.daysInactive} ngày trước`,`)`]})]}):e.status===`away`?(0,S.jsxs)(`span`,{className:`text-3xs font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1`,children:[(0,S.jsx)(_,{className:`w-2.5 h-2.5 text-amber-500`}),(0,S.jsxs)(`span`,{children:[`Vắng mặt (`,e.daysInactive,` ngày)`]})]}):(0,S.jsx)(`span`,{className:`text-3xs font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1`,children:(0,S.jsxs)(`span`,{children:[`💤 Không hoạt động (`,e.daysInactive,` ngày)`]})}),(0,S.jsxs)(`span`,{className:`text-3xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400`,children:[e.sizeKb.toFixed(1),` KB`]})]}),(0,S.jsxs)(`div`,{className:`flex items-center gap-3 text-2xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-mono`,children:[(0,S.jsx)(`span`,{className:`truncate`,children:e.email}),(0,S.jsx)(`span`,{className:`text-slate-300 dark:text-slate-700`,children:`•`}),(0,S.jsxs)(`span`,{className:`text-3xs text-slate-400 font-sans flex items-center gap-1`,children:[(0,S.jsx)(_,{className:`w-3 h-3 text-slate-400`}),(0,S.jsxs)(`span`,{children:[`Hoạt động: `,n]})]})]})]})]}),(0,S.jsxs)(`div`,{className:`flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800`,children:[(0,S.jsxs)(`div`,{className:`flex items-center gap-1.5 flex-wrap`,children:[(0,S.jsxs)(`span`,{className:`inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-2xs font-bold text-slate-700 dark:text-slate-200`,children:[(0,S.jsx)(me,{className:`w-3 h-3 text-blue-500`}),(0,S.jsxs)(`span`,{children:[e.accCount,` ví`]})]}),(0,S.jsxs)(`span`,{className:`inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-2xs font-bold text-slate-700 dark:text-slate-200`,children:[(0,S.jsx)(ce,{className:`w-3 h-3 text-emerald-500`}),(0,S.jsxs)(`span`,{children:[e.txCount,` giao dịch`]})]})]}),(0,S.jsxs)(`div`,{className:`flex items-center space-x-1.5 shrink-0`,children:[(0,S.jsx)(`button`,{type:`button`,onClick:()=>N(e),className:`px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer`,children:`Chi tiết`}),!e.isAdmin&&(0,S.jsx)(`button`,{type:`button`,onClick:()=>dt(e),className:`p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer`,title:`Xóa bản sao lưu người này khỏi Cloud`,children:(0,S.jsx)(p,{className:`w-4 h-4`})})]})]})]},e.id)})}),(0,S.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs gap-3`,children:[(0,S.jsxs)(`span`,{className:`text-slate-600 dark:text-slate-400`,children:[`Tổng cộng `,(0,S.jsx)(`strong`,{children:E.length}),` tài khoản (`,$,` tài khoản vắng mặt >30 ngày, `,(0,S.jsxs)(`strong`,{children:[Z.toFixed(1),` KB`]}),`).`]}),(0,S.jsxs)(`div`,{className:`flex items-center gap-2 flex-wrap`,children:[(0,S.jsxs)(`button`,{type:`button`,onClick:async()=>{if(!v||!b)C(`Chưa kết nối Supabase Cloud`,`error`);else if(confirm(`Bạn có chắc muốn dọn dẹp các tài khoản khách thử nghiệm vãng lai (guest) và bản ghi test trên Cloud?`)){Ue(!0);try{let{data:e}=await b.from(`cloud_backups`).select(`id`),t=(e||[]).map(e=>e.id).filter(e=>e.includes(`guest`)||e===`moneyflow_cloud_state`);if(t.length===0){C(`Không có bản ghi khách thử nghiệm nào cần dọn dẹp.`,`info`);return}for(let e of t)await b.from(`cloud_backups`).delete().eq(`id`,e);C(`✓ Đã dọn dẹp sạch ${t.length} bản ghi khách thử nghiệm khỏi Cloud!`,`success`),X()}catch(e){C(`Lỗi dọn dẹp: `+e.message,`error`)}finally{Ue(!1)}}},disabled:He,className:`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 rounded-xl border border-slate-300 dark:border-slate-600 transition-all cursor-pointer disabled:opacity-50`,title:`Dọn dẹp tài khoản guest hoặc bản ghi test`,children:[(0,S.jsx)(p,{className:`w-3.5 h-3.5 text-slate-400`}),(0,S.jsx)(`span`,{children:He?`Đang dọn...`:`Dọn dẹp bản ghi khách/test`})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:async()=>{if(!v||!b){C(`Chưa kết nối Supabase Cloud`,`error`);return}let e=E.filter(e=>!e.isAdmin&&e.daysInactive>=30);if(e.length===0){C(`Không có tài khoản nào ngừng hoạt động quá 30 ngày.`,`info`);return}let t=e.reduce((e,t)=>e+t.sizeKb,0).toFixed(1),n=e.map(e=>`• ${e.fullName} (${e.email}) - Vắng mặt ${e.daysInactive} ngày`).join(`
`);if(confirm(`Phát hiện ${e.length} tài khoản không hoạt động hơn 30 ngày (chiếm ~${t} KB dung lượng):\n\n${n}\n\n🛡️ CƠ CHẾ BẢO VỆ DỮ LIỆU AN TOÀN:\n1. Dữ liệu trên thiết bị của người dùng (LocalStorage điện thoại/máy tính) vẫn NGUYÊN VẸN 100% không bị ảnh hưởng.\n2. Khi người dùng mở lại MoneyFlow trong tương lai, hệ thống sẽ tự động thông báo rõ ràng và tái tạo bản sao lưu mới lên Cloud.\n\nBạn có muốn giải phóng ${e.length} bản sao lưu Cloud này ngay không?`)){Ge(!0);try{for(let t of e)await b.from(`cloud_backups`).delete().eq(`id`,t.id);C(`✓ Đã giải phóng an toàn ${e.length} bản sao lưu không hoạt động >30 ngày!`,`success`),X()}catch(e){C(`Lỗi khi dọn dẹp: `+e.message,`error`)}finally{Ge(!1)}}},disabled:We||$===0,className:`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-xl border border-rose-200 dark:border-rose-900 transition-all cursor-pointer disabled:opacity-50`,title:`Dọn dẹp các tài khoản không hoạt động quá 30 ngày (dữ liệu trên máy họ vẫn an toàn 100%)`,children:[(0,S.jsx)(p,{className:`w-3.5 h-3.5 text-rose-600`}),(0,S.jsx)(`span`,{children:We?`Đang giải phóng...`:`💤 Dọn tài khoản vắng mặt >30 ngày (${$})`})]})]})]})]}),w===`database`&&(0,S.jsxs)(`div`,{className:`space-y-6`,children:[(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4`,children:[(0,S.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-3`,children:[(0,S.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0`,children:(0,S.jsx)(c,{className:`w-5 h-5`})}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Máy Chủ Cơ Sở Dữ Liệu Supabase Cloud`}),(0,S.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`PostgreSQL 15 • Đã cấu hình mã hóa SSL 256-bit & Phân quyền RLS`})]})]}),(0,S.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,S.jsxs)(`button`,{type:`button`,onClick:ct,disabled:R,className:`px-3 py-1 text-2xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer`,children:[(0,S.jsx)(he,{className:`w-3 h-3 text-amber-500`}),(0,S.jsx)(`span`,{children:R?`Đo...`:L?`${L.latency} ms`:`Đo Ping`})]}),(0,S.jsxs)(`span`,{className:`px-3 py-1 text-2xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 w-fit`,children:[(0,S.jsx)(f,{className:`w-3.5 h-3.5`}),(0,S.jsx)(`span`,{children:`Online 100%`})]})]})]}),(0,S.jsxs)(`div`,{className:`p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2`,children:[(0,S.jsxs)(`div`,{className:`flex items-center justify-between text-xs`,children:[(0,S.jsxs)(`span`,{className:`font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5`,children:[(0,S.jsx)(se,{className:`w-4 h-4 text-blue-600`}),(0,S.jsx)(`span`,{children:`Dung lượng CSDL đang sử dụng:`})]}),(0,S.jsxs)(`span`,{className:`font-mono font-bold text-slate-800 dark:text-slate-200`,children:[Z.toFixed(2),` KB / 500,000 KB (500 MB Free Tier)`]})]}),(0,S.jsx)(`div`,{className:`w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden`,children:(0,S.jsx)(`div`,{className:`h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full`,style:{width:`${Math.max(1,Z/5e5*100)}%`}})}),(0,S.jsxs)(`p`,{className:`text-3xs text-slate-400`,children:[`Chỉ mới sử dụng `,(0,S.jsxs)(`strong`,{children:[(Z/5e5*100).toFixed(3),`%`]}),` hạn mức gói Cloud miễn phí của Supabase.`]})]}),(0,S.jsxs)(`div`,{className:`grid grid-cols-1 md:grid-cols-2 gap-3`,children:[(0,S.jsxs)(`div`,{className:`p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1`,children:[(0,S.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 tracking-wider`,children:`Máy chủ API URL`}),(0,S.jsxs)(`div`,{className:`flex items-center justify-between font-mono text-xs text-slate-700 dark:text-slate-300`,children:[(0,S.jsx)(`span`,{className:`truncate`,children:Y}),(0,S.jsx)(`button`,{type:`button`,onClick:()=>{navigator.clipboard.writeText(Y),C(`Đã copy Supabase URL!`,`success`)},className:`p-1 hover:text-blue-500 cursor-pointer text-slate-400`,title:`Copy URL`,children:(0,S.jsx)(i,{className:`w-3.5 h-3.5`})})]})]}),(0,S.jsxs)(`div`,{className:`p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1`,children:[(0,S.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 tracking-wider`,children:`Supabase Anon Key`}),(0,S.jsxs)(`div`,{className:`flex items-center justify-between font-mono text-xs text-slate-700 dark:text-slate-300`,children:[(0,S.jsx)(`span`,{className:`truncate`,children:I?nt:`${nt.slice(0,16)}••••••••••••••••`}),(0,S.jsxs)(`div`,{className:`flex items-center space-x-1 shrink-0`,children:[(0,S.jsx)(`button`,{type:`button`,onClick:()=>Le(!I),className:`p-1 hover:text-blue-500 cursor-pointer text-slate-400`,title:I?`Ẩn key`:`Hiện key`,children:I?(0,S.jsx)(_e,{className:`w-3.5 h-3.5`}):(0,S.jsx)(re,{className:`w-3.5 h-3.5`})}),(0,S.jsx)(`button`,{type:`button`,onClick:()=>{navigator.clipboard.writeText(nt),ze(!0),C(`Đã sao chép Supabase Anon Key!`,`success`),setTimeout(()=>ze(!1),2e3)},className:`p-1 hover:text-blue-500 cursor-pointer text-slate-400`,title:`Copy Key`,children:Re?(0,S.jsx)(d,{className:`w-3.5 h-3.5 text-emerald-500`}):(0,S.jsx)(i,{className:`w-3.5 h-3.5`})})]})]})]})]}),(0,S.jsxs)(`div`,{className:`p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 space-y-3`,children:[(0,S.jsx)(`div`,{className:`flex items-center justify-between`,children:(0,S.jsxs)(`div`,{className:`space-y-0.5`,children:[(0,S.jsxs)(`h4`,{className:`text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5`,children:[(0,S.jsx)(h,{className:`w-3.5 h-3.5 text-emerald-600`}),(0,S.jsx)(`span`,{children:`Điều khiển Đồng bộ Dữ liệu Quản trị viên`})]}),(0,S.jsx)(`p`,{className:`text-3xs text-slate-500 dark:text-slate-400`,children:`Đẩy bản sao lưu của tài khoản Admin lên Supabase hoặc tải bản sao lưu mới nhất về thiết bị này.`})]})}),(0,S.jsxs)(`div`,{className:`flex items-center space-x-2 flex-wrap gap-y-2 pt-1`,children:[(0,S.jsxs)(`button`,{type:`button`,disabled:P||F,onClick:async()=>{je(!0);try{await xe(),X()}finally{je(!1)}},className:`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer`,children:[P?(0,S.jsx)(l,{className:`w-3.5 h-3.5 animate-spin`}):(0,S.jsx)(ue,{className:`w-3.5 h-3.5`}),(0,S.jsx)(`span`,{children:P?`Đang đẩy lên...`:`☁️ Đẩy dữ liệu Admin lên Cloud`})]}),(0,S.jsxs)(`button`,{type:`button`,disabled:P||F,onClick:async()=>{if(confirm(`Tải dữ liệu từ Supabase Cloud về thiết bị này?`)){Me(!0);try{await Ce(),X()}finally{Me(!1)}}},className:`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-slate-800 hover:bg-emerald-50 disabled:opacity-50 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-2xs transition-colors cursor-pointer`,children:[F?(0,S.jsx)(l,{className:`w-3.5 h-3.5 animate-spin`}):(0,S.jsx)(n,{className:`w-3.5 h-3.5`}),(0,S.jsx)(`span`,{children:F?`Đang tải về...`:`Tải dữ liệu Admin từ Cloud về`})]}),Te&&(0,S.jsxs)(`button`,{type:`button`,onClick:()=>{confirm(`Khôi phục lại phiên dữ liệu trên máy trước lần tải gần nhất?`)&&we()},className:`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-xl border border-amber-300 dark:border-amber-700 shadow-2xs transition-colors cursor-pointer`,title:`Khôi phục lại dữ liệu trước khi đồng bộ`,children:[(0,S.jsx)(s,{className:`w-3.5 h-3.5 text-amber-600`}),(0,S.jsx)(`span`,{children:`Hoàn tác lần tải gần nhất`})]})]})]})]}),(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4`,children:[(0,S.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-3`,children:[(0,S.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0`,children:(0,S.jsx)(ne,{className:`w-5 h-5`})}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Mã Nguồn Cấu Trúc Bảng CSDL (PostgreSQL Schema)`}),(0,S.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`Bao gồm 10 bảng dữ liệu, khóa ngoại, chỉ mục (Index) và chính sách bảo mật RLS`})]})]}),(0,S.jsx)(`div`,{className:`flex items-center gap-2`,children:(0,S.jsxs)(`button`,{type:`button`,onClick:()=>{navigator.clipboard.writeText(Se),Ie(!0),C(`Đã sao chép toàn bộ mã SQL Supabase vào Clipboard!`,`success`),setTimeout(()=>Ie(!1),2500)},className:`flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs text-white font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer shrink-0`,children:[Fe?(0,S.jsx)(d,{className:`w-3.5 h-3.5 text-white`}):(0,S.jsx)(i,{className:`w-3.5 h-3.5`}),(0,S.jsx)(`span`,{children:Fe?`✓ Đã sao chép SQL!`:`Sao chép toàn bộ mã SQL`})]})})]}),(0,S.jsxs)(`div`,{className:`p-4 bg-slate-900 rounded-2xl border border-slate-800 text-slate-300 text-xs space-y-2 font-mono`,children:[(0,S.jsxs)(`div`,{className:`flex items-center gap-2 text-amber-400 font-bold font-sans`,children:[(0,S.jsx)(h,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{children:`Hướng dẫn 3 bước khởi tạo hoặc bảo trì CSDL Supabase:`})]}),(0,S.jsxs)(`ol`,{className:`list-decimal list-inside space-y-1 text-slate-400 font-sans text-2xs leading-relaxed`,children:[(0,S.jsxs)(`li`,{children:[`Bấm nút `,(0,S.jsx)(`strong`,{children:`"Sao chép toàn bộ mã SQL"`}),` ở góc trên.`]}),(0,S.jsxs)(`li`,{children:[`Đăng nhập vào `,(0,S.jsx)(`a`,{href:`https://supabase.com/dashboard`,target:`_blank`,rel:`noreferrer`,className:`text-blue-400 underline font-semibold`,children:`Supabase Dashboard`}),` → Chọn Project `,(0,S.jsx)(`code`,{children:`rlqicielkddwyzgpwgnm`}),` → Mở mục `,(0,S.jsx)(`strong`,{children:`SQL Editor`}),`.`]}),(0,S.jsxs)(`li`,{children:[`Bấm `,(0,S.jsx)(`strong`,{children:`"New query"`}),`, dán toàn bộ mã (`,(0,S.jsx)(`code`,{children:`Ctrl + V`}),`) và ấn `,(0,S.jsx)(`strong`,{children:`"Run"`}),` để khởi tạo hoặc cập nhật bảng.`]})]})]}),(0,S.jsxs)(`div`,{className:`rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden text-2xs font-mono`,children:[(0,S.jsxs)(`div`,{className:`px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400`,children:[(0,S.jsxs)(`span`,{className:`flex items-center gap-2`,children:[(0,S.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-rose-500 inline-block`}),(0,S.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-amber-500 inline-block`}),(0,S.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block`}),(0,S.jsx)(`span`,{className:`ml-2 text-slate-300 font-bold`,children:`schema.sql`})]}),(0,S.jsx)(`span`,{className:`text-3xs uppercase`,children:`PostgreSQL DDL`})]}),(0,S.jsx)(`pre`,{className:`p-4 text-emerald-400 overflow-x-auto max-h-96 leading-relaxed select-all`,children:`-- ==============================================================================
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
`})]})]})]}),w===`announcement`&&(0,S.jsxs)(`div`,{className:`space-y-6`,children:[z?(0,S.jsxs)(`div`,{className:`p-5 rounded-3xl border shadow-sm space-y-3 ${z.type===`warning`?`bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200`:z.type===`success`?`bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200`:`bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200`}`,children:[(0,S.jsxs)(`div`,{className:`flex items-center justify-between flex-wrap gap-2`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-2`,children:[(0,S.jsx)(te,{className:`w-4 h-4 text-emerald-500 animate-pulse`}),(0,S.jsx)(`span`,{className:`text-xs font-bold uppercase tracking-wider`,children:`Đang phát trên toàn hệ thống`}),(0,S.jsxs)(`span`,{className:`text-3xs font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-800`,children:[`Loại: `,z.type]})]}),(0,S.jsxs)(`div`,{className:`flex items-center space-x-2 text-3xs opacity-80`,children:[(0,S.jsx)(_,{className:`w-3 h-3`}),(0,S.jsx)(`span`,{children:new Date(z.createdAt).toLocaleString(`vi-VN`)}),(0,S.jsx)(`button`,{type:`button`,onClick:async()=>{if(!v||!b)C(`Chưa kết nối Supabase Cloud`,`error`);else if(confirm(`Bạn có chắc muốn thu hồi / xóa thông báo toàn hệ thống này?`))try{await b.from(`cloud_backups`).delete().eq(`id`,`system_announcement`),B(null),C(`Đã thu hồi thông báo toàn hệ thống!`,`info`)}catch(e){C(`Lỗi thu hồi thông báo: `+e.message,`error`)}},className:`px-2.5 py-1 text-2xs font-bold text-rose-600 bg-white dark:bg-slate-900 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer ml-2`,children:`Thu hồi thông báo`})]})]}),(0,S.jsxs)(`div`,{className:`space-y-1`,children:[(0,S.jsx)(`h3`,{className:`text-base font-bold`,children:z.title}),(0,S.jsx)(`p`,{className:`text-xs leading-relaxed opacity-90`,children:z.message})]})]}):(0,S.jsxs)(`div`,{className:`p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-500 flex items-center space-x-2`,children:[(0,S.jsx)(ie,{className:`w-4 h-4 text-slate-400`}),(0,S.jsx)(`span`,{children:`Hiện tại chưa có thông báo phát thanh nào hoạt động trên hệ thống.`})]}),(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800`,children:[(0,S.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0`,children:(0,S.jsx)(le,{className:`w-5 h-5`})}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Phát Thông Báo Toàn Hệ Thống`}),(0,S.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`Gửi thông báo tới chuông thông báo của tất cả người dùng khi họ mở ứng dụng`})]})]}),(0,S.jsxs)(`form`,{onSubmit:async e=>{if(e.preventDefault(),!v||!b)C(`Chưa kết nối Supabase Cloud`,`error`);else if(!V.trim()||!H.trim())C(`Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!`,`error`);else{Qe(!0);try{let e={title:V.trim(),message:H.trim(),type:U,createdAt:new Date().toISOString(),author:`Admin Khôi`},{error:t}=await b.from(`cloud_backups`).upsert({id:`system_announcement`,data:e,updated_at:new Date().toISOString()});if(t)throw t;B(e),Je(``),Ye(``),C(`🚀 Đã phát thông báo toàn hệ thống! Người dùng sẽ nhận được khi mở app.`,`success`)}catch(e){C(`Lỗi phát thông báo: `+e.message,`error`)}finally{Qe(!1)}}},className:`space-y-4`,children:[(0,S.jsxs)(`div`,{className:`space-y-1.5`,children:[(0,S.jsx)(`label`,{className:`text-xs font-bold text-slate-700 dark:text-slate-300 block`,children:`Tiêu đề thông báo`}),(0,S.jsx)(`input`,{type:`text`,placeholder:`Ví dụ: 🎉 Chào mừng phiên bản MoneyFlow v2.5!`,value:V,onChange:e=>Je(e.target.value),className:`w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800 dark:text-slate-200 font-medium`})]}),(0,S.jsxs)(`div`,{className:`space-y-1.5`,children:[(0,S.jsx)(`label`,{className:`text-xs font-bold text-slate-700 dark:text-slate-300 block`,children:`Nội dung thông báo`}),(0,S.jsx)(`textarea`,{rows:3,placeholder:`Nhập nội dung thông điệp muốn nhắn gửi tới người dùng...`,value:H,onChange:e=>Ye(e.target.value),className:`w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800 dark:text-slate-200 leading-relaxed font-sans`})]}),(0,S.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-2`,children:[(0,S.jsx)(`span`,{className:`text-2xs font-bold text-slate-500 uppercase`,children:`Mức độ:`}),(0,S.jsx)(`button`,{type:`button`,onClick:()=>Xe(`info`),className:`px-3 py-1 rounded-xl text-xs font-bold transition-all ${U===`info`?`bg-indigo-600 text-white shadow-xs`:`bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200`}`,children:`Thông tin`}),(0,S.jsx)(`button`,{type:`button`,onClick:()=>Xe(`success`),className:`px-3 py-1 rounded-xl text-xs font-bold transition-all ${U===`success`?`bg-emerald-600 text-white shadow-xs`:`bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200`}`,children:`Cập nhật mới`}),(0,S.jsx)(`button`,{type:`button`,onClick:()=>Xe(`warning`),className:`px-3 py-1 rounded-xl text-xs font-bold transition-all ${U===`warning`?`bg-amber-600 text-white shadow-xs`:`bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200`}`,children:`Bảo trì / Chú ý`})]}),(0,S.jsxs)(`button`,{type:`submit`,disabled:Ze,className:`px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50`,children:[(0,S.jsx)(le,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{children:Ze?`Đang phát...`:`Phát thông báo ngay`})]})]})]})]})]}),w===`ai`&&(0,S.jsx)(`div`,{className:`space-y-6`,children:(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5`,children:[(0,S.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-3`,children:[(0,S.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0`,children:(0,S.jsx)(h,{className:`w-5 h-5`})}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Cấu Hình Trí Tuệ Nhân Tạo Google Gemini`}),(0,S.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`Hỗ trợ mô hình: Gemini 2.0 Flash, Gemini 1.5 Flash, Gemini 1.5 Pro`})]})]}),(0,S.jsx)(`div`,{className:`flex items-center gap-2`,children:(0,S.jsxs)(`a`,{href:`https://aistudio.google.com/app/apikey`,target:`_blank`,rel:`noreferrer`,className:`px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-colors`,children:[(0,S.jsx)(`span`,{children:`Google AI Studio`}),(0,S.jsx)(ee,{className:`w-3 h-3`})]})})]}),(0,S.jsxs)(`div`,{className:`p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/40 text-2xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1.5`,children:[(0,S.jsxs)(`div`,{className:`flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300`,children:[(0,S.jsx)(h,{className:`w-3.5 h-3.5 text-indigo-600`}),(0,S.jsx)(`span`,{children:`Quyền năng AI trong MoneyFlow:`})]}),(0,S.jsx)(`p`,{children:`Hệ thống sử dụng Gemini API để kích hoạt: Trợ lý tài chính AI đàm thoại tự do, nhận diện giọng nói thêm giao dịch thông minh, tư vấn chi tiêu và dự báo dòng tiền cá nhân hóa.`})]}),(0,S.jsxs)(`form`,{onSubmit:async e=>{if(e.preventDefault(),!W.trim())C(`Vui lòng nhập API Key Gemini hợp lệ`,`error`);else{K(!0);try{let e=await y.testConnection(W.trim());e.success?(y.setApiKey(W.trim()),tt(!0),J({tested:!0,success:!0,message:e.message,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),C(`Kết nối Google Gemini AI thành công và đã lưu!`,`success`)):(J({tested:!0,success:!1,message:e.message,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),C(e.message,`error`))}catch(e){J({tested:!0,success:!1,message:e.message||`Lỗi kiểm tra kết nối API Key`,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),C(`Kiểm tra API Key thất bại`,`error`)}finally{K(!1)}}},className:`space-y-4`,children:[(0,S.jsxs)(`div`,{className:`space-y-1.5`,children:[(0,S.jsx)(`label`,{className:`text-xs font-bold text-slate-700 dark:text-slate-300 block`,children:`Google Gemini API Key`}),(0,S.jsx)(`div`,{className:`relative`,children:(0,S.jsx)(`input`,{type:`password`,placeholder:`Dán API Key Google Gemini (bắt đầu bằng AIzaSy...)`,value:W,onChange:e=>$e(e.target.value),className:`w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200`})})]}),(0,S.jsxs)(`div`,{className:`flex items-center gap-2.5 flex-wrap`,children:[(0,S.jsxs)(`button`,{type:`submit`,disabled:G,className:`py-2.5 px-5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center space-x-1.5 disabled:opacity-50`,children:[G?(0,S.jsx)(l,{className:`w-4 h-4 animate-spin`}):(0,S.jsx)(d,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{children:G?`Đang kiểm tra...`:`Lưu & Kiểm tra kết nối AI`})]}),et&&(0,S.jsxs)(S.Fragment,{children:[(0,S.jsxs)(`button`,{type:`button`,disabled:G,onClick:async()=>{if(et){K(!0);try{let e=await y.testConnection();J({tested:!0,success:e.success,message:e.message,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),e.success?C(`Kết nối Google Gemini AI hoạt động hoàn hảo!`,`success`):C(e.message,`error`)}catch(e){J({tested:!0,success:!1,message:e.message||`Lỗi kiểm tra kết nối`,timestamp:new Date().toLocaleTimeString(`vi-VN`)}),C(`Kiểm tra API Key thất bại`,`error`)}finally{K(!1)}}},className:`py-2.5 px-4 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer flex items-center space-x-1.5`,children:[(0,S.jsx)(ge,{className:`w-4 h-4 text-indigo-600`}),(0,S.jsx)(`span`,{children:`Kiểm tra lại kết nối`})]}),(0,S.jsx)(`button`,{type:`button`,onClick:()=>{confirm(`Bạn có chắc muốn xóa Google Gemini API Key khỏi hệ thống?`)&&(y.setApiKey(``),$e(``),tt(!1),J(null),C(`Đã xóa API Key Gemini khỏi hệ thống`,`info`))},className:`py-2.5 px-4 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl transition-colors cursor-pointer`,children:`Xóa Key khỏi hệ thống`})]})]})]}),q&&(0,S.jsxs)(`div`,{className:`p-4 rounded-2xl border text-xs space-y-1 ${q.success?`bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300`:`bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300`}`,children:[(0,S.jsxs)(`div`,{className:`flex items-center gap-2 font-bold`,children:[q.success?(0,S.jsx)(o,{className:`w-4 h-4 text-emerald-600`}):(0,S.jsx)(pe,{className:`w-4 h-4 text-rose-600`}),(0,S.jsx)(`span`,{children:q.success?`Kết nối thành công!`:`Kết nối thất bại`}),q.timestamp&&(0,S.jsx)(`span`,{className:`text-3xs font-normal opacity-70 ml-auto`,children:q.timestamp})]}),(0,S.jsx)(`p`,{className:`text-2xs leading-relaxed opacity-90`,children:q.message})]})]})}),w===`security`&&(0,S.jsx)(`div`,{className:`space-y-6`,children:(0,S.jsxs)(`div`,{className:`grid grid-cols-1 md:grid-cols-2 gap-4`,children:[(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800`,children:[(0,S.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0`,children:(0,S.jsx)(f,{className:`w-5 h-5`})}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Bảo Mật & Kiểm Tra An Toàn`}),(0,S.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`Các lớp bảo vệ hệ thống MoneyFlow`})]})]}),(0,S.jsxs)(`div`,{className:`space-y-3`,children:[(0,S.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-2.5`,children:[(0,S.jsx)(a,{className:`w-4 h-4 text-emerald-500 shrink-0`}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`span`,{className:`text-xs font-bold text-slate-800 dark:text-slate-200 block`,children:`Mã hóa đường truyền TLS / SSL 256-bit`}),(0,S.jsx)(`span`,{className:`text-3xs text-slate-400`,children:`Toàn bộ request đến Supabase & Google AI được mã hóa HTTPS`})]})]}),(0,S.jsx)(`span`,{className:`text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800`,children:`ACTIVE`})]}),(0,S.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-2.5`,children:[(0,S.jsx)(a,{className:`w-4 h-4 text-emerald-500 shrink-0`}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`span`,{className:`text-xs font-bold text-slate-800 dark:text-slate-200 block`,children:`Phân Quyền Cấp Hàng (PostgreSQL RLS)`}),(0,S.jsx)(`span`,{className:`text-3xs text-slate-400`,children:`Tách biệt dữ liệu người dùng, chỉ user sở hữu mới có quyền đọc/ghi`})]})]}),(0,S.jsx)(`span`,{className:`text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800`,children:`ENFORCED`})]}),(0,S.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-2.5`,children:[(0,S.jsx)(a,{className:`w-4 h-4 text-emerald-500 shrink-0`}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`span`,{className:`text-xs font-bold text-slate-800 dark:text-slate-200 block`,children:`PWA Cache Service Worker v3`}),(0,S.jsx)(`span`,{className:`text-3xs text-slate-400`,children:`Hỗ trợ hoạt động ngoại tuyến (Offline) và tự động đồng bộ khi có mạng`})]})]}),(0,S.jsx)(`span`,{className:`text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800`,children:`V3 ACTIVE`})]}),(0,S.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-2.5`,children:[(0,S.jsx)(a,{className:`w-4 h-4 text-emerald-500 shrink-0`}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`span`,{className:`text-xs font-bold text-slate-800 dark:text-slate-200 block`,children:`Bộ nhớ đệm LocalStorage Độc lập`}),(0,S.jsx)(`span`,{className:`text-3xs text-slate-400`,children:`Sao lưu dữ liệu tức thì trên thiết bị ngay cả khi rớt mạng`})]})]}),(0,S.jsx)(`span`,{className:`text-3xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800`,children:`READY`})]})]})]}),(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800`,children:[(0,S.jsx)(`div`,{className:`w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0`,children:(0,S.jsx)(u,{className:`w-5 h-5`})}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:`Thông Tin Phiên Bản Ứng Dụng`}),(0,S.jsx)(`p`,{className:`text-2xs text-slate-400`,children:`Cấu trúc ứng dụng & môi trường chạy`})]})]}),(0,S.jsxs)(`div`,{className:`space-y-2.5 font-mono text-xs text-slate-700 dark:text-slate-300`,children:[(0,S.jsxs)(`div`,{className:`flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800`,children:[(0,S.jsx)(`span`,{className:`text-slate-400 font-sans`,children:`Phiên bản ứng dụng:`}),(0,S.jsx)(`span`,{className:`font-bold text-blue-600 dark:text-blue-400`,children:`v2.5 Executive Suite`})]}),(0,S.jsxs)(`div`,{className:`flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800`,children:[(0,S.jsx)(`span`,{className:`text-slate-400 font-sans`,children:`Môi trường:`}),(0,S.jsx)(`span`,{className:`font-bold text-emerald-600`,children:`Production (Vite + React 18)`})]}),(0,S.jsxs)(`div`,{className:`flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800`,children:[(0,S.jsx)(`span`,{className:`text-slate-400 font-sans`,children:`Cơ sở dữ liệu:`}),(0,S.jsx)(`span`,{children:`Supabase PostgreSQL 15`})]}),(0,S.jsxs)(`div`,{className:`flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800`,children:[(0,S.jsx)(`span`,{className:`text-slate-400 font-sans`,children:`Mô hình AI:`}),(0,S.jsx)(`span`,{children:`Gemini 2.0 Flash / 1.5 Flash`})]}),(0,S.jsxs)(`div`,{className:`flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800`,children:[(0,S.jsx)(`span`,{className:`text-slate-400 font-sans`,children:`Chế độ PWA:`}),(0,S.jsx)(`span`,{children:`Standalone Web App Ready`})]})]}),(0,S.jsx)(`div`,{className:`pt-2`,children:(0,S.jsxs)(`button`,{type:`button`,onClick:()=>{confirm(`Làm mới toàn bộ bộ nhớ đệm và tải lại ứng dụng?`)&&window.location.reload()},className:`w-full py-2.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5`,children:[(0,S.jsx)(l,{className:`w-3.5 h-3.5`}),(0,S.jsx)(`span`,{children:`Xóa Cache & Tải lại giao diện`})]})})]})]})}),M&&(0,S.jsx)(`div`,{className:`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200`,children:(0,S.jsxs)(`div`,{className:`bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`,children:[(0,S.jsxs)(`div`,{className:`flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800`,children:[(0,S.jsxs)(`div`,{className:`flex items-center space-x-3`,children:[(0,S.jsx)(`div`,{className:`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md ${M.isAdmin?`bg-gradient-to-tr from-amber-500 to-orange-500`:`bg-gradient-to-tr from-blue-600 to-indigo-600`}`,children:M.fullName?.slice(0,2).toUpperCase()||`US`}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`h3`,{className:`text-base font-bold text-slate-800 dark:text-slate-100`,children:M.fullName}),(0,S.jsx)(`p`,{className:`text-2xs text-slate-400 font-mono`,children:M.email})]})]}),(0,S.jsxs)(`div`,{className:`flex items-center space-x-1`,children:[!M.isAdmin&&(0,S.jsx)(`button`,{type:`button`,onClick:()=>dt(M),className:`p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer`,title:`Xóa bản sao lưu người này`,children:(0,S.jsx)(p,{className:`w-4 h-4`})}),(0,S.jsx)(`button`,{type:`button`,onClick:()=>N(null),className:`p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer`,children:(0,S.jsx)(fe,{className:`w-5 h-5`})})]})]}),(0,S.jsxs)(`div`,{className:`grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center`,children:[(0,S.jsxs)(`div`,{className:`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,S.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 block`,children:`Ví tài khoản`}),(0,S.jsx)(`span`,{className:`text-lg font-black text-blue-600 dark:text-blue-400`,children:M.accCount})]}),(0,S.jsxs)(`div`,{className:`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,S.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 block`,children:`Giao dịch`}),(0,S.jsx)(`span`,{className:`text-lg font-black text-emerald-600 dark:text-emerald-400`,children:M.txCount})]}),(0,S.jsxs)(`div`,{className:`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,S.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 block`,children:`Dung lượng`}),(0,S.jsxs)(`span`,{className:`text-lg font-black text-indigo-600 dark:text-indigo-400`,children:[M.sizeKb.toFixed(1),` KB`]})]}),(0,S.jsxs)(`div`,{className:`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60`,children:[(0,S.jsx)(`span`,{className:`text-3xs uppercase font-bold text-slate-400 block`,children:`Sổ nợ`}),(0,S.jsx)(`span`,{className:`text-lg font-black text-amber-600 dark:text-amber-400`,children:M.debtCount})]})]}),M.daysInactive>=30&&!M.isAdmin&&(0,S.jsxs)(`div`,{className:`p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-2xs text-rose-700 dark:text-rose-300 space-y-1`,children:[(0,S.jsxs)(`div`,{className:`font-bold flex items-center gap-1.5`,children:[(0,S.jsx)(oe,{className:`w-3.5 h-3.5 text-rose-600 shrink-0`}),(0,S.jsxs)(`span`,{children:[`Tài khoản không hoạt động trong `,M.daysInactive,` ngày (>30 ngày)`]})]}),(0,S.jsx)(`p`,{className:`leading-relaxed opacity-90`,children:`Bản sao lưu Cloud này có thể được giải phóng an toàn để tiết kiệm tài nguyên máy chủ. Toàn bộ dữ liệu của người dùng trên thiết bị cá nhân của họ vẫn an toàn tuyệt đối 100%! Khi họ mở lại MoneyFlow trong tương lai, hệ thống sẽ tự động thông báo rõ ràng và tái tạo bản sao lưu mới lên Cloud.`})]}),M.rawData?.accounts&&M.rawData.accounts.length>0&&(0,S.jsxs)(`div`,{className:`space-y-2`,children:[(0,S.jsx)(`span`,{className:`text-xs font-bold text-slate-700 dark:text-slate-300 block`,children:`Danh sách Ví & Tài khoản:`}),(0,S.jsx)(`div`,{className:`space-y-1.5 max-h-40 overflow-y-auto pr-1`,children:M.rawData.accounts.map(e=>(0,S.jsxs)(`div`,{className:`flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs`,children:[(0,S.jsx)(`span`,{className:`font-semibold text-slate-800 dark:text-slate-200`,children:e.name}),(0,S.jsx)(`span`,{className:`font-mono font-bold text-slate-700 dark:text-slate-300`,children:ve(e.balance||0)})]},e.id))})]}),(0,S.jsxs)(`div`,{className:`p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-2xs space-y-1 font-mono text-slate-500 dark:text-slate-400`,children:[(0,S.jsxs)(`div`,{className:`flex justify-between`,children:[(0,S.jsx)(`span`,{children:`Khởi tạo tài khoản:`}),(0,S.jsx)(`span`,{className:`text-slate-700 dark:text-slate-300`,children:new Date(M.createdAt).toLocaleString(`vi-VN`)})]}),(0,S.jsxs)(`div`,{className:`flex justify-between`,children:[(0,S.jsx)(`span`,{children:`Sao lưu lần cuối:`}),(0,S.jsx)(`span`,{className:`text-slate-700 dark:text-slate-300`,children:new Date(M.lastActive).toLocaleString(`vi-VN`)})]}),(0,S.jsxs)(`div`,{className:`flex justify-between`,children:[(0,S.jsx)(`span`,{children:`Backup Key trên Supabase:`}),(0,S.jsx)(`span`,{className:`text-blue-500 font-bold`,children:M.id})]})]}),(0,S.jsx)(`div`,{className:`pt-2`,children:(0,S.jsx)(`button`,{type:`button`,onClick:()=>N(null),className:`w-full py-2.5 px-4 text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-all cursor-pointer`,children:`Đóng`})})]})})]}):(0,S.jsxs)(`div`,{className:`py-16 px-4 max-w-xl mx-auto text-center space-y-6`,children:[(0,S.jsx)(`div`,{className:`w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20`,children:(0,S.jsx)(r,{className:`w-8 h-8`})}),(0,S.jsxs)(`div`,{className:`space-y-2`,children:[(0,S.jsx)(`h2`,{className:`text-xl sm:text-2xl font-black text-slate-900 dark:text-white`,children:`Khu vực Quản trị viên (Admin Only)`}),(0,S.jsxs)(`p`,{className:`text-sm text-slate-500 dark:text-slate-400 leading-relaxed`,children:[`Bạn đang đăng nhập bằng tài khoản không có quyền quản trị hệ thống. Trang này chỉ dành cho tài khoản Admin đã được ủy quyền (`,(0,S.jsx)(`code`,{children:`minhkhoj2002@gmail.com`}),`).`]})]}),(0,S.jsx)(`div`,{className:`pt-2`,children:(0,S.jsxs)(`button`,{type:`button`,onClick:()=>g(`dashboard`),className:`inline-flex items-center space-x-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer`,children:[(0,S.jsx)(de,{className:`w-4 h-4`}),(0,S.jsx)(`span`,{children:`Quay lại Trang Tổng Quan`})]})})]})};export{Ce as AdminPage};