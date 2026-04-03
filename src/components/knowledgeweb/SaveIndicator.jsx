import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function SaveIndicator({ status }) {
  // status: 'idle' | 'saving' | 'saved' | 'error'
  const [visible, setVisible] = useState(false);
  const saveCountRef = useRef(0);
  const SHOW_EVERY_N = 10;

  useEffect(() => {
    if (status === 'saving') {
      saveCountRef.current += 1;
      // Only show the indicator every Nth save or on error
      if (saveCountRef.current % SHOW_EVERY_N === 0) {
        setVisible(true);
      }
    } else if (status === 'saved') {
      // If we were showing it, briefly show "Saved" then hide
      if (visible) {
        const t = setTimeout(() => setVisible(false), 800);
        return () => clearTimeout(t);
      }
    } else if (status === 'error') {
      // Always show errors
      setVisible(true);
    } else if (status === 'idle') {
      // Hide after a bit
      const t = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <AnimatePresence>
      {visible && status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800/90 border border-gray-700 text-xs"
        >
          {status === 'saving' && (
            <>
              <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="text-gray-400">Saving...</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <Check className="w-3 h-3 text-green-400" />
              <span className="text-green-400">Saved</span>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span className="text-red-400">Save failed</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}