import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { LoadingScreen } from '../components/ui/loading-screen';
import SocialSidebar from '../components/social/SocialSidebar';
import ConversationsPanel from '../components/social/ConversationsPanel';
import ChatView from '../components/social/ChatView';
import FriendRequestsPanel from '../components/social/FriendRequestsPanel';
import FriendsListPanel from '../components/social/FriendsListPanel';
import BlockedUsersPanel from '../components/social/BlockedUsersPanel';
import IncomingCallOverlay from '../components/social/IncomingCallOverlay';
import CallView from '../components/social/CallView';
import GroupConversationsPanel from '../components/social/GroupConversationsPanel';
import GroupChatView from '../components/social/GroupChatView';
import CreateGroupDialog from '../components/social/CreateGroupDialog';
import { trackActivity } from '../components/utils/activityTracker';
import { toast } from 'sonner';

function getConversationKey(email1, email2) {
  return [email1, email2].sort().join('::');
}

export default function Social() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversations');
  const [friends, setFriends] = useState([]);
  const [requestCount, setRequestCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Chat state
  const [activeFriend, setActiveFriend] = useState(null);
  const [activeConversationKey, setActiveConversationKey] = useState(null);

  // Group state
  const [activeGroup, setActiveGroup] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);

  // Call state
  const [activeCall, setActiveCall] = useState(null); // { signal, friend, conversationKey, isCaller }

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(createPageUrl('Social'));
        return;
      }
      const currentUser = await base44.auth.me();
      if (!currentUser?.access_key) {
        window.location.href = createPageUrl('KeyEntry');
        return;
      }
      setUser(currentUser);
      await loadFriends(currentUser);
      await loadCounts(currentUser);
      await loadGroupUnread(currentUser);

      // Restore tab/chat from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const friendEmailParam = urlParams.get('friend_email');
      if (tabParam) setActiveTab(tabParam);
    } catch (e) {
      window.location.href = createPageUrl('KeyEntry');
    }
    // Restore friend chat after friends load (needs friends data)
    setLoading(false);
  };

  // Restore friend chat from URL params after friends load
  useEffect(() => {
    if (!user || friends.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const friendEmailParam = urlParams.get('friend_email');
    if (friendEmailParam && !activeFriend) {
      const friend = friends.find(f => f.email === friendEmailParam);
      if (friend) {
        const key = getConversationKey(user.email, friend.email);
        setActiveFriend(friend);
        setActiveConversationKey(key);
      }
    }
  }, [friends, user]);

  const loadFriends = useCallback(async (u) => {
    const currentUser = u || user;
    if (!currentUser) return;
    const [sent, received] = await Promise.all([
      base44.entities.Friendship.filter({ sender_email: currentUser.email, status: 'accepted' }),
      base44.entities.Friendship.filter({ receiver_email: currentUser.email, status: 'accepted' }),
    ]);
    const merged = [
      ...sent.map(f => ({
        friendshipId: f.id,
        email: f.receiver_email,
        name: f.receiver_name || f.receiver_email.split('@')[0],
        avatar: f.receiver_avatar,
      })),
      ...received.map(f => ({
        friendshipId: f.id,
        email: f.sender_email,
        name: f.sender_name || f.sender_email.split('@')[0],
        avatar: f.sender_avatar,
      })),
    ];
    setFriends(merged);
  }, [user]);

  const loadCounts = useCallback(async (u) => {
    const currentUser = u || user;
    if (!currentUser) return;
    const pending = await base44.entities.Friendship.filter({ receiver_email: currentUser.email, status: 'pending' });
    setRequestCount(pending.length);

    // Unread messages count - check across all conversation keys
    // Simple approach: just count all unread messages for this user
    const unread = await base44.entities.DirectMessage.filter({
      receiver_email: currentUser.email,
      is_read: false,
    });
    setUnreadCount(unread.length);
  }, [user]);

  const handleFriendshipChange = useCallback(() => {
    loadFriends();
    loadCounts();
  }, [loadFriends, loadCounts]);

  const handleStartChat = (friend) => {
    const key = getConversationKey(user.email, friend.email);
    setActiveFriend(friend);
    setActiveConversationKey(key);
    setActiveTab('conversations');
    trackActivity({
      type: 'social_chat',
      page: 'Social',
      title: 'Continue messaging?',
      subtitle: friend.name,
      icon: 'social',
      url_params: `tab=conversations&friend_email=${encodeURIComponent(friend.email)}`,
    });
  };

  const handleSelectConversation = (friend, key) => {
    setActiveFriend(friend);
    setActiveConversationKey(key);
    trackActivity({
      type: 'social_chat',
      page: 'Social',
      title: 'Continue messaging?',
      subtitle: friend.name,
      icon: 'social',
      url_params: `tab=conversations&friend_email=${encodeURIComponent(friend.email)}`,
    });
  };

  const loadGroupUnread = useCallback(async (u) => {
    const currentUser = u || user;
    if (!currentUser) return;
    try {
      const allGroups = await base44.entities.GroupChat.list('-last_message_date', 100);
      const myGroups = allGroups.filter(g => g.member_emails?.includes(currentUser.email));
      let total = 0;
      for (const g of myGroups) {
        const msgs = await base44.entities.GroupMessage.filter({ group_id: g.id });
        total += msgs.filter(m =>
          !m.is_system && m.sender_email !== currentUser.email &&
          !(m.read_by || []).includes(currentUser.email)
        ).length;
      }
      setGroupUnreadCount(total);
    } catch {}
  }, [user]);

  const handleBackFromChat = () => {
    setActiveFriend(null);
    setActiveConversationKey(null);
    loadCounts();
  };

  const handleStartCall = async () => {
    if (!user || !activeFriend || !activeConversationKey) return;
    const signal = await base44.entities.CallSignal.create({
      conversation_key: activeConversationKey,
      caller_email: user.email,
      callee_email: activeFriend.email,
      caller_name: user.display_name || user.full_name || user.email.split('@')[0],
      caller_avatar: user.avatar_url || '',
      status: 'ringing',
    });
    setActiveCall({
      signal,
      friend: activeFriend,
      conversationKey: activeConversationKey,
      isCaller: true,
    });
  };

  const handleAcceptIncomingCall = (callSignal) => {
    const callerFriend = friends.find(f => f.email === callSignal.caller_email);
    const friendInfo = callerFriend || {
      email: callSignal.caller_email,
      name: callSignal.callerName || callSignal.caller_name || callSignal.caller_email.split('@')[0],
      avatar: callSignal.callerAvatar || callSignal.caller_avatar,
    };
    setActiveCall({
      signal: callSignal,
      friend: friendInfo,
      conversationKey: callSignal.conversation_key,
      isCaller: false,
    });
    // Navigate to the right conversation
    setActiveFriend(friendInfo);
    setActiveConversationKey(callSignal.conversation_key);
    setActiveTab('conversations');
  };

  const handleCallEnd = () => {
    setActiveCall(null);
  };

  // ── Group handlers ──
  const handleSelectGroup = (group) => {
    setActiveGroup(group);
  };

  const handleBackFromGroup = () => {
    setActiveGroup(null);
    loadGroupUnread();
  };

  const handleGroupCreated = (group) => {
    setActiveGroup(group);
    setActiveTab('groups');
    setShowCreateGroup(false);
    loadGroupUnread();
  };

  const handleGroupUpdated = async () => {
    if (!activeGroup) return;
    // Refresh the group data
    try {
      const groups = await base44.entities.GroupChat.filter({ id: activeGroup.id });
      if (groups.length > 0 && groups[0].member_emails?.includes(user.email)) {
        setActiveGroup(groups[0]);
      } else {
        setActiveGroup(null);
      }
    } catch {}
    loadGroupUnread();
  };

  const handleStartGroupCall = () => {
    if (!activeGroup) return;
    toast.info('Group calls coming soon!');
  };

  if (loading) {
    return <LoadingScreen message="Loading Social..." />;
  }

  // Mobile: show one panel at a time
  const showChat = activeFriend && activeConversationKey;

  return (
    <div className="h-screen bg-gray-950 flex">
      {/* Incoming call overlay (works from any tab) */}
      {!activeCall && (
        <IncomingCallOverlay user={user} friends={friends} onAcceptCall={handleAcceptIncomingCall} />
      )}

      {/* Active call view */}
      {activeCall && (
        <CallView
          user={user}
          friend={activeCall.friend}
          conversationKey={activeCall.conversationKey}
          callSignal={activeCall.signal}
          isCaller={activeCall.isCaller}
          onEnd={handleCallEnd}
        />
      )}

      {/* Sidebar - hidden on mobile when in chat or group */}
      <div className={`${showChat || activeGroup ? 'hidden md:flex' : 'flex'}`}>
        <SocialSidebar
          activeTab={activeTab}
          onTabChange={(newTab) => {
            setActiveTab(newTab);
            setActiveFriend(null);
            setActiveConversationKey(null);
            setActiveGroup(null);
            const tabLabels = {
              conversations: 'Continue messaging?',
              requests: 'Continue managing friend requests?',
              friends: 'Continue browsing friends?',
              blocked: 'Continue managing blocked users?',
            };
            trackActivity({
              type: `social_${newTab}`,
              page: 'Social',
              title: tabLabels[newTab] || 'Continue on Social?',
              icon: newTab === 'requests' ? 'requests' : newTab === 'friends' ? 'friends' : newTab === 'blocked' ? 'blocked' : 'social',
              url_params: `tab=${newTab}`,
            });
          }}
          requestCount={requestCount}
          unreadCount={unreadCount}
          groupUnreadCount={groupUnreadCount}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-w-0">
        {activeTab === 'conversations' && (
          <>
            {/* Conversation list - hidden on mobile when in chat */}
            <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-800 ${showChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
              <ConversationsPanel
                user={user}
                friends={friends}
                activeConversation={activeConversationKey}
                onSelectConversation={handleSelectConversation}
              />
            </div>

            {/* Chat view */}
            {showChat ? (
              <div className="flex-1 flex flex-col min-w-0">
                <ChatView
                  user={user}
                  friend={activeFriend}
                  conversationKey={activeConversationKey}
                  onBack={handleBackFromChat}
                  onFriendshipChange={handleFriendshipChange}
                  onStartCall={handleStartCall}
                />
              </div>
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center text-gray-600">
                <div className="text-center">
                  <p className="text-lg font-medium mb-1">Select a conversation</p>
                  <p className="text-sm">Choose a friend to start chatting</p>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'groups' && (
          <>
            {/* Group list - hidden on mobile when in group chat */}
            <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-800 ${activeGroup ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
              <GroupConversationsPanel
                user={user}
                activeGroupId={activeGroup?.id}
                onSelectGroup={handleSelectGroup}
                onCreateGroup={() => setShowCreateGroup(true)}
              />
            </div>

            {/* Group chat view */}
            {activeGroup ? (
              <div className="flex-1 flex flex-col min-w-0">
                <GroupChatView
                  user={user}
                  group={activeGroup}
                  onBack={handleBackFromGroup}
                  onGroupUpdated={handleGroupUpdated}
                  onStartGroupCall={handleStartGroupCall}
                />
              </div>
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center text-gray-600">
                <div className="text-center">
                  <p className="text-lg font-medium mb-1">Select a group</p>
                  <p className="text-sm">Choose a group or create a new one</p>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'requests' && (
          <div className="flex-1">
            <FriendRequestsPanel user={user} onFriendshipChange={handleFriendshipChange} />
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="flex-1">
            <FriendsListPanel user={user} onStartChat={handleStartChat} onFriendshipChange={handleFriendshipChange} />
          </div>
        )}

        {activeTab === 'blocked' && (
          <div className="flex-1">
            <BlockedUsersPanel user={user} />
          </div>
        )}
      </div>

      {/* Create group dialog */}
      {showCreateGroup && (
        <CreateGroupDialog
          user={user}
          friends={friends}
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </div>
  );
}