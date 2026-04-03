import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, PenLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MarkdownRenderer from '../editor/MarkdownRenderer';

export default function AnnotationsListModal({
  open,
  onOpenChange,
  annotations,
  annotationDrawings,
  onEditDrawing,
  onEditAnnotation,
  onDeleteAnnotation
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            Annotations ({annotations.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {annotations.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No annotations yet. Highlight text and press Enter to create one.
            </p>
          ) : (
            <AnimatePresence mode="popLayout">
              {annotations.map((ann) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    x: -20,
                    transition: { duration: 0.2 }
                  }}
                  layout
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      {ann.start_verse === ann.end_verse || !ann.end_verse ?
                        `v${ann.start_verse}` :
                        `v${ann.start_verse} - v${ann.end_verse}`
                      }
                      {annotationDrawings[ann.id] && (
                        <span className="ml-2 text-xs text-blue-500 dark:text-blue-400">
                          <PenLine className="w-3 h-3 inline" /> drawing
                        </span>
                      )}
                    </span>
                    <div className="flex gap-1">
                      {annotationDrawings[ann.id] && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-600 dark:text-blue-400"
                          onClick={() => onEditDrawing(ann)}
                          title="Edit Drawing"
                        >
                          <PenLine className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEditAnnotation(ann)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        onClick={() => onDeleteAnnotation(ann)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">
                    {ann.selected_text ? `"${ann.selected_text}"` :
                      ann.selected_text === undefined ? '(quote missing - field undefined)' :
                        '(quote empty)'}
                  </p>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <MarkdownRenderer content={ann.content} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}