import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { base44 } from '@/api/base44Client';

import RadialMenuCluster from './RadialMenuCluster';

const SAFE_MARGIN = 30;
const POS_KEY = 'globalNavPos';

function clampToViewport(x, y) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.max(SAFE_MARGIN, Math.min(vw - SAFE_MARGIN, x)),
    y: Math.max(SAFE_MARGIN, Math.min(vh - SAFE_MARGIN, y)),
  };
}

function percentToPixels(pct) {
  if (!pct) return null;
  return clampToViewport(
    (pct.xPct / 100) * window.innerWidth,
    (pct.yPct / 100) * window.innerHeight
  );
}

function pixelsToPercent(px) {
  return {
    xPct: (px.x / window.innerWidth) * 100,
    yPct: (px.y / window.innerHeight) * 100,
  };
}

export default function GlobalNav({ isAdmin }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const navRef = useRef(null);

  // Position: null = default bottom-center
  const [pos, setPos] = useState(() => {
    // Try localStorage first (instant), user data overrides later
    const saved = localStorage.getItem(POS_KEY);
    if (saved) {
      try {
        const pct = JSON.parse(saved);
        return percentToPixels(pct);
      } catch {}
    }
    return null;
  });

  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  // Load saved position from user profile (overrides localStorage)
  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        if (user?.nav_position) {
          const pct = typeof user.nav_position === 'string' ? JSON.parse(user.nav_position) : user.nav_position;
          if (pct.xPct != null && pct.yPct != null) {
            const px = percentToPixels(pct);
            setPos(px);
            localStorage.setItem(POS_KEY, JSON.stringify(pct));
          }
        }
      } catch {}
    })();
  }, []);

  // Re-clamp on window resize
  useEffect(() => {
    const handleResize = () => {
      setPos(prev => {
        if (!prev) return null;
        return clampToViewport(prev.x, prev.y);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close on outside click / escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setIsOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const savePosition = useCallback((px) => {
    const pct = pixelsToPercent(px);
    localStorage.setItem(POS_KEY, JSON.stringify(pct));
    // Persist to user profile (fire and forget)
    base44.auth.updateMe({ nav_position: JSON.stringify(pct) }).catch(() => {});
  }, []);

  // Shared move/end logic
  const handleDragMove = useCallback((clientX, clientY) => {
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      if (!didDrag.current) {
        didDrag.current = true;
        setIsOpen(false); // close menu immediately when drag starts
      }
    }
    const clamped = clampToViewport(posStart.current.x + dx, posStart.current.y + dy);
    setPos(clamped);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragging.current = false;
    setPos(prev => {
      if (prev) savePosition(prev);
      return prev;
    });
  }, [savePosition]);

  // Mouse drag
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    didDrag.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    const el = navRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      posStart.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    const onMove = (ev) => handleDragMove(ev.clientX, ev.clientY);
    const onUp = () => {
      handleDragEnd();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [handleDragMove, handleDragEnd]);

  // Touch drag
  const onTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    dragging.current = true;
    didDrag.current = false;
    dragStart.current = { x: t.clientX, y: t.clientY };
    const el = navRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      posStart.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    const onMove = (ev) => {
      if (ev.touches.length !== 1) return;
      ev.preventDefault();
      handleDragMove(ev.touches[0].clientX, ev.touches[0].clientY);
    };
    const onEnd = () => {
      handleDragEnd();
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }, [handleDragMove, handleDragEnd]);

  const handleClick = () => {
    if (didDrag.current) return;
    setIsOpen(prev => !prev);
  };

  // Close on scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  // Compute fresh center position for RadialMenuCluster
  const centerPos = pos || {
    x: window.innerWidth / 2,
    y: window.innerHeight - 32 - 28,
  };

  const style = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', zIndex: 50 }
    : { position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 50 };

  return (
    <div ref={navRef} style={{ ...style, overflow: 'visible' }}>
      <RadialMenuCluster
        isAdmin={isAdmin}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        hoveredIndex={hoveredIndex}
        setHoveredIndex={setHoveredIndex}
        anchorPos={centerPos}
      />

      <button
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onMouseEnter={() => {
          if (window.innerWidth >= 768 && !dragging.current) setIsOpen(true);
        }}
        onClick={handleClick}
        className="relative group cursor-grab active:cursor-grabbing touch-none"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all"
        >
          <Home className="w-6 h-6" />
        </motion.div>
        <div className="absolute inset-0 rounded-full bg-orange-500/20 dark:bg-orange-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
      </button>
    </div>
  );
}