import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

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

const TIER_DATA = [
  { tier: 0, roman: '—', days: 0, chapters: 0, desc: 'Less than 7 login days OR does not meet Tier I' },
  { tier: 1, roman: 'I', days: 7, chapters: 3, desc: '7 login days AND 3 chapters with commentary' },
  { tier: 2, roman: 'II', days: 12, chapters: 6, desc: '12 login days AND 6 chapters with commentary' },
  { tier: 3, roman: 'III', days: 49, chapters: 21, desc: '49 login days AND 21 chapters with commentary' },
  { tier: 4, roman: 'IV', days: 70, chapters: 35, desc: '70 login days AND 35 chapters with commentary' },
  { tier: 5, roman: 'V', days: 144, chapters: 70, desc: '144 login days AND 70 chapters with commentary' },
  { tier: 6, roman: 'VI', days: 400, chapters: 210, desc: '400 login days AND 210 chapters with commentary' },
  { tier: 7, roman: 'VII', days: 700, chapters: 350, desc: '700 login days AND 350 chapters with commentary' }
];

function TierBadgePreview({ tier, roman }) {
  const style = TIER_STYLES[tier];

  return (
    <div
      className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-base",
        style.bg,
        style.text,
        style.border,
        "relative overflow-hidden flex-shrink-0"
      )}
    >
      {style.texture && (
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px'
          }}
        />
      )}
      
      {style.crystal && (
        <>
          <div className="absolute inset-0 bg-gradient-to-tr from-red-700 via-transparent to-red-400 opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-bl from-pink-400 via-transparent to-red-900 opacity-40" />
          <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-white opacity-20 blur-sm rounded-full" />
        </>
      )}
      
      <span className="relative z-10">{roman}</span>
    </div>
  );
}

export default function TierCriteriaPanel({ open, onClose, currentTier }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="dark:text-white text-xl">Tier Rank Criteria</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {TIER_DATA.map((tierInfo) => {
            const isCurrent = tierInfo.tier === currentTier;
            
            return (
              <div
                key={tierInfo.tier}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
                  isCurrent 
                    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-500 dark:border-purple-400" 
                    : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                )}
              >
                <TierBadgePreview tier={tierInfo.tier} roman={tierInfo.roman} />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Tier {tierInfo.tier === 0 ? 'Unranked' : tierInfo.roman}
                    </h3>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600 text-white">
                        Your Tier
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tierInfo.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> Both requirements (login days AND chapters with commentary) must be met to unlock each tier.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}