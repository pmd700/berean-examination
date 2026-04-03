import React from 'react';
import { TOTAL_CHAPTERS } from '../utils/bibleData';

export default function ProgressBar({ chaptersCompleted }) {
  const percentage = (chaptersCompleted / TOTAL_CHAPTERS) * 100;
  const formattedPercentage = percentage.toFixed(3);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          Bible Progress
        </span>
        <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
          {formattedPercentage}%
        </span>
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${Math.max(percentage, 0.5)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{chaptersCompleted} chapters annotated</span>
        <span>{TOTAL_CHAPTERS} total chapters</span>
      </div>
    </div>
  );
}