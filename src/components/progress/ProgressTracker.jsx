import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  BookOpen, Trash2, Clock, TrendingUp, ChevronRight, Edit2, X, Download, Loader2, Upload
} from 'lucide-react';
import { formatInTz, getUserTimezone } from '../utils/timezoneUtils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { parsePreparedText } from '../utils/chapterParser';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { BIBLE_BOOKS, OLD_TESTAMENT, NEW_TESTAMENT } from '../utils/bibleData';
import { isLsvSpecialSection } from '../utils/lsvParser';
import { useInfiniteScroll } from '../ui/useInfiniteScroll';

const TOTAL_BIBLE_CHAPTERS = 1189;

// Biblical order mapping
const getBiblicalOrder = (book) => {
  const allBooks = [...OLD_TESTAMENT, ...NEW_TESTAMENT];
  return allBooks.indexOf(book);
};

export default function ProgressTracker({ chapters, onSelectChapter, onDeleteChapter, user }) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [showMassDeleteModal, setShowMassDeleteModal] = useState(false);
  const [massDeleteConfirmation, setMassDeleteConfirmation] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleMassExport = async () => {
    if (selectedIds.length === 0) return;
    setIsExporting(true);
    
    try {
      const filesToZip = [];
      for (const id of selectedIds) {
        const chapter = chapters.find(ch => ch.id === id);
        if (!chapter) continue;
        
        const annotations = await base44.entities.Annotation.filter({ study_chapter_id: chapter.id });
        
        let content = `Title: ${chapter.book} ${chapter.chapter_number}\n`;
        content += `Version: ${chapter.version}\n\n`;

        if (chapter.context) content += `[Context]\n${chapter.context}\n\n`;
        if (chapter.application) content += `[Application]\n${chapter.application}\n\n`;
        if (chapter.notes) content += `[Notes]\n${chapter.notes}\n\n`;

        content += `[Text]\n`;

        const blocks = parsePreparedText(chapter.raw_text || '');

        const annByVerse = {};
        annotations.forEach(a => {
            if (!annByVerse[a.start_verse]) annByVerse[a.start_verse] = [];
            annByVerse[a.start_verse].push(a);
        });

        blocks.forEach(block => {
            if (block.type === 'header') {
                content += `### ${block.text}\n`;
            } else if (block.type === 'verse') {
                content += `~${block.verseNumber} ${block.text}\n`;
                
                if (annByVerse[block.verseNumber]) {
                    annByVerse[block.verseNumber].forEach(ann => {
                        if (ann.selected_text) {
                            content += `  | ${ann.selected_text}\n`;
                            const commentLines = (ann.content || '').split('\n');
                            commentLines.forEach(line => {
                                content += `    ${line}\n`;
                            });
                        }
                    });
                }
            }
        });

        filesToZip.push({
          name: `${chapter.book.toLowerCase()} ${chapter.chapter_number}.md`,
          content
        });
      }

      const res = await base44.functions.invoke('massExportZip', { files: filesToZip });
      if (res.data?.zipBase64) {
        const binaryString = window.atob(res.data.zipBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `mass_export_${selectedIds.length}_chapters.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${selectedIds.length} chapters to ZIP successfully!`);
        setSelectedIds([]);
      } else {
        throw new Error(res.data?.error || "Failed to generate zip");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to mass export.");
    } finally {
      setIsExporting(false);
    }
  };

  const massImportInputRef = React.useRef(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleMassImport = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsImporting(true);

    try {
      let importedCount = 0;
      for (const file of files) {
        const text = await file.text();
        const lines = text.split('\n');
        
        const titleLine = lines.find(l => l.startsWith('Title: '));
        const versionLine = lines.find(l => l.startsWith('Version: '));
        
        if (!titleLine) continue;
        
        const titleParts = titleLine.substring(7).trim().split(' ');
        const chapterNum = parseInt(titleParts.pop());
        const bookName = titleParts.join(' ');
        const version = versionLine ? versionLine.substring(9).trim() : 'ESV';

        const sections = { Context: '', Application: '', Notes: '', Text: '' };
        let currentSection = null;
        let rawTextLines = [];
        const parsedAnnotations = [];
        let currentVerseNumber = null;
        let currentAnnotation = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            const sectionMatch = line.match(/^\[(Context|Application|Notes|Text)\]/i);
            if (sectionMatch) {
                currentSection = sectionMatch[1];
                continue;
            }

            if (currentSection === 'Context') sections.Context += line + '\n';
            else if (currentSection === 'Application') sections.Application += line + '\n';
            else if (currentSection === 'Notes') sections.Notes += line + '\n';
            else if (currentSection === 'Text') {
                if (line.startsWith('### ')) {
                    rawTextLines.push(line);
                    currentAnnotation = null;
                } else if (line.match(/^~(\d+)\s/)) {
                    currentVerseNumber = parseInt(line.match(/^~(\d+)/)[1]);
                    rawTextLines.push(line);
                    currentAnnotation = null;
                } else if (line.startsWith('  | ')) {
                    currentAnnotation = {
                        start_verse: currentVerseNumber,
                        selected_text: line.substring(4).trim(),
                        content: ''
                    };
                    parsedAnnotations.push(currentAnnotation);
                } else if (line.startsWith('    ') && currentAnnotation) {
                    currentAnnotation.content += line.substring(4) + '\n';
                } else if (line.trim() === '') {
                    if (currentAnnotation) {
                        currentAnnotation.content += '\n';
                    } else {
                        rawTextLines.push(line);
                    }
                } else {
                    rawTextLines.push(line);
                }
            }
        }

        const newRawText = rawTextLines.join('\n').trim();

        const existing = await base44.entities.StudyChapter.filter({
            book: bookName,
            chapter_number: chapterNum,
            version: version
        });

        let chapterId;
        if (existing.length > 0) {
            chapterId = existing[0].id;
            await base44.entities.StudyChapter.update(chapterId, {
                context: sections.Context.trim(),
                application: sections.Application.trim(),
                notes: sections.Notes.trim(),
                raw_text: newRawText
            });
            const oldAnns = await base44.entities.Annotation.filter({ study_chapter_id: chapterId });
            for (const ann of oldAnns) {
                await base44.entities.Annotation.delete(ann.id);
            }
        } else {
            const newChapter = await base44.entities.StudyChapter.create({
                book: bookName,
                chapter_number: chapterNum,
                version: version,
                context: sections.Context.trim(),
                application: sections.Application.trim(),
                notes: sections.Notes.trim(),
                raw_text: newRawText
            });
            chapterId = newChapter.id;
        }

        const blocks = parsePreparedText(newRawText);
        const tokenizeText = (t) => t.split(/(\s+)/);
        const allTokens = [];
        blocks.forEach(b => {
            if (b.type === 'verse') {
                const tokens = tokenizeText(b.text);
                tokens.forEach((t, i) => {
                    allTokens.push({ verse: b.verseNumber, index: i, text: t, isWhitespace: /^\s+$/.test(t) });
                });
            }
        });

        for (const ann of parsedAnnotations) {
            if (!ann.selected_text || !ann.start_verse) continue;
            const target = ann.selected_text.replace(/\s+/g, '').toLowerCase();
            let startToken = null, endToken = null;
            const startIndex = allTokens.findIndex(t => t.verse === ann.start_verse);
            if (startIndex === -1) continue;

            for (let i = startIndex; i < allTokens.length; i++) {
                let current = '';
                let j = i;
                while (j < allTokens.length && current.length < target.length) {
                    if (!allTokens[j].isWhitespace) current += allTokens[j].text.toLowerCase();
                    j++;
                }
                if (current === target) {
                    startToken = allTokens[i];
                    endToken = allTokens[j - 1];
                    break;
                }
            }

            if (startToken && endToken) {
                await base44.entities.Annotation.create({
                    study_chapter_id: chapterId,
                    start_verse: startToken.verse,
                    start_token_index: startToken.index,
                    end_verse: endToken.verse,
                    end_token_index: endToken.index,
                    selected_text: ann.selected_text,
                    content: ann.content.trim()
                });
            }
        }
        importedCount++;
      }
      toast.success(`Imported ${importedCount} chapters successfully! Refreshing...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
        console.error(e);
        toast.error("Error importing chapters");
    } finally {
        setIsImporting(false);
        if (massImportInputRef.current) massImportInputRef.current.value = '';
    }
  };

  // Filter out LSV special sections (Copyright, Preface, Introduction)
  const filteredChapters = chapters.filter(ch => !isLsvSpecialSection(ch.book));

  // Count unique book+chapter combinations
  const uniqueChapters = new Set(
    filteredChapters.map(ch => `${ch.book}-${ch.chapter_number}`)
  ).size;

  const progressPercent = Math.round((uniqueChapters / TOTAL_BIBLE_CHAPTERS) * 100);

  const sortedChapters = [...filteredChapters].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.updated_date) - new Date(a.updated_date);
    } else {
      // Biblical order
      const orderA = getBiblicalOrder(a.book);
      const orderB = getBiblicalOrder(b.book);
      if (orderA !== orderB) return orderA - orderB;
      return a.chapter_number - b.chapter_number;
    }
  });

  const handleDelete = async () => {
    if (deleteTarget) {
      await onDeleteChapter(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleMassDelete = async () => {
    if (selectedIds.length >= 4) {
      setShowMassDeleteModal(true);
    } else if (selectedIds.length > 0) {
      const confirmed = confirm(`Delete ${selectedIds.length} chapter${selectedIds.length > 1 ? 's' : ''}?`);
      if (confirmed) {
        for (const id of selectedIds) {
          const chapter = chapters.find(ch => ch.id === id);
          if (chapter) await onDeleteChapter(chapter);
        }
        setSelectedIds([]);
      }
    }
  };

  const confirmMassDelete = async () => {
    if (massDeleteConfirmation === 'yes-delete-them') {
      for (const id of selectedIds) {
        const chapter = chapters.find(ch => ch.id === id);
        if (chapter) await onDeleteChapter(chapter);
      }
      setSelectedIds([]);
      setShowMassDeleteModal(false);
      setMassDeleteConfirmation('');
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedChapters.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedChapters.map(ch => ch.id));
    }
  };

  const { displayedItems, hasMore, observerTarget } = useInfiniteScroll(
    sortedChapters,
    15
  );

  return (
    <div className="space-y-6">
      <style>{`
        .chapter-card {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .chapter-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(156, 163, 175, 0.4);
        }
        
        .dark .chapter-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(156, 163, 175, 0.5);
        }
        
        .chapter-card:active {
          transform: translateY(-1px);
          transition: transform 0.1s ease;
        }
        
        .shine-overlay {
          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 40%,
            rgba(255, 255, 255, 0.15) 50%,
            transparent 60%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shine 0.8s ease-in-out;
        }
        
        .chapter-card:hover .shine-overlay {
          animation: shine 0.8s ease-in-out;
        }
        
        @keyframes shine {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
      {/* Chapter List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Chapters
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs gap-1"
              onClick={() => massImportInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Mass Import
            </Button>
            <input 
              type="file" 
              accept=".md,.txt" 
              multiple
              ref={massImportInputRef} 
              onChange={handleMassImport} 
              className="hidden" 
            />
          </div>
          
          {sortedChapters.length > 0 && (
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 dark:bg-gray-900 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date created (newest)</SelectItem>
                <SelectItem value="biblical">Biblical order</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Selection Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                {selectedIds.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-7 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMassExport}
                disabled={isExporting}
                className="h-7 bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-700"
              >
                {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                Export
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleMassDelete}
                className="h-7"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}
        
        {sortedChapters.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No chapters studied yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Start by selecting a chapter to study
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedItems.map(chapter => (
              <div
                key={chapter.id}
                className="chapter-card relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3.5 transition-all duration-300 group overflow-hidden"
              >
                {/* Shine effect on hover */}
                <div className="shine-overlay absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
                
                {/* Global Chapter Art Background */}
                {chapter.cover_art_url && (
                  <>
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `url(${chapter.cover_art_url})`,
                        backgroundPosition: `${chapter.cover_art_x ?? 20}% ${chapter.cover_art_y ?? 50}%`,
                        backgroundSize: `${chapter.cover_art_scale ?? 100}%`,
                        backgroundRepeat: 'no-repeat',
                        opacity: (chapter.cover_art_opacity ?? 100) / 100,
                        mixBlendMode: 'soft-light',
                        zIndex: 0
                      }}
                    />
                    
                    {/* White gradient fade (light mode) - opacity reduced when cover_art_opacity > 100 */}
                    <div 
                      className="absolute inset-0 pointer-events-none dark:hidden"
                      style={{
                        backgroundImage: `linear-gradient(to left, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 60%)`,
                        opacity: chapter.cover_art_opacity > 100 ? Math.max(0, 1 - ((chapter.cover_art_opacity - 100) / 100)) : 1,
                        zIndex: 1
                      }}
                    />
                    
                    {/* Dark gradient fade (dark mode) - opacity reduced when cover_art_opacity > 100 */}
                    <div 
                      className="absolute inset-0 pointer-events-none hidden dark:block"
                      style={{
                        backgroundImage: `linear-gradient(to left, rgba(17,24,39,0) 0%, rgba(17,24,39,0.85) 60%)`,
                        opacity: chapter.cover_art_opacity > 100 ? Math.max(0, 1 - ((chapter.cover_art_opacity - 100) / 100)) : 1,
                        zIndex: 1
                      }}
                    />
                  </>
                )}
                <div className="relative z-10 flex items-center gap-3" style={{ zIndex: 10 }}>
                  <div className={`${selectedIds.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <Checkbox
                      checked={selectedIds.includes(chapter.id)}
                      onCheckedChange={() => toggleSelection(chapter.id)}
                    />
                  </div>

                  <div className="flex-1">
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                      {chapter.book} {chapter.chapter_number}
                    </h4>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                      <Clock className="w-3 h-3" />
                      <span>Last edited {formatInTz(chapter.updated_date, getUserTimezone(user))}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {chapter.annotation_count || 0} notes
                      </Badge>
                      {chapter.version && (
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          {chapter.version}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(chapter)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={() => onSelectChapter(chapter)}
                      className="text-purple-600 dark:text-purple-400"
                    >
                      Open
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <div 
                ref={observerTarget} 
                className="py-8 text-center"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  Loading more chapters...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Single Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="dark:bg-gray-900 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Delete Chapter?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              This will permanently delete {deleteTarget?.book} {deleteTarget?.chapter_number} and all its annotations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mass Delete Confirmation */}
      <AlertDialog open={showMassDeleteModal} onOpenChange={(open) => {
        if (!open) {
          setShowMassDeleteModal(false);
          setMassDeleteConfirmation('');
        }
      }}>
        <AlertDialogContent className="dark:bg-gray-900 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white text-red-600 dark:text-red-400">
              Mass Delete Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400 space-y-4">
              <p className="font-semibold text-base text-gray-900 dark:text-white">
                You are about to delete {selectedIds.length} chapters and all their annotations.
              </p>
              <p>
                This action is permanent and cannot be undone.
              </p>
              <div className="space-y-2">
                <p className="font-medium text-gray-900 dark:text-white">
                  Type <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">yes-delete-them</code> to confirm:
                </p>
                <Input
                  value={massDeleteConfirmation}
                  onChange={(e) => setMassDeleteConfirmation(e.target.value)}
                  placeholder="Type here..."
                  className="dark:bg-gray-800 dark:border-gray-700 font-mono"
                  autoFocus
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="dark:border-gray-700"
              onClick={() => {
                setShowMassDeleteModal(false);
                setMassDeleteConfirmation('');
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMassDelete}
              disabled={massDeleteConfirmation !== 'yes-delete-them'}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete {selectedIds.length} Chapters
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}