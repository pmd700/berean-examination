import React from 'react';
import { format } from 'date-fns';
import { ChevronRight, FileText } from 'lucide-react';

export default function ChapterList({ chapters, onSelectChapter }) {
  if (!chapters?.length) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No chapters annotated yet</p>
        <p className="text-sm mt-1">Start by selecting a chapter to work on</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chapters.map(chapter => (
        <button
          key={chapter.id}
          onClick={() => onSelectChapter(chapter)}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all group relative overflow-hidden"
        >
          {/* Global Chapter Art Background */}
          {chapter.cover_art_url && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to left, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 70%), url(${chapter.cover_art_url})`,
                backgroundPosition: chapter.cover_art_position || 'right',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                opacity: chapter.cover_art_opacity || 0.12,
                mixBlendMode: chapter.cover_art_blend || 'soft-light'
              }}
            />
          )}
          
          {/* Dark mode fade overlay */}
          {chapter.cover_art_url && (
            <div 
              className="absolute inset-0 pointer-events-none dark:block hidden"
              style={{
                backgroundImage: `linear-gradient(to left, rgba(31,41,55,0) 0%, rgba(31,41,55,0.8) 70%)`,
              }}
            />
          )}

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-400 font-bold">{chapter.chapter}</span>
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {chapter.book} {chapter.chapter}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {chapter.annotation_count || 0} annotations • {format(new Date(chapter.updated_date), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors relative z-10" />
        </button>
      ))}
    </div>
  );
}