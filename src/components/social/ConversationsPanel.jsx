import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, isToday, isYesterday } from 'date-fns';
import { LoadingSpinner } from '../ui/loading-screen';
import UserAvatar from './UserAvatar';

function getConversationKey(email1, email2) {
  return [email1, email2].sort().join('::');
}

function formatMessageTime(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export default function ConversationsPanel({ user, friends, activeConversation, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typingEmails, setTypingEmails] = useState(new Set());

  useEffect(() => {
    loadConversations();
  }, [user, friends]);

  useEffect(() => {
    if (!user) return;
    const checkTyping = async () => {
      try {
        const statuses = await base44.entities.TypingStatus.filter({ is_typing: true });
        const now = Date.now();
        const active = new Set();
        statuses.forEach(s => {
          if (s.user_email !== user.email && (now - new Date(s.updated_date).getTime()) < 8000) {
            active.add(s.user_email);
          }
        });
        setTypingEmails(active);
      } catch {}
    };
    checkTyping();
    const interval = setInterval(checkTyping, 8000);
    return () => clearInterval(interval);
  }, [user]);

  const loadConversations = async () => {
    if (!user || !friends || friends.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // For each friend, get the last message
    const convos = await Promise.all(
      friends.map(async (friend) => {
        const key = getConversationKey(user.email, friend.email);
        const msgs = await base44.entities.DirectMessage.filter(
          { conversation_key: key },
          '-created_date',
          1
        );
        
        // Count unread
        const unreadMsgs = await base44.entities.DirectMessage.filter({
          conversation_key: key,
          receiver_email: user.email,
          is_read: false,
        });

        return {
          friend,
          lastMessage: msgs[0] || null,
          unreadCount: unreadMsgs.length,
          key,
        };
      })
    );

    // Sort by last message date, most recent first
    convos.sort((a, b) => {
      const aDate = a.lastMessage?.created_date || '1970-01-01';
      const bDate = b.lastMessage?.created_date || '1970-01-01';
      return bDate.localeCompare(aDate);
    });

    setConversations(convos);
    setLoading(false);
  };

  const filtered = conversations.filter(c =>
    c.friend.name.toLowerCase().includes(search.toLowerCase()) ||
    c.friend.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <MessageCircle className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">{friends.length === 0 ? 'Add friends to start messaging' : 'No conversations yet'}</p>
          </div>
        ) : (
          filtered.map(convo => {
            const isActive = activeConversation === convo.key;
            return (
              <button
                key={convo.key}
                onClick={() => onSelectConversation(convo.friend, convo.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-800/50 ${
                  isActive
                    ? 'bg-amber-600/10 border-l-2 border-l-amber-500'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <UserAvatar name={convo.friend.name} avatarUrl={convo.friend.avatar} size="md" isTyping={typingEmails.has(convo.friend.email)} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium truncate ${convo.unreadCount > 0 ? 'text-white' : 'text-gray-300'}`}>
                      {convo.friend.name}
                    </p>
                    {convo.lastMessage && (
                      <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">
                        {formatMessageTime(convo.lastMessage.created_date)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate pr-2 ${typingEmails.has(convo.friend.email) ? 'text-amber-400 italic' : 'text-gray-500'}`}>
                      {typingEmails.has(convo.friend.email)
                        ? 'typing...'
                        : convo.lastMessage
                          ? `${convo.lastMessage.sender_email === user.email ? 'You: ' : ''}${convo.lastMessage.text}`
                          : 'Start a conversation'
                      }
                    </p>
                    {convo.unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {convo.unreadCount}
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