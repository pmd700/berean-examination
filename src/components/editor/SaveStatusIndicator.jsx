import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export default function SaveStatusIndicator({ status }) {
  // Don't show anything for neutral/null state
  if (!status) {
    return null;
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <Check className="w-3.5 h-3.5" />
        <span>Saved</span>
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (status === 'unsaved') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  return null;
}