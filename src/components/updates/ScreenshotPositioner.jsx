import React, { useRef, useState, useCallback } from 'react';
import { Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ScreenshotPositioner({ 
  imageUrl, 
  posX = 50, 
  posY = 50, 
  scale = 100, 
  onPositionChange 
}) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: posX,
      startPosY: posY
    };

    const handleMouseMove = (moveE) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dx = ((moveE.clientX - dragStart.current.x) / rect.width) * -100;
      const dy = ((moveE.clientY - dragStart.current.y) / rect.height) * -100;

      const newX = Math.max(0, Math.min(100, dragStart.current.startPosX + dx));
      const newY = Math.max(0, Math.min(100, dragStart.current.startPosY + dy));
      
      onPositionChange({ x: Math.round(newX), y: Math.round(newY), scale });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [posX, posY, scale, onPositionChange]);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      startPosX: posX,
      startPosY: posY
    };

    const handleTouchMove = (moveE) => {
      moveE.preventDefault();
      const t = moveE.touches[0];
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dx = ((t.clientX - dragStart.current.x) / rect.width) * -100;
      const dy = ((t.clientY - dragStart.current.y) / rect.height) * -100;

      const newX = Math.max(0, Math.min(100, dragStart.current.startPosX + dx));
      const newY = Math.max(0, Math.min(100, dragStart.current.startPosY + dy));
      
      onPositionChange({ x: Math.round(newX), y: Math.round(newY), scale });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }, [posX, posY, scale, onPositionChange]);

  const adjustScale = (delta) => {
    const newScale = Math.max(50, Math.min(200, scale + delta));
    onPositionChange({ x: posX, y: posY, scale: newScale });
  };

  const reset = () => {
    onPositionChange({ x: 50, y: 50, scale: 100 });
  };

  if (!imageUrl) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Move className="w-3 h-3" /> Drag to reposition
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-white"
            onClick={() => adjustScale(-10)}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[10px] text-gray-500 w-8 text-center">{scale}%</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-white"
            onClick={() => adjustScale(10)}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-white"
            onClick={reset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative h-40 rounded-lg border-2 overflow-hidden select-none ${
          isDragging ? 'border-amber-500 cursor-grabbing' : 'border-gray-700 cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <img
          src={imageUrl}
          alt="Position preview"
          className="w-full h-full object-cover pointer-events-none transition-transform duration-75"
          style={{
            objectPosition: `${posX}% ${posY}%`,
            transform: `scale(${scale / 100})`
          }}
          draggable={false}
        />
        {/* Crosshair overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/20" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20" />
        </div>
      </div>
    </div>
  );
}