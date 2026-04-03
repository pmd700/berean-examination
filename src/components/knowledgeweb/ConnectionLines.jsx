import React, { useState, useRef, useCallback } from 'react';

// ─── Port geometry ───
const STEM_LENGTH = 12;

export function getPorts(card) {
  const x = card.x || 0;
  const y = card.y || 0;
  const w = card.width || 200;
  const h = card.height || 120;
  return {
    top:    { x: x + w / 2, y, stemX: x + w / 2, stemY: y - STEM_LENGTH, side: 'top' },
    right:  { x: x + w, y: y + h / 2, stemX: x + w + STEM_LENGTH, stemY: y + h / 2, side: 'right' },
    bottom: { x: x + w / 2, y: y + h, stemX: x + w / 2, stemY: y + h + STEM_LENGTH, side: 'bottom' },
    left:   { x, y: y + h / 2, stemX: x - STEM_LENGTH, stemY: y + h / 2, side: 'left' },
  };
}

function pickBestPorts(fromCard, toCard, connectionIndex, totalSameDirection) {
  const fromPorts = getPorts(fromCard);
  const toPorts = getPorts(toCard);

  const fromCx = (fromCard.x || 0) + (fromCard.width || 200) / 2;
  const fromCy = (fromCard.y || 0) + (fromCard.height || 120) / 2;
  const toCx = (toCard.x || 0) + (toCard.width || 200) / 2;
  const toCy = (toCard.y || 0) + (toCard.height || 120) / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  let fromPort, toPort;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) { fromPort = { ...fromPorts.right }; toPort = { ...toPorts.left }; }
    else { fromPort = { ...fromPorts.left }; toPort = { ...toPorts.right }; }
  } else {
    if (dy >= 0) { fromPort = { ...fromPorts.bottom }; toPort = { ...toPorts.top }; }
    else { fromPort = { ...fromPorts.top }; toPort = { ...toPorts.bottom }; }
  }

  if (totalSameDirection > 1) {
    const spread = 10;
    const offset = (connectionIndex - (totalSameDirection - 1) / 2) * spread;
    if (fromPort.side === 'left' || fromPort.side === 'right') {
      fromPort.stemY += offset; toPort.stemY += offset;
    } else {
      fromPort.stemX += offset; toPort.stemX += offset;
    }
  }

  return { from: fromPort, to: toPort };
}

const DIRS = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } };

/** Build a path through reroute points using smooth cubics */
function buildNoodlePathWithReroutes(from, to, reroutes) {
  if (!reroutes || reroutes.length === 0) {
    return buildSegmentPath(from.stemX, from.stemY, from.side, to.stemX, to.stemY, to.side);
  }

  // Build segments: start → reroute1 → reroute2 → ... → end
  const points = [
    { x: from.stemX, y: from.stemY },
    ...reroutes,
    { x: to.stemX, y: to.stemY },
  ];

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const tension = Math.min(Math.max(dist * 0.35, 30), 180);

    let outDir, inDir;
    if (i === 0) {
      const fd = DIRS[from.side] || { x: 1, y: 0 };
      outDir = fd;
    } else {
      // For reroute points, direction based on neighbors
      const prev = points[i - 1];
      const pdx = p0.x - prev.x;
      const pdy = p0.y - prev.y;
      const pmag = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
      outDir = { x: pdx / pmag, y: pdy / pmag };
    }

    if (i === points.length - 2) {
      const td = DIRS[to.side] || { x: -1, y: 0 };
      inDir = td;
    } else {
      const next = points[i + 2];
      const ndx = next.x - p1.x;
      const ndy = next.y - p1.y;
      const nmag = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
      inDir = { x: -ndx / nmag, y: -ndy / nmag };
    }

    const cp1x = p0.x + outDir.x * tension;
    const cp1y = p0.y + outDir.y * tension;
    const cp2x = p1.x + inDir.x * tension;
    const cp2y = p1.y + inDir.y * tension;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  return path;
}

function buildSegmentPath(x1, y1, fromSide, x2, y2, toSide) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const tension = Math.min(Math.max(dist * 0.45, 40), 250);

  const fd = DIRS[fromSide] || { x: 1, y: 0 };
  const td = DIRS[toSide] || { x: -1, y: 0 };

  return `M ${x1} ${y1} C ${x1 + fd.x * tension} ${y1 + fd.y * tension}, ${x2 + td.x * tension} ${y2 + td.y * tension}, ${x2} ${y2}`;
}

/** Get a point on a cubic bezier at t ∈ [0,1] */
function bezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
    y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
  };
}

/** Parse a simple "M ... C ..." SVG path to get the midpoint */
function getMidpointOfPath(pathD) {
  // Parse M x y C cp1x cp1y, cp2x cp2y, ex ey (possibly multiple C segments)
  const nums = pathD.match(/-?[\d.]+/g)?.map(Number);
  if (!nums || nums.length < 8) return null;

  if (nums.length === 8) {
    // Single segment: M x y C cp1x cp1y cp2x cp2y ex ey
    const p0 = { x: nums[0], y: nums[1] };
    const p1 = { x: nums[2], y: nums[3] };
    const p2 = { x: nums[4], y: nums[5] };
    const p3 = { x: nums[6], y: nums[7] };
    return bezierPoint(p0, p1, p2, p3, 0.5);
  }

  // Multiple segments: find total midpoint by taking middle segment at 0.5
  // Each C segment adds 6 numbers after the initial M (2 numbers)
  const segCount = (nums.length - 2) / 6;
  const midSeg = Math.floor(segCount / 2);
  const base = 2 + midSeg * 6;
  const prevEnd = midSeg === 0
    ? { x: nums[0], y: nums[1] }
    : { x: nums[base - 2], y: nums[base - 1] };
  
  if (base + 5 < nums.length) {
    const p0 = prevEnd;
    const p1 = { x: nums[base], y: nums[base + 1] };
    const p2 = { x: nums[base + 2], y: nums[base + 3] };
    const p3 = { x: nums[base + 4], y: nums[base + 5] };
    return bezierPoint(p0, p1, p2, p3, 0.5);
  }
  
  // Fallback: just average start and end
  return { x: (nums[0] + nums[nums.length - 2]) / 2, y: (nums[1] + nums[nums.length - 1]) / 2 };
}


export default function ConnectionLines({
  connections, cards, selectedConnectionId, onSelectConnection,
  tempLine, hoveredConnectionId, onHoverConnection,
  onAddReroutePoint, onDragReroutePoint, onRemoveReroutePoint,
  onRequestInsertNode,
}) {
  const cardMap = {};
  cards.forEach(c => { cardMap[c.id] = c; });

  // Fan-out calculation
  const pairCounts = {};
  const pairIndices = {};
  connections.forEach(conn => {
    const key = [conn.from_card_id, conn.to_card_id].sort().join('::');
    pairCounts[key] = (pairCounts[key] || 0) + 1;
  });
  const pairCurrentIndex = {};
  connections.forEach(conn => {
    const key = [conn.from_card_id, conn.to_card_id].sort().join('::');
    pairCurrentIndex[key] = (pairCurrentIndex[key] || 0);
    pairIndices[conn.id] = pairCurrentIndex[key];
    pairCurrentIndex[key]++;
  });

  // State for dragging reroute points
  const [draggingReroute, setDraggingReroute] = useState(null);

  const handleRerouteMouseDown = useCallback((e, connId, pointIndex) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingReroute({ connId, pointIndex });

    const onMove = (ev) => {
      // We need to convert screen coords to canvas coords
      // The SVG is inside the transform div, so coordinates are already in canvas space
      // We'll use a custom event to pass delta
      if (onDragReroutePoint) {
        const svgEl = ev.target.closest('svg') || document.querySelector('[data-noodle-svg]');
        if (!svgEl) return;
        // Get the transform container's CTM
        const transformDiv = svgEl.parentElement;
        const style = transformDiv?.style?.transform || '';
        const translateMatch = style.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
        const scaleMatch = style.match(/scale\(([\d.]+)\)/);
        const panX = translateMatch ? parseFloat(translateMatch[1]) : 0;
        const panY = translateMatch ? parseFloat(translateMatch[2]) : 0;
        const zoom = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
        const rect = svgEl.getBoundingClientRect();
        // Screen position relative to the SVG element
        const sx = ev.clientX - rect.left;
        const sy = ev.clientY - rect.top;
        // But SVG is already inside the scaled container, so coords match canvas space directly
        // Actually the SVG fills the transform div, which is already scaled
        // So we need to undo the parent container offset
        const containerRect = transformDiv?.parentElement?.getBoundingClientRect();
        if (!containerRect) return;
        const cx = (ev.clientX - containerRect.left - panX) / zoom;
        const cy = (ev.clientY - containerRect.top - panY) / zoom;
        onDragReroutePoint(connId, pointIndex, cx, cy);
      }
    };

    const onUp = () => {
      setDraggingReroute(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onDragReroutePoint]);

  return (
    <svg
      data-noodle-svg="true"
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: 'visible', width: '100%', height: '100%' }}
    >
      <defs>
        <marker id="arrowhead-dim" markerWidth="14" markerHeight="10" refX="14" refY="5" orient="auto">
          <polygon points="0 0, 10 5, 0 10" fill="#6b7280" />
        </marker>
        <marker id="arrowhead-selected" markerWidth="14" markerHeight="10" refX="14" refY="5" orient="auto">
          <polygon points="0 0, 10 5, 0 10" fill="#f59e0b" />
        </marker>
      </defs>

      {/* Render noodles */}
      {connections.map(conn => {
        const fromCard = cardMap[conn.from_card_id];
        const toCard = cardMap[conn.to_card_id];
        if (!fromCard || !toCard) return null;

        const pairKey = [conn.from_card_id, conn.to_card_id].sort().join('::');
        const total = pairCounts[pairKey] || 1;
        const idx = pairIndices[conn.id] || 0;
        const { from, to } = pickBestPorts(fromCard, toCard, idx, total);
        const reroutes = conn.reroute_points || [];
        const isSelected = selectedConnectionId === conn.id;
        const isHovered = hoveredConnectionId === conn.id;
        const pathD = buildNoodlePathWithReroutes(from, to, reroutes);
        const midpoint = getMidpointOfPath(pathD);

        const noodleColor = isSelected ? '#f59e0b' : isHovered ? '#9ca3af' : '#4b556399';
        const noodleWidth = isSelected ? 2.5 : isHovered ? 2 : 1.8;

        // Label position at midpoint
        const midX = midpoint ? midpoint.x : (from.stemX + to.stemX) / 2;
        const midY = midpoint ? midpoint.y : (from.stemY + to.stemY) / 2;

        return (
          <g key={conn.id}>
            {/* Wide invisible hit area */}
            <path
              d={pathD}
              stroke="transparent"
              strokeWidth="18"
              fill="none"
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onSelectConnection(conn.id); }}
              onMouseEnter={() => onHoverConnection?.(conn.id)}
              onMouseLeave={() => onHoverConnection?.(null)}
            />

            {/* Glow for selected */}
            {isSelected && (
              <path d={pathD} stroke="#f59e0b" strokeWidth="8" fill="none" opacity="0.12" strokeLinecap="round" className="pointer-events-none" />
            )}

            {/* The noodle */}
            <path
              d={pathD}
              stroke={noodleColor}
              strokeWidth={noodleWidth}
              fill="none"
              strokeLinecap="round"
              markerEnd={conn.has_arrow ? (isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead-dim)') : undefined}
              className="pointer-events-none"
              style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
            />

            {/* Port extrusions at endpoints */}
            <line x1={from.x} y1={from.y} x2={from.stemX} y2={from.stemY} stroke={isSelected ? '#f59e0b' : '#4b5563'} strokeWidth={isSelected ? 2 : 1.5} strokeLinecap="round" className="pointer-events-none" />
            <circle cx={from.stemX} cy={from.stemY} r={isSelected ? 4.5 : 3.5} fill={isSelected ? '#f59e0b' : '#1f2937'} stroke={isSelected ? '#f59e0b' : '#4b5563'} strokeWidth={isSelected ? 2 : 1.5} className="pointer-events-none" />
            <line x1={to.x} y1={to.y} x2={to.stemX} y2={to.stemY} stroke={isSelected ? '#f59e0b' : '#4b5563'} strokeWidth={isSelected ? 2 : 1.5} strokeLinecap="round" className="pointer-events-none" />
            <circle cx={to.stemX} cy={to.stemY} r={isSelected ? 4.5 : 3.5} fill={isSelected ? '#f59e0b' : '#1f2937'} stroke={isSelected ? '#f59e0b' : '#4b5563'} strokeWidth={isSelected ? 2 : 1.5} className="pointer-events-none" />

            {/* Reroute points (draggable dots) */}
            {reroutes.map((pt, i) => (
              <g key={i}>
                {/* Hit area for reroute */}
                <circle
                  cx={pt.x} cy={pt.y} r="12"
                  fill="transparent"
                  className="pointer-events-auto cursor-grab"
                  onMouseDown={(e) => handleRerouteMouseDown(e, conn.id, i)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onRemoveReroutePoint) onRemoveReroutePoint(conn.id, i);
                  }}
                />
                {/* Visible dot */}
                <circle
                  cx={pt.x} cy={pt.y}
                  r={isSelected ? 5 : 4}
                  fill={isSelected ? '#f59e0b' : '#374151'}
                  stroke={isSelected ? '#fbbf24' : '#6b7280'}
                  strokeWidth="1.5"
                  className="pointer-events-none"
                />
                {isSelected && (
                  <circle cx={pt.x} cy={pt.y} r="8" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.3" className="pointer-events-none" />
                )}
              </g>
            ))}

            {/* Midpoint affordance: "+" dot on hover or selected (only when no reroutes obscure it) */}
            {(isHovered || isSelected) && midpoint && (
              <g>
                {/* + circle */}
                <circle
                  cx={midX} cy={midY} r="10"
                  fill="transparent"
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAddReroutePoint) onAddReroutePoint(conn.id, midX, midY);
                  }}
                />
                <circle
                  cx={midX} cy={midY} r="6"
                  fill={isSelected ? '#292524' : '#1e293b'}
                  stroke={isSelected ? '#f59e0b' : '#6b7280'}
                  strokeWidth="1.5"
                  className="pointer-events-none"
                  opacity={isHovered || isSelected ? 1 : 0}
                />
                <text
                  x={midX} y={midY + 0.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isSelected ? '#f59e0b' : '#9ca3af'}
                  className="pointer-events-none"
                  style={{ fontSize: '9px', fontWeight: 700 }}
                >
                  +
                </text>
              </g>
            )}

            {/* Insert node button: appears on selected noodle, below midpoint */}
            {isSelected && midpoint && onRequestInsertNode && (
              <g
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestInsertNode(conn.id, midX, midY);
                }}
              >
                <rect
                  x={midX - 44} y={midY + 12}
                  width="88" height="26"
                  rx="8"
                  fill="#3b2a16"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
                <circle
                  cx={midX - 28}
                  cy={midY + 25}
                  r="8"
                  fill="#1f2937"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
                <text
                  x={midX - 28}
                  y={midY + 25.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fbbf24"
                  style={{ fontSize: '12px', fontWeight: 700 }}
                >
                  +
                </text>
                <text
                  x={midX + 10}
                  y={midY + 26}
                  textAnchor="middle"
                  fill="#fbbf24"
                  style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}
                >
                  Insert Card
                </text>
              </g>
            )}

            {/* Label */}
            {conn.label && (
              <g className="pointer-events-none">
                <rect
                  x={midX - conn.label.length * 3.2 - 8}
                  y={midY - 22}
                  width={conn.label.length * 6.4 + 16}
                  height={18}
                  rx="5"
                  fill={isSelected ? 'rgba(245,158,11,0.12)' : 'rgba(15,23,42,0.9)'}
                  stroke={isSelected ? 'rgba(245,158,11,0.25)' : 'rgba(75,85,99,0.25)'}
                  strokeWidth="1"
                />
                <text
                  x={midX} y={midY - 10}
                  textAnchor="middle"
                  fill={isSelected ? '#fbbf24' : '#9ca3af'}
                  style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
                >
                  {conn.label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Temp noodle (live preview while creating) */}
      {tempLine && (() => {
        const fromSide = (() => {
          const dx = tempLine.x2 - tempLine.x1;
          const dy = tempLine.y2 - tempLine.y1;
          if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
          return dy >= 0 ? 'bottom' : 'top';
        })();
        const toSide = fromSide === 'right' ? 'left' : fromSide === 'left' ? 'right' : fromSide === 'bottom' ? 'top' : 'bottom';
        const tempPath = buildSegmentPath(tempLine.x1, tempLine.y1, fromSide, tempLine.x2, tempLine.y2, toSide);

        return (
          <>
            <path d={tempPath} stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" className="pointer-events-none" opacity="0.6" />
            <circle cx={tempLine.x2} cy={tempLine.y2} r="4" fill="#f59e0b" opacity="0.5" className="pointer-events-none" />
          </>
        );
      })()}
    </svg>
  );
}