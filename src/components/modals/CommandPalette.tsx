import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { useModalEscape } from '../../hooks/useModalEscape';
import {
  Search,
  Plus,
  ArrowLeftRight,
  HandCoins,
  Target,
  Cloud,
  LayoutDashboard,
  Receipt,
  Wallet,
  PiggyBank,
  FileBarChart,
  Settings,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { formatVND, formatDateVN } from '../../utils/formatters';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTransferModal: () => void;
  onOpenDebtModal: () => void;
  onOpenGoalModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenTransferModal,
  onOpenDebtModal,
  onOpenGoalModal,
}) => {
  useModalEscape(onClose, isOpen);

  const {
    transactions,
    categories,
    debts,
    openAddTxModal,
    setCurrentTab,
    syncToCloud,
    isCloudConfigured,
  } = useFinancial();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Navigation Items
  const navItems = useMemo(
    () => [
      { id: 'nav_dashboard', title: 'Tổng quan (Dashboard)', tab: 'dashboard', icon: LayoutDashboard },
      { id: 'nav_transactions', title: 'Sổ giao dịch thu chi', tab: 'transactions', icon: Receipt },
      { id: 'nav_accounts', title: 'Tài khoản & Ví tiền', tab: 'accounts', icon: Wallet },
      { id: 'nav_budgets', title: 'Hạn mức ngân sách', tab: 'budgets', icon: Target },
      { id: 'nav_savings', title: 'Mục tiêu tiết kiệm', tab: 'savings', icon: PiggyBank },
      { id: 'nav_debts', title: 'Sổ nợ & Cho vay', tab: 'debts', icon: HandCoins },
      { id: 'nav_reports', title: 'Báo cáo & Phân tích', tab: 'reports', icon: FileBarChart },
      { id: 'nav_settings', title: 'Cài đặt hệ thống', tab: 'settings', icon: Settings },
    ],
    []
  );

  // Quick Action Items
  const actionItems = useMemo(
    () => [
      {
        id: 'act_add_tx',
        title: 'Thêm giao dịch mới (Thu/Chi)',
        action: () => {
          onClose();
          openAddTxModal();
        },
        icon: Plus,
        badge: 'Phím tắt N',
      },
      {
        id: 'act_transfer',
        title: 'Chuyển tiền nội bộ giữa các ví',
        action: () => {
          onClose();
          onOpenTransferModal();
        },
        icon: ArrowLeftRight,
      },
      {
        id: 'act_debt',
        title: 'Ghi nhận khoản nợ mới (Cho vay / Đi vay)',
        action: () => {
          onClose();
          onOpenDebtModal();
        },
        icon: HandCoins,
      },
      {
        id: 'act_goal',
        title: 'Thiết lập mục tiêu tiết kiệm mới',
        action: () => {
          onClose();
          onOpenGoalModal();
        },
        icon: Target,
      },
      ...(isCloudConfigured
        ? [
            {
              id: 'act_sync',
              title: 'Đồng bộ hóa dữ liệu lên Cloud Supabase',
              action: () => {
                onClose();
                syncToCloud();
              },
              icon: Cloud,
              badge: 'Cloud Sync',
            },
          ]
        : []),
    ],
    [onClose, openAddTxModal, onOpenTransferModal, onOpenDebtModal, onOpenGoalModal, isCloudConfigured, syncToCloud]
  );

  // Filtered matching transactions
  const matchedTransactions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return transactions
      .filter((t) => {
        const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
        const catName = cat?.name?.toLowerCase() || '';
        const note = t.note?.toLowerCase() || '';
        const amtStr = t.amount.toString();
        return catName.includes(q) || note.includes(q) || amtStr.includes(q);
      })
      .slice(0, 5);
  }, [query, transactions, catMap]);

  // Filtered matching debts
  const matchedDebts = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return debts
      .filter((d) => {
        const name = d.personName.toLowerCase();
        const phone = d.phoneNumber || '';
        const note = d.note?.toLowerCase() || '';
        return name.includes(q) || phone.includes(q) || note.includes(q);
      })
      .slice(0, 4);
  }, [query, debts]);

  // Filtered Navigation & Actions by query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actionItems;
    const q = query.toLowerCase().trim();
    return actionItems.filter((a) => a.title.toLowerCase().includes(q));
  }, [query, actionItems]);

  const filteredNav = useMemo(() => {
    if (!query.trim()) return navItems;
    const q = query.toLowerCase().trim();
    return navItems.filter((n) => n.title.toLowerCase().includes(q));
  }, [query, navItems]);

  // Flat list of selectable items for keyboard navigation
  const selectableItems = useMemo(() => {
    const list: Array<{ id: string; select: () => void }> = [];
    filteredActions.forEach((item) => {
      list.push({ id: item.id, select: item.action });
    });
    filteredNav.forEach((item) => {
      list.push({
        id: item.id,
        select: () => {
          onClose();
          setCurrentTab(item.tab);
        },
      });
    });
    matchedDebts.forEach((debt) => {
      list.push({
        id: debt.id,
        select: () => {
          onClose();
          setCurrentTab('debts');
        },
      });
    });
    matchedTransactions.forEach((tx) => {
      list.push({
        id: tx.id,
        select: () => {
          onClose();
          openAddTxModal(tx);
        },
      });
    });
    return list;
  }, [filteredActions, filteredNav, matchedDebts, matchedTransactions, onClose, setCurrentTab, openAddTxModal]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectableItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % selectableItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + selectableItems.length) % selectableItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = selectableItems[selectedIndex];
      if (current) {
        current.select();
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm giao dịch, người nợ, hoặc nhập lệnh nhanh..."
            className="w-full text-sm sm:text-base font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-2xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Search Content */}
        <div className="overflow-y-auto p-3 space-y-4 max-h-[60vh]">
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1.5">
                ⚡ Thao tác nhanh
              </span>
              <div className="space-y-1">
                {filteredActions.map((item) => {
                  const itemIndex = selectableItems.findIndex((s) => s.id === item.id);
                  const isSelected = itemIndex === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-3xs px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Transactions */}
          {matchedTransactions.length > 0 && (
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1.5">
                💳 Giao dịch khớp ({matchedTransactions.length})
              </span>
              <div className="space-y-1">
                {matchedTransactions.map((tx) => {
                  const itemIndex = selectableItems.findIndex((s) => s.id === tx.id);
                  const isSelected = itemIndex === selectedIndex;
                  const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        openAddTxModal(tx);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        {tx.type === 'income' ? (
                          <TrendingUp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                        ) : (
                          <TrendingDown className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-rose-600'}`} />
                        )}
                        <div className="truncate">
                          <span className="font-bold block truncate">{cat?.name || 'Giao dịch'}</span>
                          <span className={`text-2xs truncate block ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {tx.note ? `${tx.note} • ` : ''}{formatDateVN(tx.date)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`font-black text-xs shrink-0 ml-2 ${
                          isSelected
                            ? 'text-white'
                            : tx.type === 'income'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}{formatVND(tx.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Debts */}
          {matchedDebts.length > 0 && (
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1.5">
                🤝 Sổ nợ liên quan ({matchedDebts.length})
              </span>
              <div className="space-y-1">
                {matchedDebts.map((debt) => {
                  const itemIndex = selectableItems.findIndex((s) => s.id === debt.id);
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={debt.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        setCurrentTab('debts');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <HandCoins className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                        <div>
                          <span className="font-bold block">{debt.personName} ({debt.type === 'lend' ? 'Nợ tôi' : 'Tôi nợ'})</span>
                          <span className={`text-2xs ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            Còn lại: {formatVND(debt.totalAmount - debt.paidAmount)}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          {filteredNav.length > 0 && (
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1.5">
                🧭 Đi đến trang
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filteredNav.map((nav) => {
                  const itemIndex = selectableItems.findIndex((s) => s.id === nav.id);
                  const isSelected = itemIndex === selectedIndex;
                  const Icon = nav.icon;
                  return (
                    <button
                      key={nav.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        setCurrentTab(nav.tab);
                      }}
                      className={`flex items-center space-x-2.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                      <span>{nav.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectableItems.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">Không tìm thấy kết quả nào phù hợp</p>
              <p className="text-2xs">Hãy thử từ khóa khác như tên danh mục, số tiền hoặc ghi chú</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-400">
          <div className="flex items-center space-x-3">
            <span>↑↓ Di chuyển</span>
            <span>↵ Chọn mục</span>
            <span>ESC Đóng</span>
          </div>
          <span className="font-medium text-slate-500">MoneyFlow Quick Search</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

