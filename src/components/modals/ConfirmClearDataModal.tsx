import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Download, Trash2, X, ShieldAlert } from 'lucide-react';
import { useModalEscape } from '../../hooks/useModalEscape';

interface ConfirmClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onAutoBackup: () => void;
  stats: {
    transactionCount: number;
    accountCount: number;
    debtCount: number;
    goalCount: number;
  };
}

export const ConfirmClearDataModal: React.FC<ConfirmClearDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onAutoBackup,
  stats,
}) => {
  useModalEscape(onClose, isOpen);

  const [confirmText, setConfirmText] = useState('');
  const [autoBackup, setAutoBackup] = useState(true);

  // Reset input when opening
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setAutoBackup(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed =
    confirmText.trim().toUpperCase() === 'XÓA' ||
    confirmText.trim().toUpperCase() === 'XOA';

  const handleExecute = () => {
    if (!isConfirmed) return;
    if (autoBackup) {
      onAutoBackup();
    }
    onConfirm();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Alert */}
        <div className="p-6 bg-gradient-to-b from-rose-50 to-white pb-4 border-b border-rose-100/80">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-3xs uppercase tracking-wider font-bold text-rose-600 block">
                  Xác nhận hành động nguy hiểm
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-800">
                  Xóa sạch toàn bộ dữ liệu?
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Warning box */}
          <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200/80 text-rose-800 space-y-1.5 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              Hành động này sẽ xóa vĩnh viễn trên máy tính:
            </p>
            <ul className="list-disc list-inside pl-1 space-y-0.5 text-2xs text-rose-700">
              <li><strong>{stats.transactionCount}</strong> giao dịch thu / chi</li>
              <li><strong>{stats.accountCount}</strong> tài khoản & số dư các ví</li>
              <li><strong>{stats.debtCount}</strong> khoản nợ & cho vay</li>
              <li><strong>{stats.goalCount}</strong> mục tiêu tích lũy</li>
            </ul>
          </div>

          {/* Auto-backup safeguard option */}
          <label className="flex items-start space-x-3 p-3 bg-blue-50/60 rounded-2xl border border-blue-100 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoBackup}
              onChange={(e) => setAutoBackup(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <div className="text-2xs text-slate-700 leading-relaxed">
              <strong className="text-blue-900 block font-semibold flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-blue-600" />
                Tự động tải về 1 bản sao lưu JSON trước khi xóa (Khuyên dùng)
              </strong>
              <span>Nếu lỡ tay xóa nhầm, bạn chỉ cần chọn lại file sao lưu này để khôi phục lại 100% dữ liệu.</span>
            </div>
          </label>

          {/* Type confirmation safeguard */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-semibold text-slate-700">
              Để xác nhận chắc chắn, vui lòng gõ chữ <strong className="text-rose-600 font-black">XÓA</strong> vào ô bên dưới:
            </label>
            <input
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Nhập chữ "XÓA" để mở khóa...'
              className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 uppercase tracking-widest text-center"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            Hủy bỏ an toàn
          </button>
          <button
            type="button"
            disabled={!isConfirmed}
            onClick={handleExecute}
            className={`flex items-center space-x-1.5 px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs ${
              isConfirmed
                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xác nhận xóa sạch</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

