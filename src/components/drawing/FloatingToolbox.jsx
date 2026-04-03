import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Pencil, Eraser, Undo2, Redo2, Lasso, MoreHorizontal, X,
  PenTool, Paintbrush, Highlighter, Hand,
  Square, Circle, Minus, Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Triangle, ArrowRight, Droplets, SprayCan, Group, Ungroup,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  Sun, Moon, Grid3x3, Download, Trash2, Bookmark, Settings, ChevronRight
} from 'lucide-react';

export default function FloatingToolbox({
  tool, onToolChange,
  color, onColorChange,
  brushSize, onBrushSizeChange,
  zoom, onZoomChange,
  paperMode, onPaperModeChange,
  paperStyle, onPaperStyleChange,
  onUndo, onRedo, canUndo, canRedo,
  onExport, onReset, onShowPresets,
  recentColors, onColorSelect,
  shapeOptions, onShapeOptionsChange,
  textOptions, onTextOptionsChange,
  smoothing, onSmoothingChange,
  eraserMode, onEraserModeChange,
  eraserSize, onEraserSizeChange,
  selectedCount, onGroup, onUngroup, onAlign, hasGroups,
  onSavePreset, presetSaved,
}) {
  const [showMore, setShowMore] = useState(false);
  const [moreTab, setMoreTab] = useState('draw'); // draw, insert, view, actions
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isPenTool = ['rigid_pen', 'smooth_pen', 'marker', 'highlighter', 'calligraphy', 'watercolor', 'spray'].includes(tool);
  const isShapeTool = ['rectangle', 'circle', 'line', 'triangle', 'arrow'].includes(tool);
  const isTextTool = tool === 'text';
  const isSelectTool = tool === 'lasso';
  const isEraserTool = tool === 'eraser';

  const toolIcons = {
    rigid_pen: Pencil, smooth_pen: PenTool, marker: Paintbrush,
    highlighter: Highlighter, calligraphy: PenTool, watercolor: Droplets, spray: SprayCan,
  };
  const CurrentDrawIcon = toolIcons[tool] || Pencil;

  const closeAll = () => { setShowMore(false); setShowColorPicker(false); };

  // Quick tool select: tap cycles through draw tools, or selects draw if on another tool
  const selectDrawTool = () => {
    if (!isPenTool) {
      onToolChange('rigid_pen');
    }
    // If already a pen tool, open more menu to switch
    else {
      setShowMore(true);
      setMoreTab('draw');
    }
  };

  return (
    <>
      {/* Backdrop for closing menus */}
      {(showMore || showColorPicker) && (
        <div className="fixed inset-0 z-20" onClick={closeAll} />
      )}

      {/* ─── Primary Bottom Bar ─── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl px-2 py-1.5">
        {/* Draw */}
        <ToolBtn
          active={isPenTool}
          onClick={selectDrawTool}
          icon={<CurrentDrawIcon className="w-5 h-5" />}
          label="Draw"
        />

        {/* Eraser */}
        <ToolBtn
          active={isEraserTool}
          onClick={() => { closeAll(); onToolChange('eraser'); }}
          icon={<Eraser className="w-5 h-5" />}
          label="Erase"
        />

        {/* Select */}
        <ToolBtn
          active={isSelectTool}
          onClick={() => { closeAll(); onToolChange('lasso'); }}
          icon={<Lasso className="w-5 h-5" />}
          label="Select"
        />

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-0.5" />

        {/* Color */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMore(false); setShowColorPicker(!showColorPicker); }}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-inner" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-gray-500 dark:text-gray-400">Color</span>
          </button>
          {showColorPicker && <ColorPickerPopup color={color} onColorChange={onColorChange} recentColors={recentColors} onColorSelect={(c) => { onColorSelect(c); setShowColorPicker(false); }} />}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-0.5" />

        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
          title="Undo"
        >
          <Undo2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
          title="Redo"
        >
          <Redo2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-0.5" />

        {/* More */}
        <ToolBtn
          active={showMore}
          onClick={() => { setShowColorPicker(false); setShowMore(!showMore); }}
          icon={showMore ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
          label="More"
        />
      </div>

      {/* ─── More Panel (above bottom bar) ─── */}
      {showMore && (
        <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-30 w-[340px] max-h-[60vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { key: 'draw', label: 'Draw' },
              { key: 'insert', label: 'Insert' },
              { key: 'view', label: 'View' },
              { key: 'actions', label: 'Actions' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setMoreTab(t.key)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  moreTab === t.key
                    ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-3 overflow-y-auto max-h-[calc(60vh-40px)]">
            {moreTab === 'draw' && (
              <DrawTab
                tool={tool} onToolChange={(t) => { onToolChange(t); }}
                brushSize={brushSize} onBrushSizeChange={onBrushSizeChange}
                smoothing={smoothing} onSmoothingChange={onSmoothingChange}
                eraserMode={eraserMode} onEraserModeChange={onEraserModeChange}
                eraserSize={eraserSize} onEraserSizeChange={onEraserSizeChange}
                isPenTool={isPenTool} isEraserTool={isEraserTool}
              />
            )}
            {moreTab === 'insert' && (
              <InsertTab
                tool={tool} onToolChange={onToolChange}
                shapeOptions={shapeOptions} onShapeOptionsChange={onShapeOptionsChange}
                textOptions={textOptions} onTextOptionsChange={onTextOptionsChange}
                isShapeTool={isShapeTool} isTextTool={isTextTool}
              />
            )}
            {moreTab === 'view' && (
              <ViewTab
                zoom={zoom} onZoomChange={onZoomChange}
                paperMode={paperMode} onPaperModeChange={onPaperModeChange}
                paperStyle={paperStyle} onPaperStyleChange={onPaperStyleChange}
                tool={tool} onToolChange={onToolChange}
              />
            )}
            {moreTab === 'actions' && (
              <ActionsTab onExport={onExport} onReset={onReset} onShowPresets={onShowPresets} onSavePreset={onSavePreset} presetSaved={presetSaved} />
            )}
          </div>
        </div>
      )}

      {/* ─── Contextual Selection Bar (appears above bottom bar when objects selected) ─── */}
      {isSelectTool && selectedCount > 0 && !showMore && (
        <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400 mr-1">
              {selectedCount} selected
            </span>
            <button
              onClick={onGroup}
              disabled={selectedCount < 2}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Group (Ctrl+G)"
            >
              <Group className="w-3.5 h-3.5" /> Group
            </button>
            <button
              onClick={onUngroup}
              disabled={!hasGroups}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Ungroup (Ctrl+Shift+G)"
            >
              <Ungroup className="w-3.5 h-3.5" /> Ungroup
            </button>
            {selectedCount >= 2 && <AlignDropdown onAlign={onAlign} />}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Small helper components ───

function ToolBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition-colors ${
        active
          ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}

function ColorPickerPopup({ color, onColorChange, recentColors, onColorSelect }) {
  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 mb-3">
        <input type="color" value={color} onChange={e => onColorChange(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
        <input
          type="text" value={color}
          onChange={e => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) onColorChange(e.target.value); }}
          className="flex-1 px-2 py-1.5 text-xs font-mono border rounded dark:bg-gray-900 dark:border-gray-700 uppercase"
        />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {(recentColors || []).map((c, i) => (
          <button
            key={i} onClick={() => onColorSelect(c)}
            className={`w-9 h-9 rounded-lg border-2 hover:scale-110 transition-transform ${color === c ? 'border-orange-500 ring-2 ring-orange-300' : 'border-gray-300 dark:border-gray-600'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

function AlignDropdown({ onAlign }) {
  const [open, setOpen] = useState(false);
  const alignments = [
    { key: 'left', label: 'Left', icon: AlignStartVertical },
    { key: 'center', label: 'Center', icon: AlignCenterVertical },
    { key: 'right', label: 'Right', icon: AlignEndVertical },
    { key: 'top', label: 'Top', icon: AlignStartHorizontal },
    { key: 'middle', label: 'Middle', icon: AlignCenterHorizontal },
    { key: 'bottom', label: 'Bottom', icon: AlignEndHorizontal },
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        Align <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
          {alignments.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { onAlign?.(key); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs text-gray-700 dark:text-gray-300"
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab content components ───

function DrawTab({ tool, onToolChange, brushSize, onBrushSizeChange, smoothing, onSmoothingChange, eraserMode, onEraserModeChange, eraserSize, onEraserSizeChange, isPenTool, isEraserTool }) {
  const penTools = [
    { key: 'rigid_pen', icon: Pencil, label: 'Pen', sm: 5 },
    { key: 'smooth_pen', icon: PenTool, label: 'Smooth', sm: 70 },
    { key: 'marker', icon: Paintbrush, label: 'Marker', sm: 30 },
    { key: 'highlighter', icon: Highlighter, label: 'Highlight', sm: 40 },
    { key: 'calligraphy', icon: PenTool, label: 'Calligraphy', sm: 5 },
    { key: 'watercolor', icon: Droplets, label: 'Watercolor', sm: 30 },
    { key: 'spray', icon: SprayCan, label: 'Spray', sm: 0 },
  ];

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Brush Type</label>
        <div className="grid grid-cols-4 gap-1.5">
          {penTools.map(({ key, icon: Icon, label, sm }) => (
            <button
              key={key}
              onClick={() => { onToolChange(key); onSmoothingChange?.(sm); }}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                tool === key ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Brush Size</label>
          <span className="text-xs text-gray-400">{brushSize}px</span>
        </div>
        <Slider value={[brushSize]} onValueChange={([v]) => onBrushSizeChange(v)} min={1} max={30} step={1} />
      </div>

      {/* Smoothing */}
      {isPenTool && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Smoothing</label>
            <span className="text-xs text-gray-400">{smoothing || 0}%</span>
          </div>
          <Slider value={[smoothing || 0]} onValueChange={([v]) => onSmoothingChange(v)} min={0} max={100} step={5} />
        </div>
      )}

      {/* Eraser options */}
      {isEraserTool && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Eraser Mode</label>
          <div className="flex gap-1.5 mb-3">
            <button
              onClick={() => onEraserModeChange?.('vector')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${eraserMode === 'vector' ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
            >
              Stroke Delete
            </button>
            <button
              onClick={() => onEraserModeChange?.('normal')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${eraserMode === 'normal' ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
            >
              Normal
            </button>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-500">Eraser Size</label>
            <span className="text-xs text-gray-400">{eraserSize || 15}px</span>
          </div>
          <Slider value={[eraserSize || 15]} onValueChange={([v]) => onEraserSizeChange?.(v)} min={5} max={50} step={1} />
        </div>
      )}
    </div>
  );
}

function InsertTab({ tool, onToolChange, shapeOptions, onShapeOptionsChange, textOptions, onTextOptionsChange, isShapeTool, isTextTool }) {
  const shapeTools = [
    { key: 'rectangle', icon: Square, label: 'Rect' },
    { key: 'circle', icon: Circle, label: 'Circle' },
    { key: 'triangle', icon: Triangle, label: 'Tri' },
    { key: 'line', icon: Minus, label: 'Line' },
    { key: 'arrow', icon: ArrowRight, label: 'Arrow' },
  ];

  return (
    <div className="space-y-3">
      {/* Shapes */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Shapes</label>
        <div className="grid grid-cols-5 gap-1.5">
          {shapeTools.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => onToolChange(key)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                tool === key ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shape Style */}
      {isShapeTool && (
        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Border</label>
            <input type="checkbox" checked={shapeOptions?.borderEnabled ?? true} onChange={e => onShapeOptionsChange({ ...shapeOptions, borderEnabled: e.target.checked })} className="rounded" />
          </div>
          {shapeOptions?.borderEnabled !== false && (
            <div className="flex items-center gap-2">
              <input type="color" value={shapeOptions?.borderColor || '#000000'} onChange={e => onShapeOptionsChange({ ...shapeOptions, borderColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer" />
              <Slider value={[shapeOptions?.borderWidth || 2]} onValueChange={([v]) => onShapeOptionsChange({ ...shapeOptions, borderWidth: v })} min={1} max={20} step={1} className="flex-1" />
              <span className="text-xs text-gray-400 w-5">{shapeOptions?.borderWidth || 2}</span>
            </div>
          )}
          {!['line', 'arrow'].includes(tool) && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Fill</label>
                <input type="checkbox" checked={shapeOptions?.fillEnabled ?? false} onChange={e => onShapeOptionsChange({ ...shapeOptions, fillEnabled: e.target.checked })} className="rounded" />
              </div>
              {shapeOptions?.fillEnabled && (
                <div className="flex items-center gap-2">
                  <input type="color" value={shapeOptions?.fillColor || '#3b82f6'} onChange={e => onShapeOptionsChange({ ...shapeOptions, fillColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer" />
                  <span className="text-xs text-gray-500">{shapeOptions?.fillColor || '#3b82f6'}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Text */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onToolChange('text')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            isTextTool ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Type className="w-4 h-4" /> Text Tool
        </button>
      </div>

      {/* Text Options */}
      {isTextTool && (
        <div className="space-y-2">
          <select
            value={textOptions?.fontFamily || 'Arial, sans-serif'}
            onChange={e => onTextOptionsChange({ ...textOptions, fontFamily: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-900 dark:border-gray-700"
          >
            <option value="Arial, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Courier New, monospace">Courier</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Size</span>
            <Slider value={[textOptions?.fontSize || 16]} onValueChange={([v]) => onTextOptionsChange({ ...textOptions, fontSize: v })} min={10} max={72} step={1} className="flex-1" />
            <span className="text-xs text-gray-400 w-6">{textOptions?.fontSize || 16}</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={textOptions?.color || '#000000'} onChange={e => onTextOptionsChange({ ...textOptions, color: e.target.value })} className="w-7 h-7 rounded cursor-pointer" />
            <div className="flex gap-1">
              <button onClick={() => onTextOptionsChange({ ...textOptions, bold: !textOptions?.bold })} className={`p-1.5 rounded border ${textOptions?.bold ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300' : 'border-gray-200 dark:border-gray-700'}`}><Bold className="w-3.5 h-3.5" /></button>
              <button onClick={() => onTextOptionsChange({ ...textOptions, italic: !textOptions?.italic })} className={`p-1.5 rounded border ${textOptions?.italic ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300' : 'border-gray-200 dark:border-gray-700'}`}><Italic className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex gap-0.5 ml-auto">
              {[{ v: 'left', i: AlignLeft }, { v: 'center', i: AlignCenter }, { v: 'right', i: AlignRight }].map(({ v, i: I }) => (
                <button key={v} onClick={() => onTextOptionsChange({ ...textOptions, align: v })} className={`p-1.5 rounded border ${(textOptions?.align || 'left') === v ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300' : 'border-gray-200 dark:border-gray-700'}`}><I className="w-3.5 h-3.5" /></button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pan tool */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onToolChange('hand')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            tool === 'hand' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Hand className="w-4 h-4" /> Pan / Hand
        </button>
      </div>
    </div>
  );
}

function ViewTab({ zoom, onZoomChange, paperMode, onPaperModeChange, paperStyle, onPaperStyleChange, tool, onToolChange }) {
  const paperStyles = [
    { key: 'blank', label: 'Blank' },
    { key: 'lines', label: 'Notebook' },
    { key: 'wide_lines', label: 'Wide Ruled' },
    { key: 'grid', label: 'Grid' },
    { key: 'dots', label: 'Dot Grid' },
  ];
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Zoom</label>
          <span className="text-xs text-gray-400">{Math.round(zoom * 100)}%</span>
        </div>
        <Slider value={[zoom]} onValueChange={onZoomChange} min={0.25} max={4} step={0.05} />
        <div className="flex gap-1.5 mt-2">
          {[0.5, 1, 2].map(z => (
            <button key={z} onClick={() => onZoomChange([z])} className="flex-1 px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">{z * 100}%</button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Theme</label>
        <div className="flex gap-1.5">
          <button onClick={() => onPaperModeChange('light')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium ${paperMode === 'light' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 text-orange-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
            <Sun className="w-4 h-4" /> Light
          </button>
          <button onClick={() => onPaperModeChange('dark')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium ${paperMode === 'dark' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 text-orange-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
            <Moon className="w-4 h-4" /> Dark
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Paper Style</label>
        <div className="grid grid-cols-3 gap-1.5">
          {paperStyles.map(({ key, label }) => (
            <button
              key={key} onClick={() => onPaperStyleChange(key)}
              className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${paperStyle === key ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 text-orange-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionsTab({ onExport, onReset, onShowPresets, onSavePreset, presetSaved }) {
  return (
    <div className="space-y-2">
      <button onClick={onExport} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 transition-colors">
        <Download className="w-4 h-4" /> Export Drawing
      </button>
      <button onClick={onSavePreset} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm text-orange-700 dark:text-orange-300 transition-colors">
        <Bookmark className="w-4 h-4" /> {presetSaved ? 'Preset Saved ✓' : 'Save as Default Preset'}
      </button>
      <button onClick={onReset} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 transition-colors">
        <Trash2 className="w-4 h-4" /> Reset Canvas
      </button>
    </div>
  );
}