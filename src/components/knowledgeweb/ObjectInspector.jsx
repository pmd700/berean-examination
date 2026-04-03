import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Trash2, Type, LayoutGrid, Image as ImageIcon } from 'lucide-react';

const SECTION_COLORS = [
  { id: 'default', label: 'Blue', color: '#3b82f6' },
  { id: 'amber', label: 'Amber', color: '#f59e0b' },
  { id: 'green', label: 'Green', color: '#22c55e' },
  { id: 'purple', label: 'Purple', color: '#a855f7' },
  { id: 'red', label: 'Red', color: '#ef4444' },
];

export default function ObjectInspector({ obj, onUpdate, onDelete, onClose }) {
  const [title, setTitle] = useState(obj.title || '');
  const [content, setContent] = useState(obj.content || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    setTitle(obj.title || '');
    setContent(obj.content || '');
    setConfirmDelete(false);
  }, [obj.id]);

  const autosave = (updates) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUpdate(obj.id, updates), 500);
  };

  const typeLabels = { text: 'Text Block', section: 'Section', image: 'Image' };
  const TypeIcon = obj.object_type === 'text' ? Type : obj.object_type === 'section' ? LayoutGrid : ImageIcon;

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-3.5 h-3.5 text-sky-400" />
          <h3 className="text-sm font-semibold text-gray-200">{typeLabels[obj.object_type] || 'Object'}</h3>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {obj.object_type === 'section' && (
          <>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Title</label>
              <Input
                value={title}
                onChange={e => { setTitle(e.target.value); autosave({ title: e.target.value }); }}
                className="mt-1 bg-gray-800/50 border-gray-700 text-gray-100 h-9 text-sm"
                placeholder="Section title"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Color</label>
              <div className="flex gap-2 mt-1.5">
                {SECTION_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onUpdate(obj.id, { color: c.id })}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${
                      (obj.color || 'default') === c.id ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ background: c.color + '30' }}
                  >
                    <div className="w-full h-full rounded-md" style={{ background: c.color }} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Size</label>
              <div className="flex gap-2 mt-1">
                <div>
                  <span className="text-[9px] text-gray-600">W</span>
                  <Input
                    type="number"
                    value={obj.width || 400}
                    onChange={e => onUpdate(obj.id, { width: Math.max(200, parseInt(e.target.value) || 400) })}
                    className="bg-gray-800/50 border-gray-700 text-gray-100 h-7 text-xs w-20"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-gray-600">H</span>
                  <Input
                    type="number"
                    value={obj.height || 300}
                    onChange={e => onUpdate(obj.id, { height: Math.max(100, parseInt(e.target.value) || 300) })}
                    className="bg-gray-800/50 border-gray-700 text-gray-100 h-7 text-xs w-20"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {obj.object_type === 'text' && (
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Content</label>
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); autosave({ content: e.target.value }); }}
              className="mt-1 w-full bg-gray-800/50 border border-gray-700 text-gray-100 rounded-md p-2.5 text-sm resize-none h-32 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-gray-600"
              placeholder="Write text..."
            />
          </div>
        )}

        {obj.object_type === 'image' && obj.image_url && (
          <div>
            <img src={obj.image_url} alt="" className="w-full rounded-lg" />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-800">
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onDelete(obj.id)} className="flex-1 h-8 text-xs bg-red-600 hover:bg-red-700 text-white">Confirm</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="h-8 text-xs text-gray-400">Cancel</Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="w-full text-red-400/70 hover:text-red-300 hover:bg-red-950/20">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
          </Button>
        )}
      </div>
    </div>
  );
}