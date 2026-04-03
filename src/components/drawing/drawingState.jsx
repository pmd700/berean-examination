/**
 * Drawing state model & helpers.
 * All strokes are vector objects with unique IDs, layer assignments, and transform data.
 * Data version: 3 (adds groups, rotation, new brushes, alignment)
 */

let _idCounter = Date.now();
export const uid = () => String(_idCounter++);

// ─── Default layer ───
export function createLayer(name = 'Layer 1') {
  return { id: uid(), name, visible: true, locked: false, opacity: 1 };
}

// ─── Stroke object ───
export function createStroke(points, opts = {}) {
  return {
    id: uid(),
    type: 'stroke',
    layerId: opts.layerId || null,
    groupId: opts.groupId || null,
    tool: opts.tool || 'rigid_pen',
    points,
    color: opts.color || '#000000',
    size: opts.size || 2,
    opacity: opts.opacity || 1,
    tx: 0, ty: 0, scaleX: 1, scaleY: 1, rotation: 0,
  };
}

// ─── Shape object ───
export function createShape(type, rect, opts = {}) {
  return {
    id: uid(),
    type: 'shape',
    shapeType: type,
    layerId: opts.layerId || null,
    groupId: opts.groupId || null,
    x: rect.x, y: rect.y, width: rect.width, height: rect.height,
    borderEnabled: opts.borderEnabled ?? true,
    borderColor: opts.borderColor || '#000000',
    borderWidth: opts.borderWidth || 2,
    fillEnabled: opts.fillEnabled ?? false,
    fillColor: opts.fillColor || '#3b82f6',
    tx: 0, ty: 0, scaleX: 1, scaleY: 1, rotation: 0,
  };
}

// ─── Text object ───
export function createText(pos, text, opts = {}) {
  return {
    id: uid(),
    type: 'text',
    layerId: opts.layerId || null,
    groupId: opts.groupId || null,
    x: pos.x, y: pos.y,
    text,
    fontFamily: opts.fontFamily || 'Arial, sans-serif',
    fontSize: opts.fontSize || 16,
    color: opts.color || '#000000',
    bold: opts.bold || false,
    italic: opts.italic || false,
    align: opts.align || 'left',
    tx: 0, ty: 0, scaleX: 1, scaleY: 1, rotation: 0,
  };
}

// ─── Group object ───
export function createGroup(memberIds) {
  return {
    id: uid(),
    type: 'group',
    memberIds: [...memberIds],
  };
}

// ─── Get all object IDs in a group (recursively if nested) ───
export function getGroupMemberIds(groupId, groups) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return [];
  const ids = [];
  for (const mid of group.memberIds) {
    ids.push(mid);
    const subGroup = groups.find(g => g.id === mid);
    if (subGroup) ids.push(...getGroupMemberIds(mid, groups));
  }
  return ids;
}

// ─── Expand selection to include group siblings ───
export function expandSelectionToGroups(selectedIds, allObjects, groups) {
  const expanded = new Set(selectedIds);
  for (const id of selectedIds) {
    const obj = allObjects.find(o => o.id === id);
    if (obj?.groupId) {
      const memberIds = getGroupMemberIds(obj.groupId, groups);
      memberIds.forEach(mid => expanded.add(mid));
    }
  }
  return expanded;
}

// ─── Get bounds of any object ───
export function getObjectBounds(obj, allStrokes, allShapes, allTexts) {
  if (obj.type === 'stroke' || (!obj.type && obj.points)) {
    return getStrokeBounds(obj);
  }
  if (obj.type === 'shape' || obj.shapeType) {
    const tx = obj.tx || 0, ty = obj.ty || 0;
    return { x: obj.x + tx, y: obj.y + ty, width: obj.width, height: obj.height };
  }
  if (obj.type === 'text') {
    const tx = obj.tx || 0, ty = obj.ty || 0;
    const approxWidth = obj.text.length * (obj.fontSize || 16) * 0.6;
    const lines = obj.text.split('\n');
    const approxHeight = lines.length * (obj.fontSize || 16) * 1.2;
    return { x: obj.x + tx, y: obj.y + ty, width: approxWidth, height: approxHeight };
  }
  return null;
}

// ─── Get combined bounds for multiple objects ───
export function getCombinedBounds(objectIds, strokes, shapes, texts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const all = [...strokes, ...shapes, ...texts];
  for (const id of objectIds) {
    const obj = all.find(o => o.id === id);
    if (!obj) continue;
    const b = getObjectBounds(obj);
    if (!b) continue;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ─── Alignment helpers ───
export function alignObjects(alignment, selectedIds, strokes, shapes, texts) {
  const bounds = getCombinedBounds(selectedIds, strokes, shapes, texts);
  if (!bounds) return { strokes, shapes, texts };

  const all = [...strokes, ...shapes, ...texts];
  const updates = {};
  
  for (const id of selectedIds) {
    const obj = all.find(o => o.id === id);
    if (!obj) continue;
    const objBounds = getObjectBounds(obj);
    if (!objBounds) continue;
    
    let dx = 0, dy = 0;
    switch (alignment) {
      case 'left': dx = bounds.x - objBounds.x; break;
      case 'center': dx = (bounds.x + bounds.width / 2) - (objBounds.x + objBounds.width / 2); break;
      case 'right': dx = (bounds.x + bounds.width) - (objBounds.x + objBounds.width); break;
      case 'top': dy = bounds.y - objBounds.y; break;
      case 'middle': dy = (bounds.y + bounds.height / 2) - (objBounds.y + objBounds.height / 2); break;
      case 'bottom': dy = (bounds.y + bounds.height) - (objBounds.y + objBounds.height); break;
    }
    updates[id] = { dx, dy };
  }

  const applyDelta = (arr) => arr.map(o => {
    const u = updates[o.id];
    if (!u) return o;
    return { ...o, tx: (o.tx || 0) + u.dx, ty: (o.ty || 0) + u.dy };
  });

  return {
    strokes: applyDelta(strokes),
    shapes: applyDelta(shapes),
    texts: applyDelta(texts),
  };
}

// ─── Bounding box for a stroke (with transforms applied) ───
export function getStrokeBounds(stroke) {
  if (!stroke.points || stroke.points.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const pts = getTransformedPoints(stroke);
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const pad = (stroke.size || 2) / 2;
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}

// ─── Apply transform to points (for rendering / hit testing) ───
export function getTransformedPoints(stroke) {
  const { tx = 0, ty = 0 } = stroke;
  if (tx === 0 && ty === 0) return stroke.points;
  return stroke.points.map(p => ({
    x: p.x + tx,
    y: p.y + ty,
  }));
}

// ─── Hit test: is a point within `threshold` of any segment of a stroke? ───
export function hitTestStroke(stroke, point, threshold = 10) {
  const pts = getTransformedPoints(stroke);
  const t = threshold + (stroke.size || 2) / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    if (distToSegment(point, pts[i], pts[i + 1]) < t) return true;
  }
  if (pts.length === 1) {
    const dx = pts[0].x - point.x, dy = pts[0].y - point.y;
    return Math.sqrt(dx * dx + dy * dy) < t;
  }
  return false;
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx, projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

// ─── Split a stroke at points intersected by eraser (normal erase mode) ───
export function splitStroke(stroke, eraserPoint, eraserRadius) {
  const pts = stroke.points;
  const r = eraserRadius + (stroke.size || 2) / 2;
  const segments = [];
  let current = [];

  for (const p of pts) {
    const dx = p.x - eraserPoint.x + (stroke.tx || 0);
    const dy = p.y - eraserPoint.y + (stroke.ty || 0);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < r) {
      if (current.length >= 2) segments.push(current);
      current = [];
    } else {
      current.push(p);
    }
  }
  if (current.length >= 2) segments.push(current);

  return segments.map(seg => ({
    ...stroke,
    id: uid(),
    points: seg,
  }));
}

// ─── Point in polygon (for lasso) ───
export function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// ─── Smoothing ───
export function smoothPoints(points, intensity) {
  if (points.length < 4 || intensity <= 10) return points;
  const passes = Math.ceil(intensity / 25);
  let smoothed = [...points];
  for (let pass = 0; pass < passes; pass++) {
    const next = [smoothed[0]];
    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1], curr = smoothed[i], nx = smoothed[i + 1];
      const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
      const dx2 = nx.x - curr.x, dy2 = nx.y - curr.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (len1 > 0 && len2 > 0) {
        const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
        if (dot < 0.3) { next.push(curr); continue; }
      }
      const factor = (intensity / 100) * 0.4;
      next.push({
        x: curr.x + (((prev.x + nx.x) / 2) - curr.x) * factor,
        y: curr.y + (((prev.y + nx.y) / 2) - curr.y) * factor,
      });
    }
    next.push(smoothed[smoothed.length - 1]);
    smoothed = next;
  }
  return smoothed;
}

export function stabilizePoint(newPoint, prevPoints, intensity) {
  if (intensity <= 5 || prevPoints.length === 0) return newPoint;
  const weight = intensity / 100;
  const bufferSize = Math.max(2, Math.floor(intensity / 10));
  const recent = prevPoints.slice(-bufferSize);
  let sumX = 0, sumY = 0, totalW = 0;
  recent.forEach((p, i) => {
    const w = (i + 1) / recent.length;
    sumX += p.x * w; sumY += p.y * w; totalW += w;
  });
  return {
    x: newPoint.x * (1 - weight) + (sumX / totalW) * weight,
    y: newPoint.y * (1 - weight) + (sumY / totalW) * weight,
  };
}

// ─── Hit test for shapes ───
export function hitTestShape(shape, point, threshold = 5) {
  const tx = shape.tx || 0, ty = shape.ty || 0;
  const sx = shape.x + tx, sy = shape.y + ty;
  const st = shape.shapeType || shape.type;
  
  if (st === 'rectangle') {
    const inside = point.x >= sx - threshold && point.x <= sx + shape.width + threshold &&
                   point.y >= sy - threshold && point.y <= sy + shape.height + threshold;
    return inside;
  }
  if (st === 'circle') {
    const cx = sx + shape.width / 2, cy = sy + shape.height / 2;
    const rx = Math.abs(shape.width / 2) + threshold, ry = Math.abs(shape.height / 2) + threshold;
    const dx = (point.x - cx) / rx, dy = (point.y - cy) / ry;
    return (dx * dx + dy * dy) <= 1;
  }
  if (st === 'line' || st === 'arrow') {
    const a = { x: sx, y: sy }, b = { x: sx + shape.width, y: sy + shape.height };
    const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (lenSq === 0) return Math.hypot(point.x - a.x, point.y - a.y) < threshold;
    let t = ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + t * (b.x - a.x), py = a.y + t * (b.y - a.y);
    return Math.hypot(point.x - px, point.y - py) < threshold + (shape.borderWidth || 2);
  }
  if (st === 'triangle') {
    const inside = point.x >= sx - threshold && point.x <= sx + shape.width + threshold &&
                   point.y >= sy - threshold && point.y <= sy + shape.height + threshold;
    return inside;
  }
  return false;
}

// ─── Hit test for text ───
export function hitTestText(txt, point) {
  const tx = txt.tx || 0, ty = txt.ty || 0;
  const x = txt.x + tx, y = txt.y + ty;
  const lines = txt.text.split('\n');
  const w = Math.max(...lines.map(l => l.length)) * (txt.fontSize || 16) * 0.6;
  const h = lines.length * (txt.fontSize || 16) * 1.2;
  return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
}

// ─── Serialize / deserialize for DB ───
export function serializeDrawing(state) {
  return JSON.stringify({
    version: 3,
    layers: state.layers,
    strokes: state.strokes,
    shapes: state.shapes,
    texts: state.texts,
    groups: state.groups || [],
    activeLayerId: state.activeLayerId,
    paperMode: state.paperMode,
    paperStyle: state.paperStyle,
    paperGridSize: state.paperGridSize,
    paperLineSpacing: state.paperLineSpacing,
    lastTool: state.tool,
    lastPanX: state.panX,
    lastPanY: state.panY,
    lastZoom: state.zoom,
  });
}

export function deserializeDrawing(json) {
  let data;
  try { data = JSON.parse(json); } catch { data = {}; }

  // Version 1 migration
  if (!data.version || data.version < 2) {
    const legacyStrokes = Array.isArray(data) ? data : (data.strokes || []);
    const defaultLayer = createLayer('Layer 1');
    return {
      version: 3,
      layers: [defaultLayer],
      strokes: legacyStrokes.map(s => ({ ...s, id: s.id || uid(), layerId: defaultLayer.id, type: 'stroke' })),
      shapes: (data.shapes || []).map(s => ({ ...s, id: s.id || uid(), layerId: defaultLayer.id, type: 'shape', shapeType: s.shapeType || s.type })),
      texts: (data.texts || []).map(t => ({ ...t, id: t.id || uid(), layerId: defaultLayer.id, type: 'text' })),
      groups: [],
      activeLayerId: defaultLayer.id,
      paperMode: data.paperMode || 'light',
      paperStyle: data.paperStyle || 'blank',
      paperGridSize: 20,
      paperLineSpacing: 30,
      tool: data.lastTool || 'rigid_pen',
      panX: data.lastPanX || 0,
      panY: data.lastPanY || 0,
      zoom: data.lastZoom || 1,
    };
  }

  // Migrate strokes/shapes/texts to include type field
  const migrateStrokes = (data.strokes || []).map(s => ({ ...s, type: s.type || 'stroke' }));
  const migrateShapes = (data.shapes || []).map(s => ({ ...s, type: s.type || 'shape', shapeType: s.shapeType || s.type }));
  const migrateTexts = (data.texts || []).map(t => ({ ...t, type: t.type || 'text' }));

  return {
    version: 3,
    layers: data.layers || [createLayer('Layer 1')],
    strokes: migrateStrokes,
    shapes: migrateShapes,
    texts: migrateTexts,
    groups: data.groups || [],
    activeLayerId: data.activeLayerId || data.layers?.[0]?.id,
    paperMode: data.paperMode || 'light',
    paperStyle: data.paperStyle || 'blank',
    paperGridSize: data.paperGridSize || 20,
    paperLineSpacing: data.paperLineSpacing || 30,
    tool: data.lastTool || 'rigid_pen',
    panX: data.lastPanX || 0,
    panY: data.lastPanY || 0,
    zoom: data.lastZoom || 1,
  };
}

// ─── Background options ───
export const PAPER_STYLES = [
  { key: 'blank', label: 'Blank' },
  { key: 'lines', label: 'Notebook' },
  { key: 'wide_lines', label: 'Wide Ruled' },
  { key: 'grid', label: 'Grid' },
  { key: 'dots', label: 'Dot Grid' },
];