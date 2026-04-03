import React from 'react';
import { BookOpen } from 'lucide-react';

export function LoadingScreen({ message = 'Loading...', fullScreen = true }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Animated Book Icon */}
      <div className="relative">
        <div className="absolute inset-0 animate-ping">
          <div className="w-16 h-16 rounded-full bg-orange-500/20 dark:bg-orange-400/20" />
        </div>
        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-200 dark:border-orange-800/50 shadow-lg">
          <BookOpen className="w-8 h-8 text-orange-600 dark:text-orange-400 animate-pulse" />
        </div>
      </div>
      
      {/* Loading Text */}
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 animate-pulse">
          {message}
        </p>
        <div className="flex gap-1 justify-center">
          <span className="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 flex items-center justify-center z-50 transition-colors duration-300">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full min-h-[400px] flex items-center justify-center">
      {content}
    </div>
  );
}

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 border-2 border-orange-200 dark:border-orange-800 rounded-full" />
        <div className="absolute inset-0 border-2 border-transparent border-t-orange-600 dark:border-t-orange-400 rounded-full animate-spin" />
      </div>
    </div>
  );
}