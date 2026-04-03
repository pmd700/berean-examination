import React, { useMemo } from 'react';

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

export default function TypeLegend({ cards }) {
  const usedTypes = useMemo(() => {
    const types = new Set();
    cards.forEach(c => { if (c.card_type) types.add(c.card_type); });
    return Array.from(types).sort();
  }, [cards]);

  if (usedTypes.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 z-20 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg px-2.5 py-2 shadow-lg">
      <div className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Types</div>
      <div className="flex flex-col gap-0.5">
        {usedTypes.map(type => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: TYPE_COLORS[type] || '#6b7280' }} />
            <span className="text-[10px] text-gray-400">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}