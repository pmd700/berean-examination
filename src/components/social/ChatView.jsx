import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send, ArrowLeft, CheckCheck, Check, Shield, Flag, MoreVertical, Plus, Phone
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import UserAvatar from './UserAvatar';
import ReportDialog from './ReportDialog';
import EmojiPicker from './EmojiPicker';
import TypingBubble from './TypingBubble';
import { requestNotificationPermission, showMessageNotification } from './NotificationManager';
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

export default function ChatView({ user, friend, conversationKey, onBack, onFriendshipChange, onStartCall }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reactionMenuId, setReactionMenuId] = useState(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState(null);
  const [recentEmojis, setRecentEmojis] = useState(getRecentEmojis);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [friendTyping, setFriendTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const lastSentRef = useRef(0);
  const pollRef = useRef(null);
  const typingRef = useRef({ id: null, timeout: null, lastSent: 0 });
  const prevMsgIdsRef = useRef(new Set());
  const hasRequestedNotifRef = useRef(false);

  // ── Poll: messages + read receipts + typing (sequential to avoid rate limits) ──
  useEffect(() => {
    let cancelled = false;

    const poll = async (silent = false) => {
      if (cancelled) return;
      try { await loadMessages(silent); } catch {}
      if (cancelled) return;
      try { await markAsRead(); } catch {}
      if (cancelled) return;
      try { await checkFriendTyping(); } catch {}
    };

    poll(false);

    if (!hasRequestedNotifRef.current) {
      hasRequestedNotifRef.current = true;
      requestNotificationPermission();
    }

    pollRef.current = setInterval(() => poll(true), 5000);

    return () => { cancelled = true; clearInterval(pollRef.current); };
  }, [conversationKey]);

  // ── Init typing record ──
  useEffect(() => {
    const init = async () => {
      if (!conversationKey || !user) return;
      try {
        const existing = await base44.entities.TypingStatus.filter({
          conversation_key: conversationKey, user_email: user.email,
        });
        if (existing.length > 0) typingRef.current.id = existing[0].id;
      } catch {}
    };
    init();

    return () => {
      if (typingRef.current.id) {
        base44.entities.TypingStatus.update(typingRef.current.id, { is_typing: false }).catch(() => {});
      }
      clearTimeout(typingRef.current.timeout);
      typingRef.current = { id: null, timeout: null, lastSent: 0 };
    };
  }, [conversationKey, user]);

  // ── Close reaction bar on outside click ──
  useEffect(() => {
    if (!reactionMenuId) return;
    const handler = () => { setReactionMenuId(null); setEmojiPickerMsgId(null); };
    const timer = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handler); };
  }, [reactionMenuId]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, friendTyping]);

  // ── Data helpers ──
  const loadMessages = useCallback(async (silent = false) => {
    if (!conversationKey) return;
    const msgs = await base44.entities.DirectMessage.filter(
      { conversation_key: conversationKey }, 'created_date', 200
    );

    // Detect genuinely new incoming messages for notifications
    if (silent && prevMsgIdsRef.current.size > 0) {
      const newIncoming = msgs.filter(
        m => m.sender_email === friend.email && !m.is_read && !prevMsgIdsRef.current.has(m.id)
      );
      if (newIncoming.length > 0) {
        showMessageNotification(friend.name, newIncoming, conversationKey, user);
      }
    }
    prevMsgIdsRef.current = new Set(msgs.map(m => m.id));

    setMessages(msgs);
    if (!silent) setLoading(false);
  }, [conversationKey, friend, user]);

  const markAsRead = useCallback(async () => {
    if (!conversationKey || !user) return;
    const unread = await base44.entities.DirectMessage.filter({
      conversation_key: conversationKey, receiver_email: user.email, is_read: false,
    });
    await Promise.all(
      unread.map(m => base44.entities.DirectMessage.update(m.id, {
        is_read: true, read_at: new Date().toISOString(),
      }))
    );
  }, [conversationKey, user]);

  const checkFriendTyping = useCallback(async () => {
    if (!conversationKey || !friend) return;
    try {
      const statuses = await base44.entities.TypingStatus.filter({
        conversation_key: conversationKey, user_email: friend.email, is_typing: true,
      });
      if (statuses.length > 0) {
        const updatedAt = new Date(statuses[0].updated_date).getTime();
        setFriendTyping(Date.now() - updatedAt < 8000);
      } else {
        setFriendTyping(false);
      }
    } catch { setFriendTyping(false); }
  }, [conversationKey, friend]);

  // ── Typing status ──
  const sendTypingStatus = useCallback(async (isTyping) => {
    if (!conversationKey || !user) return;
    try {
      if (typingRef.current.id) {
        await base44.entities.TypingStatus.update(typingRef.current.id, { is_typing: isTyping });
      } else {
        const record = await base44.entities.TypingStatus.create({
          conversation_key: conversationKey, user_email: user.email, is_typing: isTyping,
        });
        typingRef.current.id = record.id;
      }
    } catch {
      try {
        const existing = await base44.entities.TypingStatus.filter({
          conversation_key: conversationKey, user_email: user.email,
        });
        if (existing.length > 0) {
          typingRef.current.id = existing[0].id;
          await base44.entities.TypingStatus.update(existing[0].id, { is_typing: isTyping });
        }
      } catch {}
    }
  }, [conversationKey, user]);

  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - typingRef.current.lastSent > 4000) {
      typingRef.current.lastSent = now;
      sendTypingStatus(true);
    }
    clearTimeout(typingRef.current.timeout);
    typingRef.current.timeout = setTimeout(() => sendTypingStatus(false), 5000);
  }, [sendTypingStatus]);

  // ── Send ──
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
    clearTimeout(typingRef.current.timeout);
    sendTypingStatus(false);

    await base44.entities.DirectMessage.create({
      sender_email: user.email, receiver_email: friend.email,
      text, conversation_key: conversationKey, is_read: false, reactions: [],
    });
    await loadMessages(true);
    setSending(false);
  };

  // ── Reactions ──
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
    await base44.entities.DirectMessage.update(msgId, { reactions });
    setRecentEmojis(addRecentEmoji(emoji));
    setReactionMenuId(null);
    setEmojiPickerMsgId(null);
    await loadMessages(true);
  };

  // ── Block ──
  const handleBlock = async () => {
    const [sent, received] = await Promise.all([
      base44.entities.Friendship.filter({ sender_email: user.email, receiver_email: friend.email, status: 'accepted' }),
      base44.entities.Friendship.filter({ sender_email: friend.email, receiver_email: user.email, status: 'accepted' }),
    ]);
    await Promise.all([...sent, ...received].map(f => base44.entities.Friendship.delete(f.id)));
    await base44.entities.UserBlock.create({ blocker_email: user.email, blocked_email: friend.email });
    toast.success(`Blocked ${friend.name}`);
    setBlockConfirm(false);
    onFriendshipChange?.();
    onBack();
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
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-gray-400" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <UserAvatar name={friend.name} avatarUrl={friend.avatar} size="md" isTyping={friendTyping} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{friend.name}</p>
          <p className="text-[11px] text-gray-500">
            {friendTyping
              ? <span className="text-amber-400 animate-pulse">typing...</span>
              : friend.email}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-900/20"
          onClick={() => onStartCall?.()}
          title="Start a call"
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
            <DropdownMenuItem className="text-red-400 hover:bg-red-900/20 cursor-pointer" onClick={() => setBlockConfirm(true)}>
              <Shield className="w-4 h-4 mr-2" /> Block User
            </DropdownMenuItem>
            <DropdownMenuItem className="text-orange-400 hover:bg-orange-900/20 cursor-pointer" onClick={() => setReportOpen(true)}>
              <Flag className="w-4 h-4 mr-2" /> Report User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Say hello to {friend.name}!
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_email === user.email;
          const dateStr = formatDateHeader(msg.created_date);
          let showDateHeader = false;
          if (dateStr !== lastDateStr) { showDateHeader = true; lastDateStr = dateStr; }
          const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];

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
                <div className="max-w-[75%]">
                  {/* Message bubble — single click opens reactions */}
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

                  {/* Existing reactions */}
                  {reactions.length > 0 && (
                    <div className={`flex gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {reactions.map((r, ri) => (
                        <span key={ri} className="text-xs bg-gray-800 border border-gray-700 rounded-full px-1.5 py-0.5">
                          {r.emoji}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Reaction bar: recent emojis + "+" for full picker */}
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

                  {/* Timestamp + read receipt */}
                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-gray-600">
                      {format(new Date(msg.created_date), 'h:mm a')}
                    </span>
                    {isMine && (
                      msg.is_read
                        ? <CheckCheck className="w-3 h-3 text-amber-500" />
                        : <Check className="w-3 h-3 text-gray-600" />
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Typing indicator */}
        {friendTyping && <TypingBubble name={friend.name} avatarUrl={friend.avatar} />}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-800 bg-gray-900">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if (e.target.value.trim()) handleTyping();
            }}
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

      {/* ── Full emoji picker overlay ── */}
      {emojiPickerMsgId && (
        <EmojiPicker
          onSelect={(emoji) => handleReaction(emojiPickerMsgId, emoji)}
          onClose={() => setEmojiPickerMsgId(null)}
        />
      )}

      {/* ── Block dialog ── */}
      <AlertDialog open={blockConfirm} onOpenChange={() => setBlockConfirm(false)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Block {friend.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              They won't be able to message you or send friend requests. You will also be removed from each other's friends list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-red-600 hover:bg-red-700">Block</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {reportOpen && (
        <ReportDialog
          targetEmail={friend.email}
          targetName={friend.name}
          reporterEmail={user.email}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}