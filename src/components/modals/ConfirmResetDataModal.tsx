import React from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X, Info } from 'lucide-react';
import { useModalEscape } from '../../hooks/useModalEscape';

interface ConfirmResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmResetDataModal: React.FC<ConfirmResetDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  useModalEscape(onClose, isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-gradient-to-b from-indigo-50 to-white pb-4 border-b border-indigo-100/80">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
                <RotateCcw className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <span className="text-3xs uppercase tracking-wider font-bold text-indigo-600 block">
                  Khôi phục dữ liệu mẫu
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-800">
                  Nạp lại 50+ giao dịch mẫu?
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

        <div className="p-6 space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Thao tác này sẽ làm mới toàn bộ hệ thống về trạng thái ban đầu với <strong>50+ giao dịch thu chi mẫu</strong>, 3 tài khoản ví mẫu và các mục tiêu tiết kiệm giả định để trải nghiệm.
          </p>
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-2xs text-amber-800 flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Lưu ý:</strong> Mọi giao dịch bạn đã tự ghi chép sẽ được thay thế bằng bộ dữ liệu mẫu này.
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đồng ý nạp lại</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

