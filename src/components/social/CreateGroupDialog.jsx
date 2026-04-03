import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Users, Check, Search, Image } from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from './UserAvatar';

const GROUP_EMOJIS = ['👥', '🔥', '💬', '📚', '⛪', '🙏', '✝️', '🕊️', '🌟', '📖', '💡', '🎯'];

export default function CreateGroupDialog({ user, friends, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👥');
  const [iconUrl, setIconUrl] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFriend = (friend) => {
    setSelectedFriends(prev =>
      prev.find(f => f.email === friend.email)
        ? prev.filter(f => f.email !== friend.email)
        : [...prev, friend]
    );
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setIconUrl(file_url);
    } catch {
      toast.error('Failed to upload image');
    }
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (selectedFriends.length < 2) {
      toast.error('Select at least 2 friends (minimum 3 members total)');
      return;
    }

    setCreating(true);

    const memberEmails = [user.email, ...selectedFriends.map(f => f.email)];
    const memberNames = [
      user.display_name || user.full_name || user.email.split('@')[0],
      ...selectedFriends.map(f => f.name),
    ];
    const memberAvatars = [
      user.avatar_url || '',
      ...selectedFriends.map(f => f.avatar || ''),
    ];

    const group = await base44.entities.GroupChat.create({
      name: name.trim(),
      icon_url: iconUrl,
      icon_emoji: selectedEmoji,
      member_emails: memberEmails,
      member_names: memberNames,
      member_avatars: memberAvatars,
      admin_emails: [user.email],
      last_message_text: '',
      last_message_sender: '',
      last_message_date: new Date().toISOString(),
    });

    // System message
    await base44.entities.GroupMessage.create({
      group_id: group.id,
      sender_email: user.email,
      sender_name: memberNames[0],
      text: `${memberNames[0]} created the group "${name.trim()}"`,
      is_system: true,
      reactions: [],
      read_by: [user.email],
    });

    toast.success('Group created!');
    setCreating(false);
    onCreated(group);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[440px] max-w-[95vw] max-h-[85vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-white">Create Group</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Group icon + name */}
          <div className="flex items-start gap-4">
            <div className="relative">
              {iconUrl ? (
                <img src={iconUrl} alt="Group" className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center text-3xl border border-gray-700">
                  {selectedEmoji}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-700 flex items-center justify-center cursor-pointer transition-colors">
                <Image className="w-3 h-3 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} disabled={uploading} />
              </label>
            </div>
            <div className="flex-1 space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name..."
                maxLength={50}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
              <div className="flex gap-1 flex-wrap">
                {GROUP_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => { setSelectedEmoji(e); setIconUrl(''); }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${
                      selectedEmoji === e && !iconUrl ? 'bg-amber-600/20 ring-1 ring-amber-500' : 'hover:bg-gray-800'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Friend selector */}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">
              Add members ({selectedFriends.length} selected, {selectedFriends.length + 1} total)
            </p>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends..."
                className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Selected chips */}
            {selectedFriends.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {selectedFriends.map(f => (
                  <span
                    key={f.email}
                    className="flex items-center gap-1 bg-amber-600/20 text-amber-300 text-xs px-2 py-1 rounded-full border border-amber-600/30"
                  >
                    {f.name}
                    <button onClick={() => toggleFriend(f)} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-0.5 border border-gray-800 rounded-lg">
              {filteredFriends.length === 0 ? (
                <p className="text-center text-gray-600 text-sm py-4">
                  {friends.length === 0 ? 'No friends to add' : 'No matching friends'}
                </p>
              ) : (
                filteredFriends.map(f => {
                  const isSelected = selectedFriends.some(sf => sf.email === f.email);
                  return (
                    <button
                      key={f.email}
                      onClick={() => toggleFriend(f)}
                      className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${
                        isSelected ? 'bg-amber-600/10' : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <UserAvatar name={f.name} avatarUrl={f.avatar} size="sm" />
                      <span className="flex-1 text-sm text-gray-200 text-left truncate">{f.name}</span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim() || selectedFriends.length < 2}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {creating ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </div>
    </div>
  );
}