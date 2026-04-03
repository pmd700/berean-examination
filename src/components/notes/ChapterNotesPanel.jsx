import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RichTextEditor from '../editor/RichTextEditor';
import SaveStatusIndicator from '../editor/SaveStatusIndicator';
import { formatInTz, getUserTimezone } from '../utils/timezoneUtils';

export default function ChapterNotesPanel({
  isOpen,
  onClose,
  content,
  onChange,
  saveStatus,
  lastEditedDate,
  user
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Desktop backdrop (click to close) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
            className="hidden lg:block fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: prefersReducedMotion ? 0 : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: prefersReducedMotion ? 0 : '100%' }}
            transition={{ 
              duration: prefersReducedMotion ? 0 : 0.28,
              ease: [0.32, 0.72, 0, 1]
            }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] lg:w-[480px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Chapter Notes
                  </h2>
                  {lastEditedDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Last edited {formatInTz(lastEditedDate, getUserTimezone(user))}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <SaveStatusIndicator status={saveStatus} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                General notes for this chapter (not tied to a verse)
              </p>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto p-6">
              <RichTextEditor
                content={content}
                onChange={onChange}
                placeholder="Add your general notes about this chapter..."
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}