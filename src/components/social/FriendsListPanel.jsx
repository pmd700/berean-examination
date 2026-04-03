import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { 
  Users, MessageCircle, Shield, Flag, MoreVertical, UserX
} from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '../ui/loading-screen';
import UserAvatar from './UserAvatar';
import ReportDialog from './ReportDialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function FriendsListPanel({ user, onStartChat, onFriendshipChange }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockConfirm, setBlockConfirm] = useState(null);
  const [unfriendConfirm, setUnfriendConfirm] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

  useEffect(() => {
    loadFriends();
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    const [sent, received] = await Promise.all([
      base44.entities.Friendship.filter({ sender_email: user.email, status: 'accepted' }),
      base44.entities.Friendship.filter({ receiver_email: user.email, status: 'accepted' }),
    ]);

    const merged = [
      ...sent.map(f => ({
        friendshipId: f.id,
        email: f.receiver_email,
        name: f.receiver_name || f.receiver_email.split('@')[0],
        avatar: f.receiver_avatar,
        since: f.updated_date || f.created_date,
      })),
      ...received.map(f => ({
        friendshipId: f.id,
        email: f.sender_email,
        name: f.sender_name || f.sender_email.split('@')[0],
        avatar: f.sender_avatar,
        since: f.updated_date || f.created_date,
      })),
    ];
    setFriends(merged);
    setLoading(false);
  };

  const handleBlock = async () => {
    if (!blockConfirm) return;
    // Remove friendship
    await base44.entities.Friendship.delete(blockConfirm.friendshipId);
    // Create block
    await base44.entities.UserBlock.create({
      blocker_email: user.email,
      blocked_email: blockConfirm.email,
    });
    toast.success(`Blocked ${blockConfirm.name}`);
    setBlockConfirm(null);
    await loadFriends();
    onFriendshipChange?.();
  };

  const handleUnfriend = async () => {
    if (!unfriendConfirm) return;
    await base44.entities.Friendship.delete(unfriendConfirm.friendshipId);
    toast.success(`Removed ${unfriendConfirm.name} from friends`);
    setUnfriendConfirm(null);
    await loadFriends();
    onFriendshipChange?.();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          <Users className="w-4 h-4" /> Friends ({friends.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No friends yet. Send a request!</p>
          </div>
        ) : (
          friends.map(friend => (
            <div key={friend.friendshipId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-800 hover:border-gray-700 transition-colors">
              <UserAvatar name={friend.name} avatarUrl={friend.avatar} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{friend.name}</p>
                <p className="text-[11px] text-gray-500">{friend.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-amber-400 hover:bg-amber-900/20"
                  onClick={() => onStartChat(friend)}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                    <DropdownMenuItem
                      className="text-gray-300 hover:bg-gray-800 cursor-pointer"
                      onClick={() => setUnfriendConfirm(friend)}
                    >
                      <UserX className="w-4 h-4 mr-2" /> Unfriend
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-400 hover:bg-red-900/20 cursor-pointer"
                      onClick={() => setBlockConfirm(friend)}
                    >
                      <Shield className="w-4 h-4 mr-2" /> Block
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-orange-400 hover:bg-orange-900/20 cursor-pointer"
                      onClick={() => setReportTarget(friend)}
                    >
                      <Flag className="w-4 h-4 mr-2" /> Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Block confirm */}
      <AlertDialog open={!!blockConfirm} onOpenChange={() => setBlockConfirm(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Block {blockConfirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              They won't be able to message you or send friend requests. This also removes them from your friends list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-red-600 hover:bg-red-700">Block</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unfriend confirm */}
      <AlertDialog open={!!unfriendConfirm} onOpenChange={() => setUnfriendConfirm(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove {unfriendConfirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              They will be removed from your friends list. You can send a new request later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnfriend} className="bg-orange-600 hover:bg-orange-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {reportTarget && (
        <ReportDialog
          targetEmail={reportTarget.email}
          targetName={reportTarget.name}
          reporterEmail={user.email}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}