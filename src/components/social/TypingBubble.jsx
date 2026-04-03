import React from 'react';
import UserAvatar from './UserAvatar';

export default function TypingBubble({ name, avatarUrl }) {
  return (
    <div className="flex items-end gap-2 py-1">
      <UserAvatar name={name} avatarUrl={avatarUrl} size="sm" isTyping />
      <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.2s' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.2s' }} />
        </div>
      </div>
    </div>
  );
}