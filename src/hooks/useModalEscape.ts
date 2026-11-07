import { useEffect } from 'react';

// Quản lý số lượng modal đang mở đồng thời (để tránh mở modal lồng nhau khi đóng 1 cái bị mở khóa nhầm)
let activeModalsCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyOverscroll = '';
let originalPaddingRight = '';

// Listener touchmove toàn cục để chặn cuộn nền trên thiết bị di động
let touchMoveListener: ((e: TouchEvent) => void) | null = null;

/**
 * Hook đa năng cho tất cả Modal trong MoneyFlow:
 * 1. Lắng nghe phím 'Escape' (Esc) để đóng modal ngay lập tức
 * 2. Tự động KHÓA CUỘN trang nền (Body Scroll Lock), ngăn triệt để hiện tượng cuộn nhầm trang mờ phía dưới
 * 3. Chống scroll-chaining & chặn kéo màn hình nền trên điện thoại di động
 */
export function useModalEscape(onClose: () => void, isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return;

    // 1. Khóa cuộn trang nền khi modal mở
    if (activeModalsCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalHtmlOverflow = document.documentElement.style.overflow;
      originalBodyOverscroll = document.body.style.overscrollBehavior;
      originalPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      // Ngăn cuộn trang nền khi vuốt trên màn hình cảm ứng di động
      touchMoveListener = (e: TouchEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        // Cho phép cuộn nếu thao tác nằm bên trong vùng cuộn của modal (.overflow-y-auto, .overflow-auto, v.v.)
        const isScrollable = target.closest('.overflow-y-auto, .overflow-auto, textarea, input[type="range"]');
        if (!isScrollable) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      };
      window.addEventListener('touchmove', touchMoveListener, { passive: false });
    }
    activeModalsCount++;

    // 2. Lắng nghe phím Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 3. Khôi phục trạng thái ban đầu khi modal đóng
    return () => {
      window.removeEventListener('keydown', handleKeyDown);

      activeModalsCount = Math.max(0, activeModalsCount - 1);
      if (activeModalsCount === 0) {
        if (touchMoveListener) {
          window.removeEventListener('touchmove', touchMoveListener);
          touchMoveListener = null;
        }

        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
        document.documentElement.style.overscrollBehavior = '';
        document.body.style.paddingRight = originalPaddingRight;
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
      }
    };
  }, [onClose, isOpen]);
}
