import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function KeywordCard({ keyword, onEdit, onDelete }) {
  return (
    <div className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
            {keyword.title}
          </h3>
          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded">
            {keyword.category}
          </span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(keyword)}
            className="h-8 w-8 text-gray-500 hover:text-purple-600"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(keyword)}
            className="h-8 w-8 text-gray-500 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {keyword.explanation && (
        <div 
          className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 prose prose-sm dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: keyword.explanation }}
        />
      )}
    </div>
  );
}