import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  MoreVertical,
  Share,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  Laptop,
  ArrowRight,
  Download,
  Info,
} from 'lucide-react';
import { useModalEscape } from '../../hooks/useModalEscape';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPromptInstall?: () => void;
  canPromptDirectly?: boolean;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  onClose,
  onPromptInstall,
  canPromptDirectly = false,
}) => {
  useModalEscape(onClose, isOpen);

  // Detect device platform
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-slate-800/40 dark:to-indigo-950/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Cài ra màn hình chính
                <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  Dùng như App
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mở nhanh 1 chạm • Toàn màn hình • Không vướng thanh duyệt web
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platform === 'android'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android (Chrome)</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('ios')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platform === 'ios'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <span>🍎 iPhone (Safari)</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('desktop')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              platform === 'desktop'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Máy tính</span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-slate-700 dark:text-slate-300">
          {canPromptDirectly && onPromptInstall && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-md">
              <div>
                <p className="text-xs font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Trình duyệt hỗ trợ cài đặt tự động!
                </p>
                <p className="text-2xs text-blue-100 mt-0.5">Bấm nút bên cạnh để thêm ngay trong 1 giây</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onPromptInstall();
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs font-bold bg-white text-blue-700 hover:bg-blue-50 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Cài đặt ngay
              </button>
            </div>
          )}

          {/* Android Chrome Instructions */}
          {platform === 'android' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  Bạn đang mở trang trên <strong>Google Chrome</strong> hoặc <strong>Cốc Cốc</strong> trên điện thoại. Hãy thực hiện 3 bước đơn giản dưới đây:
                </p>
              </div>

              {/* Step 1 */}
              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                    Bấm vào biểu tượng 3 chấm
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                      <MoreVertical className="w-3.5 h-3.5 inline mr-0.5" /> 3 dấu chấm (⋮)
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Nằm ở <strong>góc trên bên phải màn hình</strong> của thanh trình duyệt (ngay cạnh thanh địa chỉ <i>minhkhoii.github.io</i>).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                    Chọn dòng
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                      <Download className="w-3.5 h-3.5 inline mr-1" /> "Cài đặt ứng dụng"
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    (Hoặc <strong>"Thêm vào màn hình chính"</strong> / <i>"Add to Home screen"</i>).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Bấm xác nhận "Cài đặt" (hoặc "Thêm")
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Biểu tượng <strong>MoneyFlow</strong> sẽ xuất hiện ngay ngoài màn hình chính điện thoại của bạn giống hệt như các app khác!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* iOS Safari Instructions */}
          {platform === 'ios' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                  Trên iPhone/iPad, Apple yêu cầu mở bằng trình duyệt <strong>Safari</strong> để đưa app ra ngoài màn hình chính.
                </p>
              </div>

              {/* Step 1 */}
              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                    Bấm nút Chia sẻ
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                      <Share className="w-3.5 h-3.5 inline mr-1" /> Biểu tượng chia sẻ ⎋
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Nằm ở thanh công cụ dưới đáy màn hình Safari.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                    Cuộn xuống chọn
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                      <PlusSquare className="w-3.5 h-3.5 inline mr-1" /> "Thêm vào MH chính"
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    (Hoặc <i>"Add to Home Screen"</i>).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Bấm "Thêm" ở góc trên bên phải
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    App MoneyFlow sẽ nằm ngay trên màn hình iPhone, bấm vào là vào thẳng app toàn màn hình không có viền duyệt web!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Chrome / Edge Instructions */}
          {platform === 'desktop' && (
            <div className="space-y-3.5">
              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Nhìn vào thanh địa chỉ URL ở trên cùng
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Bấm vào biểu tượng <strong>Cài đặt</strong> (hình màn hình vi tính nhỏ hoặc mũi tên tải xuống nằm ở bên phải thanh gõ link web).
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Bấm xác nhận "Cài đặt" (Install)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    MoneyFlow sẽ mở trong một cửa sổ riêng độc lập, có thể ghim vào thanh Taskbar để mở nhanh hàng ngày!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Features list */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
            <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">
              Lợi ích khi cài ra màn hình chính:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Mở 1 chạm ngay lập tức</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Toàn màn hình không bị che</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Không tốn bộ nhớ máy (siêu nhẹ)</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Tự động cập nhật phiên bản mới</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 flex items-center justify-between">
          <p className="text-2xs text-slate-400">
            MoneyFlow Smart Wealth Engine
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Đã hiểu, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
};
