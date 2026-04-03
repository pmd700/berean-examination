import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Crown, UserMinus, Image, Users } from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from './UserAvatar';

const GROUP_EMOJIS = ['👥', '🔥', '💬', '📚', '⛪', '🙏', '✝️', '🕊️', '🌟', '📖', '💡', '🎯'];

export default function GroupSettingsDialog({ user, group, onClose, onUpdated }) {
  const [name, setName] = useState(group.name || '');
  const [iconUrl, setIconUrl] = useState(group.icon_url || '');
  const [iconEmoji, setIconEmoji] = useState(group.icon_emoji || '👥');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isAdmin = group.admin_emails?.includes(user.email);

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

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }
    setSaving(true);
    await base44.entities.GroupChat.update(group.id, {
      name: name.trim(),
      icon_url: iconUrl,
      icon_emoji: iconEmoji,
    });
    toast.success('Group updated');
    setSaving(false);
    onUpdated?.();
    onClose();
  };

  const handleRemoveMember = async (email) => {
    if (!isAdmin) return;
    if (email === user.email) return;

    const idx = group.member_emails.indexOf(email);
    const removedName = group.member_names?.[idx] || email.split('@')[0];

    const updatedEmails = group.member_emails.filter(e => e !== email);
    const updatedNames = [...(group.member_names || [])];
    const updatedAvatars = [...(group.member_avatars || [])];
    if (idx >= 0) { updatedNames.splice(idx, 1); updatedAvatars.splice(idx, 1); }
    const updatedAdmins = (group.admin_emails || []).filter(e => e !== email);

    await base44.entities.GroupChat.update(group.id, {
      member_emails: updatedEmails,
      member_names: updatedNames,
      member_avatars: updatedAvatars,
      admin_emails: updatedAdmins,
    });

    const myName = user.display_name || user.full_name || user.email.split('@')[0];
    await base44.entities.GroupMessage.create({
      group_id: group.id,
      sender_email: user.email,
      sender_name: myName,
      text: `${myName} removed ${removedName} from the group`,
      is_system: true,
      reactions: [],
      read_by: [],
    });

    toast.success(`Removed ${removedName}`);
    onUpdated?.();
    onClose();
  };

  const handleToggleAdmin = async (email) => {
    if (!isAdmin || email === user.email) return;
    const admins = [...(group.admin_emails || [])];
    const idx = admins.indexOf(email);
    if (idx >= 0) {
      admins.splice(idx, 1);
    } else {
      admins.push(email);
    }
    await base44.entities.GroupChat.update(group.id, { admin_emails: admins });
    toast.success('Admin list updated');
    onUpdated?.();
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
            <h2 className="text-lg font-semibold text-white">Group Settings</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Icon + name (editable by admins) */}
          {isAdmin ? (
            <div className="flex items-start gap-4">
              <div className="relative">
                {iconUrl ? (
                  <img src={iconUrl} alt="Group" className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center text-3xl border border-gray-700">
                    {iconEmoji}
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-700 flex items-center justify-center cursor-pointer">
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
                      onClick={() => { setIconEmoji(e); setIconUrl(''); }}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all ${
                        iconEmoji === e && !iconUrl ? 'bg-amber-600/20 ring-1 ring-amber-500' : 'hover:bg-gray-800'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {iconUrl ? (
                <img src={iconUrl} alt="Group" className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center text-3xl border border-gray-700">
                  {iconEmoji}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-white">{group.name}</p>
                <p className="text-sm text-gray-500">{group.member_emails?.length} members</p>
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Members ({group.member_emails?.length || 0})</p>
            <div className="space-y-1 border border-gray-800 rounded-lg">
              {(group.member_emails || []).map((email, idx) => {
                const memberName = group.member_names?.[idx] || email.split('@')[0];
                const memberAvatar = group.member_avatars?.[idx] || null;
                const memberIsAdmin = group.admin_emails?.includes(email);
                const isMe = email === user.email;

                return (
                  <div key={email} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800/30">
                    <UserAvatar name={memberName} avatarUrl={memberAvatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">
                        {memberName} {isMe && <span className="text-gray-500">(you)</span>}
                      </p>
                    </div>
                    {memberIsAdmin && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full">
                        <Crown className="w-3 h-3" /> Admin
                      </span>
                    )}
                    {isAdmin && !isMe && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleAdmin(email)}
                          className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-amber-400"
                          title={memberIsAdmin ? 'Remove admin' : 'Make admin'}
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveMember(email)}
                          className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400"
                          title="Remove member"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="bg-amber-600 hover:bg-amber-700">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}