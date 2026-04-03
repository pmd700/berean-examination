import React, { useState, useMemo } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_COLORS = {
  Person: '#3b82f6',
  Place: '#22c55e',
  Keyword: '#f59e0b',
  Doctrine: '#a855f7',
  Verse: '#f97316',
  Event: '#06b6d4',
  Question: '#ec4899',
  Custom: '#6b7280',
};

export default function FilterPanel({ cards, filters, onFiltersChange }) {
  const [open, setOpen] = useState(false);

  const allTypes = useMemo(() => {
    const types = new Set();
    cards.forEach(c => { if (c.card_type) types.add(c.card_type); });
    return Array.from(types).sort();
  }, [cards]);

  const allTags = useMemo(() => {
    const tags = new Set();
    cards.forEach(c => (c.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [cards]);

  const activeCount = (filters.types?.length || 0) + (filters.tags?.length || 0);

  const toggleType = (type) => {
    const current = filters.types || [];
    const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    onFiltersChange({ ...filters, types: updated });
  };

  const toggleTag = (tag) => {
    const current = filters.tags || [];
    const updated = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    onFiltersChange({ ...filters, tags: updated });
  };

  const clearFilters = () => onFiltersChange({ types: [], tags: [] });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
          activeCount > 0
            ? 'bg-amber-600/15 border-amber-600/30 text-amber-400'
            : 'bg-gray-800/60 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600'
        }`}
      >
        <Filter className="w-3 h-3" />
        <span className="hidden sm:inline">Filter</span>
        {activeCount > 0 && (
          <span className="bg-amber-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-8 right-0 z-40 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <span className="text-xs font-semibold text-gray-300">Filters</span>
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <button onClick={clearFilters} className="text-[10px] text-amber-400 hover:text-amber-300">
                    Clear all
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-3">
              {/* Types */}
              {allTypes.length > 0 && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-1 mb-1">Type</div>
                  <div className="flex flex-wrap gap-1">
                    {allTypes.map(type => {
                      const active = (filters.types || []).includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition-colors ${
                            active
                              ? 'bg-amber-600/15 border-amber-600/30 text-amber-300'
                              : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TYPE_COLORS[type] || '#6b7280' }} />
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tags */}
              {allTags.length > 0 && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-1 mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {allTags.map(tag => {
                      const active = (filters.tags || []).includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-2 py-1 rounded-md text-[11px] border transition-colors ${
                            active
                              ? 'bg-amber-600/15 border-amber-600/30 text-amber-300'
                              : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {allTypes.length === 0 && allTags.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-600">No types or tags to filter</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}