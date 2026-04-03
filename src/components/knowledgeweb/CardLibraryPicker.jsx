import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Plus, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function CardLibraryPicker({ open, onClose, onPlaceCard, currentWebCards }) {
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.WebCard.list('-updated_date', 200).then(cards => {
      setAllCards(cards);
      setLoading(false);
    });
  }, [open]);

  const currentCardIds = useMemo(() => new Set(currentWebCards.map(c => c.id)), [currentWebCards]);

  const q = query.toLowerCase().trim();
  const filtered = useMemo(() => {
    if (!q) return allCards;
    return allCards.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.card_type || '').toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [allCards, q]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute top-12 right-4 z-40 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
          <span className="text-xs font-semibold text-gray-300">Card Library</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-3.5 h-3.5" /></button>
        </div>

        <div className="px-3 py-2 border-b border-gray-800">
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1.5">
            <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-600"
              placeholder="Search all your cards..."
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="text-center py-6 text-xs text-gray-600">Loading cards...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-600">No cards found</div>
          ) : (
            filtered.map(card => {
              const alreadyHere = currentCardIds.has(card.id);
              return (
                <button
                  key={card.id}
                  onClick={() => { if (!alreadyHere) onPlaceCard(card); }}
                  disabled={alreadyHere}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                    alreadyHere ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-800 cursor-pointer'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-200 truncate">{card.title}</div>
                    <div className="text-[10px] text-gray-500 flex gap-1">
                      {card.card_type && <span>{card.card_type}</span>}
                      {card.web_id && <span>• {alreadyHere ? 'Already here' : 'From another web'}</span>}
                    </div>
                  </div>
                  {!alreadyHere && <Copy className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}