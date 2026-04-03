import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X, ThumbsUp, ThumbsDown, Send, Calendar, MessageSquare, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import VersionHistory from './VersionHistory';

export default function UpdatePopup() {
  const [update, setUpdate] = useState(null);
  const [user, setUser] = useState(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Reaction state
  const [userReaction, setUserReaction] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [reactingTo, setReactingTo] = useState(null);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { setLoading(false); return; }

      const currentUser = await base44.auth.me();
      if (!currentUser?.access_key) { setLoading(false); return; }
      setUser(currentUser);

      const publishedUpdates = await base44.entities.AppUpdate.filter(
        { is_published: true },
        '-published_date',
        1
      );

      if (!publishedUpdates || publishedUpdates.length === 0) {
        setLoading(false);
        return;
      }

      const latestUpdate = publishedUpdates[0];

      const acks = await base44.entities.UpdateAcknowledgment.filter({
        update_id: latestUpdate.id,
        user_email: currentUser.email
      });

      if (acks && acks.length > 0) {
        setLoading(false);
        return;
      }

      setUpdate(latestUpdate);
      setLikesCount(latestUpdate.likes_count || 0);
      setDislikesCount(latestUpdate.dislikes_count || 0);

      const reactions = await base44.entities.UpdateReaction.filter({
        update_id: latestUpdate.id,
        user_email: currentUser.email
      });
      if (reactions && reactions.length > 0) {
        setUserReaction(reactions[0].reaction);
      }

      await loadComments(latestUpdate.id);
      setTimeout(() => setVisible(true), 600);
    } catch (e) {
      console.error('UpdatePopup check failed:', e);
    }
    setLoading(false);
  };

  const loadComments = async (updateId) => {
    const cmts = await base44.entities.UpdateComment.filter(
      { update_id: updateId },
      '-created_date',
      50
    );
    setComments(cmts);
  };

  const handleAcknowledge = async () => {
    if (!update || !user) return;
    await base44.entities.UpdateAcknowledgment.create({
      update_id: update.id,
      user_email: user.email
    });
    setVisible(false);
    setTimeout(() => setUpdate(null), 300);
  };

  const handleReaction = useCallback(async (type) => {
    if (!update || !user || reactingTo) return;
    setReactingTo(type);

    const existingReactions = await base44.entities.UpdateReaction.filter({
      update_id: update.id,
      user_email: user.email
    });

    let newLikes = likesCount;
    let newDislikes = dislikesCount;

    if (existingReactions.length > 0) {
      const existing = existingReactions[0];
      if (existing.reaction === type) {
        await base44.entities.UpdateReaction.delete(existing.id);
        if (type === 'like') newLikes = Math.max(0, newLikes - 1);
        else newDislikes = Math.max(0, newDislikes - 1);
        setUserReaction(null);
      } else {
        await base44.entities.UpdateReaction.update(existing.id, { reaction: type });
        if (type === 'like') { newLikes += 1; newDislikes = Math.max(0, newDislikes - 1); }
        else { newDislikes += 1; newLikes = Math.max(0, newLikes - 1); }
        setUserReaction(type);
      }
    } else {
      await base44.entities.UpdateReaction.create({
        update_id: update.id,
        user_email: user.email,
        reaction: type
      });
      if (type === 'like') newLikes += 1;
      else newDislikes += 1;
      setUserReaction(type);
    }

    await base44.entities.AppUpdate.update(update.id, {
      likes_count: newLikes,
      dislikes_count: newDislikes
    });

    setLikesCount(newLikes);
    setDislikesCount(newDislikes);
    setReactingTo(null);
  }, [update, user, reactingTo, likesCount, dislikesCount]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !update || !user || submittingComment) return;
    setSubmittingComment(true);
    await base44.entities.UpdateComment.create({
      update_id: update.id,
      username: user.username || user.full_name || user.email.split('@')[0],
      text: newComment.trim()
    });
    setNewComment('');
    await loadComments(update.id);
    setSubmittingComment(false);
  };

  if (loading || !update) return null;

  return (
    <>
      <AnimatePresence>
        {visible && !showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
              onClick={handleAcknowledge}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col pointer-events-auto overflow-hidden">
                {/* Header */}
                <div className="relative flex-shrink-0">
                  {update.screenshot_url ? (
                    <div className="relative h-48 overflow-hidden rounded-t-2xl">
                      <img
                        src={update.screenshot_url}
                        alt={update.title}
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${update.screenshot_x || 50}% ${update.screenshot_y || 50}%`,
                          transform: `scale(${(update.screenshot_scale || 100) / 100})`
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(update.published_date || update.created_date), 'MMM d, yyyy')}
                      </div>

                      <button
                        onClick={handleAcknowledge}
                        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="absolute bottom-3 left-4 right-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-xs font-bold mb-1">
                          {update.version}
                        </span>
                        <h2 className="text-xl font-bold text-white drop-shadow-lg">
                          {update.title}
                        </h2>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 pb-0 flex items-start justify-between">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-900/30 text-amber-300 text-xs font-bold mb-1">
                          {update.version}
                        </span>
                        <h2 className="text-xl font-bold text-white">
                          {update.title}
                        </h2>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(update.published_date || update.created_date), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <button
                        onClick={handleAcknowledge}
                        className="w-8 h-8 rounded-full bg-gray-800 text-gray-500 flex items-center justify-center hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed mb-4">
                    {update.description}
                  </p>

                  <div className="flex items-center gap-3 mb-5">
                    <button
                      onClick={() => handleReaction('like')}
                      disabled={!!reactingTo}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        userReaction === 'like'
                          ? 'bg-green-900/30 text-green-300 ring-2 ring-green-400/50'
                          : 'bg-gray-800 text-gray-400 hover:bg-green-900/20'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" /> {likesCount}
                    </button>
                    <button
                      onClick={() => handleReaction('dislike')}
                      disabled={!!reactingTo}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        userReaction === 'dislike'
                          ? 'bg-red-900/30 text-red-300 ring-2 ring-red-400/50'
                          : 'bg-gray-800 text-gray-400 hover:bg-red-900/20'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" /> {dislikesCount}
                    </button>
                  </div>

                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5 mb-3">
                      <MessageSquare className="w-4 h-4" /> Comments ({comments.length})
                    </h3>

                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                      {comments.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No comments yet. Be the first!</p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="bg-gray-800/50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-amber-400">{c.username}</span>
                              <span className="text-[10px] text-gray-500">{format(new Date(c.created_date), 'MMM d')}</span>
                            </div>
                            <p className="text-xs text-gray-300">{c.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitComment();
                          }
                        }}
                        placeholder="Write a comment..."
                        className="text-sm bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500"
                      />
                      <Button
                        size="icon"
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || submittingComment}
                        className="bg-amber-600 hover:bg-amber-700 flex-shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-4 py-3 border-t border-gray-800">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowHistory(true)}
                      className="flex-1 border-gray-700 text-gray-300 hover:text-white hover:border-amber-700"
                    >
                      <Clock className="w-4 h-4 mr-2" /> Version History
                    </Button>
                    <Button
                      onClick={handleAcknowledge}
                      className="flex-[2] bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
                    >
                      Got it!
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <VersionHistory onClose={() => setShowHistory(false)} />
        )}
      </AnimatePresence>
    </>
  );
}