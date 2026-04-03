import React from 'react';
import { Pencil } from 'lucide-react';

export default function DrawingThumbnail({ drawing, onClick }) {
  return (
    <div
      onClick={onClick}
      className="relative my-3 rounded-xl border-2 border-purple-200 dark:border-purple-800 overflow-hidden cursor-pointer group hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-lg"
    >
      <img
        src={drawing.preview_image_url}
        alt="Drawing"
        className="w-full h-auto bg-gray-50 dark:bg-gray-800"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 bg-purple-600 text-white rounded-full p-3 shadow-xl">
          <Pencil className="w-5 h-5" />
        </div>
      </div>
      <div className="absolute bottom-3 right-3 text-xs bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-gray-700 dark:text-gray-300 font-medium shadow-sm">
        Tap to edit
      </div>
    </div>
  );
}