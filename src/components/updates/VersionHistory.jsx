import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, ThumbsUp, ThumbsDown, MessageSquare, 
  ChevronDown, ChevronRight, Clock, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '../ui/loading-screen';

export default function VersionHistory({ onClose }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [comments, setComments] = useState({});
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    loadAllUpdates();
  }, []);

  const loadAllUpdates = async () => {
    const all = await base44.entities.AppUpdate.filter(
      { is_published: true },
      'published_date'
    );
    setUpdates(all);
    setLoading(false);
  };

  const loadComments = async (updateId) => {
    if (comments[updateId]) return;
    const cmts = await base44.entities.UpdateComment.filter(
      { update_id: updateId },
      '-created_date',
      20
    );
    setComments(prev => ({ ...prev, [updateId]: cmts }));
  };

  const handleExpand = (updateId) => {
    if (expandedId === updateId) {
      setExpandedId(null);
    } else {
      setExpandedId(updateId);
      loadComments(updateId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[102] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-gray-950 rounded-2xl border border-amber-900/40 shadow-2xl overflow-hidden"
      >
        {/* Decorative header glow */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-900/20 to-transparent pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex-shrink-0 px-6 pt-5 pb-4 border-b border-gray-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Version History</h2>
                <p className="text-xs text-gray-400">{updates.length} updates released</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-700 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : updates.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No updates yet.</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-amber-600 via-amber-800/50 to-transparent" />

              <div className="space-y-1">
                {updates.slice(0, visibleCount).map((update, index) => {
                  const isExpanded = expandedId === update.id;
                  const isLatest = index === updates.length - 1;
                  
                  return (
                    <div key={update.id} className="relative">
                      {/* Timeline node */}
                      <div className="flex items-start gap-4">
                        <div className="relative z-10 flex-shrink-0 mt-1">
                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            isLatest 
                              ? 'bg-amber-600 border-amber-500 shadow-lg shadow-amber-600/30' 
                              : isExpanded 
                                ? 'bg-amber-900/50 border-amber-600' 
                                : 'bg-gray-900 border-gray-700 hover:border-amber-700'
                          }`}>
                            {isLatest ? (
                              <Sparkles className="w-4 h-4 text-white" />
                            ) : (
                              <span className="text-[10px] font-bold text-gray-400">
                                {update.version?.replace('v', '').substring(0, 4)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card */}
                        <div className="flex-1 pb-4">
                          <button
                            onClick={() => handleExpand(update.id)}
                            className={`w-full text-left rounded-xl border transition-all duration-200 overflow-hidden ${
                              isExpanded 
                                ? 'bg-gray-900 border-amber-700/50 shadow-lg shadow-amber-900/10' 
                                : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 hover:bg-gray-900/80'
                            }`}
                          >
                            {/* Collapsed view */}
                            <div className="px-4 py-3 flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                                    {update.version}
                                  </span>
                                  <h3 className="text-sm font-semibold text-white truncate">
                                    {update.title}
                                  </h3>
                                  {isLatest && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium">
                                      Latest
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(update.published_date || update.created_date), 'MMM d, yyyy')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3" /> {update.likes_count || 0}
                                  </span>
                                </div>
                              </div>

                              {update.screenshot_url && !isExpanded && (
                                <img 
                                  src={update.screenshot_url} 
                                  alt="" 
                                  className="w-14 h-10 rounded-md object-cover flex-shrink-0 opacity-60"
                                  style={{
                                    objectPosition: `${update.screenshot_x || 50}% ${update.screenshot_y || 50}%`
                                  }}
                                />
                              )}

                              <div className="flex-shrink-0 text-gray-500">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </div>
                            </div>
                          </button>

                          {/* Expanded detail */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                                  {/* Screenshot */}
                                  {update.screenshot_url && (
                                    <div className="relative h-48 overflow-hidden">
                                      <img
                                        src={update.screenshot_url}
                                        alt={update.title}
                                        className="w-full h-full object-cover"
                                        style={{
                                          objectPosition: `${update.screenshot_x || 50}% ${update.screenshot_y || 50}%`,
                                          transform: `scale(${(update.screenshot_scale || 100) / 100})`
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />
                                    </div>
                                  )}

                                  <div className="p-4">
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed mb-4">
                                      {update.description}
                                    </p>

                                    {/* Reactions */}
                                    <div className="flex items-center gap-3 mb-4">
                                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 text-xs">
                                        <ThumbsUp className="w-3.5 h-3.5" /> {update.likes_count || 0}
                                      </span>
                                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 text-xs">
                                        <ThumbsDown className="w-3.5 h-3.5" /> {update.dislikes_count || 0}
                                      </span>
                                    </div>

                                    {/* Comments */}
                                    <div className="border-t border-gray-800 pt-3">
                                      <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 mb-2">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Comments
                                      </h4>
                                      <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {!comments[update.id] ? (
                                          <LoadingSpinner size="sm" />
                                        ) : comments[update.id].length === 0 ? (
                                          <p className="text-xs text-gray-600 italic">No comments on this update.</p>
                                        ) : (
                                          comments[update.id].map(c => (
                                            <div key={c.id} className="bg-gray-800/50 rounded-lg px-3 py-2">
                                              <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[11px] font-semibold text-amber-400">{c.username}</span>
                                                <span className="text-[10px] text-gray-500">{format(new Date(c.created_date), 'MMM d')}</span>
                                              </div>
                                              <p className="text-xs text-gray-300">{c.text}</p>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load more */}
              {visibleCount < updates.length && (
                <div className="text-center pt-4 pl-14">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="border-gray-700 text-gray-400 hover:text-white hover:border-amber-700"
                  >
                    See more ({updates.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-gray-800 bg-gray-950/80">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:text-white hover:border-amber-700"
          >
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}