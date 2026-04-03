import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MarkdownRenderer from './MarkdownRenderer';
import { createPageUrl } from '@/utils';

export default function KeywordPreview({ keywordId, position, onClose }) {
  const [keyword, setKeyword] = useState(null);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    if (keywordId) {
      loadKeyword();
    }
  }, [keywordId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFull(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const loadKeyword = async () => {
    try {
      const kws = await base44.entities.Keyword.filter({ id: keywordId });
      if (kws && kws.length > 0) {
        setKeyword(kws[0]);
      }
    } catch (e) {
      console.error('Failed to load keyword:', e);
    }
  };

  if (!keyword) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl max-w-sm"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          pointerEvents: 'auto'
        }}
        onMouseLeave={onClose}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {keyword.title}
            </h4>
            {keyword.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                {keyword.category}
              </span>
            )}
          </div>
          
          <AnimatePresence mode="wait">
            {!showFull ? (
              <motion.div
                key="preview"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: keyword.explanation }}
              />
            ) : (
              <motion.a
                key="link"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                href={createPageUrl('Keywords')}
                className="inline-flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              >
                See full keyword
                <ExternalLink className="w-3 h-3" />
              </motion.a>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}