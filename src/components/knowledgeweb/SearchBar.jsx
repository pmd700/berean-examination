import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchBar({ cards, onJumpToCard }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const q = query.toLowerCase().trim();
  const results = q ? cards.filter(c =>
    (c.title || '').toLowerCase().includes(q) ||
    (c.card_type || '').toLowerCase().includes(q) ||
    (c.tags || []).some(t => t.toLowerCase().includes(q))
  ).slice(0, 8) : [];

  const handleSelect = (card) => {
    onJumpToCard(card);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors text-xs"
      >
        <Search className="w-3 h-3" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline text-[9px] text-gray-600 ml-1 px-1 py-0.5 rounded bg-gray-800 border border-gray-700">⌘F</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-40 w-80"
          >
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
                <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-100 outline-none placeholder:text-gray-600"
                  placeholder="Search cards by title, type, or tag..."
                />
                <button onClick={() => { setOpen(false); setQuery(''); }} className="text-gray-500 hover:text-gray-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {q && (
                <div className="max-h-60 overflow-y-auto">
                  {results.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-gray-600">No cards found</div>
                  ) : (
                    results.map(card => (
                      <button
                        key={card.id}
                        onClick={() => handleSelect(card)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-200 truncate">{card.title}</div>
                          <div className="text-[10px] text-gray-500 flex gap-1.5">
                            {card.card_type && <span>{card.card_type}</span>}
                            {(card.tags || []).slice(0, 2).map(t => <span key={t}>#{t}</span>)}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}