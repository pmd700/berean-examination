import React from 'react';
import { MessageCircle, UserPlus, Users, Shield, Search, UsersRound } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'conversations', label: 'Messages', icon: MessageCircle },
  { id: 'groups', label: 'Groups', icon: UsersRound },
  { id: 'requests', label: 'Friend Requests', icon: UserPlus },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'blocked', label: 'Blocked Users', icon: Shield },
];

export default function SocialSidebar({ activeTab, onTabChange, requestCount = 0, unreadCount = 0, groupUnreadCount = 0 }) {
  return (
    <div className="w-full md:w-64 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-amber-500" />
          Social
        </h1>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const badgeCount = item.id === 'requests' ? requestCount : item.id === 'conversations' ? unreadCount : item.id === 'groups' ? groupUnreadCount : 0;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {badgeCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}