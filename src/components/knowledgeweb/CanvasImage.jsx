import React, { useRef, useState, useCallback } from 'react';

export default function CanvasImage({ obj, zoom, isSelected, onSelect, onDragEnd, onPositionUpdate }) {
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState(null);
  const dragStartRef = useRef(null);
  const objStartRef = useRef(null);
  const didDrag = useRef(false);

  const onMouseDown = useCallback((e) => {
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
  }, [obj, zoom, onSelect, onDragEnd, onPositionUpdate]);

  const x = dragging && dragPos ? dragPos.x : obj.x;
  const y = dragging && dragPos ? dragPos.y : obj.y;

  return (
    <div
      data-obj-id={obj.id}
      className={`absolute select-none group ${dragging ? 'cursor-grabbing z-[100]' : 'cursor-grab'} ${isSelected ? 'z-50' : 'z-[9]'}`}
      style={{ left: x, top: y, width: obj.width || 240, willChange: dragging ? 'transform' : 'auto' }}
      onMouseDown={onMouseDown}
    >
      <div className={`rounded-xl overflow-hidden shadow-lg transition-all duration-150 ${
        isSelected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-gray-950' : 'border border-gray-700/50 hover:border-gray-600'
      }`}>
        <img src={obj.image_url} alt="" className="w-full h-auto object-cover" draggable={false} />
      </div>
    </div>
  );
}