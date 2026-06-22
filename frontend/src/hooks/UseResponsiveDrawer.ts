import { useState, useEffect, useRef, useCallback } from 'react';

const MOBILE_BREAKPOINT = 1024;
const SWIPE_THRESHOLD = 60;
const SWIPE_EDGE_THRESHOLD = 30;

interface UseResponsiveDrawerOptions {
  onOpen?: () => void;
  onClose?: () => void;
}

export function useResponsiveDrawer(options: UseResponsiveDrawerOptions = {}) {
  const { onOpen, onClose } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
    if (window.history.state?.drawerOpen !== true) {
      window.history.pushState({ drawerOpen: true }, '');
    }
  }, [onOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
    if (window.history.state?.drawerOpen === true) {
      window.history.back();
    }
  }, [onClose]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [isOpen, handleOpen, handleClose]);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile && isOpen) {
        setIsOpen(false);
        if (window.history.state?.drawerOpen === true) {
          window.history.back();
        }
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && isMobile) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMobile, handleClose]);

  useEffect(() => {
    const handlePopState = () => {
      if (isOpen) {
        setIsOpen(false);
        onClose?.();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      isDragging.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isDragging.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || !isDragging.current) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const startFromLeftEdge = touchStartX.current < SWIPE_EDGE_THRESHOLD;

      if (!isOpen && startFromLeftEdge && deltaX > SWIPE_THRESHOLD) {
        handleOpen();
      } else if (isOpen && deltaX < -SWIPE_THRESHOLD) {
        handleClose();
      }

      touchStartX.current = null;
      touchStartY.current = null;
      isDragging.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isOpen, handleOpen, handleClose]);

  useEffect(() => {
    return () => {
      if (window.history.state?.drawerOpen === true) {
        window.history.back();
      }
    };
  }, []);

  return {
    isOpen,
    isMobile,
    open: handleOpen,
    close: handleClose,
    toggle: handleToggle,
    setIsOpen,
  };
}
