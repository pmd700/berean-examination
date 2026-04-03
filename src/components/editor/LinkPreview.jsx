import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function LinkPreview({ url }) {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetadata();
  }, [url]);

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await base44.functions.invoke('fetchUrlMetadata', { url });
      setMetadata(response.data);
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
      setError('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">
          {url}
        </span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-700 transition-colors overflow-hidden bg-white dark:bg-gray-800"
    >
      <div className="flex gap-3 p-3">
        {metadata.image && (
          <img
            src={metadata.image}
            alt={metadata.title}
            className="w-20 h-20 object-cover rounded flex-shrink-0"
            onError={(e) => e.target.style.display = 'none'}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {metadata.favicon && (
              <img
                src={metadata.favicon}
                alt=""
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <h4 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">
              {metadata.title}
            </h4>
          </div>
          {metadata.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {metadata.description}
            </p>
          )}
          <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{new URL(url).hostname}</span>
          </div>
        </div>
      </div>
    </a>
  );
}