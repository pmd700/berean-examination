import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X, RotateCcw, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ArtEditorPanel({ 
  chapter, 
  settings, 
  onChange, 
  onSave, 
  onCancel, 
  onReset,
  saving 
}) {
  if (!chapter) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Art Editor
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {chapter.book} {chapter.chapter_number}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Live Preview (Exact Recent Chapters Render) */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                LIVE PREVIEW (exact render from Recent Chapters)
              </Label>
              
              {/* Exact replica of Recent Chapters card */}
              <div
                className="chapter-card-preview relative w-full p-3.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-300 overflow-hidden"
                style={{ 
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                {/* Shine effect */}
                <div className="shine-overlay-preview absolute inset-0 opacity-0 pointer-events-none" />
                
                {/* Art Background - Exact same styling as ProgressTracker */}
                {settings.cover_art_url && (
                  <>
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `url(${settings.cover_art_url})`,
                        backgroundPosition: `${settings.cover_art_x}% ${settings.cover_art_y}%`,
                        backgroundSize: `${settings.cover_art_scale}%`,
                        backgroundRepeat: 'no-repeat',
                        opacity: settings.cover_art_opacity / 100,
                        mixBlendMode: 'soft-light',
                        zIndex: 0
                      }}
                    />
                    
                    {/* White fade overlay (light mode) - opacity reduced when cover_art_opacity > 100 */}
                    <div 
                      className="absolute inset-0 pointer-events-none dark:hidden"
                      style={{
                        backgroundImage: `linear-gradient(to left, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 60%)`,
                        opacity: settings.cover_art_opacity > 100 ? Math.max(0, 1 - ((settings.cover_art_opacity - 100) / 100)) : 1,
                        zIndex: 1
                      }}
                    />
                    
                    {/* Dark fade overlay (dark mode) - opacity reduced when cover_art_opacity > 100 */}
                    <div 
                      className="absolute inset-0 pointer-events-none hidden dark:block"
                      style={{
                        backgroundImage: `linear-gradient(to left, rgba(17,24,39,0) 0%, rgba(17,24,39,0.85) 60%)`,
                        opacity: settings.cover_art_opacity > 100 ? Math.max(0, 1 - ((settings.cover_art_opacity - 100) / 100)) : 1,
                        zIndex: 1
                      }}
                    />
                  </>
                )}
                
                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    {chapter.book} {chapter.chapter_number}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                    <span>Last edited Feb 10, 2026 2:45 AM</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    13 notes
                  </Badge>
                </div>
              </div>
              
              <style>{`
                .chapter-card-preview:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(156, 163, 175, 0.4) !important;
                }
                
                .dark .chapter-card-preview:hover {
                  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(156, 163, 175, 0.5) !important;
                }
                
                .chapter-card-preview:active {
                  transform: translateY(-1px);
                }
                
                .shine-overlay-preview {
                  background: linear-gradient(
                    110deg,
                    transparent 0%,
                    transparent 40%,
                    rgba(255, 255, 255, 0.15) 50%,
                    transparent 60%,
                    transparent 100%
                  );
                  background-size: 200% 100%;
                }
                
                .chapter-card-preview:hover .shine-overlay-preview {
                  opacity: 1;
                  animation: shine-preview 0.8s ease-in-out;
                }
                
                @keyframes shine-preview {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
              `}</style>
            </div>

            {/* Controls Below Preview */}
            <div className="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              {/* Opacity Warning */}
              {settings.cover_art_opacity === 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Opacity is 0% — art will be invisible
                  </p>
                </div>
              )}

              {/* Opacity */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Opacity
                    {settings.cover_art_opacity > 100 && (
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(Fade override active)</span>
                    )}
                  </Label>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{settings.cover_art_opacity}%</span>
                </div>
                <div className="relative">
                  <Slider
                    value={[settings.cover_art_opacity]}
                    onValueChange={([val]) => onChange({ cover_art_opacity: val })}
                    min={0}
                    max={200}
                    step={1}
                    className="w-full"
                  />
                  {/* Marker at 100% */}
                  <div 
                    className="absolute top-6 pointer-events-none"
                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                  >
                    <div className="w-0.5 h-2 bg-amber-500 dark:bg-amber-400 mx-auto mb-1" />
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                      Fade override begins
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-8">
                  <span>Hidden</span>
                  <span>Normal</span>
                  <span>Boost</span>
                </div>
              </div>

              {/* Position X */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Horizontal Position</Label>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{settings.cover_art_x}%</span>
                </div>
                <Slider
                  value={[settings.cover_art_x]}
                  onValueChange={([val]) => onChange({ cover_art_x: val })}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <span>Left</span>
                  <span>Center</span>
                  <span>Right</span>
                </div>
              </div>

              {/* Position Y */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vertical Position</Label>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{settings.cover_art_y}%</span>
                </div>
                <Slider
                  value={[settings.cover_art_y]}
                  onValueChange={([val]) => onChange({ cover_art_y: val })}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <span>Top</span>
                  <span>Middle</span>
                  <span>Bottom</span>
                </div>
              </div>

              {/* Scale */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Scale (Size)</Label>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{settings.cover_art_scale}%</span>
                </div>
                <Slider
                  value={[settings.cover_art_scale]}
                  onValueChange={([val]) => onChange({ cover_art_scale: val })}
                  min={10}
                  max={200}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <span>Small</span>
                  <span>Large</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onReset}
            className="dark:border-gray-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="dark:border-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 min-w-24"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}