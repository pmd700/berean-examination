import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check, BookOpen } from 'lucide-react';
import { BIBLE_BOOKS, OLD_TESTAMENT, NEW_TESTAMENT, isValidChapter } from '../utils/bibleData';

export default function ChapterSelector({ isOpen, onClose, onSubmit }) {
  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const maxChapters = book ? BIBLE_BOOKS[book] : 0;

  const handleSubmit = async () => {
    setError('');
    
    if (!book) {
      setError('Please select a book');
      return;
    }
    
    const chapterNum = parseInt(chapter);
    if (!chapter || isNaN(chapterNum)) {
      setError('Please select a chapter');
      return;
    }
    
    if (!isValidChapter(book, chapterNum)) {
      setError(`${book} only has ${BIBLE_BOOKS[book]} chapters`);
      return;
    }
    
    if (!text.trim()) {
      setError('Please paste the chapter text');
      return;
    }

    setSubmitting(true);
    await onSubmit({ book, chapter: chapterNum, text: text.trim() });
    setSubmitting(false);
    
    setBook('');
    setChapter('');
    setText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
        <DialogHeader>
          <DialogTitle className="text-purple-900 dark:text-purple-100 font-serif text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Select Bible Chapter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Book</Label>
              <Select value={book} onValueChange={(val) => { setBook(val); setChapter(''); }}>
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue placeholder="Select book..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <div className="px-2 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30">
                    Old Testament
                  </div>
                  {OLD_TESTAMENT.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 mt-2">
                    New Testament
                  </div>
                  {NEW_TESTAMENT.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">
                Chapter {book && <span className="text-gray-400">(1-{maxChapters})</span>}
              </Label>
              <Select value={chapter} onValueChange={setChapter} disabled={!book}>
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue placeholder="Select chapter..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: maxChapters }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">
              Chapter Text
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Paste the chapter text below. Format: Each verse should start with its number (e.g., "1 In the beginning..."). Headers can be on their own line.
            </p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Example format:\n\nThe Restoration of Israel\n\n1 The word that came to Jeremiah from the LORD...\n2 Thus says the LORD, the God of Israel...`}
              className="min-h-[200px] font-serif dark:bg-gray-800 dark:border-gray-700"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="dark:border-gray-600">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Check className="w-4 h-4 mr-1" />
            {submitting ? 'Loading...' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}