import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Trash2, ArrowRight, Minus, Clock, BookOpen, Plus, ExternalLink } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { createPageUrl } from '@/utils';
import moment from 'moment';

const QUICK_LABELS = [
  'relates to', 'causes', 'fulfills', 'foreshadows', 'contradicts',
  'supports', 'leads to', 'part of', 'symbolizes', 'teaches',
];

export default function ConnectionEditor({ connection, cards, onUpdate, onDelete, onClose }) {
  const [label, setLabel] = useState('');
  const [hasArrow, setHasArrow] = useState(true);
  const [notes, setNotes] = useState('');
  const [scriptureRefs, setScriptureRefs] = useState([]);
  const [newRef, setNewRef] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    setLabel(connection.label || '');
    setHasArrow(connection.has_arrow ?? true);
    setNotes(connection.notes || '');
    setScriptureRefs(connection.scripture_refs || []);
    setNewRef('');
    setConfirmDelete(false);
  }, [connection.id]);

  const autosave = (updates) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate(connection.id, updates);
    }, 500);
  };

  const addScriptureRef = () => {
    if (!newRef.trim()) return;
    const updated = [...scriptureRefs, newRef.trim()];
    setScriptureRefs(updated);
    setNewRef('');
    onUpdate(connection.id, { scripture_refs: updated });
  };

  const removeScriptureRef = (idx) => {
    const updated = scriptureRefs.filter((_, i) => i !== idx);
    setScriptureRefs(updated);
    onUpdate(connection.id, { scripture_refs: updated });
  };

  const fromCard = cards.find(c => c.id === connection.from_card_id);
  const toCard = cards.find(c => c.id === connection.to_card_id);

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <h3 className="text-sm font-semibold text-gray-200">Connection Inspector</h3>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Connection visual */}
          <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-200 truncate">{fromCard?.title || '?'}</div>
              <div className="text-[10px] text-gray-500">{fromCard?.card_type || 'Card'}</div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {hasArrow ? (
                <ArrowRight className="w-4 h-4 text-amber-500" />
              ) : (
                <Minus className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="text-xs font-medium text-gray-200 truncate">{toCard?.title || '?'}</div>
              <div className="text-[10px] text-gray-500">{toCard?.card_type || 'Card'}</div>
            </div>
          </div>

          {/* Relationship Label */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Relationship Label</label>
            <Input
              value={label}
              onChange={e => { setLabel(e.target.value); autosave({ label: e.target.value }); }}
              className="mt-1 bg-gray-800/50 border-gray-700 text-gray-100 h-9 text-sm focus:border-amber-500"
              placeholder="e.g. relates to, fulfills..."
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {QUICK_LABELS.map(ql => (
                <button
                  key={ql}
                  onClick={() => { setLabel(ql); onUpdate(connection.id, { label: ql }); }}
                  className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                    label === ql
                      ? 'bg-amber-600/20 text-amber-400 border-amber-600/30'
                      : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:border-gray-600 hover:text-gray-400'
                  }`}
                >
                  {ql}
                </button>
              ))}
            </div>
          </div>

          {/* Direction */}
          <div className="flex items-center justify-between py-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Show Arrow (Direction)</label>
            <Switch
              checked={hasArrow}
              onCheckedChange={(v) => {
                setHasArrow(v);
                onUpdate(connection.id, { has_arrow: v });
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Notes</label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); autosave({ notes: e.target.value }); }}
              className="mt-1 w-full bg-gray-800/50 border border-gray-700 text-gray-100 rounded-md p-2.5 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 placeholder:text-gray-600"
              placeholder="Add notes about this connection..."
            />
          </div>

          {/* Evidence Scripture Refs */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Evidence / Scripture References
            </label>
            <div className="mt-1 space-y-1">
              {scriptureRefs.map((ref, idx) => (
                <div key={idx} className="flex items-center gap-1.5 group">
                  <a
                    href={createPageUrl('Study') + `?search=${encodeURIComponent(ref)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1.5 bg-amber-600/10 rounded-md border border-amber-600/20"
                    onClick={e => e.stopPropagation()}
                  >
                    {ref}
                    <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                  </a>
                  <button
                    onClick={() => removeScriptureRef(idx)}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <Input
                  value={newRef}
                  onChange={e => setNewRef(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addScriptureRef(); }}
                  className="bg-gray-800/50 border-gray-700 text-gray-100 h-7 text-xs flex-1"
                  placeholder="e.g. Romans 8:28"
                />
                <Button
                  size="sm"
                  onClick={addScriptureRef}
                  disabled={!newRef.trim()}
                  className="h-7 w-7 p-0 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-2 border-t border-gray-800 space-y-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" /> Metadata
            </label>
            <div className="text-[11px] text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Created</span>
                <span className="text-gray-400">{moment(connection.created_date).format('MMM D, YYYY h:mm A')}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span className="text-gray-400">{moment(connection.updated_date || connection.created_date).format('MMM D, YYYY h:mm A')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete */}
      <div className="p-3 border-t border-gray-800">
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onDelete(connection.id)}
              className="flex-1 h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              className="h-8 text-xs text-gray-400"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="w-full text-red-400/70 hover:text-red-300 hover:bg-red-950/20"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Connection
          </Button>
        )}
      </div>
    </div>
  );
}