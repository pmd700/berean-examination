import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Shield, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '../ui/loading-screen';
import UserAvatar from './UserAvatar';

export default function BlockedUsersPanel({ user }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlocks();
  }, [user]);

  const loadBlocks = async () => {
    if (!user) return;
    const b = await base44.entities.UserBlock.filter({ blocker_email: user.email });
    setBlocks(b);
    setLoading(false);
  };

  const handleUnblock = async (block) => {
    await base44.entities.UserBlock.delete(block.id);
    toast.success(`Unblocked ${block.blocked_email}`);
    await loadBlocks();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Blocked Users ({blocks.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <Shield className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No blocked users</p>
          </div>
        ) : (
          blocks.map(block => (
            <div key={block.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-800">
              <UserAvatar name={block.blocked_email} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{block.blocked_email}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:text-white hover:border-green-700"
                onClick={() => handleUnblock(block)}
              >
                <Unlock className="w-3.5 h-3.5 mr-1.5" /> Unblock
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}