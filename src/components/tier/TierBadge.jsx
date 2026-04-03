import React, { useState, useEffect, useRef } from 'react';
import { Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import TierCriteriaPanel from './TierCriteriaPanel';

const TIER_STYLES = {
  0: {
    bg: 'bg-gray-400 dark:bg-gray-600',
    text: 'text-gray-800 dark:text-gray-200',
    name: 'Unranked'
  },
  1: {
    bg: 'bg-white dark:bg-gray-100',
    text: 'text-gray-800',
    border: 'border-2 border-gray-300',
    name: 'White'
  },
  2: {
    bg: 'bg-green-500 dark:bg-green-600',
    text: 'text-white',
    name: 'Green'
  },
  3: {
    bg: 'bg-blue-500 dark:bg-blue-600',
    text: 'text-white',
    name: 'Blue'
  },
  4: {
    bg: 'bg-purple-400 dark:bg-purple-500',
    text: 'text-white',
    name: 'Light Purple'
  },
  5: {
    bg: 'bg-purple-700 dark:bg-purple-800',
    text: 'text-white',
    name: 'Dark Purple'
  },
  6: {
    bg: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600',
    text: 'text-yellow-900',
    name: 'Gold',
    texture: true
  },
  7: {
    bg: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700',
    text: 'text-white',
    name: 'Ruby',
    crystal: true
  }
};

export default function TierBadge({ tier, roman, loginDays, chaptersWithCommentary, loading }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCriteriaPanel, setShowCriteriaPanel] = useState(false);
  const tooltipRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTooltip]);
  
  if (loading) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
    );
  }

  const style = TIER_STYLES[tier] || TIER_STYLES[0];

  return (
    <div className="relative" ref={tooltipRef}>
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg transition-all hover:scale-105",
          style.bg,
          style.text,
          style.border,
          "relative overflow-hidden"
        )}
      >
        {/* Matte gold texture for Tier 6 */}
        {style.texture && (
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px'
            }}
          />
        )}
        
        {/* Ruby crystal texture for Tier 7 */}
        {style.crystal && (
          <>
            <div className="absolute inset-0 bg-gradient-to-tr from-red-700 via-transparent to-red-400 opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-bl from-pink-400 via-transparent to-red-900 opacity-40" />
            <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-white opacity-20 blur-sm rounded-full" />
          </>
        )}
        
        <span className="relative z-10">{roman}</span>
      </button>

      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 border border-gray-700">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="font-semibold">
              Tier {tier === 0 ? 'Unranked' : roman} {tier > 0 && `(${style.name})`}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCriteriaPanel(true);
                  setShowTooltip(false);
                }}
                className="p-1 rounded-full hover:bg-gray-700 transition-colors"
                title="View tier criteria"
              >
                <Info className="w-3.5 h-3.5 text-blue-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                }}
                className="p-1 rounded-full hover:bg-gray-700 transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
          <div className="text-gray-300">Login days: {loginDays}</div>
          <div className="text-gray-300">Chapters with commentary: {chaptersWithCommentary}</div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 border-l border-t border-gray-700 rotate-45" />
        </div>
      )}

      <TierCriteriaPanel 
        open={showCriteriaPanel}
        onClose={() => setShowCriteriaPanel(false)}
        currentTier={tier}
      />
    </div>
  );
}