import React from 'react';

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-2xl',
};

export default function UserAvatar({ name, avatarUrl, size = 'md', isTyping = false, className = '' }) {
  const sizeClass = SIZES[size] || SIZES.md;
  const initials = (name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (isTyping) {
    return (
      <div className="relative flex-shrink-0">
        <div className="absolute -inset-1 rounded-full bg-amber-500/30 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute -inset-0.5 rounded-full ring-2 ring-amber-500/60 animate-pulse" />
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name || 'User'}
            className={`${sizeClass} rounded-full object-cover transform scale-110 transition-transform duration-300 ${className}`}
          />
        ) : (
          <div className={`${sizeClass} rounded-full bg-gradient-to-br from-amber-700 to-orange-700 flex items-center justify-center text-white font-bold transform scale-110 transition-transform duration-300 ${className}`}>
            {initials}
          </div>
        )}
      </div>
    );
  }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User'}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-amber-700 to-orange-700 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
      {initials}
    </div>
  );
}