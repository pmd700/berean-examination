import React, { useState, useEffect } from 'react';
import { Search, BookOpen, MessageSquare, Key, Map } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await base44.functions.invoke('globalSearch', { query });
        setResults(res.data.results || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const getIcon = (type) => {
    switch (type) {
      case 'Chapter': return <BookOpen className="w-4 h-4 text-orange-500" />;
      case 'Annotation': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'Keyword': return <Key className="w-4 h-4 text-amber-500" />;
      case 'Web Card': return <Map className="w-4 h-4 text-green-500" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden dark:bg-gray-900 border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl">
        <div className="flex items-center border-b border-gray-200 dark:border-gray-800 px-3">
          <Search className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chapters, annotations, keywords, cards... (Cmd+K)"
            className="flex-1 border-0 shadow-none focus-visible:ring-0 text-base h-14 bg-transparent dark:text-white"
            autoFocus
          />
          {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent mr-2" />}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <AnimatePresence>
            {results.length > 0 ? (
              <div className="py-2">
                {results.map((r, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={r.id + r.type}
                  >
                    <a
                      href={createPageUrl(r.url.split('?')[0]) + (r.url.includes('?') ? '?' + r.url.split('?')[1] : '')}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="mt-0.5 p-1.5 bg-gray-50 dark:bg-gray-800 rounded-md shrink-0">
                        {getIcon(r.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {r.title}
                        </div>
                        {r.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {r.description}
                          </div>
                        )}
                        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                          {r.type}
                        </div>
                      </div>
                    </a>
                  </motion.div>
                ))}
              </div>
            ) : query.length >= 2 && !loading ? (
              <div className="py-14 text-center text-sm text-gray-500 dark:text-gray-400">
                No results found for "{query}"
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}