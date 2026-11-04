import { useEffect } from 'react';

/**
 * Hook lắng nghe phím 'Escape' (Esc) trên bàn phím máy tính
 * để đóng modal / cửa sổ popup ngay lập tức.
 */
export function useModalEscape(onClose: () => void, isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isOpen]);
}

