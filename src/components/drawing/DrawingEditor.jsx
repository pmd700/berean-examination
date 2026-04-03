import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { X, Loader2, Save, Download, FileImage, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import FloatingToolbox from './FloatingToolbox';
import LayersPanel from './LayersPanel';
import { drawBackground, drawObjects, drawSelectionBox, drawShape, drawText } from './canvasRenderer';
import {
  uid, createLayer, createStroke, createShape as createShapeObj, createText as createTextObj,
  createGroup, getGroupMemberIds, expandSelectionToGroups, alignObjects,
  getStrokeBounds, getObjectBounds, getCombinedBounds,
  getTransformedPoints, hitTestStroke, hitTestShape, hitTestText, splitStroke, isPointInPolygon,
  smoothPoints, stabilizePoint, serializeDrawing, deserializeDrawing, PAPER_STYLES,
} from './drawingState';
import { hitTestSelectionBox } from './canvasRenderer';

export default function DrawingEditor({ open, onClose, drawingId, annotationId, onSave }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  // Core state
  const [layers, setLayers] = useState([createLayer()]);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [texts, setTexts] = useState([]);
  const [groups, setGroups] = useState([]);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [tool, setTool] = useState('rigid_pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [smoothingLevel, setSmoothingLevel] = useState(5);
  const [eraserMode, setEraserMode] = useState('vector');
  const [eraserSize, setEraserSize] = useState(15);

  // Paper
  const [paperStyle, setPaperStyle] = useState('blank');
  const [paperMode, setPaperMode] = useState('light');
  const [paperGridSize, setPaperGridSize] = useState(20);
  const [paperLineSpacing, setPaperLineSpacing] = useState(30);

  // View
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [canvasDim, setCanvasDim] = useState({ width: 1200, height: 800 });

  // Interaction
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const lastTouchDistRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [transformMode, setTransformMode] = useState(null); // 'move' | 'scale' | null
  const transformStartRef = useRef(null);

  // Selection bounding box
  const [selectionBounds, setSelectionBounds] = useState(null);

  // Shapes / Text
  const [currentShape, setCurrentShape] = useState(null);
  const [shapeStartPoint, setShapeStartPoint] = useState(null);
  const [shapeOptions, setShapeOptions] = useState({
    borderEnabled: true, borderColor: '#000000', borderWidth: 2,
    fillEnabled: false, fillColor: '#3b82f6',
  });
  const [textInputPosition, setTextInputPosition] = useState(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [editingTextId, setEditingTextId] = useState(null);
  const [textOptions, setTextOptions] = useState({
    fontFamily: 'Arial, sans-serif', fontSize: 16, color: '#000000',
    bold: false, italic: false, align: 'left',
  });
  const textInputRef = useRef(null);

  // History
  const historyRef = useRef([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [recentColors, setRecentColors] = useState(['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b']);

  // UI
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingDrawing, setExistingDrawing] = useState(null);
  const [showLayers, setShowLayers] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [exportScale, setExportScale] = useState(2);
  const [exportIncludePaper, setExportIncludePaper] = useState(true);
  const [exportPreview, setExportPreview] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [presetSaved, setPresetSaved] = useState(false);

  // Marquee selection state
  const [marqueeStart, setMarqueeStart] = useState(null);
  const [marqueeEnd, setMarqueeEnd] = useState(null);

  // ─── Drawing Presets ───
  const PRESET_KEY = 'drawingEditorPreset';

  const savePreset = () => {
    const preset = {
      tool, color, brushSize, smoothingLevel, eraserMode, eraserSize,
      paperStyle, paperMode, paperGridSize, paperLineSpacing,
      shapeOptions, textOptions,
    };
    localStorage.setItem(PRESET_KEY, JSON.stringify(preset));
    setPresetSaved(true);
    setTimeout(() => setPresetSaved(false), 1500);
    toast.success('Preset saved');
  };

  const loadPreset = () => {
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      if (!raw) return;
      const preset = JSON.parse(raw);
      if (preset.tool) setTool(preset.tool);
      if (preset.color) setColor(preset.color);
      if (preset.brushSize) setBrushSize(preset.brushSize);
      if (preset.smoothingLevel != null) setSmoothingLevel(preset.smoothingLevel);
      if (preset.eraserMode) setEraserMode(preset.eraserMode);
      if (preset.eraserSize) setEraserSize(preset.eraserSize);
      if (preset.paperStyle) setPaperStyle(preset.paperStyle);
      if (preset.paperMode) setPaperMode(preset.paperMode);
      if (preset.paperGridSize) setPaperGridSize(preset.paperGridSize);
      if (preset.paperLineSpacing) setPaperLineSpacing(preset.paperLineSpacing);
      if (preset.shapeOptions) setShapeOptions(preset.shapeOptions);
      if (preset.textOptions) setTextOptions(preset.textOptions);
    } catch {}
  };

  // ─── Helpers ───
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0];

  const saveToHistory = useCallback((s, sh, t, g) => {
    const snap = { strokes: s, shapes: sh, texts: t, groups: g ?? groups, layers: [...layers] };
    const h = historyRef.current.slice(0, historyIndex + 1);
    h.push(snap);
    if (h.length > 100) h.shift();
    historyRef.current = h;
    setHistoryIndex(h.length - 1);
  }, [historyIndex, layers, groups]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    const snap = historyRef.current[newIdx];
    setStrokes(snap.strokes);
    setShapes(snap.shapes);
    setTexts(snap.texts);
    setGroups(snap.groups || []);
    setHistoryIndex(newIdx);
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const newIdx = historyIndex + 1;
    const snap = historyRef.current[newIdx];
    setStrokes(snap.strokes);
    setShapes(snap.shapes);
    setTexts(snap.texts);
    setGroups(snap.groups || []);
    setHistoryIndex(newIdx);
  }, [historyIndex]);

  // ─── Canvas point from event ───
  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    let cx, cy;
    if (e.touches?.[0]) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    else { cx = e.clientX; cy = e.clientY; }
    return {
      x: ((cx - rect.left) * sx - panX) / zoom,
      y: ((cy - rect.top) * sy - panY) / zoom,
    };
  }, [panX, panY, zoom]);

  // ─── Redraw ───
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas, paperStyle, paperMode, panX, panY, zoom, paperGridSize, paperLineSpacing);
    drawObjects(ctx, layers, strokes, shapes, texts, selectedIds, panX, panY, zoom);

    // Draw current in-progress stroke
    if (currentPoints.length > 1 && !['lasso', 'eraser'].includes(tool)) {
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);
      const config = { rigid_pen: 1, smooth_pen: 1, marker: 1, highlighter: 0.3 };
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = config[tool] ?? 1;
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw marquee selection rectangle
    if (tool === 'lasso' && marqueeStart && marqueeEnd && isDrawing && !transformMode) {
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);
      const mx = Math.min(marqueeStart.x, marqueeEnd.x);
      const my = Math.min(marqueeStart.y, marqueeEnd.y);
      const mw = Math.abs(marqueeEnd.x - marqueeStart.x);
      const mh = Math.abs(marqueeEnd.y - marqueeStart.y);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.strokeRect(mx, my, mw, mh);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Draw current shape preview
    if (currentShape) {
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);
      ctx.setLineDash([5, 5]);
      drawShape(ctx, currentShape);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Selection bounding box
    if (selectedIds.size > 0 && selectionBounds) {
      drawSelectionBox(ctx, selectionBounds, panX, panY, zoom);
    }
  }, [strokes, shapes, texts, layers, currentPoints, currentShape, paperStyle, paperMode,
      panX, panY, zoom, paperGridSize, paperLineSpacing, selectedIds, selectionBounds, tool, color, brushSize, isDrawing, transformMode]);

  useEffect(() => {
    if (!open) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(redraw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [redraw, open]);

  // ─── Compute selection bounds (strokes + shapes + texts) ───
  useEffect(() => {
    if (selectedIds.size === 0) { setSelectionBounds(null); return; }
    const b = getCombinedBounds(selectedIds, strokes, shapes, texts);
    setSelectionBounds(b);
  }, [selectedIds, strokes, shapes, texts]);

  // ─── Load / Init ───
  useEffect(() => {
    if (!open) return;
    if (drawingId) {
      loadDrawing();
    } else {
      const defLayer = createLayer();
      setLayers([defLayer]);
      setActiveLayerId(defLayer.id);
      setStrokes([]); setShapes([]); setTexts([]); setGroups([]);
      historyRef.current = [{ strokes: [], shapes: [], texts: [], groups: [], layers: [defLayer] }];
      setHistoryIndex(0);
      setExistingDrawing(null);
      setPaperMode('light'); setPaperStyle('blank');
      setColor('#000000'); setTool('rigid_pen'); setBrushSize(2);
      setSelectedIds(new Set());
      setPanX(0); setPanY(0); setZoom(1);
      // Apply saved preset for new drawings
      loadPreset();
    }
  }, [open, drawingId]);

  // Resize
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const update = () => {
      const r = containerRef.current?.getBoundingClientRect();
      if (r && r.width > 0) setCanvasDim({ width: Math.floor(r.width), height: Math.floor(r.height) });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          const newStrokes = strokes.filter(s => !selectedIds.has(s.id));
          const newShapes = shapes.filter(s => !selectedIds.has(s.id));
          const newTexts = texts.filter(t => !selectedIds.has(t.id));
          setStrokes(newStrokes); setShapes(newShapes); setTexts(newTexts);
          setSelectedIds(new Set());
          saveToHistory(newStrokes, newShapes, newTexts, groups);
        }
      }
      // Group shortcut: Ctrl/Cmd+G
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        handleGroup();
      }
      // Ungroup shortcut: Ctrl/Cmd+Shift+G
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && e.shiftKey) {
        e.preventDefault();
        handleUngroup();
      }
      if (e.key === 'Escape') { setSelectedIds(new Set()); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, undo, redo, selectedIds, strokes, shapes, texts, saveToHistory]);

  const loadDrawing = async () => {
    setIsLoading(true);
    try {
      const drawings = await base44.entities.Drawing.filter({ id: drawingId });
      if (drawings.length > 0) {
        const drawing = drawings[0];
        setExistingDrawing(drawing);
        const data = deserializeDrawing(drawing.strokes_json || '{}');
        setLayers(data.layers);
        setActiveLayerId(data.activeLayerId || data.layers[0]?.id);
        setStrokes(data.strokes);
        setShapes(data.shapes);
        setTexts(data.texts);
        setGroups(data.groups || []);
        setPaperMode(data.paperMode);
        setPaperStyle(data.paperStyle);
        setPaperGridSize(data.paperGridSize || 20);
        setPaperLineSpacing(data.paperLineSpacing || 30);
        setTool(data.tool);
        setPanX(data.panX); setPanY(data.panY); setZoom(data.zoom);
        historyRef.current = [{ strokes: data.strokes, shapes: data.shapes, texts: data.texts, groups: data.groups || [], layers: data.layers }];
        setHistoryIndex(0);
      }
    } catch (error) {
      console.error('Failed to load drawing:', error);
      toast.error('Failed to load drawing');
    }
    setIsLoading(false);
  };

  // ─── Tool Change ───
  const handleToolChange = (newTool) => {
    setTool(newTool);
    if (newTool !== 'lasso') setSelectedIds(new Set());
    const presets = { rigid_pen: 5, smooth_pen: 70, marker: 30, highlighter: 40, calligraphy: 5, watercolor: 30, spray: 0 };
    if (presets[newTool] !== undefined) setSmoothingLevel(presets[newTool]);
    const sizes = { rigid_pen: 2, smooth_pen: 2, marker: 8, highlighter: 16, calligraphy: 6, watercolor: 20, spray: 8 };
    if (sizes[newTool]) setBrushSize(sizes[newTool]);
  };

  // ─── Group / Ungroup ───
  const handleGroup = () => {
    if (selectedIds.size < 2) return;
    const newGroup = createGroup([...selectedIds]);
    const newStrokes = strokes.map(s => selectedIds.has(s.id) ? { ...s, groupId: newGroup.id } : s);
    const newShapes = shapes.map(s => selectedIds.has(s.id) ? { ...s, groupId: newGroup.id } : s);
    const newTexts = texts.map(t => selectedIds.has(t.id) ? { ...t, groupId: newGroup.id } : t);
    const newGroups = [...groups, newGroup];
    setStrokes(newStrokes); setShapes(newShapes); setTexts(newTexts); setGroups(newGroups);
    saveToHistory(newStrokes, newShapes, newTexts, newGroups);
  };

  const handleUngroup = () => {
    if (selectedIds.size === 0) return;
    const all = [...strokes, ...shapes, ...texts];
    const groupIdsToRemove = new Set();
    for (const id of selectedIds) {
      const obj = all.find(o => o.id === id);
      if (obj?.groupId) groupIdsToRemove.add(obj.groupId);
    }
    if (groupIdsToRemove.size === 0) return;
    const newStrokes = strokes.map(s => groupIdsToRemove.has(s.groupId) ? { ...s, groupId: null } : s);
    const newShapes = shapes.map(s => groupIdsToRemove.has(s.groupId) ? { ...s, groupId: null } : s);
    const newTexts = texts.map(t => groupIdsToRemove.has(t.groupId) ? { ...t, groupId: null } : t);
    const newGroups = groups.filter(g => !groupIdsToRemove.has(g.id));
    setStrokes(newStrokes); setShapes(newShapes); setTexts(newTexts); setGroups(newGroups);
    saveToHistory(newStrokes, newShapes, newTexts, newGroups);
  };

  // ─── Alignment ───
  const handleAlign = (alignment) => {
    if (selectedIds.size < 2) return;
    const result = alignObjects(alignment, selectedIds, strokes, shapes, texts);
    setStrokes(result.strokes); setShapes(result.shapes); setTexts(result.texts);
    saveToHistory(result.strokes, result.shapes, result.texts, groups);
  };

  // ─── Hit test any object at point ───
  const hitTestAnyObject = (point) => {
    // Check in reverse order (top-most first)
    for (let i = texts.length - 1; i >= 0; i--) {
      if (hitTestText(texts[i], point)) return texts[i];
    }
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (hitTestShape(shapes[i], point)) return shapes[i];
    }
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (hitTestStroke(strokes[i], point, 8)) return strokes[i];
    }
    return null;
  };

  // ─── Pointer handlers ───
  const startDrawing = (e) => {
    e.preventDefault();
    // Two-finger pan
    if (e.touches?.length === 2) {
      setIsPanning(true);
      const rect = canvasRef.current.getBoundingClientRect();
      panStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
      };
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      return;
    }

    // Hand tool
    if (tool === 'hand') {
      setIsPanning(true);
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      panStartRef.current = { x: cx - rect.left, y: cy - rect.top };
      return;
    }

    const point = getPoint(e);

    // Text tool
    if (tool === 'text') {
      setTextInputPosition(point);
      setTextInputValue('');
      setEditingTextId(null);
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    // Lasso / Select tool
    if (tool === 'lasso') {
      // Check if clicking on selection handles first
      if (selectedIds.size > 0 && selectionBounds) {
        const handleHit = hitTestSelectionBox(selectionBounds, point, zoom);
        if (handleHit === 'move') {
          setTransformMode('move');
          transformStartRef.current = { ...point };
          setIsDrawing(true);
          return;
        }
        if (handleHit === 'rotate') {
          setTransformMode('rotate');
          const cx = selectionBounds.x + selectionBounds.width / 2;
          const cy = selectionBounds.y + selectionBounds.height / 2;
          const startAngle = Math.atan2(point.y - cy, point.x - cx);
          transformStartRef.current = { ...point, cx, cy, startAngle, lastAngle: startAngle };
          setIsDrawing(true);
          return;
        }
        if (handleHit && handleHit.startsWith('resize-')) {
          setTransformMode(handleHit);
          transformStartRef.current = { ...point, bounds: { ...selectionBounds }, lastPoint: { ...point } };
          setIsDrawing(true);
          return;
        }
      }

      // Click-select: check if clicking on any object
      const hitObj = hitTestAnyObject(point);
      if (hitObj) {
        if (e.shiftKey) {
          // Shift-click: toggle in/out of selection
          setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(hitObj.id)) next.delete(hitObj.id);
            else next.add(hitObj.id);
            // Expand to include group members
            return expandSelectionToGroups(next, [...strokes, ...shapes, ...texts], groups);
          });
        } else {
          // Single click select (expand to group)
          const newSel = new Set([hitObj.id]);
          setSelectedIds(expandSelectionToGroups(newSel, [...strokes, ...shapes, ...texts], groups));
        }
        setIsDrawing(false);
        return;
      }

      // Start marquee or lasso selection
      if (!e.shiftKey) setSelectedIds(new Set());
      setIsDrawing(true);
      setMarqueeStart(point);
      setMarqueeEnd(point);
      setCurrentPoints([point]);
      return;
    }

    // Shape tools
    if (['rectangle', 'circle', 'line', 'triangle', 'arrow'].includes(tool)) {
      setIsDrawing(true);
      setShapeStartPoint(point);
      setCurrentShape({ type: tool, x: point.x, y: point.y, width: 0, height: 0, ...shapeOptions });
      return;
    }

    // Eraser
    if (tool === 'eraser') {
      if (activeLayer?.locked) { toast.error('Layer is locked'); return; }
      if (eraserMode === 'vector') {
        // Delete whole stroke on tap
        const hit = strokes.find(s => s.layerId === activeLayerId && hitTestStroke(s, point, eraserSize));
        if (hit) {
          const newStrokes = strokes.filter(s => s.id !== hit.id);
          setStrokes(newStrokes);
          saveToHistory(newStrokes, shapes, texts);
        }
      } else {
        // Normal erase – start tracking
        setIsDrawing(true);
        setCurrentPoints([point]);
      }
      return;
    }

    // Drawing tools
    if (activeLayer?.locked) { toast.error('Layer is locked'); return; }
    setIsDrawing(true);
    setCurrentPoints([point]);
  };

  const draw = (e) => {
    e.preventDefault();

    // Panning
    if (isPanning) {
      const rect = canvasRef.current.getBoundingClientRect();
      if (e.touches?.length === 2) {
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        setPanX(prev => prev + cx - panStartRef.current.x);
        setPanY(prev => prev + cy - panStartRef.current.y);
        panStartRef.current = { x: cx, y: cy };
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDistRef.current) {
          setZoom(prev => Math.max(0.1, Math.min(5, prev * (dist / lastTouchDistRef.current))));
        }
        lastTouchDistRef.current = dist;
      } else {
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const curX = cx - rect.left, curY = cy - rect.top;
        setPanX(prev => prev + curX - panStartRef.current.x);
        setPanY(prev => prev + curY - panStartRef.current.y);
        panStartRef.current = { x: curX, y: curY };
      }
      return;
    }

    if (!isDrawing) return;
    const point = getPoint(e);

    // Transform: move, resize, rotate
    if (transformMode && selectedIds.size > 0 && transformStartRef.current) {
      const ref = transformStartRef.current;
      if (transformMode === 'move') {
        const dx = point.x - ref.x;
        const dy = point.y - ref.y;
        const applyMove = (arr) => arr.map(o => {
          if (!selectedIds.has(o.id)) return o;
          return { ...o, tx: (o.tx || 0) + dx, ty: (o.ty || 0) + dy };
        });
        setStrokes(applyMove);
        setShapes(applyMove);
        setTexts(applyMove);
        transformStartRef.current = { ...point };
      } else if (transformMode === 'rotate') {
        const currentAngle = Math.atan2(point.y - ref.cy, point.x - ref.cx);
        const deltaAngle = currentAngle - ref.lastAngle;
        ref.lastAngle = currentAngle;
        // Rotate all selected objects' positions around the selection center
        const cx = ref.cx, cy = ref.cy;
        const cosA = Math.cos(deltaAngle), sinA = Math.sin(deltaAngle);
        const rotateArr = (arr) => arr.map(o => {
          if (!selectedIds.has(o.id)) return o;
          if (o.type === 'stroke' || (!o.type && o.points)) {
            // Rotate each point around center
            const newPoints = o.points.map(p => {
              const px = p.x + (o.tx || 0) - cx;
              const py = p.y + (o.ty || 0) - cy;
              return {
                x: px * cosA - py * sinA + cx,
                y: px * sinA + py * cosA + cy,
              };
            });
            return { ...o, points: newPoints, tx: 0, ty: 0 };
          }
          // Shapes and texts: rotate their position around center
          const ox = (o.x || 0) + (o.tx || 0) - cx;
          const oy = (o.y || 0) + (o.ty || 0) - cy;
          return {
            ...o,
            x: ox * cosA - oy * sinA + cx,
            y: ox * sinA + oy * cosA + cy,
            tx: 0, ty: 0,
            rotation: (o.rotation || 0) + deltaAngle,
          };
        });
        setStrokes(rotateArr);
        setShapes(rotateArr);
        setTexts(rotateArr);
      } else if (transformMode.startsWith('resize-')) {
        const startBounds = ref.bounds;
        if (startBounds) {
          const dx = point.x - ref.lastPoint.x;
          const dy = point.y - ref.lastPoint.y;
          ref.lastPoint = { ...point };
          // Calculate incremental scale factor
          const dir = transformMode.replace('resize-', '');
          let sx = 1, sy = 1;
          const bw = Math.max(startBounds.width, 1);
          const bh = Math.max(startBounds.height, 1);
          if (dir.includes('r')) sx = 1 + dx / bw;
          if (dir.includes('l')) sx = 1 - dx / bw;
          if (dir.includes('b')) sy = 1 + dy / bh;
          if (dir.includes('t')) sy = 1 - dy / bh;
          // For corner handles, use uniform scaling
          if (dir.length === 2) {
            const avg = (Math.abs(sx - 1) > Math.abs(sy - 1)) ? sx : sy;
            sx = avg; sy = avg;
          }
          sx = Math.max(0.05, Math.min(10, sx));
          sy = Math.max(0.05, Math.min(10, sy));
          // Scale all objects relative to selection center
          const cx = startBounds.x + startBounds.width / 2;
          const cy = startBounds.y + startBounds.height / 2;
          const scaleArr = (arr) => arr.map(o => {
            if (!selectedIds.has(o.id)) return o;
            if (o.type === 'stroke' || (!o.type && o.points)) {
              const newPoints = o.points.map(p => {
                const px = p.x + (o.tx || 0);
                const py = p.y + (o.ty || 0);
                return {
                  x: (px - cx) * sx + cx,
                  y: (py - cy) * sy + cy,
                };
              });
              return { ...o, points: newPoints, tx: 0, ty: 0, size: Math.max(0.5, (o.size || 2) * ((sx + sy) / 2)) };
            }
            // Shapes: scale position and dimensions
            const ox = (o.x || 0) + (o.tx || 0);
            const oy = (o.y || 0) + (o.ty || 0);
            const newX = (ox - cx) * sx + cx;
            const newY = (oy - cy) * sy + cy;
            if (o.type === 'text') {
              return {
                ...o,
                x: newX, y: newY, tx: 0, ty: 0,
                fontSize: Math.max(6, Math.round((o.fontSize || 16) * ((sx + sy) / 2))),
              };
            }
            return {
              ...o,
              x: newX, y: newY, tx: 0, ty: 0,
              width: (o.width || 0) * sx,
              height: (o.height || 0) * sy,
              borderWidth: Math.max(0.5, (o.borderWidth || 2) * ((sx + sy) / 2)),
            };
          });
          setStrokes(scaleArr);
          setShapes(scaleArr);
          setTexts(scaleArr);
        }
      }
      return;
    }

    // Marquee selection drag
    if (tool === 'lasso' && marqueeStart) {
      setMarqueeEnd(point);
      setCurrentPoints(prev => [...prev, point]);
      return;
    }

    // Shape preview
    if (['rectangle', 'circle', 'line', 'triangle', 'arrow'].includes(tool) && shapeStartPoint) {
      setCurrentShape({
        type: tool, x: shapeStartPoint.x, y: shapeStartPoint.y,
        width: point.x - shapeStartPoint.x, height: point.y - shapeStartPoint.y,
        ...shapeOptions,
      });
      return;
    }

    // Normal eraser
    if (tool === 'eraser' && eraserMode === 'normal') {
      // Split strokes that intersect eraser path
      let changed = false;
      let newStrokes = [...strokes];
      for (let i = newStrokes.length - 1; i >= 0; i--) {
        const s = newStrokes[i];
        if (s.layerId !== activeLayerId) continue;
        if (hitTestStroke(s, point, eraserSize)) {
          const segments = splitStroke(s, point, eraserSize);
          newStrokes.splice(i, 1, ...segments);
          changed = true;
        }
      }
      if (changed) setStrokes(newStrokes);
      setCurrentPoints(prev => [...prev, point]);
      return;
    }

    // Lasso/marquee drawing handled above in transform section
    if (tool === 'lasso') {
      return;
    }

    // Drawing
    const stabilized = stabilizePoint(point, currentPoints, smoothingLevel);
    setCurrentPoints(prev => [...prev, stabilized]);
  };

  const stopDrawing = () => {
    if (isPanning) {
      setIsPanning(false);
      lastTouchDistRef.current = null;
      return;
    }
    if (!isDrawing) return;
    setIsDrawing(false);

    // Transform complete
    if (transformMode) {
      setTransformMode(null);
      transformStartRef.current = null;
      saveToHistory(strokes, shapes, texts, groups);
      return;
    }

    // Normal eraser done
    if (tool === 'eraser' && eraserMode === 'normal') {
      saveToHistory(strokes, shapes, texts, groups);
      setCurrentPoints([]);
      return;
    }

    // Shape complete
    if (['rectangle', 'circle', 'line', 'triangle', 'arrow'].includes(tool) && currentShape && shapeStartPoint) {
      if (Math.abs(currentShape.width) > 5 || Math.abs(currentShape.height) > 5) {
        const newShape = createShapeObj(tool, currentShape, { ...shapeOptions, layerId: activeLayerId });
        const newShapes = [...shapes, newShape];
        setShapes(newShapes);
        saveToHistory(strokes, newShapes, texts, groups);
      }
      setCurrentShape(null);
      setShapeStartPoint(null);
      setCurrentPoints([]);
      return;
    }

    // Lasso / Marquee complete
    if (tool === 'lasso' && (marqueeStart || currentPoints.length > 2)) {
      if (marqueeStart && marqueeEnd) {
        // Box/marquee selection
        const mx = Math.min(marqueeStart.x, marqueeEnd.x);
        const my = Math.min(marqueeStart.y, marqueeEnd.y);
        const mw = Math.abs(marqueeEnd.x - marqueeStart.x);
        const mh = Math.abs(marqueeEnd.y - marqueeStart.y);
        
        if (mw > 5 || mh > 5) {
          const newSelected = new Set(selectedIds);
          const all = [...strokes, ...shapes, ...texts];
          for (const obj of all) {
            const b = getObjectBounds(obj);
            if (!b) continue;
            // Check if object bounds overlap marquee
            if (b.x + b.width >= mx && b.x <= mx + mw && b.y + b.height >= my && b.y <= my + mh) {
              newSelected.add(obj.id);
            }
          }
          setSelectedIds(expandSelectionToGroups(newSelected, all, groups));
        }
      } else if (currentPoints.length > 2) {
        // Lasso polygon selection  
        const newSelected = new Set(selectedIds);
        const all = [...strokes, ...shapes, ...texts];
        for (const obj of all) {
          const b = getObjectBounds(obj);
          if (!b) continue;
          const center = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
          if (isPointInPolygon(center, currentPoints)) newSelected.add(obj.id);
        }
        setSelectedIds(expandSelectionToGroups(newSelected, all, groups));
      }
      setMarqueeStart(null);
      setMarqueeEnd(null);
      setCurrentPoints([]);
      return;
    }

    // Stroke complete
    if (currentPoints.length > 0 && !['lasso', 'eraser', 'text', 'rectangle', 'circle', 'line', 'triangle', 'arrow'].includes(tool)) {
      const finalPts = smoothPoints(currentPoints, smoothingLevel);
      const config = { rigid_pen: 1, smooth_pen: 1, marker: 1, highlighter: 0.3, calligraphy: 1, watercolor: 0.8, spray: 0.6 };
      const newStroke = createStroke(finalPts, {
        layerId: activeLayerId,
        tool, color, size: brushSize,
        opacity: config[tool] ?? 1,
      });
      const newStrokes = [...strokes, newStroke];
      setStrokes(newStrokes);
      saveToHistory(newStrokes, shapes, texts, groups);
    }
    setCurrentPoints([]);
  };

  // ─── Text submit ───
  const handleTextSubmit = () => {
    if (!textInputValue.trim() || !textInputPosition) { setTextInputPosition(null); return; }
    if (editingTextId) {
      const newTexts = texts.map(t => t.id === editingTextId ? { ...t, text: textInputValue, ...textOptions } : t);
      setTexts(newTexts);
      saveToHistory(strokes, shapes, newTexts, groups);
    } else {
      const newText = createTextObj(textInputPosition, textInputValue, { ...textOptions, layerId: activeLayerId });
      const newTexts = [...texts, newText];
      setTexts(newTexts);
      saveToHistory(strokes, shapes, newTexts, groups);
    }
    setTextInputPosition(null);
    setTextInputValue('');
    setEditingTextId(null);
  };

  // ─── Layers ───
  const handleAddLayer = () => {
    const newLayer = createLayer(`Layer ${layers.length + 1}`);
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const handleDeleteLayer = (layerId) => {
    if (layers.length <= 1) return;
    setLayers(prev => prev.filter(l => l.id !== layerId));
    setStrokes(prev => prev.filter(s => s.layerId !== layerId));
    setShapes(prev => prev.filter(s => s.layerId !== layerId));
    setTexts(prev => prev.filter(t => t.layerId !== layerId));
    if (activeLayerId === layerId) {
      const remaining = layers.filter(l => l.id !== layerId);
      setActiveLayerId(remaining[0]?.id);
    }
  };

  const handleToggleVisibility = (layerId) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l));
  };

  const handleToggleLock = (layerId) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l));
  };

  const handleRenameLayer = (layerId, name) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, name } : l));
  };

  const handleChangeOpacity = (layerId, opacity) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, opacity } : l));
  };

  // ─── Reset ───
  const confirmReset = () => {
    const defLayer = createLayer();
    setLayers([defLayer]);
    setActiveLayerId(defLayer.id);
    setStrokes([]); setShapes([]); setTexts([]); setGroups([]);
    historyRef.current = [{ strokes: [], shapes: [], texts: [], groups: [], layers: [defLayer] }];
    setHistoryIndex(0);
    setPanX(0); setPanY(0); setZoom(1);
    setPaperMode('light'); setPaperStyle('blank');
    setColor('#000000'); setBrushSize(2); setTool('rigid_pen');
    setSelectedIds(new Set());
    setShowResetDialog(false);
    toast.success('Canvas reset');
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!annotationId) { toast.error('No annotation ID'); return; }
    setIsSaving(true);
    try {
      const canvas = canvasRef.current;
      const drawingData = {
        annotation_id: annotationId,
        strokes_json: serializeDrawing({
          layers, strokes, shapes, texts, groups, activeLayerId,
          paperMode, paperStyle, paperGridSize, paperLineSpacing,
          tool, panX, panY, zoom,
        }),
        width: canvas?.width || 1200,
        height: canvas?.height || 800,
        version: 2,
      };

      // Upload preview
      try {
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('blob fail')), 'image/png');
        });
        if (blob?.size > 0) {
          const upload = await base44.integrations.Core.UploadFile({ file: blob });
          if (upload?.file_url) drawingData.preview_image_url = upload.file_url;
        }
      } catch {}

      let savedDrawing;
      if (existingDrawing) {
        savedDrawing = await base44.entities.Drawing.update(existingDrawing.id, drawingData);
      } else {
        savedDrawing = await base44.entities.Drawing.create(drawingData);
      }

      toast.success('Drawing saved');
      if (onSave) onSave(savedDrawing);
      if (onClose) onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDrawing = async () => {
    if (!existingDrawing) return;
    await base44.entities.Drawing.update(existingDrawing.id, { is_deleted: true });
    toast.success('Drawing deleted');
    if (onClose) onClose();
  };

  // ─── Export ───
  const generateExportCanvas = (opts = {}) => {
    const { scale = exportScale, includePaper = exportIncludePaper } = opts;
    if (strokes.length === 0 && shapes.length === 0 && texts.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    strokes.forEach(s => {
      const pts = getTransformedPoints(s);
      pts.forEach(p => {
        minX = Math.min(minX, p.x - s.size); minY = Math.min(minY, p.y - s.size);
        maxX = Math.max(maxX, p.x + s.size); maxY = Math.max(maxY, p.y + s.size);
      });
    });
    const pad = 64;
    const bounds = { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
    const ec = document.createElement('canvas');
    ec.width = bounds.width * scale; ec.height = bounds.height * scale;
    const ctx = ec.getContext('2d');
    ctx.scale(scale, scale);
    if (includePaper) {
      ctx.fillStyle = paperMode === 'dark' ? '#1f2937' : '#ffffff';
      ctx.fillRect(0, 0, bounds.width, bounds.height);
    }
    ctx.translate(-bounds.x, -bounds.y);
    drawObjects(ctx, layers, strokes, shapes, texts, new Set(), 0, 0, 1);
    return ec;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const ec = generateExportCanvas();
      if (!ec) throw new Error('Nothing to export');
      let blob, filename;
      if (exportFormat === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const imgData = ec.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: ec.width > ec.height ? 'landscape' : 'portrait',
          unit: 'px', format: [ec.width, ec.height],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, ec.width, ec.height);
        blob = pdf.output('blob'); filename = `drawing-${Date.now()}.pdf`;
      } else {
        const mime = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
        blob = await new Promise(r => ec.toBlob(r, mime, 0.95));
        filename = `drawing-${Date.now()}.${exportFormat}`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Exported');
      setShowExportModal(false);
    } catch (err) {
      toast.error('Export failed');
    } finally { setIsExporting(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-40">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
                <X className="w-5 h-5" />
              </Button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Drawing Editor</span>
              <span className="text-xs text-gray-400">v2</span>
            </div>

            <div className="flex items-center gap-2">
              {existingDrawing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteDrawing}
                  className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLayers(!showLayers)}
                className="h-8 text-xs"
              >
                Layers ({layers.length})
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 h-9">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save</>}
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div ref={containerRef} className="absolute inset-0 top-14 pb-16" style={{ background: paperMode === 'dark' ? '#111827' : '#f9fafb' }}>
            <canvas
              ref={canvasRef}
              width={canvasDim.width}
              height={canvasDim.height}
              className={`w-full h-full touch-none ${
                tool === 'hand' ? 'cursor-grab active:cursor-grabbing' :
                tool === 'lasso' && selectedIds.size > 0 ? 'cursor-move' :
                tool === 'eraser' ? 'cursor-cell' :
                'cursor-crosshair'
              }`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onWheel={(e) => {
                e.preventDefault();
                const factor = e.deltaY > 0 ? 0.9 : 1.1;
                const newZoom = Math.max(0.1, Math.min(5, zoom * factor));
                const rect = canvasRef.current.getBoundingClientRect();
                const sx = canvasRef.current.width / rect.width;
                const sy = canvasRef.current.height / rect.height;
                // Mouse position in canvas pixel space
                const mx = (e.clientX - rect.left) * sx;
                const my = (e.clientY - rect.top) * sy;
                // World coordinate under cursor
                const wx = (mx - panX) / zoom;
                const wy = (my - panY) / zoom;
                // Adjust pan so the same world point stays under cursor
                setPanX(mx - wx * newZoom);
                setPanY(my - wy * newZoom);
                setZoom(newZoom);
              }}
            />
          </div>

          {/* Layers Panel */}
          {showLayers && (
            <div className="absolute top-16 right-4 z-30">
              <LayersPanel
                layers={layers}
                activeLayerId={activeLayerId}
                onSelectLayer={setActiveLayerId}
                onAddLayer={handleAddLayer}
                onDeleteLayer={handleDeleteLayer}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onReorderLayer={() => {}}
                onRenameLayer={handleRenameLayer}
                onChangeOpacity={handleChangeOpacity}
              />
            </div>
          )}

          {/* Toolbox */}
          <FloatingToolbox
            tool={tool}
            onToolChange={handleToolChange}
            color={color}
            onColorChange={(c) => { setColor(c); if (!recentColors.includes(c)) setRecentColors([c, ...recentColors.slice(0, 4)]); }}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            zoom={zoom}
            onZoomChange={(val) => setZoom(val[0])}
            paperMode={paperMode}
            onPaperModeChange={setPaperMode}
            paperStyle={paperStyle}
            onPaperStyleChange={setPaperStyle}
            onUndo={undo}
            onRedo={redo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < historyRef.current.length - 1}
            onExport={() => setShowExportModal(true)}
            onReset={() => setShowResetDialog(true)}
            onSavePreset={savePreset}
            presetSaved={presetSaved}
            onShowPresets={() => {}}
            recentColors={recentColors}
            onColorSelect={setColor}
            shapeOptions={shapeOptions}
            onShapeOptionsChange={setShapeOptions}
            textOptions={textOptions}
            onTextOptionsChange={setTextOptions}
            smoothing={smoothingLevel}
            onSmoothingChange={setSmoothingLevel}
            eraserMode={eraserMode}
            onEraserModeChange={setEraserMode}
            eraserSize={eraserSize}
            onEraserSizeChange={setEraserSize}
            selectedCount={selectedIds.size}
            onGroup={handleGroup}
            onUngroup={handleUngroup}
            onAlign={handleAlign}
            hasGroups={selectedIds.size > 0 && [...strokes, ...shapes, ...texts].some(o => selectedIds.has(o.id) && o.groupId)}
          />

          {/* Text Input Overlay */}
          {textInputPosition && (
            <div className="fixed z-50" style={{
              left: textInputPosition.x * zoom + panX + (containerRef.current?.getBoundingClientRect().left || 0),
              top: textInputPosition.y * zoom + panY + (containerRef.current?.getBoundingClientRect().top || 0) + 56,
            }}>
              <textarea
                ref={textInputRef}
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                onBlur={handleTextSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setTextInputPosition(null); setTextInputValue(''); }
                  else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }
                }}
                className="min-w-[200px] min-h-[40px] p-2 border-2 border-orange-500 rounded-lg bg-white dark:bg-gray-800 shadow-lg outline-none resize-none"
                style={{
                  fontFamily: textOptions.fontFamily,
                  fontSize: textOptions.fontSize * zoom,
                  color: textOptions.color,
                  fontWeight: textOptions.bold ? 'bold' : 'normal',
                  fontStyle: textOptions.italic ? 'italic' : 'normal',
                  textAlign: textOptions.align,
                }}
                placeholder="Type here..."
                autoFocus
              />
            </div>
          )}

          {/* Export Modal */}
          <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
            <DialogContent className="max-w-lg dark:bg-gray-900 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle className="dark:text-white flex items-center gap-2">
                  <FileImage className="w-5 h-5" /> Export Drawing
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div>
                  <Label className="text-sm mb-2 block">Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger className="dark:bg-gray-800"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="jpeg">JPEG</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-2 block">Scale</Label>
                  <Select value={String(exportScale)} onValueChange={(v) => setExportScale(parseInt(v))}>
                    <SelectTrigger className="dark:bg-gray-800"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="3">3x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowExportModal(false)}>Cancel</Button>
                <Button onClick={handleExport} disabled={isExporting} className="bg-orange-600 hover:bg-orange-700">
                  {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Export
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reset Dialog */}
          <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
            <DialogContent className="max-w-md dark:bg-gray-900 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle className="dark:text-white">Reset Canvas?</DialogTitle>
              </DialogHeader>
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">This will clear everything. Cannot be undone.</p>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowResetDialog(false)} className="flex-1">Cancel</Button>
                <Button onClick={confirmReset} className="flex-1 bg-red-600 hover:bg-red-700">Reset</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}