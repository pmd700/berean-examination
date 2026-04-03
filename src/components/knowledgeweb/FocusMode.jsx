import React from 'react';
import { Crosshair, X, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FocusMode({ isActive, depth, onToggle, onDepthChange, selectedCardTitle }) {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-12 left-3 z-30 flex items-center gap-2 bg-amber-600/15 border border-amber-600/30 rounded-xl px-3 py-2 backdrop-blur-sm"
    >
      <Crosshair className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-xs text-amber-300 font-medium">
        Focus: {selectedCardTitle || 'Card'}
      </span>

      <div className="flex items-center gap-1 ml-2 bg-gray-900/60 rounded-lg px-1.5 py-0.5">
        <button
          onClick={() => onDepthChange(Math.max(1, depth - 1))}
          disabled={depth <= 1}
          className="text-gray-400 hover:text-gray-200 disabled:opacity-30"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-[10px] text-amber-300 font-mono w-6 text-center">{depth}°</span>
        <button
          onClick={() => onDepthChange(Math.min(3, depth + 1))}
          disabled={depth >= 3}
          className="text-gray-400 hover:text-gray-200 disabled:opacity-30"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <button
        onClick={onToggle}
        className="ml-1 text-amber-400/60 hover:text-amber-300 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}