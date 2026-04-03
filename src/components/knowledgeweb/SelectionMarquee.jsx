import React from 'react';

export default function SelectionMarquee({ selection }) {
  if (!selection) return null;

  const left = Math.min(selection.startScreenX, selection.endScreenX);
  const top = Math.min(selection.startScreenY, selection.endScreenY);
  const width = Math.abs(selection.endScreenX - selection.startScreenX);
  const height = Math.abs(selection.endScreenY - selection.startScreenY);

  return (
    <div
      className="pointer-events-none absolute border border-amber-400/80 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,0.15)]"
      style={{ left, top, width, height }}
    />
  );
}