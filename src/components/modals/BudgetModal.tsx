import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { Budget } from '../../types';
import { X, Check, Edit2, Plus } from 'lucide-react';
import { DynamicIcon } from '../common/DynamicIcon';
import { QuickAmountInput } from '../common/QuickAmountInput';
import { useModalEscape } from '../../hooks/useModalEscape';
import { getLocalMonthString } from '../../utils/formatters';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBudget?: Budget | null;
  defaultMonth?: string;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  editingBudget,
  defaultMonth,
}) => {
  const { categories, saveBudget, updateCategory, createCategory } = useFinancial();

  const currentYearMonth = defaultMonth || getLocalMonthString(); // YYYY-MM
  const [categoryId, setCategoryId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [month, setMonth] = useState(currentYearMonth);

  // States to allow renaming category or creating new category right here
  const [isRenamingCategory, setIsRenamingCategory] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Only expense categories can have budgets
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );
  const currentCategory = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    if (!isOpen) return;

    if (editingBudget) {
      setCategoryId(editingBudget.categoryId);
      setAmountStr(editingBudget.amount.toString());
      setMonth(editingBudget.month);
    } else {
      setCategoryId(expenseCategories[0]?.id || '');
      setAmountStr('500000');
      setMonth(defaultMonth || currentYearMonth);
    }
    setIsRenamingCategory(false);
    setIsCreatingCategory(false);
  }, [isOpen, editingBudget]);

  useModalEscape(onClose, isOpen);

  if (!isOpen) return null;

  const handleStartRename = () => {
    if (currentCategory) {
      setRenameValue(currentCategory.name);
      setIsRenamingCategory(true);
      setIsCreatingCategory(false);
    }
  };

  const handleSaveRename = () => {
    if (!renameValue.trim()) return;
    if (categoryId) {
      updateCategory(categoryId, { name: renameValue.trim() });
      setIsRenamingCategory(false);
    }
  };

  const handleSaveNewCategory = () => {
    if (!newCatName.trim()) return;
    const created = createCategory({
      name: newCatName.trim(),
      type: 'expense',
      color: '#F97316',
      icon: 'Tag',
    });
    setCategoryId((created as any)?.id || categoryId);
    setNewCatName('');
    setIsCreatingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền ngân sách lớn hơn 0');
      return;
    }
    if (!categoryId) {
      alert('Vui lòng chọn danh mục chi tiêu');
      return;
    }

    saveBudget(categoryId, amount, month, editingBudget?.id);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800">
            {editingBudget ? 'Chỉnh sửa ngân sách' : 'Thiết lập ngân sách chi tiêu'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            title="Đóng (Phím Esc)"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Áp dụng cho tháng
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Danh mục chi tiêu
              </label>
              <div className="flex items-center space-x-2 text-2xs">
                {!isRenamingCategory && !isCreatingCategory && (
                  <>
                    <button
                      type="button"
                      onClick={handleStartRename}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Đổi tên mục này</span>
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCategory(true);
                        setIsRenamingCategory(false);
                      }}
                      className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tạo mục mới</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* If renaming */}
            {isRenamingCategory ? (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                <span className="text-2xs text-blue-700 font-bold block">
                  Đổi tên trực tiếp danh mục "{currentCategory?.name}":
                </span>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên mới (VD: Tiền ăn hàng ngày...)"
                  />
                  <button
                    type="button"
                    onClick={handleSaveRename}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Lưu tên
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenamingCategory(false)}
                    className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : isCreatingCategory ? (
              /* If creating new category */
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                <span className="text-2xs text-emerald-800 font-bold block">
                  Tạo nhanh danh mục chi tiêu mới:
                </span>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCatName}
                    autoFocus
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="VD: Tiền trọ, Học phí, Xăng xe..."
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewCategory}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                  >
                    Tạo & Chọn
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(false)}
                    className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              /* Normal Select Dropdown */
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <QuickAmountInput
            label="Hạn mức chi tiêu tối đa (VNĐ)"
            value={amountStr}
            onChange={setAmountStr}
            presets={[
              { label: '100k', value: 100000 },
              { label: '200k', value: 200000 },
              { label: '300k', value: 300000 },
              { label: '500k', value: 500000 },
              { label: '1 Tr', value: 1000000 },
              { label: '2 Tr', value: 2000000 },
              { label: '3 Tr', value: 3000000 },
              { label: '5 Tr', value: 5000000 },
            ]}
            addChips={[
              { label: '+50k', value: 50000 },
              { label: '+100k', value: 100000 },
              { label: '+200k', value: 200000 },
              { label: '+500k', value: 500000 },
              { label: '+1 Tr', value: 1000000 },
            ]}
          />

          <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800 leading-relaxed">
            Hệ thống sẽ gửi cảnh báo tự động khi bạn chi tiêu chạm mức <strong>80%</strong> và khi <strong>vượt quá 100%</strong> hạn mức này.
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Lưu ngân sách</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

