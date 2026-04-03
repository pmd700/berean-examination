import React, { useRef, useState, useCallback, useEffect } from 'react';

const SECTION_COLORS = {
  default: { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
  amber: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  green: { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)', text: '#4ade80' },
  purple: { bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.2)', text: '#c084fc' },
  red: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)', text: '#f87171' },
};

export default function CanvasSection({ obj, zoom, isSelected, onSelect, onDragEnd, onPositionUpdate, onUpdate, onResize }) {
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState(null);
  const [resizing, setResizing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(obj.title || '');
  const dragStartRef = useRef(null);
  const objStartRef = useRef(null);
  const sizeStartRef = useRef(null);
  const didDrag = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => { setEditTitle(obj.title || ''); }, [obj.title]);

  const colors = SECTION_COLORS[obj.color] || SECTION_COLORS.default;

  const onMouseDown = useCallback((e) => {
    if (editing || resizing) return;
    e.stopPropagation();
    onSelect(obj.id);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    objStartRef.current = { x: obj.x, y: obj.y };
    setDragging(true);
    didDrag.current = false;

    const onMove = (ev) => {
      const dx = (ev.clientX - dragStartRef.current.x) / zoom;
      const dy = (ev.clientY - dragStartRef.current.y) / zoom;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag.current = true;
      const nx = objStartRef.current.x + dx;
      const ny = objStartRef.current.y + dy;
      setDragPos({ x: nx, y: ny });
      if (onPositionUpdate) onPositionUpdate(obj.id, nx, ny);
    };

    const onUp = (ev) => {
      const dx = (ev.clientX - dragStartRef.current.x) / zoom;
      const dy = (ev.clientY - dragStartRef.current.y) / zoom;
      setDragging(false);
      setDragPos(null);
      if (didDrag.current) onDragEnd(obj.id, objStartRef.current.x + dx, objStartRef.current.y + dy);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [obj, zoom, onSelect, onDragEnd, onPositionUpdate, editing, resizing]);

  // Resize handle
  const onResizeDown = useCallback((e) => {
    e.stopPropagation();
    setResizing(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    sizeStartRef.current = { w: obj.width || 400, h: obj.height || 300 };

    const onMove = (ev) => {
      const dw = (ev.clientX - dragStartRef.current.x) / zoom;
      const dh = (ev.clientY - dragStartRef.current.y) / zoom;
      const nw = Math.max(200, sizeStartRef.current.w + dw);
      const nh = Math.max(100, sizeStartRef.current.h + dh);
      if (onResize) onResize(obj.id, nw, nh);
    };

    const onUp = () => {
      setResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [obj, zoom, onResize]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitTitle = () => {
    setEditing(false);
    if (editTitle !== obj.title) onUpdate(obj.id, { title: editTitle });
  };

  const x = dragging && dragPos ? dragPos.x : obj.x;
  const y = dragging && dragPos ? dragPos.y : obj.y;

  return (
    <div
      data-obj-id={obj.id}
      className={`absolute select-none group ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${isSelected ? 'z-[5]' : 'z-[2]'}`}
      style={{
        left: x, top: y,
        width: obj.width || 400,
        height: obj.height || 300,
        willChange: dragging ? 'transform' : 'auto',
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={`w-full h-full rounded-2xl border-2 border-dashed transition-all duration-150 ${
          isSelected ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-gray-950' : ''
        }`}
        style={{ background: colors.bg, borderColor: colors.border }}
      >
        <div className="px-3 py-2">
          {editing ? (
            <input
              ref={inputRef}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setEditTitle(obj.title); setEditing(false); } }}
              className="bg-transparent text-xs font-semibold uppercase tracking-wider outline-none w-full"
              style={{ color: colors.text }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            />
          ) : (
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.text }}>
              {obj.title || 'Section'}
            </div>
          )}
        </div>
      </div>
      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={onResizeDown}
        style={{ borderRight: `3px solid ${colors.border}`, borderBottom: `3px solid ${colors.border}`, borderRadius: '0 0 8px 0' }}
      />
    </div>
  );
}