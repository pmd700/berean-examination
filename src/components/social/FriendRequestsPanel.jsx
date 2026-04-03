import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, Check, X, Send, Clock, Inbox
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { LoadingSpinner } from '../ui/loading-screen';
import UserAvatar from './UserAvatar';
import UsernameSearch from './UsernameSearch';

export default function FriendRequestsPanel({ user, onFriendshipChange }) {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState('incoming');

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    const [inc, out] = await Promise.all([
      base44.entities.Friendship.filter({ receiver_email: user.email, status: 'pending' }),
      base44.entities.Friendship.filter({ sender_email: user.email, status: 'pending' }),
    ]);
    setIncoming(inc);
    setOutgoing(out);
    setLoading(false);
  }, [user]);

  const sendRequestToUser = async (selectedUser) => {
    if (!selectedUser || sending) return;

    const email = selectedUser.email;
    if (email === user.email) {
      toast.error("You can't add yourself");
      return;
    }

    setSending(true);

    // Check if already friends or pending
    const [existing, existingReverse] = await Promise.all([
      base44.entities.Friendship.filter({ sender_email: user.email, receiver_email: email }),
      base44.entities.Friendship.filter({ sender_email: email, receiver_email: user.email }),
    ]);
    
    const all = [...existing, ...existingReverse];
    if (all.some(f => f.status === 'accepted')) {
      toast.error('You are already friends with this user');
      setSending(false);
      return;
    }
    if (all.some(f => f.status === 'pending')) {
      toast.error('A friend request already exists');
      setSending(false);
      return;
    }

    // Check if blocked
    const blocks = await base44.entities.UserBlock.filter({ blocker_email: email, blocked_email: user.email });
    if (blocks.length > 0) {
      toast.error('Unable to send request to this user');
      setSending(false);
      return;
    }

    await base44.entities.Friendship.create({
      sender_email: user.email,
      receiver_email: email,
      status: 'pending',
      sender_name: user.username || user.full_name || user.email.split('@')[0],
      sender_avatar: user.avatar_url || '',
      receiver_name: selectedUser.username || selectedUser.full_name || email.split('@')[0],
      receiver_avatar: selectedUser.avatar_url || '',
    });

    toast.success(`Friend request sent to ${selectedUser.username || selectedUser.full_name}!`);
    await loadRequests();
    setSending(false);
  };

  const handleAccept = async (request) => {
    await base44.entities.Friendship.update(request.id, {
      status: 'accepted',
      receiver_name: user.username || user.full_name || user.email.split('@')[0],
      receiver_avatar: user.avatar_url || '',
    });
    toast.success(`Accepted ${request.sender_name || request.sender_email}`);
    await loadRequests();
    onFriendshipChange?.();
  };

  const handleDecline = async (request) => {
    await base44.entities.Friendship.update(request.id, { status: 'declined' });
    toast.success('Request declined');
    await loadRequests();
  };

  const handleCancel = async (request) => {
    await base44.entities.Friendship.delete(request.id);
    toast.success('Request cancelled');
    await loadRequests();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Send request */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add a Friend
        </h2>
        <UsernameSearch
          currentUserEmail={user.email}
          onSelectUser={sendRequestToUser}
        />
        {sending && (
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-400">
            <LoadingSpinner size="sm" /> Sending request...
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setTab('incoming')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'incoming'
              ? 'text-amber-400 border-b-2 border-amber-500'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Incoming ({incoming.length})
        </button>
        <button
          onClick={() => setTab('outgoing')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'outgoing'
              ? 'text-amber-400 border-b-2 border-amber-500'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Sent ({outgoing.length})
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === 'incoming' ? (
          incoming.length === 0 ? (
            <EmptyState icon={Inbox} text="No incoming friend requests" />
          ) : (
            incoming.map(req => (
              <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-800">
                <UserAvatar name={req.sender_name} avatarUrl={req.sender_avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{req.sender_name || req.sender_email}</p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(req.created_date), 'MMM d, h:mm a')}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700" onClick={() => handleAccept(req)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-900/20" onClick={() => handleDecline(req)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )
        ) : (
          outgoing.length === 0 ? (
            <EmptyState icon={Send} text="No pending sent requests" />
          ) : (
            outgoing.map(req => (
              <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-800">
                <UserAvatar name={req.receiver_name || req.receiver_email} avatarUrl={req.receiver_avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{req.receiver_name || req.receiver_email}</p>
                  <p className="text-[11px] text-gray-500">Pending...</p>
                </div>
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400" onClick={() => handleCancel(req)}>
                  Cancel
                </Button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
      <Icon className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}