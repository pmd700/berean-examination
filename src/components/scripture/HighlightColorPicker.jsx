import React, { useState } from 'react';
import { Highlighter, X } from 'lucide-react';

const PRESET_COLORS = [
  { color: '#fde047', label: 'Yellow' },
  { color: '#86efac', label: 'Green' },
  { color: '#93c5fd', label: 'Blue' },
  { color: '#fca5a5', label: 'Red' },
];

export default function HighlightColorPicker({ onSelectColor, onRemoveHighlight, hasExistingHighlight }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customColor, setCustomColor] = useState('#f9a8d4');

  return (
    <div className="flex items-center gap-1">
      {PRESET_COLORS.map((preset) => (
        <button
          key={preset.color}
          className="w-6 h-6 rounded-full border-2 border-white/30 hover:border-white/80 hover:scale-110 transition-all active:scale-90"
          style={{ backgroundColor: preset.color }}
          title={preset.label}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelectColor(preset.color);
          }}
        />
      ))}

      {/* Custom color */}
      <div className="relative">
        <button
          className="w-6 h-6 rounded-full border-2 border-dashed border-white/40 hover:border-white/80 transition-all flex items-center justify-center active:scale-90"
          style={{ backgroundColor: showCustom ? customColor : 'transparent' }}
          title="Custom color"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (showCustom) {
              onSelectColor(customColor);
            } else {
              setShowCustom(true);
            }
          }}
        >
          {!showCustom && <Highlighter className="w-3 h-3 text-white/60" />}
        </button>
        {showCustom && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-8 h-8 cursor-pointer rounded border-0 bg-transparent"
            />
            <button
              className="block mx-auto mt-1 text-[10px] text-white/70 hover:text-white"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectColor(customColor);
                setShowCustom(false);
              }}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Remove highlight */}
      {hasExistingHighlight && (
        <>
          <div className="w-px h-5 bg-gray-700 mx-0.5" />
          <button
            className="w-6 h-6 rounded-full hover:bg-red-500/20 flex items-center justify-center transition-all active:scale-90"
            title="Remove highlight"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemoveHighlight();
            }}
          >
            <X className="w-3.5 h-3.5 text-red-400" />
          </button>
        </>
      )}
    </div>
  );
}