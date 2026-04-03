import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send, ArrowLeft, MoreVertical, Plus, Users, Phone, UserPlus, LogOut, Settings
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import UserAvatar from './UserAvatar';
import EmojiPicker from './EmojiPicker';
import GroupSettingsDialog from './GroupSettingsDialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const RATE_LIMIT_MS = 1000;
const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const RECENTS_KEY = 'berean_recent_emojis';
const MAX_RECENTS = 8;

function getRecentEmojis() {
  try {
    const stored = localStorage.getItem(RECENTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, MAX_RECENTS);
    }
  } catch {}
  return DEFAULT_REACTIONS;
}

function addRecentEmoji(emoji) {
  const current = getRecentEmojis();
  const updated = [emoji, ...current.filter(e => e !== emoji)].slice(0, MAX_RECENTS);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
  return updated;
}

function formatDateHeader(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-amber-400 underline hover:text-amber-300 break-all">
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function GroupChatView({ user, group, onBack, onGroupUpdated, onStartGroupCall }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reactionMenuId, setReactionMenuId] = useState(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState(null);
  const [recentEmojis, setRecentEmojis] = useState(getRecentEmojis);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const lastSentRef = useRef(0);
  const pollRef = useRef(null);

  const myName = user.display_name || user.full_name || user.email.split('@')[0];
  const isAdmin = group.admin_emails?.includes(user.email);

  // ── Polling ──
  useEffect(() => {
    let cancelled = false;
    const poll = async (silent = false) => {
      if (cancelled) return;
      await loadMessages(silent);
      if (cancelled) return;
      await markAsRead();
    };
    poll(false);
    pollRef.current = setInterval(() => poll(true), 5000);
    return () => { cancelled = true; clearInterval(pollRef.current); };
  }, [group.id]);

  useEffect(() => {
    if (!reactionMenuId) return;
    const handler = () => { setReactionMenuId(null); setEmojiPickerMsgId(null); };
    const timer = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handler); };
  }, [reactionMenuId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = useCallback(async (silent = false) => {
    if (!group.id) return;
    const msgs = await base44.entities.GroupMessage.filter(
      { group_id: group.id }, 'created_date', 200
    );
    setMessages(msgs);
    if (!silent) setLoading(false);
  }, [group.id]);

  const markAsRead = useCallback(async () => {
    if (!group.id || !user) return;
    const unread = await base44.entities.GroupMessage.filter({ group_id: group.id });
    const toMark = unread.filter(m =>
      !m.is_system && m.sender_email !== user.email &&
      !(m.read_by || []).includes(user.email)
    );
    await Promise.all(
      toMark.map(m =>
        base44.entities.GroupMessage.update(m.id, {
          read_by: [...(m.read_by || []), user.email],
        })
      )
    );
  }, [group.id, user]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;
    const now = Date.now();
    if (now - lastSentRef.current < RATE_LIMIT_MS) {
      toast.error("Slow down! You're sending messages too fast.");
      return;
    }
    setSending(true);
    lastSentRef.current = now;
    setNewMessage('');

    await base44.entities.GroupMessage.create({
      group_id: group.id,
      sender_email: user.email,
      sender_name: myName,
      text,
      is_system: false,
      reactions: [],
      read_by: [user.email],
    });

    // Update group's last message preview
    await base44.entities.GroupChat.update(group.id, {
      last_message_text: text.slice(0, 100),
      last_message_sender: user.email,
      last_message_date: new Date().toISOString(),
    });

    await loadMessages(true);
    setSending(false);
  };

  const handleReaction = async (msgId, emoji) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    let reactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
    const existingIdx = reactions.findIndex(r => r.user_email === user.email);
    if (existingIdx >= 0) {
      if (reactions[existingIdx].emoji === emoji) {
        reactions.splice(existingIdx, 1);
      } else {
        reactions[existingIdx] = { emoji, user_email: user.email };
      }
    } else {
      reactions.push({ emoji, user_email: user.email });
    }
    await base44.entities.GroupMessage.update(msgId, { reactions });
    setRecentEmojis(addRecentEmoji(emoji));
    setReactionMenuId(null);
    setEmojiPickerMsgId(null);
    await loadMessages(true);
  };

  const handleLeave = async () => {
    const updatedEmails = group.member_emails.filter(e => e !== user.email);
    const idx = group.member_emails.indexOf(user.email);
    const updatedNames = [...(group.member_names || [])];
    const updatedAvatars = [...(group.member_avatars || [])];
    if (idx >= 0) {
      updatedNames.splice(idx, 1);
      updatedAvatars.splice(idx, 1);
    }
    const updatedAdmins = (group.admin_emails || []).filter(e => e !== user.email);

    // If no admins left, promote first remaining member
    if (updatedAdmins.length === 0 && updatedEmails.length > 0) {
      updatedAdmins.push(updatedEmails[0]);
    }

    await base44.entities.GroupChat.update(group.id, {
      member_emails: updatedEmails,
      member_names: updatedNames,
      member_avatars: updatedAvatars,
      admin_emails: updatedAdmins,
    });

    await base44.entities.GroupMessage.create({
      group_id: group.id,
      sender_email: user.email,
      sender_name: myName,
      text: `${myName} left the group`,
      is_system: true,
      reactions: [],
      read_by: [],
    });

    toast.success('You left the group');
    setLeaveConfirm(false);
    onBack();
  };

  const getSenderName = (email) => {
    if (email === user.email) return 'You';
    const idx = group.member_emails?.indexOf(email);
    if (idx >= 0 && group.member_names?.[idx]) return group.member_names[idx];
    return email.split('@')[0];
  };

  const getSenderAvatar = (email) => {
    const idx = group.member_emails?.indexOf(email);
    if (idx >= 0 && group.member_avatars?.[idx]) return group.member_avatars[idx];
    return null;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  let lastDateStr = '';

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-gray-400" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {group.icon_url ? (
          <img src={group.icon_url} alt={group.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl border border-gray-700 flex-shrink-0">
            {group.icon_emoji || '👥'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{group.name}</p>
          <p className="text-[11px] text-gray-500">{group.member_emails?.length || 0} members</p>
        </div>
        <Button
          size="icon" variant="ghost"
          className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-900/20"
          onClick={() => onStartGroupCall?.()}
          title="Start group call"
        >
          <Phone className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
            <DropdownMenuItem className="text-gray-300 hover:bg-gray-800 cursor-pointer" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-2" /> Group Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-400 hover:bg-red-900/20 cursor-pointer" onClick={() => setLeaveConfirm(true)}>
              <LogOut className="w-4 h-4 mr-2" /> Leave Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            No messages yet. Say something!
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_email === user.email;
          const isSystem = msg.is_system;
          const dateStr = formatDateHeader(msg.created_date);
          let showDateHeader = false;
          if (dateStr !== lastDateStr) { showDateHeader = true; lastDateStr = dateStr; }
          const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];

          if (isSystem) {
            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="flex items-center justify-center py-3">
                    <span className="text-[10px] text-gray-600 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                      {dateStr}
                    </span>
                  </div>
                )}
                <div className="flex justify-center py-2">
                  <span className="text-xs text-gray-500 bg-gray-900/50 px-3 py-1 rounded-full italic">
                    {msg.text}
                  </span>
                </div>
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && (
                <div className="flex items-center justify-center py-3">
                  <span className="text-[10px] text-gray-600 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                    {dateStr}
                  </span>
                </div>
              )}
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
                {!isMine && (
                  <div className="mr-2 mt-auto mb-1">
                    <UserAvatar name={getSenderName(msg.sender_email)} avatarUrl={getSenderAvatar(msg.sender_email)} size="sm" />
                  </div>
                )}
                <div className="max-w-[70%]">
                  {/* Sender name (not for own messages) */}
                  {!isMine && (
                    <p className="text-[10px] text-gray-500 mb-0.5 ml-1">{getSenderName(msg.sender_email)}</p>
                  )}
                  <div
                    className={`relative px-3.5 py-2 rounded-2xl text-sm break-words cursor-pointer ${
                      isMine
                        ? 'bg-amber-600 text-white rounded-br-md'
                        : 'bg-gray-800 text-gray-200 rounded-bl-md'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const sel = window.getSelection();
                      if (sel && sel.toString().length > 0) return;
                      setReactionMenuId(reactionMenuId === msg.id ? null : msg.id);
                      setEmojiPickerMsgId(null);
                    }}
                  >
                    {linkify(msg.text)}
                  </div>

                  {reactions.length > 0 && (
                    <div className={`flex gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {reactions.map((r, ri) => (
                        <span key={ri} className="text-xs bg-gray-800 border border-gray-700 rounded-full px-1.5 py-0.5">
                          {r.emoji}
                        </span>
                      ))}
                    </div>
                  )}

                  {reactionMenuId === msg.id && (
                    <div
                      className={`flex gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-full px-2 py-1 shadow-lg">
                        {recentEmojis.slice(0, 6).map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform text-base px-0.5"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setEmojiPickerMsgId(msg.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors ml-0.5"
                          title="More emojis"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-gray-600">
                      {format(new Date(msg.created_date), 'h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-800 bg-gray-900">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Type a message..."
            maxLength={2000}
            className="bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="bg-amber-600 hover:bg-amber-700 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Emoji picker overlay */}
      {emojiPickerMsgId && (
        <EmojiPicker
          onSelect={(emoji) => handleReaction(emojiPickerMsgId, emoji)}
          onClose={() => setEmojiPickerMsgId(null)}
        />
      )}

      {/* Leave group dialog */}
      <AlertDialog open={leaveConfirm} onOpenChange={() => setLeaveConfirm(false)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Leave {group.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              You will no longer receive messages from this group. You can be re-added by an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} className="bg-red-600 hover:bg-red-700">Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Group settings */}
      {settingsOpen && (
        <GroupSettingsDialog
          user={user}
          group={group}
          onClose={() => setSettingsOpen(false)}
          onUpdated={onGroupUpdated}
        />
      )}
    </div>
  );
}