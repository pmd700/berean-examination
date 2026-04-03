import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Network, Trash2, ChevronLeft } from 'lucide-react';
import moment from 'moment';

export default function WebListSidebar({ webs, activeWebId, onSelect, onCreate, onDelete, onBack }) {
  const [newTitle, setNewTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    onCreate(newTitle.trim());
    setNewTitle('');
    setShowCreate(false);
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full flex-shrink-0">
      <div className="p-3 border-b border-gray-800 flex items-center gap-2">
        <Network className="w-5 h-5 text-amber-500" />
        <h2 className="text-sm font-bold text-gray-100 flex-1">Knowledge Webs</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-amber-500 hover:text-amber-400"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showCreate && (
        <div className="p-2 border-b border-gray-800">
          <Input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Web title..."
            className="bg-gray-800 border-gray-700 text-gray-100 h-8 text-sm mb-1.5"
          />
          <div className="flex gap-1.5">
            <Button size="sm" onClick={handleCreate} className="flex-1 h-7 text-xs bg-amber-600 hover:bg-amber-700">Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)} className="h-7 text-xs text-gray-400">Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {webs.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-xs">
            No webs yet. Create your first one!
          </div>
        )}
        {webs.map(w => (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-all group flex items-center gap-2 ${
              activeWebId === w.id
                ? 'bg-amber-600/15 text-amber-400 border border-amber-600/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <Network className="w-3.5 h-3.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{w.title}</div>
              <div className="text-[10px] text-gray-600">{moment(w.updated_date || w.created_date).fromNow()}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(w.id); }}
              className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}