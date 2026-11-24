'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

type UserRowActionMenuProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
};

export default function UserRowActionMenu({ open, anchorEl, onClose, children }: UserRowActionMenuProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const menuW = 208;
    const menuH = menuRef.current?.offsetHeight ?? 220;
    const gap = 6;
    let top = rect.bottom + gap;
    let left = Math.min(rect.left, window.innerWidth - menuW - 8);
    if (top + menuH > window.innerHeight - 8) {
      top = rect.top - gap - menuH;
    }
    if (top < 8) top = 8;
    setStyle({ top, left, width: menuW });
  }, [anchorEl]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, anchorEl, updatePosition, children]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updatePosition]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[200]" aria-hidden onClick={onClose} />
          <motion.div
            ref={menuRef}
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="fixed z-[201] bg-white rounded-2xl shadow-2xl border border-nexa-border p-2 space-y-0.5"
            style={style}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
