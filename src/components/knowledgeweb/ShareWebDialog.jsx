import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, Globe, Lock, Copy, Check } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareWebDialog({ open, web, onToggleShare, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!open || !web) return null;

  const shareUrl = web.share_id
    ? `${window.location.origin}${window.location.pathname}?view=${web.share_id}`
    : null;

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-96 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-200">Share "{web.title}"</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {web.is_shared ? (
                  <Globe className="w-4 h-4 text-green-400" />
                ) : (
                  <Lock className="w-4 h-4 text-gray-500" />
                )}
                <div>
                  <div className="text-sm text-gray-200">{web.is_shared ? 'Public (read-only)' : 'Private'}</div>
                  <div className="text-[11px] text-gray-500">
                    {web.is_shared ? 'Anyone with the link can view' : 'Only you can access'}
                  </div>
                </div>
              </div>
              <Switch checked={web.is_shared || false} onCheckedChange={(v) => onToggleShare(v)} />
            </div>

            {web.is_shared && shareUrl && (
              <div className="p-3 bg-gray-800/50 rounded-xl space-y-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Share Link</div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 outline-none"
                  />
                  <Button size="sm" onClick={handleCopy} className="h-8 w-8 p-0 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <div className="text-[10px] text-gray-600">Viewers cannot edit — read-only access.</div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}