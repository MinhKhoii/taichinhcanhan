import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { SavingsGoal } from '../../types';
import {
  X,
  Check,
  Target,
  ShieldCheck,
  Car,
  Home,
  Plane,
  Heart,
  Laptop,
  Gift,
  Sparkles,
  Clock,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { DynamicIcon } from '../common/DynamicIcon';
import { QuickAmountInput } from '../common/QuickAmountInput';
import { useModalEscape } from '../../hooks/useModalEscape';
import { formatVND, getLocalDateString } from '../../utils/formatters';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGoal?: SavingsGoal | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  editingGoal,
}) => {
  const { accounts, createSavingsGoal, updateSavingsGoal } = useFinancial();

  const [name, setName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [currentAmountStr, setCurrentAmountStr] = useState('');
  const [deadline, setDeadline] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [icon, setIcon] = useState('Target');
  const [color, setColor] = useState('#3B82F6');

  useEffect(() => {
    if (!isOpen) return;

    if (editingGoal) {
      setName(editingGoal.name);
      setTargetAmountStr(editingGoal.targetAmount.toString());
      setCurrentAmountStr(editingGoal.currentAmount.toString());
      setDeadline(editingGoal.deadline);
      setLinkedAccountId(editingGoal.linkedAccountId || '');
      setNotes(editingGoal.notes || '');
      setIcon(editingGoal.icon || 'Target');
      setColor(editingGoal.color || '#3B82F6');
    } else {
      setName('');
      setTargetAmountStr('30000000');
      setCurrentAmountStr('0');
      // Default deadline: 6 months from now
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      setDeadline(getLocalDateString(d));
      const defaultAcc = accounts.find((a) => a.balance > 0) || accounts[0];
      setLinkedAccountId(defaultAcc?.id || '');
      setNotes('');
      setIcon('Target');
      setColor('#3B82F6');
    }
  }, [editingGoal, isOpen]);

  useModalEscape(onClose, isOpen);

  // Calculate remaining amount and monthly savings needed
  const savingsPlan = useMemo(() => {
    const targetAmount = parseInt(targetAmountStr.replace(/[^0-9]/g, '') || '0', 10);
    const currentAmount = parseInt(currentAmountStr.replace(/[^0-9]/g, '') || '0', 10);
    const remaining = Math.max(0, targetAmount - currentAmount);

    if (!deadline || targetAmount <= 0) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(deadline);
    dueDate.setHours(0, 0, 0, 0);

    const diffMs = dueDate.getTime() - today.getTime();
    if (diffMs <= 0) {
      return {
        isPast: true,
        remaining,
        days: 0,
        months: 0,
        perMonth: remaining,
        perDay: remaining,
        isCompleted: targetAmount > 0 && currentAmount >= targetAmount,
      };
    }

    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const diffMonths = Math.max(1, Math.round(diffDays / 30.44));

    const perMonth = Math.ceil(remaining / diffMonths);
    const perDay = Math.ceil(remaining / diffDays);

    return {
      isPast: false,
      remaining,
      days: diffDays,
      months: diffMonths,
      perMonth,
      perDay,
      isCompleted: targetAmount > 0 && currentAmount >= targetAmount,
    };
  }, [targetAmountStr, currentAmountStr, deadline]);

  const setPresetMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setDeadline(getLocalDateString(d));
  };

  const applyPlanToNotes = () => {
    if (!savingsPlan || savingsPlan.remaining <= 0) return;
    const planText = `Trích ${formatVND(savingsPlan.perMonth)} mỗi tháng sau khi nhận lương (hoặc ~${formatVND(savingsPlan.perDay)}/ngày) để hoàn thành đúng hạn.`;
    setNotes(planText);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmount = parseInt(targetAmountStr.replace(/[^0-9]/g, '') || '0', 10);
    const currentAmount = parseInt(currentAmountStr.replace(/[^0-9]/g, '') || '0', 10);

    if (!name.trim()) {
      alert('Vui lòng nhập tên mục tiêu tài chính');
      return;
    }
    if (!targetAmount || targetAmount <= 0) {
      alert('Vui lòng nhập số tiền mục tiêu hợp lệ');
      return;
    }
    if (!deadline) {
      alert('Vui lòng chọn thời hạn hoàn thành mục tiêu');
      return;
    }

    if (editingGoal) {
      updateSavingsGoal(editingGoal.id, {
        name,
        targetAmount,
        currentAmount,
        deadline,
        linkedAccountId: linkedAccountId || undefined,
        notes,
        icon,
        color,
      });
    } else {
      createSavingsGoal({
        name,
        targetAmount,
        currentAmount,
        deadline,
        linkedAccountId: linkedAccountId || undefined,
        notes,
        icon,
        color,
      });
    }
    onClose();
  };

  const goalIcons = [
    { name: 'Target', label: 'Mục tiêu' },
    { name: 'ShieldCheck', label: 'Dự phòng' },
    { name: 'Car', label: 'Mua xe' },
    { name: 'Home', label: 'Mua nhà' },
    { name: 'Plane', label: 'Du lịch' },
    { name: 'Laptop', label: 'Công nghệ' },
    { name: 'Heart', label: 'Gia đình' },
    { name: 'Gift', label: 'Quà tặng' },
  ];

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
            {editingGoal ? 'Chỉnh sửa mục tiêu' : 'Thiết lập mục tiêu tài chính'}
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
              Tên mục tiêu tiết kiệm
            </label>
            <input
              type="text"
              required
              placeholder="VD: Quỹ khẩn cấp, Mua xe điện, Du lịch Châu Âu..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAmountInput
              label="Số tiền mục tiêu (VNĐ)"
              value={targetAmountStr}
              onChange={setTargetAmountStr}
              presets={[
                { label: '10 Tr', value: 10000000 },
                { label: '30 Tr', value: 30000000 },
                { label: '50 Tr', value: 50000000 },
                { label: '100 Tr', value: 100000000 },
                { label: '200 Tr', value: 200000000 },
              ]}
              addChips={[
                { label: '+5 Tr', value: 5000000 },
                { label: '+10 Tr', value: 10000000 },
                { label: '+20 Tr', value: 20000000 },
              ]}
            />
            <QuickAmountInput
              label="Đã tích lũy hiện tại (VNĐ)"
              value={currentAmountStr}
              onChange={setCurrentAmountStr}
              presets={[
                { label: '1 Tr', value: 1000000 },
                { label: '5 Tr', value: 5000000 },
                { label: '10 Tr', value: 10000000 },
                { label: '20 Tr', value: 20000000 },
              ]}
              addChips={[
                { label: '+1 Tr', value: 1000000 },
                { label: '+2 Tr', value: 2000000 },
                { label: '+5 Tr', value: 5000000 },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5 h-6">
                <label className="text-xs font-semibold text-slate-700">
                  Thời hạn hoàn thành
                </label>
                <div className="flex items-center space-x-1">
                  {[
                    { label: '3T', months: 3, title: '3 tháng' },
                    { label: '6T', months: 6, title: '6 tháng' },
                    { label: '1N', months: 12, title: '1 năm' },
                    { label: '2N', months: 24, title: '2 năm' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setPresetMonths(p.months)}
                      title={`Đặt nhanh ${p.title}`}
                      className="px-1.5 py-0.5 text-3xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5 h-6">
                Liên kết tài khoản
              </label>
              <select
                value={linkedAccountId}
                onChange={(e) => setLinkedAccountId(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Không liên kết cụ thể</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Smart Savings Suggestion Box */}
          {savingsPlan && (
            <div className="rounded-2xl border p-3.5 space-y-2 bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-blue-50/80 border-emerald-200/90 text-xs shadow-xs animate-in fade-in duration-200">
              {savingsPlan.isCompleted ? (
                <div className="flex items-center space-x-2 text-emerald-800 font-bold py-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>🎉 Chúc mừng! Bạn đã tích lũy đủ 100% số tiền mục tiêu đề ra!</span>
                </div>
              ) : savingsPlan.isPast ? (
                <div className="text-amber-800 text-2xs font-medium py-1">
                  ⚠️ Ngày hoàn thành đã qua. Vui lòng chọn thời hạn trong tương lai để hệ thống gợi ý kế hoạch tiết kiệm mỗi tháng.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-3xs uppercase tracking-wider font-bold text-emerald-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      Gợi ý kế hoạch tiết kiệm tự động
                    </span>
                    <span className="text-3xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Còn {savingsPlan.months} tháng ({savingsPlan.days} ngày)
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pt-0.5">
                    <div>
                      <span className="text-2xs text-slate-500 block">Số tiền cần tiết kiệm mỗi tháng:</span>
                      <div className="flex items-baseline space-x-1.5 mt-0.5">
                        <span className="text-xl font-black text-emerald-700 tracking-tight">
                          {formatVND(savingsPlan.perMonth)}
                        </span>
                        <span className="text-xs font-bold text-emerald-600">/ tháng</span>
                      </div>
                    </div>
                    <div className="text-2xs text-slate-500">
                      Hoặc khoảng <strong className="text-slate-800 font-bold">{formatVND(savingsPlan.perDay)}</strong> / ngày
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-emerald-200/60 text-2xs gap-1.5">
                    <span className="text-slate-600">
                      Còn thiếu: <strong className="text-slate-800 font-bold">{formatVND(savingsPlan.remaining)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={applyPlanToNotes}
                      className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline cursor-pointer w-fit"
                      title="Tự động điền mức trích này vào ô Ghi chú kế hoạch bên dưới"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Áp dụng vào Ghi chú kế hoạch</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Biểu tượng mục tiêu
            </label>
            <div className="grid grid-cols-4 gap-2">
              {goalIcons.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => setIcon(item.name)}
                  className={`flex items-center space-x-1.5 p-2 rounded-xl border text-xs transition-all ${
                    icon === item.name
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <DynamicIcon name={item.name} className="w-4 h-4" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú kế hoạch
            </label>
            <textarea
              rows={2}
              placeholder="VD: Trích 3.000.000đ mỗi tháng sau khi nhận lương..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
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
              <span>{editingGoal ? 'Lưu cập nhật' : 'Tạo mục tiêu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

