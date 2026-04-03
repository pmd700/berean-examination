import React, { useRef, useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MoveDiagonal2 } from 'lucide-react';

const TYPE_COLORS = {
  Person: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Place: 'bg-green-500/20 text-green-400 border-green-500/30',
  Keyword: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Doctrine: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Verse: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Event: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Question: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  Custom: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const TITLE_WRAP_LENGTH = 22;
const MIN_CARD_WIDTH = 180;
const MAX_CARD_WIDTH = 340;
const MIN_CARD_HEIGHT = 76;
const MIN_MANUAL_WIDTH = 96;
const MIN_MANUAL_HEIGHT = 48;

function formatTitleForCard(title = '') {
  const words = String(title).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Untitled';

  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const chunks = word.length > TITLE_WRAP_LENGTH
      ? word.match(new RegExp(`.{1,${TITLE_WRAP_LENGTH}}`, 'g'))
      : [word];

    chunks.forEach((chunk) => {
      if (!currentLine) {
        currentLine = chunk;
        return;
      }

      if (`${currentLine} ${chunk}`.length <= TITLE_WRAP_LENGTH) {
        currentLine = `${currentLine} ${chunk}`;
      } else {
        lines.push(currentLine);
        currentLine = chunk;
      }
    });
  });

  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
}

function getAutoCardSize(card, formattedTitle) {
  const titleLines = formattedTitle.split('\n');
  const longestLine = titleLines.reduce((max, line) => Math.max(max, line.length), 0);
  const titleHeight = titleLines.length * 20;
  const hasMeta = !!(card.card_type || (card.tags && card.tags.length > 0));
  const hasDescription = !!card.description;
  const hasImage = !!card.image_url;

  return {
    width: Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, longestLine * 9 + 36)),
    height: Math.max(MIN_CARD_HEIGHT, 18 + titleHeight + (hasDescription ? 24 : 0) + (hasMeta ? 22 : 0) + (hasImage ? 96 : 0))
  };
}

function getPlainTextPreview(content = '') {
  if (!content) return '';
  if (typeof window !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = content;
    return (temp.textContent || temp.innerText || '').replace(/\s+/g, ' ').trim();
  }
  return String(content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function CanvasCard({
  card, zoom, isSelected, onSelect, onDragEnd, onDragStart: onDragStartProp,
  onPositionUpdate, onQuickRename, onImageDrop, onClickNoDrag, onResize,
}) {
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState(null);
  const [editing, setEditing] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [dropHover, setDropHover] = useState(false);
  const dragStartRef = useRef(null);
  const cardStartRef = useRef(null);
  const resizeStartRef = useRef(null);
  const inputRef = useRef(null);
  const didDrag = useRef(false);

  useEffect(() => { setEditTitle(card.title); }, [card.title]);

  const formattedTitle = formatTitleForCard(card.title || 'Untitled');
  const autoCardSize = getAutoCardSize(card, formattedTitle);

  const onMouseDown = useCallback((e) => {
    if (editing) return;
    e.stopPropagation();
    onSelect(card.id);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    cardStartRef.current = { x: card.x, y: card.y };
    setDragging(true);
    didDrag.current = false;
    if (onDragStartProp) onDragStartProp(card.id);

    const onMove = (ev) => {
      const dx = (ev.clientX - dragStartRef.current.x) / zoom;
      const dy = (ev.clientY - dragStartRef.current.y) / zoom;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag.current = true;
      const newX = cardStartRef.current.x + dx;
      const newY = cardStartRef.current.y + dy;
      setDragPos({ x: newX, y: newY });
      // Live update for connection lines
      if (onPositionUpdate) onPositionUpdate(card.id, newX, newY);
    };

    const onUp = (ev) => {
      const dx = (ev.clientX - dragStartRef.current.x) / zoom;
      const dy = (ev.clientY - dragStartRef.current.y) / zoom;
      const newX = cardStartRef.current.x + dx;
      const newY = cardStartRef.current.y + dy;
      setDragging(false);
      setDragPos(null);
      if (didDrag.current) {
        onDragEnd(card.id, newX, newY);
      } else {
        // Pure click (no drag) — notify parent for center behavior
        if (onClickNoDrag) onClickNoDrag(card.id);
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [card, zoom, onSelect, onDragEnd, onDragStartProp, onPositionUpdate, editing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitRename = () => {
    setEditing(false);
    if (editTitle.trim() && editTitle !== card.title) {
      onQuickRename(card.id, editTitle.trim());
    } else {
      setEditTitle(card.title);
    }
  };

  const handleResizeMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: card.width || autoCardSize.width,
      height: card.height || autoCardSize.height,
    };

    const onMove = (ev) => {
      const dx = (ev.clientX - resizeStartRef.current.x) / zoom;
      const dy = (ev.clientY - resizeStartRef.current.y) / zoom;
      onResize(card.id,
        Math.max(MIN_MANUAL_WIDTH, resizeStartRef.current.width + dx),
        Math.max(MIN_MANUAL_HEIGHT, resizeStartRef.current.height + dy)
      );
    };

    const onUp = () => {
      setResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [card.id, card.width, card.height, autoCardSize.width, autoCardSize.height, onResize, zoom]);

  // Drag & drop image
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDropHover(true); };
  const handleDragLeave = () => setDropHover(false);
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropHover(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (onImageDrop) onImageDrop(card.id, file);
    }
  };

  const x = dragging && dragPos ? dragPos.x : card.x;
  const y = dragging && dragPos ? dragPos.y : card.y;
  const typeColor = card.card_type ? TYPE_COLORS[card.card_type] || TYPE_COLORS.Custom : null;
  const descriptionPreview = getPlainTextPreview(card.description);
  const w = card.width || autoCardSize.width;
  const h = card.height || autoCardSize.height;

  return (
    <div
      data-card-id={card.id}
      className={`absolute select-none group transition-shadow ${
        resizing ? 'cursor-nwse-resize z-[110]' : dragging ? 'cursor-grabbing z-[100]' : 'cursor-grab'
      } ${isSelected ? 'z-50' : 'z-10'}`}
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        willChange: dragging || resizing ? 'transform' : 'auto',
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      
    >
      {/* Ports are rendered at SVG level in ConnectionLines for precise alignment */}
      <div className={`relative h-full bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden transition-all duration-150 ${
        isSelected
          ? 'border-2 border-amber-500 shadow-amber-500/20 shadow-xl'
          : dropHover
            ? 'border-2 border-amber-400 border-dashed'
            : 'border border-gray-700/80 hover:border-gray-600'
      }`}>
        <div className="h-full">
          {card.image_url && (
            <div className="h-24 bg-gray-900 overflow-hidden relative">
              <img src={card.image_url} alt="" className="w-full h-full object-cover" draggable={false} />
            </div>
          )}
          <div className="p-2.5">
          {editing ? (
            <input
              ref={inputRef}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditTitle(card.title); setEditing(false); } }}
              className="w-full bg-transparent border-b border-amber-500 text-sm font-semibold text-gray-100 outline-none pb-0.5"
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            />
          ) : (
            <h3
              className="pr-5 text-sm font-semibold leading-tight text-gray-100 break-words overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                whiteSpace: 'pre-line'
              }}
            >
              {formattedTitle}
            </h3>
          )}
          {descriptionPreview && (
            <p className="text-[11px] text-gray-400 mt-1 line-clamp-3 leading-snug overflow-hidden">{descriptionPreview}</p>
          )}
          {(card.card_type || (card.tags && card.tags.length > 0)) && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {card.card_type && typeColor && (
                <span className={`inline-block px-1.5 py-0.5 text-[9px] rounded-md font-semibold border ${typeColor}`}>
                  {card.card_type}
                </span>
              )}
              {(card.tags || []).slice(0, 2).map((tag, i) => (
                <span key={i} className="inline-block px-1 py-0.5 bg-gray-700/50 text-gray-500 text-[9px] rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
          </div>
        </div>

        <button
            type="button"
            aria-label="Resize card"
            onMouseDown={handleResizeMouseDown}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-gray-700/80 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-600 cursor-nwse-resize"
          >
            <MoveDiagonal2 className="h-3 w-3" />
          </button>
        </div>
      </div>
  );
}