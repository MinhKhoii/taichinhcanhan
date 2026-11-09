import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { SavingsGoal } from '../types';
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { formatVND, formatCompactVND, formatDateVN } from '../utils/formatters';
import { DynamicIcon } from '../components/common/DynamicIcon';
import { GoalModal } from '../components/modals/GoalModal';
import { GoalDepositModal } from '../components/modals/GoalDepositModal';
import { differenceInDays, parseISO, isAfter } from 'date-fns';

export const SavingsPage: React.FC = () => {
  const { savingsGoals, deleteSavingsGoal, accounts } = useFinancial();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<SavingsGoal | null>(null);

  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Overall statistics
  const totalTargetAmount = useMemo(
    () => savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0),
    [savingsGoals]
  );
  const totalSavedAmount = useMemo(
    () => savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0),
    [savingsGoals]
  );
  const averageProgress = totalTargetAmount > 0 ? Math.round((totalSavedAmount / totalTargetAmount) * 100) : 0;
  const completedGoalsCount = savingsGoals.filter((g) => g.isCompleted || g.currentAmount >= g.targetAmount).length;

  const handleOpenCreate = () => {
    setEditingGoal(null);
    setIsGoalModalOpen(true);
  };

  const handleOpenEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  const handleOpenDeposit = (goal: SavingsGoal) => {
    setSelectedGoalForDeposit(goal);
    setIsDepositModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Mục tiêu tiết kiệm tài chính
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Xây dựng kỷ luật tài chính, hiện thực hóa các giấc mơ dài hạn và quỹ dự phòng
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo mục tiêu mới</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-3xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-300">
            Tổng giá trị mục tiêu
          </span>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {formatVND(totalTargetAmount)}
            </h3>
            <p className="text-2xs text-slate-300 mt-1">
              Đang theo đuổi {savingsGoals.length} mục tiêu
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Đã tích lũy thành công
          </span>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
              {formatVND(totalSavedAmount)}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">
              Chiếm {averageProgress}% tổng kế hoạch
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Còn cần tích lũy thêm
          </span>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {formatVND(Math.max(0, totalTargetAmount - totalSavedAmount))}
            </h3>
            <p className="text-2xs text-slate-400 mt-1">
              Dự kiến theo hạn định cam kết
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Tỷ lệ hoàn thành
          </span>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black text-blue-600">
                {completedGoalsCount} / {savingsGoals.length}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                {averageProgress}%
              </span>
            </div>
            <p className="text-2xs text-slate-400 mt-1">
              Mục tiêu đã hoàn tất 100%
            </p>
          </div>
        </div>
      </div>

      {/* Savings Goals Grid */}
      {savingsGoals.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Chưa có mục tiêu tiết kiệm nào
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy đặt ra mục tiêu tài chính như mua xe, du lịch, mua nhà hoặc xây dựng quỹ khẩn cấp để MoneyFlow đồng hành cùng bạn.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
          >
            + Tạo mục tiêu đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savingsGoals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100));
          const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

          // Calculate remaining days, months & recommended contribution
          let daysLeft = 0;
          let monthsLeft = 1;
          try {
            const deadlineDate = parseISO(goal.deadline);
            daysLeft = Math.max(0, differenceInDays(deadlineDate, new Date()));
            // Tính số tháng thực tế làm tròn (mỗi tháng 30 ngày)
            monthsLeft = Math.max(1, Math.round(daysLeft / 30));
          } catch {
            daysLeft = 30;
            monthsLeft = 1;
          }

          const monthlyNeeded = Math.round(remainingAmount / monthsLeft);
          const isFinished = pct >= 100 || goal.isCompleted;

          const linkedAcc = goal.linkedAccountId ? accMap.get(goal.linkedAccountId) : null;

          return (
            <div
              key={goal.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs card-hover flex flex-col justify-between relative overflow-hidden group"
            >
              {/* Top Accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: goal.color || '#3B82F6' }}
              />

              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-2xs"
                      style={{ backgroundColor: goal.color || '#3B82F6' }}
                    >
                      <DynamicIcon name={goal.icon || 'Target'} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                        {goal.name}
                      </h3>
                      {linkedAcc && (
                        <span className="text-2xs text-slate-400 font-medium">
                          Nguồn: {linkedAcc.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      title="Sửa mục tiêu"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa mục tiêu "${goal.name}"?`)) {
                          deleteSavingsGoal(goal.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Xóa mục tiêu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Circle & Amount */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Đã tích lũy: {formatVND(goal.currentAmount)}
                    </span>
                    <span className="font-black text-blue-600 text-sm">{pct}%</span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-2xs text-slate-400">
                    <span>Mục tiêu: {formatCompactVND(goal.targetAmount)}</span>
                    <span>Còn thiếu: {formatCompactVND(remainingAmount)}</span>
                  </div>
                </div>

                {/* Monthly Recommendation Box */}
                {!isFinished ? (
                  <div className="mt-4 p-3 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-1.5">
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-600" />
                        Thời hạn: {formatDateVN(goal.deadline)} (còn {daysLeft} ngày ~ {monthsLeft} tháng)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span className="text-2xs text-slate-500 font-normal">
                        Cần tiết kiệm mỗi tháng:
                      </span>
                      <span className="text-blue-700 font-bold">
                        {formatVND(monthlyNeeded)}/th
                      </span>
                    </div>
                    <p className="text-3xs text-slate-400">
                      Công thức: Còn thiếu {formatCompactVND(remainingAmount)} ÷ {monthsLeft} tháng
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Mục tiêu đã hoàn thành 100%!</span>
                  </div>
                )}
              </div>

              {/* Deposit Action */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenDeposit(goal)}
                  className="w-full py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>Nạp tiền vào mục tiêu</span>
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        editingGoal={editingGoal}
      />

      <GoalDepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        goal={selectedGoalForDeposit}
      />
    </div>
  );
};

