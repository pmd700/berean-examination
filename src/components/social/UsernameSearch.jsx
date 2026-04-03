import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, BookOpen } from 'lucide-react';
import { LoadingSpinner } from '../ui/loading-screen';
import UserAvatar from './UserAvatar';

export default function UsernameSearch({ currentUserEmail, onSelectUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      setShowDropdown(trimmed.length > 0);
      return;
    }

    setSearching(true);
    setShowDropdown(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await base44.functions.invoke('searchUsers', { query: trimmed });
        const matches = response.data?.users || [];
        setResults(matches);
      } catch (e) {
        console.error('Search failed:', e);
        setResults([]);
      }
      setHasSearched(true);
      setSearching(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, currentUserEmail]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (selectedUser) => {
    onSelectUser(selectedUser);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setHasSearched(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim().length >= 2) setShowDropdown(true); }}
          placeholder="Search username..."
          className="pl-9 bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {query.trim().length < 2 ? (
            <div className="px-4 py-3 text-xs text-gray-500 text-center">
              Keep typing to search...
            </div>
          ) : searching ? (
            <div className="px-4 py-4 flex items-center justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-600 opacity-50" />
              <p className="text-sm text-gray-500 italic leading-relaxed">
                No match — the Bereans searched daily<br />and still came up empty.
              </p>
            </div>
          ) : (
            results.map(u => {
              const displayName = u.username || u.full_name || u.email?.split('@')[0];
              const isExact = displayName.toLowerCase() === query.trim().toLowerCase();

              return (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors text-left"
                >
                  <UserAvatar name={displayName} avatarUrl={u.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {displayName}
                      {isExact && (
                        <span className="ml-2 text-[10px] text-amber-400 font-bold uppercase">Exact match</span>
                      )}
                    </p>
                    {u.bio && (
                      <p className="text-[11px] text-gray-500 truncate">{u.bio}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}