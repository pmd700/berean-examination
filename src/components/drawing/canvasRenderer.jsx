/**
 * Canvas rendering logic, separated from the main component for performance.
 */
import { getTransformedPoints } from './drawingState';

// ─── Draw paper background ───
export function drawBackground(ctx, canvas, style, mode, panX, panY, zoom, gridSize = 20, lineSpacing = 30) {
  ctx.fillStyle = mode === 'dark' ? '#1f2937' : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  const vStartX = -panX / zoom;
  const vStartY = -panY / zoom;
  const vW = canvas.width / zoom;
  const vH = canvas.height / zoom;

  if (style === 'grid') {
    ctx.strokeStyle = mode === 'dark' ? '#374151' : '#e5e7eb';
    ctx.lineWidth = 0.5 / zoom;
    const sx = Math.floor(vStartX / gridSize) * gridSize;
    const sy = Math.floor(vStartY / gridSize) * gridSize;
    for (let x = sx; x <= vStartX + vW + gridSize; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x, sy + vH + gridSize * 2); ctx.stroke();
    }
    for (let y = sy; y <= vStartY + vH + gridSize; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + vW + gridSize * 2, y); ctx.stroke();
    }
  } else if (style === 'dots') {
    const dotSize = 1 / zoom;
    ctx.fillStyle = mode === 'dark' ? '#4b5563' : '#d1d5db';
    const sx = Math.floor(vStartX / gridSize) * gridSize;
    const sy = Math.floor(vStartY / gridSize) * gridSize;
    for (let x = sx; x <= vStartX + vW + gridSize; x += gridSize) {
      for (let y = sy; y <= vStartY + vH + gridSize; y += gridSize) {
        ctx.beginPath(); ctx.arc(x, y, dotSize, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (style === 'lines' || style === 'wide_lines') {
    const spacing = style === 'wide_lines' ? lineSpacing * 1.4 : lineSpacing;
    ctx.strokeStyle = mode === 'dark' ? '#4b5563' : '#d1d5db';
    ctx.lineWidth = 0.5 / zoom;
    const sy = Math.floor(vStartY / spacing) * spacing;
    for (let y = sy; y <= vStartY + vH + spacing; y += spacing) {
      ctx.beginPath(); ctx.moveTo(vStartX, y); ctx.lineTo(vStartX + vW, y); ctx.stroke();
    }
    // Margin line for notebook
    if (style === 'lines') {
      ctx.strokeStyle = mode === 'dark' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.25)';
      ctx.lineWidth = 1 / zoom;
      const marginX = vStartX + 60;
      ctx.beginPath(); ctx.moveTo(marginX, vStartY); ctx.lineTo(marginX, vStartY + vH); ctx.stroke();
    }
  }
  ctx.restore();
}

// ─── Draw all objects ───
export function drawObjects(ctx, layers, strokes, shapes, texts, selectedIds, panX, panY, zoom) {
  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // Collect visible layer ids
  const visibleLayerIds = new Set(layers.filter(l => l.visible).map(l => l.id));
  const layerOpacity = {};
  layers.forEach(l => { layerOpacity[l.id] = l.opacity ?? 1; });

  // Sort strokes by layer order: highlighters first, then rest
  const hlStrokes = strokes.filter(s => s.tool === 'highlighter' && visibleLayerIds.has(s.layerId));
  const regStrokes = strokes.filter(s => s.tool !== 'highlighter' && visibleLayerIds.has(s.layerId));

  // Draw in layer order
  for (const layer of layers) {
    if (!layer.visible) continue;
    const lOpacity = layer.opacity ?? 1;

    // Highlighters for this layer
    for (const stroke of hlStrokes) {
      if (stroke.layerId !== layer.id) continue;
      drawStroke(ctx, stroke, lOpacity, selectedIds.has(stroke.id));
    }
    // Regular strokes for this layer
    for (const stroke of regStrokes) {
      if (stroke.layerId !== layer.id) continue;
      drawStroke(ctx, stroke, lOpacity, selectedIds.has(stroke.id));
    }
    // Shapes for this layer
    for (const shape of shapes) {
      if (shape.layerId !== layer.id || !visibleLayerIds.has(shape.layerId)) continue;
      ctx.globalAlpha = lOpacity;
      drawShape(ctx, shape);
    }
    // Texts for this layer
    for (const txt of texts) {
      if (txt.layerId !== layer.id || !visibleLayerIds.has(txt.layerId)) continue;
      ctx.globalAlpha = lOpacity;
      drawText(ctx, txt);
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function tracePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }
}

function drawStroke(ctx, stroke, layerOpacity, isSelected) {
  const pts = getTransformedPoints(stroke);
  if (pts.length < 2) return;

  const tool = stroke.tool || 'rigid_pen';
  ctx.globalCompositeOperation = 'source-over';

  // ─── Calligraphy pen: variable width based on direction ───
  if (tool === 'calligraphy') {
    ctx.globalAlpha = (stroke.opacity || 1) * layerOpacity;
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    const angle = Math.PI / 4; // nib angle
    const halfW = stroke.size / 2;
    // Build outline of calligraphic stroke
    const left = [], right = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      let dx = 0, dy = 0;
      if (i < pts.length - 1) { dx = pts[i + 1].x - p.x; dy = pts[i + 1].y - p.y; }
      else if (i > 0) { dx = p.x - pts[i - 1].x; dy = p.y - pts[i - 1].y; }
      const dirAngle = Math.atan2(dy, dx);
      const crossAngle = dirAngle + Math.PI / 2;
      // Width varies with angle relative to nib
      const angleDiff = Math.abs(Math.sin(dirAngle - angle));
      const w = halfW * (0.3 + 0.7 * angleDiff);
      left.push({ x: p.x + Math.cos(crossAngle) * w, y: p.y + Math.sin(crossAngle) * w });
      right.push({ x: p.x - Math.cos(crossAngle) * w, y: p.y - Math.sin(crossAngle) * w });
    }
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fill();
  }
  // ─── Watercolor: multiple transparent passes ───
  else if (tool === 'watercolor') {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const baseAlpha = 0.08 * (stroke.opacity || 1) * layerOpacity;
    const passes = 5;
    for (let p = 0; p < passes; p++) {
      ctx.globalAlpha = baseAlpha;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * (1 + p * 0.4);
      tracePath(ctx, pts);
      ctx.stroke();
    }
  }
  // ─── Spray paint: scattered dots ───
  else if (tool === 'spray') {
    ctx.globalAlpha = (stroke.opacity || 0.6) * layerOpacity;
    ctx.fillStyle = stroke.color;
    const radius = stroke.size * 2;
    const density = Math.max(3, Math.floor(stroke.size * 1.5));
    for (const pt of pts) {
      for (let d = 0; d < density; d++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        const dotR = 0.5 + Math.random() * 1;
        ctx.beginPath();
        ctx.arc(pt.x + Math.cos(a) * r, pt.y + Math.sin(a) * r, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // ─── Default pens (rigid, smooth, marker, highlighter) ───
  else {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = (stroke.opacity || 1) * layerOpacity;
    tracePath(ctx, pts);
    ctx.stroke();
  }

  // Selection highlight
  if (isSelected) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = (stroke.size || 2) + 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    tracePath(ctx, pts);
    ctx.stroke();
  }
}

export function drawShape(ctx, shape) {
  const st = shape.shapeType || shape.type;
  const { x, y, width, height, borderEnabled, borderColor, borderWidth, fillEnabled, fillColor } = shape;
  const tx = shape.tx || 0, ty = shape.ty || 0;
  const rot = shape.rotation || 0;

  ctx.save();
  if (rot) {
    const rcx = x + tx + width / 2;
    const rcy = y + ty + height / 2;
    ctx.translate(rcx, rcy);
    ctx.rotate(rot);
    ctx.translate(-rcx, -rcy);
  }

  ctx.beginPath();
  if (st === 'rectangle') {
    ctx.rect(x + tx, y + ty, width, height);
  } else if (st === 'circle') {
    const cx = x + width / 2 + tx, cy = y + height / 2 + ty;
    ctx.ellipse(cx, cy, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2);
  } else if (st === 'line') {
    ctx.moveTo(x + tx, y + ty);
    ctx.lineTo(x + width + tx, y + height + ty);
  } else if (st === 'triangle') {
    ctx.moveTo(x + tx + width / 2, y + ty);
    ctx.lineTo(x + tx + width, y + ty + height);
    ctx.lineTo(x + tx, y + ty + height);
    ctx.closePath();
  } else if (st === 'arrow') {
    const sx2 = x + tx, sy2 = y + ty;
    const ex = sx2 + width, ey = sy2 + height;
    const angle = Math.atan2(height, width);
    const headLen = Math.min(20, Math.hypot(width, height) * 0.3);
    ctx.moveTo(sx2, sy2);
    ctx.lineTo(ex, ey);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
  }
  if (fillEnabled && !['line', 'arrow'].includes(st)) { ctx.fillStyle = fillColor; ctx.fill(); }
  if (borderEnabled) { ctx.strokeStyle = borderColor; ctx.lineWidth = borderWidth; ctx.stroke(); }

  ctx.restore();
}

export function drawText(ctx, t) {
  let font = '';
  if (t.italic) font += 'italic ';
  if (t.bold) font += 'bold ';
  font += `${t.fontSize}px ${t.fontFamily}`;
  ctx.font = font;
  ctx.fillStyle = t.color;
  ctx.textAlign = t.align || 'left';
  ctx.textBaseline = 'top';
  const tx = t.x + (t.tx || 0);
  const ty = t.y + (t.ty || 0);
  const rot = t.rotation || 0;

  ctx.save();
  if (rot) {
    ctx.translate(tx, ty);
    ctx.rotate(rot);
    ctx.translate(-tx, -ty);
  }

  const lines = t.text.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, tx, ty + i * t.fontSize * 1.2);
  });
  ctx.restore();
}

// ─── Selection bounding box with resize + rotation handles ───
export function drawSelectionBox(ctx, bounds, panX, panY, zoom) {
  if (!bounds) return;
  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);
  
  const pad = 4;
  const bx = bounds.x - pad, by = bounds.y - pad;
  const bw = bounds.width + pad * 2, bh = bounds.height + pad * 2;
  
  // Dashed outline
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([6 / zoom, 4 / zoom]);
  ctx.strokeRect(bx, by, bw, bh);
  ctx.setLineDash([]);

  // Corner resize handles
  const hs = 7 / zoom;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5 / zoom;
  const corners = [
    { x: bx, y: by },
    { x: bx + bw, y: by },
    { x: bx, y: by + bh },
    { x: bx + bw, y: by + bh },
  ];
  for (const c of corners) {
    ctx.fillRect(c.x - hs / 2, c.y - hs / 2, hs, hs);
    ctx.strokeRect(c.x - hs / 2, c.y - hs / 2, hs, hs);
  }

  // Side handles (midpoints)
  const sideHs = 5 / zoom;
  const midpoints = [
    { x: bx + bw / 2, y: by },         // top
    { x: bx + bw / 2, y: by + bh },    // bottom
    { x: bx, y: by + bh / 2 },          // left
    { x: bx + bw, y: by + bh / 2 },     // right
  ];
  for (const m of midpoints) {
    ctx.fillRect(m.x - sideHs / 2, m.y - sideHs / 2, sideHs, sideHs);
    ctx.strokeRect(m.x - sideHs / 2, m.y - sideHs / 2, sideHs, sideHs);
  }

  // Rotation handle (circle above top-center)
  const rotHandleY = by - 24 / zoom;
  const rotHandleX = bx + bw / 2;
  // Line from top to rotation handle
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  ctx.moveTo(rotHandleX, by);
  ctx.lineTo(rotHandleX, rotHandleY);
  ctx.stroke();
  // Circle
  const rotR = 5 / zoom;
  ctx.beginPath();
  ctx.arc(rotHandleX, rotHandleY, rotR, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5 / zoom;
  ctx.stroke();

  ctx.restore();
}

// ─── Hit test selection handles ───
// Returns: 'move', 'rotate', 'resize-tl', 'resize-tr', 'resize-bl', 'resize-br', 
//          'resize-t', 'resize-b', 'resize-l', 'resize-r', or null
export function hitTestSelectionBox(bounds, point, zoom) {
  if (!bounds) return null;
  const pad = 4;
  const bx = bounds.x - pad, by = bounds.y - pad;
  const bw = bounds.width + pad * 2, bh = bounds.height + pad * 2;
  const ht = 8 / zoom; // hit threshold
  
  // Rotation handle
  const rotX = bx + bw / 2, rotY = by - 24 / zoom;
  if (Math.hypot(point.x - rotX, point.y - rotY) < 10 / zoom) return 'rotate';
  
  // Corner handles
  const corners = [
    { x: bx, y: by, name: 'resize-tl' },
    { x: bx + bw, y: by, name: 'resize-tr' },
    { x: bx, y: by + bh, name: 'resize-bl' },
    { x: bx + bw, y: by + bh, name: 'resize-br' },
  ];
  for (const c of corners) {
    if (Math.abs(point.x - c.x) < ht && Math.abs(point.y - c.y) < ht) return c.name;
  }
  
  // Side handles
  const sides = [
    { x: bx + bw / 2, y: by, name: 'resize-t' },
    { x: bx + bw / 2, y: by + bh, name: 'resize-b' },
    { x: bx, y: by + bh / 2, name: 'resize-l' },
    { x: bx + bw, y: by + bh / 2, name: 'resize-r' },
  ];
  for (const s of sides) {
    if (Math.abs(point.x - s.x) < ht && Math.abs(point.y - s.y) < ht) return s.name;
  }
  
  // Inside bounds = move
  if (point.x >= bx && point.x <= bx + bw && point.y >= by && point.y <= by + bh) return 'move';
  
  return null;
}