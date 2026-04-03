import React from 'react';
import { 
  X, Calendar, ThumbsUp, ThumbsDown, MessageSquare, Send
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function UpdatePreview({ version, title, description, screenshotUrl, screenshotX, screenshotY, screenshotScale, onClose }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Preview label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-amber-600 text-white text-xs font-bold shadow-lg">
        PREVIEW MODE — This is what users will see
      </div>

      {/* Modal — matches UpdatePopup exactly */}
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative flex-shrink-0">
          {screenshotUrl ? (
            <div className="relative h-48 overflow-hidden rounded-t-2xl">
              <img
                src={screenshotUrl}
                alt={title || 'Preview'}
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `${screenshotX || 50}% ${screenshotY || 50}%`,
                  transform: `scale(${(screenshotScale || 100) / 100})`
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs">
                <Calendar className="w-3 h-3" />
                {format(new Date(), 'MMM d, yyyy')}
              </div>

              <button className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-4 right-4">
                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-xs font-bold mb-1">
                  {version || 'v0.00'}
                </span>
                <h2 className="text-xl font-bold text-white drop-shadow-lg">
                  {title || 'Update Title'}
                </h2>
              </div>
            </div>
          ) : (
            <div className="p-4 pb-0 flex items-start justify-between">
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-900/30 text-amber-300 text-xs font-bold mb-1">
                  {version || 'v0.00'}
                </span>
                <h2 className="text-xl font-bold text-white">
                  {title || 'Update Title'}
                </h2>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(), 'MMM d, yyyy')}
                </div>
              </div>
              <button className="w-8 h-8 rounded-full bg-gray-800 text-gray-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed mb-4">
            {description || 'Update description will appear here...'}
          </p>

          <div className="flex items-center gap-3 mb-5">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-800 text-gray-400">
              <ThumbsUp className="w-4 h-4" /> 0
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-800 text-gray-400">
              <ThumbsDown className="w-4 h-4" /> 0
            </span>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5 mb-3">
              <MessageSquare className="w-4 h-4" /> Comments (0)
            </h3>
            <p className="text-xs text-gray-500 italic mb-3">No comments yet. Be the first!</p>
            <div className="flex gap-2">
              <Input
                placeholder="Write a comment..."
                disabled
                className="text-sm bg-gray-800 border-gray-700 text-gray-400"
              />
              <Button size="icon" disabled className="bg-amber-600 flex-shrink-0 opacity-50">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-800">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white"
          >
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );
}