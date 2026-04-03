import React from 'react';

const STEPS = [1, 2, 3, 4, 5];

export default function TextSizeControl({ value = 3, onChange }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] font-serif text-gray-400 dark:text-gray-500 leading-none select-none">A</span>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-size-slider w-24 h-1.5 appearance-none bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer accent-orange-500"
        style={{ accentColor: '#f97316' }}
      />
      <span className="text-base font-serif text-gray-400 dark:text-gray-500 leading-none select-none">A</span>
      <style>{`
        .text-size-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ea580c;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .text-size-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ea580c;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .dark .text-size-slider::-webkit-slider-thumb {
          border-color: #1f2937;
        }
        .dark .text-size-slider::-moz-range-thumb {
          border-color: #1f2937;
        }
      `}</style>
    </div>
  );
}

export function getScriptureTextClass(size = 3) {
  switch (size) {
    case 1: return 'text-sm leading-relaxed';
    case 2: return 'text-base leading-relaxed';
    case 3: return 'text-lg leading-relaxed';
    case 4: return 'text-xl leading-loose';
    case 5: return 'text-2xl leading-loose';
    default: return 'text-lg leading-relaxed';
  }
}

export function getVerseNumberClass(size = 3) {
  switch (size) {
    case 1: return 'text-xs';
    case 2: return 'text-xs';
    case 3: return 'text-sm';
    case 4: return 'text-sm';
    case 5: return 'text-base';
    default: return 'text-sm';
  }
}

export function getHeaderClass(size = 3) {
  switch (size) {
    case 1: return 'text-base';
    case 2: return 'text-lg';
    case 3: return 'text-xl';
    case 4: return 'text-2xl';
    case 5: return 'text-3xl';
    default: return 'text-xl';
  }
}