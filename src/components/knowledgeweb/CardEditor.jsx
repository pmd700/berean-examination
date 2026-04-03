import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Trash2, Image as ImageIcon, Clock, Tag, BookOpen, Plus, ExternalLink, Crosshair, Maximize2, Minimize2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import RichTextEditor from '../editor/RichTextEditor';
import moment from 'moment';

const CARD_TYPES = ['Person', 'Place', 'Keyword', 'Doctrine', 'Verse', 'Event', 'Question', 'Custom'];
const AUTO_EXPAND_THRESHOLD = 350;

function getDescriptionCharCount(content = '') {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length;
}

export default function CardEditor({ card, webs, allPlacements, onUpdate, onDelete, onClose, onFocus, isFocused, onJumpToWeb }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cardType, setCardType] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scriptureRefs, setScriptureRefs] = useState([]);
  const [newRef, setNewRef] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    setTitle(card.title || '');
    setDescription(card.description || '');
    setCardType(card.card_type || '');
    setTagsStr((card.tags || []).join(', '));
    setImageUrl(card.image_url || '');
    setScriptureRefs(card.scripture_refs || []);
    setNewRef('');
    setConfirmDelete(false);
    setDescriptionExpanded(false);
  }, [card.id]);

  const autosave = (updates) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate(card.id, updates);
    }, 500);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    onUpdate(card.id, { image_url: file_url });
    setUploading(false);
  };

  const addScriptureRef = () => {
    if (!newRef.trim()) return;
    const updated = [...scriptureRefs, newRef.trim()];
    setScriptureRefs(updated);
    setNewRef('');
    onUpdate(card.id, { scripture_refs: updated });
  };

  const removeScriptureRef = (idx) => {
    const updated = scriptureRefs.filter((_, i) => i !== idx);
    setScriptureRefs(updated);
    onUpdate(card.id, { scripture_refs: updated });
  };

  // Find which webs this card appears on — via placements or direct web_id
  const placementWebIds = (allPlacements || []).filter(p => p.card_id === card.id).map(p => p.web_id);
  const allWebIds = new Set([card.web_id, ...placementWebIds]);
  const appearsOnWebs = webs ? webs.filter(w => allWebIds.has(w.id)) : [];

  return (
    <div className={`${descriptionExpanded ? 'w-[28rem] xl:w-[32rem]' : 'w-80'} bg-gray-900 border-l border-gray-800 flex flex-col h-full transition-[width] duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <h3 className="text-sm font-semibold text-gray-200">Card Inspector</h3>
        </div>
        <div className="flex items-center gap-1">
          {onFocus && (
            <button
              onClick={() => onFocus(card.id)}
              className={`p-1 rounded transition-colors ${isFocused ? 'text-amber-400 bg-amber-600/15' : 'text-gray-500 hover:text-amber-400'}`}
              title="Focus on this card"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Image Section */}
        <div className="border-b border-gray-800">
          {imageUrl ? (
            <div className="relative group">
              <img src={imageUrl} alt="" className="w-full h-44 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <button
                  onClick={() => { setImageUrl(''); onUpdate(card.id, { image_url: '' }); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/80 text-white text-xs px-3 py-1.5 rounded-lg"
                >
                  Remove Image
                </button>
              </div>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 h-28 cursor-pointer hover:bg-gray-800/50 transition-colors m-3 rounded-xl border border-dashed border-gray-700 hover:border-amber-600/40">
              {uploading ? (
                <span className="text-xs text-gray-500 animate-pulse">Uploading...</span>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-500">Click or drop image</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
        </div>

        {/* Fields */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Title</label>
            <Input
              value={title}
              onChange={e => { setTitle(e.target.value); autosave({ title: e.target.value }); }}
              className="mt-1 bg-gray-800/50 border-gray-700 text-gray-100 h-9 text-sm focus:border-amber-500"
              placeholder="Card title"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Description</label>
              <button
                type="button"
                onClick={() => setDescriptionExpanded(prev => !prev)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 hover:text-amber-400 hover:bg-gray-800/70 transition-colors"
              >
                {descriptionExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                {descriptionExpanded ? 'Compact' : 'Expand'}
              </button>
            </div>
            <div className={`mt-1 kw-card-editor-rich ${descriptionExpanded ? 'min-h-[28rem]' : 'min-h-[16rem]'}`}>
              <RichTextEditor
                content={description}
                onChange={(value) => {
                  setDescription(value);
                  if (!descriptionExpanded && getDescriptionCharCount(value) >= AUTO_EXPAND_THRESHOLD) {
                    setDescriptionExpanded(true);
                  }
                  autosave({ description: value });
                }}
                placeholder="Add description or notes with rich text or markdown..."
              />
            </div>
            <style>{`
              .kw-card-editor-rich > div {
                background: #020617;
                border-color: #374151;
              }
              .kw-card-editor-rich .ProseMirror {
                color: #f9fafb;
                background: transparent;
              }
              .kw-card-editor-rich .ProseMirror p,
              .kw-card-editor-rich .ProseMirror li,
              .kw-card-editor-rich .ProseMirror h1,
              .kw-card-editor-rich .ProseMirror h2,
              .kw-card-editor-rich .ProseMirror h3,
              .kw-card-editor-rich .ProseMirror strong,
              .kw-card-editor-rich .ProseMirror em,
              .kw-card-editor-rich .ProseMirror u {
                color: #f9fafb;
              }
              .kw-card-editor-rich .ProseMirror ul,
              .kw-card-editor-rich .ProseMirror ol {
                padding-left: 1.5rem;
                margin: 0.75rem 0;
              }
              .kw-card-editor-rich .ProseMirror ul {
                list-style-type: disc;
              }
              .kw-card-editor-rich .ProseMirror ol {
                list-style-type: decimal;
              }
              .kw-card-editor-rich .ProseMirror li {
                display: list-item;
                margin: 0.2rem 0;
              }
              .kw-card-editor-rich .ProseMirror li::marker {
                color: #f9fafb;
              }
              .kw-card-editor-rich .ProseMirror p.is-editor-empty:first-child::before {
                color: #9ca3af;
              }
            `}</style>
          </div>

          {/* Type */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Type</label>
            <Select
              value={cardType || '_none'}
              onValueChange={v => {
                const val = v === '_none' ? '' : v;
                setCardType(val);
                onUpdate(card.id, { card_type: val });
              }}
            >
              <SelectTrigger className="mt-1 bg-gray-800/50 border-gray-700 text-gray-100 h-9 text-sm">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {CARD_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags
            </label>
            <Input
              value={tagsStr}
              onChange={e => {
                setTagsStr(e.target.value);
                const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                autosave({ tags });
              }}
              className="mt-1 bg-gray-800/50 border-gray-700 text-gray-100 h-9 text-sm"
              placeholder="tag1, tag2, ..."
            />
          </div>

          {/* Scripture References */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Scripture References
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
                  placeholder="e.g. John 3:16"
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
          <div className="pt-2 border-t border-gray-800 space-y-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" /> Metadata
            </label>
            <div className="text-[11px] text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Created</span>
                <span className="text-gray-400">{moment(card.created_date).format('MMM D, YYYY h:mm A')}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span className="text-gray-400">{moment(card.updated_date || card.created_date).format('MMM D, YYYY h:mm A')}</span>
              </div>
            </div>

            {appearsOnWebs.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Appears on {appearsOnWebs.length} web{appearsOnWebs.length > 1 ? 's' : ''}</div>
                <div className="space-y-1">
                  {appearsOnWebs.map(w => (
                    <button
                      key={w.id}
                      onClick={() => onJumpToWeb && onJumpToWeb(w.id)}
                      className="w-full text-left text-xs text-amber-400 hover:text-amber-300 px-2 py-1.5 bg-gray-800/50 rounded hover:bg-gray-800 transition-colors"
                    >
                      {w.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete */}
      <div className="p-3 border-t border-gray-800">
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onDelete(card.id)}
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
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Card
          </Button>
        )}
      </div>
    </div>
  );
}