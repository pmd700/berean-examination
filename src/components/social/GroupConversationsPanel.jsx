import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, isToday, isYesterday } from 'date-fns';
import { LoadingSpinner } from '../ui/loading-screen';

function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export default function GroupConversationsPanel({ user, activeGroupId, onSelectGroup, onCreateGroup }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadGroups();
    const interval = setInterval(loadGroups, 8000);
    return () => clearInterval(interval);
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;
    const allGroups = await base44.entities.GroupChat.list('-last_message_date', 100);
    // Only show groups the user is a member of
    const myGroups = allGroups.filter(g => g.member_emails?.includes(user.email));

    // Get unread counts
    const withUnread = await Promise.all(
      myGroups.map(async (g) => {
        const msgs = await base44.entities.GroupMessage.filter({ group_id: g.id });
        const unread = msgs.filter(m =>
          !m.is_system && m.sender_email !== user.email &&
          !(m.read_by || []).includes(user.email)
        ).length;
        return { ...g, unreadCount: unread };
      })
    );

    setGroups(withUnread);
    setLoading(false);
  };

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const getSenderPreview = (group) => {
    if (!group.last_message_text) return 'No messages yet';
    const senderIdx = group.member_emails?.indexOf(group.last_message_sender);
    const senderName = group.last_message_sender === user.email
      ? 'You'
      : group.member_names?.[senderIdx] || group.last_message_sender?.split('@')[0] || '';
    return `${senderName}: ${group.last_message_text}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="pl-9 bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500"
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-amber-500 hover:text-amber-400 hover:bg-amber-900/20 flex-shrink-0"
          onClick={onCreateGroup}
          title="Create group"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">
              {groups.length === 0 ? 'No groups yet' : 'No matching groups'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-amber-500 hover:text-amber-400"
              onClick={onCreateGroup}
            >
              <Plus className="w-4 h-4 mr-1" /> Create a group
            </Button>
          </div>
        ) : (
          filtered.map(g => {
            const isActive = activeGroupId === g.id;
            return (
              <button
                key={g.id}
                onClick={() => onSelectGroup(g)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-800/50 ${
                  isActive
                    ? 'bg-amber-600/10 border-l-2 border-l-amber-500'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                {g.icon_url ? (
                  <img src={g.icon_url} alt={g.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl border border-gray-700 flex-shrink-0">
                    {g.icon_emoji || '👥'}
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium truncate ${g.unreadCount > 0 ? 'text-white' : 'text-gray-300'}`}>
                      {g.name}
                    </p>
                    {g.last_message_date && (
                      <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">
                        {formatMessageTime(g.last_message_date)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 truncate pr-2">
                      {getSenderPreview(g)}
                    </p>
                    {g.unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {g.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}