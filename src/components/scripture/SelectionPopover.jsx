import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Copy, Check, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HighlightColorPicker from './HighlightColorPicker';

export default function SelectionPopover({ 
  visible, 
  position, 
  onAddAnnotation, 
  onCopy,
  onCreateDrawing,
  onHighlight,
  onRemoveHighlight,
  hasExistingHighlight,
  copied 
}) {
  if (!visible) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed z-40"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => e.stopPropagation()}
        data-selection-popover="true"
      >
        <div className="flex flex-col items-center gap-1.5">
          {/* Main actions row */}
          <div className="flex items-center gap-1 bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-full px-2 py-1.5 shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-purple-600/20 hover:text-purple-400 text-white transition-all active:scale-90"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddAnnotation();
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-5 bg-gray-700" />
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-purple-600/20 hover:text-purple-400 text-white transition-all active:scale-90"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCopy();
              }}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>

            <div className="w-px h-5 bg-gray-700" />
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-purple-600/20 hover:text-purple-400 text-white transition-all active:scale-90"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCreateDrawing();
              }}
              title="Create Drawing"
            >
              <PenLine className="w-4 h-4" />
            </Button>
          </div>

          {/* Highlight colors row */}
          <div className="bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-full px-2.5 py-1.5 shadow-2xl">
            <HighlightColorPicker
              onSelectColor={onHighlight}
              onRemoveHighlight={onRemoveHighlight}
              hasExistingHighlight={hasExistingHighlight}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}