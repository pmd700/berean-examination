import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';

export default function KeywordLinker({ isOpen, onClose, keywords, onSelect }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const filteredKeywords = keywords?.filter(kw => 
    kw.title.toLowerCase().includes(search.toLowerCase()) ||
    kw.category.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
        <DialogHeader>
          <DialogTitle className="text-purple-900 dark:text-purple-100">
            Link a Keyword
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords..."
            className="pl-10 dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {filteredKeywords.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              {keywords?.length === 0 ? 'No keywords created yet' : 'No matching keywords'}
            </p>
          ) : (
            filteredKeywords.map(kw => (
              <button
                key={kw.id}
                onClick={() => onSelect(kw.id)}
                className="w-full text-left p-3 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-700"
              >
                <p className="font-medium text-gray-900 dark:text-gray-100">{kw.title}</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">{kw.category}</p>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}