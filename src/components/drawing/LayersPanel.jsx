import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export default function LayersPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onToggleVisibility,
  onToggleLock,
  onReorderLayer,
  onRenameLayer,
  onChangeOpacity,
}) {
  const [editingId, setEditingId] = React.useState(null);
  const [editName, setEditName] = React.useState('');
  const [expandedId, setExpandedId] = React.useState(null);

  const handleStartRename = (layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      onRenameLayer(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Layers</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAddLayer}
          title="Add layer"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
        {layers.slice().reverse().map((layer, i) => {
          const isActive = layer.id === activeLayerId;
          const isExpanded = expandedId === layer.id;

          return (
            <div key={layer.id}>
              <div
                onClick={() => onSelectLayer(layer.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-900/30 ring-1 ring-orange-300 dark:ring-orange-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                {/* Visibility */}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  title={layer.visible ? 'Hide' : 'Show'}
                >
                  {layer.visible
                    ? <Eye className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    : <EyeOff className="w-3 h-3 text-gray-400 dark:text-gray-600" />
                  }
                </button>

                {/* Lock */}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  title={layer.locked ? 'Unlock' : 'Lock'}
                >
                  {layer.locked
                    ? <Lock className="w-3 h-3 text-red-500 dark:text-red-400" />
                    : <Unlock className="w-3 h-3 text-gray-400 dark:text-gray-600" />
                  }
                </button>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  {editingId === layer.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={handleFinishRename}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleFinishRename(); }}
                      className="w-full text-xs px-1 py-0.5 border rounded bg-white dark:bg-gray-800 dark:border-gray-600 outline-none"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className={`text-xs truncate block ${
                        isActive ? 'font-semibold text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'
                      } ${!layer.visible ? 'opacity-50' : ''}`}
                      onDoubleClick={(e) => { e.stopPropagation(); handleStartRename(layer); }}
                    >
                      {layer.name}
                    </span>
                  )}
                </div>

                {/* Opacity indicator */}
                {layer.opacity < 1 && (
                  <span className="text-[9px] text-gray-400 tabular-nums">{Math.round(layer.opacity * 100)}%</span>
                )}

                {/* Expand for opacity */}
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : layer.id); }}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Delete */}
                {layers.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                    className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                    title="Delete layer"
                  >
                    <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                  </button>
                )}
              </div>

              {/* Expanded: opacity slider */}
              {isExpanded && (
                <div className="flex items-center gap-2 px-3 py-1.5 ml-5">
                  <span className="text-[10px] text-gray-500 w-8">Opacity</span>
                  <Slider
                    value={[layer.opacity * 100]}
                    onValueChange={([v]) => onChangeOpacity(layer.id, v / 100)}
                    min={10}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-gray-500 w-6 tabular-nums">{Math.round(layer.opacity * 100)}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}