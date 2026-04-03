import React, { useState } from 'react';
import { Plus, Square, Link2, Zap, X, Type, LayoutGrid, Image as ImageIcon, Hand, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingToolbar({ mode, onModeChange }) {
  const [expanded, setExpanded] = useState(false);

  const tools = [
    { id: 'card', label: 'Card', icon: Square, keybind: '1', description: 'Click canvas to place' },
    { id: 'connection', label: 'Connect', icon: Link2, keybind: '2', description: 'Click card A then B' },
    { id: 'text', label: 'Text Block', icon: Type, keybind: '3', description: 'Click to place text' },
    { id: 'section', label: 'Section', icon: LayoutGrid, keybind: '4', description: 'Group cards visually' },
    { id: 'image', label: 'Image', icon: ImageIcon, keybind: '5', description: 'Click to place image' },
    { id: 'sketch', label: 'Sketch', icon: Zap, keybind: '6', description: 'Fast card + connect' },
    { id: 'hand', label: 'Hand', icon: Hand, keybind: '7', description: 'Normal drag and click' },
    { id: 'erase', label: 'Erase', icon: Eraser, keybind: '8', description: 'Click items to delete' },
  ];

  const activeTool = tools.find(t => t.id === mode);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="mb-2 bg-gray-800 border border-gray-700 rounded-xl p-1.5 shadow-2xl grid grid-cols-2 gap-1"
          >
            {tools.map(tool => {
              const Icon = tool.icon;
              const isActive = mode === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    onModeChange(isActive ? 'hand' : tool.id);
                    setExpanded(false);
                  }}
                  className={`flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-xs transition-all ${
                    isActive ? 'bg-amber-600/20 text-amber-400' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <div className="text-left">
                      <div className="font-medium text-[11px]">{tool.label}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500">{tool.keybind}</span>
                  </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        {mode && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-amber-600/20 border border-amber-600/30 rounded-lg px-3 py-2 flex items-center gap-2"
          >
            {activeTool && <activeTool.icon className="w-4 h-4 text-amber-400" />}
            <span className="text-xs text-amber-300 font-medium">{activeTool?.label}</span>
            <span className="text-[10px] text-amber-500 font-semibold">{activeTool?.keybind}</span>
            <button onClick={() => onModeChange('hand')} className="text-amber-400 hover:text-amber-200 ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setExpanded(!expanded)}
          className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-colors ${
            expanded ? 'bg-gray-700 text-gray-300' : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          {expanded ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </motion.button>
      </div>
    </div>
  );
}