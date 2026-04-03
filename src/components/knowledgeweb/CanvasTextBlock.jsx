import React, { useRef, useState, useCallback, useEffect } from 'react';

export default function CanvasTextBlock({ obj, zoom, isSelected, onSelect, onDragEnd, onPositionUpdate, onUpdate, onDelete }) {
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(obj.content || '');
  const dragStartRef = useRef(null);
  const objStartRef = useRef(null);
  const didDrag = useRef(false);
  const textRef = useRef(null);

  useEffect(() => { setEditContent(obj.content || ''); }, [obj.content]);

  const onMouseDown = useCallback((e) => {
    if (editing) return;
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
  }, [obj, zoom, onSelect, onDragEnd, onPositionUpdate, editing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => textRef.current?.focus(), 50);
  };

  const commitEdit = () => {
    setEditing(false);
    if (editContent !== obj.content) {
      onUpdate(obj.id, { content: editContent });
    }
  };

  const x = dragging && dragPos ? dragPos.x : obj.x;
  const y = dragging && dragPos ? dragPos.y : obj.y;

  return (
    <div
      data-obj-id={obj.id}
      className={`absolute select-none group ${dragging ? 'cursor-grabbing z-[100]' : 'cursor-grab'} ${isSelected ? 'z-50' : 'z-[8]'}`}
      style={{ left: x, top: y, width: obj.width || 240, willChange: dragging ? 'transform' : 'auto' }}
      onMouseDown={onMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className={`rounded-lg p-3 transition-all duration-150 ${
        isSelected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-gray-950 bg-gray-800/60' : 'hover:bg-gray-800/30'
      }`}>
        {editing ? (
          <textarea
            ref={textRef}
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Escape') commitEdit(); }}
            className="w-full bg-transparent text-sm text-gray-200 outline-none resize-none min-h-[40px] placeholder:text-gray-600"
            placeholder="Type here..."
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          />
        ) : (
          <div className="text-sm text-gray-300 whitespace-pre-wrap min-h-[20px]">
            {obj.content || <span className="text-gray-600 italic">Double-click to edit</span>}
          </div>
        )}
      </div>
    </div>
  );
}