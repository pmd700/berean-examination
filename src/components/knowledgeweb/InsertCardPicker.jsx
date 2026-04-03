import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { X, Search } from 'lucide-react';

const CARD_TYPES = ['Person', 'Place', 'Keyword', 'Doctrine', 'Verse', 'Event', 'Question', 'Custom'];

const TYPE_COLORS = {
  Person: 'text-blue-400 bg-blue-500/15',
  Place: 'text-green-400 bg-green-500/15',
  Keyword: 'text-amber-400 bg-amber-500/15',
  Doctrine: 'text-purple-400 bg-purple-500/15',
  Verse: 'text-orange-400 bg-orange-500/15',
  Event: 'text-cyan-400 bg-cyan-500/15',
  Question: 'text-pink-400 bg-pink-500/15',
  Custom: 'text-gray-400 bg-gray-500/15',
};

export default function InsertCardPicker({ position, onSelect, onCancel, existingCards }) {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('type'); // 'type' or 'existing'
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onCancel();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onCancel]);

  const filteredTypes = CARD_TYPES.filter(t => t.toLowerCase().includes(search.toLowerCase()));
  const filteredExisting = (existingCards || []).filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  return (
    <div
      ref={containerRef}
      className="fixed z-[9999] w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      style={{ left: position.x - 112, top: position.y - 20 }}
    >
      {/* Search */}
      <div className="p-2 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 placeholder:text-gray-600 outline-none focus:border-amber-600"
            placeholder="Search or pick type..."
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setMode('type')}
          className={`flex-1 text-[10px] py-1.5 font-semibold transition-colors ${mode === 'type' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          New Card
        </button>
        <button
          onClick={() => setMode('existing')}
          className={`flex-1 text-[10px] py-1.5 font-semibold transition-colors ${mode === 'existing' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Existing
        </button>
      </div>

      {/* Options */}
      <div className="max-h-48 overflow-y-auto p-1">
        {mode === 'type' ? (
          <>
            {/* Quick create with title from search */}
            {search.trim() && (
              <button
                onClick={() => onSelect({ action: 'create', title: search.trim(), card_type: null })}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-amber-300 hover:bg-amber-600/15 transition-colors flex items-center gap-2"
              >
                <span className="text-amber-500 font-bold text-sm">+</span>
                Create "{search.trim()}"
              </button>
            )}
            {filteredTypes.map(type => (
              <button
                key={type}
                onClick={() => onSelect({ action: 'create', title: search.trim() || 'New Card', card_type: type })}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${TYPE_COLORS[type]}`}>{type}</span>
              </button>
            ))}
          </>
        ) : (
          <>
            {filteredExisting.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No matching cards</p>
            ) : (
              filteredExisting.map(card => (
                <button
                  key={card.id}
                  onClick={() => onSelect({ action: 'existing', card })}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-gray-800 transition-colors truncate"
                >
                  <span className="font-medium">{card.title}</span>
                  {card.card_type && (
                    <span className={`ml-1.5 px-1 py-0.5 rounded text-[8px] font-semibold ${TYPE_COLORS[card.card_type] || TYPE_COLORS.Custom}`}>
                      {card.card_type}
                    </span>
                  )}
                </button>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}