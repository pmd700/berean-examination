import React, { useState } from 'react';
import { Layers, Plus, X, Check, Trash2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from 'framer-motion';

export default function ViewsManager({ views, activeViewId, onSaveView, onLoadView, onDeleteView, currentFilters }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSave = () => {
    if (!newName.trim()) return;
    onSaveView(newName.trim());
    setNewName('');
    setCreating(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
          activeViewId
            ? 'bg-purple-600/15 border-purple-600/30 text-purple-400'
            : 'bg-gray-800/60 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600'
        }`}
      >
        <Layers className="w-3 h-3" />
        <span className="hidden sm:inline">Views</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-8 right-0 z-40 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <span className="text-xs font-semibold text-gray-300">Saved Views</span>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto p-1.5">
              {views.length === 0 && !creating && (
                <div className="text-center py-3 text-[11px] text-gray-600">No saved views yet</div>
              )}
              {views.map(view => (
                <div
                  key={view.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs group cursor-pointer transition-colors ${
                    activeViewId === view.id ? 'bg-purple-600/15 text-purple-300' : 'text-gray-400 hover:bg-gray-800'
                  }`}
                  onClick={() => { onLoadView(view.id); setOpen(false); }}
                >
                  {activeViewId === view.id && <Check className="w-3 h-3 text-purple-400 flex-shrink-0" />}
                  <span className="flex-1 truncate">{view.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteView(view.id); }}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {creating ? (
                <div className="p-1.5">
                  <Input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setCreating(false); }}
                    className="bg-gray-800 border-gray-700 text-gray-100 h-7 text-xs mb-1"
                    placeholder="View name..."
                  />
                  <div className="flex gap-1">
                    <button onClick={handleSave} className="flex-1 text-[10px] text-amber-400 hover:text-amber-300 py-1 bg-amber-600/10 rounded">Save</button>
                    <button onClick={() => setCreating(false)} className="text-[10px] text-gray-500 py-1 px-2">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Save current view
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}