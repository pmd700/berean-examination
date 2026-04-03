import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Moon, Sun, Upload, Trash2, Search, BookOpen, Image as ImageIcon, X, Clock, List
} from 'lucide-react';
import { LoadingScreen, LoadingSpinner } from '../components/ui/loading-screen';
import { createPageUrl } from '@/utils';
import { BIBLE_BOOKS, OLD_TESTAMENT, NEW_TESTAMENT } from '../components/utils/bibleData';
import { parseSmartSearch } from '../components/utils/bibleSearch';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import ArtEditorPanel from '../components/chapterart/ArtEditorPanel';
import { trackActivity } from '../components/utils/activityTracker';
import { format } from 'date-fns';

export default function ChapterArt() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [viewMode, setViewMode] = useState('recent'); // 'recent' or 'browse'
  const [selectedBook, setSelectedBook] = useState('Genesis');
  const [searchTerm, setSearchTerm] = useState('');
  const [chapterData, setChapterData] = useState([]);
  const [recentArt, setRecentArt] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [editingChapter, setEditingChapter] = useState(null);
  const [editorSettings, setEditorSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [nameInputValue, setNameInputValue] = useState('');
  const tableRef = useRef(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (viewMode === 'browse' && selectedBook) {
      loadBookChapters();
    }
  }, [selectedBook, viewMode]);

  const checkAdminAccess = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      if (!currentUser?.access_key) {
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }
      
      if (!currentUser?.is_admin) {
        window.location.href = createPageUrl('Study');
        return;
      }
      
      setUser(currentUser);
      setTheme(currentUser.theme || 'dark');
      document.documentElement.classList.toggle('dark', currentUser.theme === 'dark');
      
      // Load recent art by default
      await loadRecentArt();

      trackActivity({
        type: 'chapter_art',
        page: 'ChapterArt',
        title: 'Keep adding chapter art?',
        icon: 'chapter_art',
        admin_only: true,
      });
    } catch (e) {
      console.error('Admin access check failed:', e);
      window.location.href = createPageUrl('KeyEntry');
    }
    setLoading(false);
  };

  const loadRecentArt = async () => {
    const { data } = await base44.functions.invoke('manageChapterArt', {
      action: 'load_recent',
      limit: 50
    });
    
    const chapters = (data.chapters || []).map(ch => ({
      chapter_number: ch.chapter_number,
      book: ch.book,
      has_art: true,
      cover_art_url: ch.cover_art_url,
      cover_art_name: ch.cover_art_name || '',
      cover_art_opacity: ch.cover_art_opacity ?? 100,
      cover_art_x: ch.cover_art_x ?? 20,
      cover_art_y: ch.cover_art_y ?? 50,
      cover_art_scale: ch.cover_art_scale ?? 100,
      updated_date: ch.updated_date,
      db_record: ch
    }));
    
    setRecentArt(chapters);
  };

  const loadBookChapters = async () => {
    const chapterCount = BIBLE_BOOKS[selectedBook];
    const chapters = [];

    const { data } = await base44.functions.invoke('manageChapterArt', {
      action: 'load_book',
      book: selectedBook
    });

    const existingChapters = data.chapters || [];
    const chapterMap = {};
    existingChapters.forEach(ch => {
      chapterMap[ch.chapter_number] = ch;
    });

    for (let i = 1; i <= chapterCount; i++) {
      const existing = chapterMap[i];
      chapters.push({
        chapter_number: i,
        book: selectedBook,
        has_art: !!existing?.cover_art_url,
        cover_art_url: existing?.cover_art_url || null,
        cover_art_name: existing?.cover_art_name || '',
        cover_art_opacity: existing?.cover_art_opacity ?? 100,
        cover_art_x: existing?.cover_art_x ?? 20,
        cover_art_y: existing?.cover_art_y ?? 50,
        cover_art_scale: existing?.cover_art_scale ?? 100,
        db_record: existing || null
      });
    }

    setChapterData(chapters);
  };

  const handleUploadArt = async (book, chapterNumber, file) => {
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(`${book}-${chapterNumber}`);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const imageUrl = uploadResult.file_url;

      await base44.functions.invoke('manageChapterArt', {
        action: 'set_art',
        book,
        chapter_number: chapterNumber,
        image_url: imageUrl
      });

      if (viewMode === 'recent') {
        await loadRecentArt();
      } else {
        await loadBookChapters();
      }
      toast.success(`Cover art set for ${book} ${chapterNumber}`);
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveArt = async (book, chapterNumber) => {
    try {
      await base44.functions.invoke('manageChapterArt', {
        action: 'remove_art',
        book,
        chapter_number: chapterNumber
      });

      if (viewMode === 'recent') {
        await loadRecentArt();
      } else {
        await loadBookChapters();
      }
      toast.success(`Cover art removed from ${book} ${chapterNumber}`);
    } catch (error) {
      toast.error('Failed to remove art: ' + error.message);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    
    if (!value.trim()) return;
    
    const parsed = parseSmartSearch(value);
    
    // If we got a book, switch to browse mode
    if (parsed.book) {
      setViewMode('browse');
      setSelectedBook(parsed.book);
      
      // If we have both book and chapter, scroll to it after a brief delay
      if (parsed.chapter) {
        setTimeout(() => {
          const row = document.querySelector(`[data-chapter-id="${parsed.book}-${parsed.chapter}"]`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('bg-orange-100', 'dark:bg-orange-900/30');
            setTimeout(() => {
              row.classList.remove('bg-orange-100', 'dark:bg-orange-900/30');
            }, 2000);
          }
        }, 300);
      }
    }
  };

  const handleDragOver = (e, identifier) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(identifier);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
  };

  const handleDrop = async (e, book, chapterNumber) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }

    await handleUploadArt(book, chapterNumber, file);
  };

  const handleBulkApply = async () => {
    if (viewMode !== 'browse') {
      toast.error('Please switch to Browse by Book mode to use bulk operations');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5MB');
        return;
      }

      const confirmed = confirm(`Apply this image to ALL ${BIBLE_BOOKS[selectedBook]} chapters in ${selectedBook}?`);
      if (!confirmed) return;

      try {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        const imageUrl = uploadResult.file_url;
        const chapterCount = BIBLE_BOOKS[selectedBook];

        await base44.functions.invoke('manageChapterArt', {
          action: 'bulk_apply',
          book: selectedBook,
          chapter_number: 1,
          chapter_count: chapterCount,
          image_url: imageUrl
        });

        await loadBookChapters();
        toast.success(`Applied cover art to all ${chapterCount} chapters in ${selectedBook}`);
      } catch (error) {
        toast.error('Bulk apply failed: ' + error.message);
      }
    };
    input.click();
  };

  const handleBulkRemove = async () => {
    if (viewMode !== 'browse') {
      toast.error('Please switch to Browse by Book mode to use bulk operations');
      return;
    }

    const confirmed = confirm(`Remove cover art from ALL chapters in ${selectedBook}?`);
    if (!confirmed) return;

    try {
      await base44.functions.invoke('manageChapterArt', {
        action: 'bulk_remove',
        book: selectedBook,
        chapter_number: 0
      });

      await loadBookChapters();
      toast.success(`Removed cover art from all chapters in ${selectedBook}`);
    } catch (error) {
      toast.error('Bulk remove failed: ' + error.message);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await base44.auth.updateMe({ theme: newTheme });
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleOpenEditor = (chapter) => {
    setEditingChapter(chapter);
    setEditorSettings({
      cover_art_url: chapter.cover_art_url,
      cover_art_opacity: chapter.cover_art_opacity ?? 100,
      cover_art_x: chapter.cover_art_x ?? 20,
      cover_art_y: chapter.cover_art_y ?? 50,
      cover_art_scale: chapter.cover_art_scale ?? 100
    });
  };

  const handleSaveName = async (book, chapterNumber) => {
    try {
      await base44.functions.invoke('manageChapterArt', {
        action: 'update_name',
        book,
        chapter_number: chapterNumber,
        name: nameInputValue.trim()
      });

      if (viewMode === 'recent') {
        await loadRecentArt();
      } else {
        await loadBookChapters();
      }
      setEditingName(null);
      setNameInputValue('');
      toast.success('Art name updated');
    } catch (error) {
      toast.error('Failed to update name: ' + error.message);
    }
  };

  const handleEditorChange = (updates) => {
    setEditorSettings(prev => ({ ...prev, ...updates }));
  };

  const handleSaveEditor = async () => {
    if (!editingChapter?.db_record) {
      toast.error('Chapter not found in database');
      return;
    }

    setSaving(true);
    try {
      await base44.functions.invoke('manageChapterArt', {
        action: 'update_settings',
        book: editingChapter.book,
        chapter_number: editingChapter.chapter_number,
        settings: {
          cover_art_opacity: editorSettings.cover_art_opacity,
          cover_art_x: editorSettings.cover_art_x,
          cover_art_y: editorSettings.cover_art_y,
          cover_art_scale: editorSettings.cover_art_scale
        }
      });

      if (viewMode === 'recent') {
        await loadRecentArt();
      } else {
        await loadBookChapters();
      }
      setEditingChapter(null);
      setEditorSettings(null);
      toast.success(`Settings saved for ${editingChapter.book} ${editingChapter.chapter_number}`);
    } catch (error) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetEditor = () => {
    setEditorSettings({
      cover_art_url: editingChapter.cover_art_url,
      cover_art_opacity: 100,
      cover_art_x: 20,
      cover_art_y: 50,
      cover_art_scale: 100
    });
  };

  const handleCancelEditor = () => {
    setEditingChapter(null);
    setEditorSettings(null);
  };

  const getDisplayData = () => {
    if (viewMode === 'recent') {
      const parsed = parseSmartSearch(searchTerm);
      
      if (!searchTerm.trim()) return recentArt;
      
      // Filter by chapter number only
      if (parsed.chapter && !parsed.book) {
        return recentArt.filter(ch => ch.chapter_number === parsed.chapter);
      }
      
      // Otherwise show all (book search switches mode)
      return recentArt;
    } else {
      // Browse mode
      const parsed = parseSmartSearch(searchTerm);
      
      if (!searchTerm.trim()) return chapterData;
      
      // Filter by chapter number
      if (parsed.chapter) {
        return chapterData.filter(ch => ch.chapter_number === parsed.chapter);
      }
      
      return chapterData;
    }
  };

  const displayData = getDisplayData();

  if (loading) {
    return <LoadingScreen message="Loading Chapter Art..." />;
  }

  return (
    <div className={`premium-page min-h-screen ${theme === 'dark' ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <ImageIcon className="w-8 h-8 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chapter Art Manager</h1>
              <p className="text-gray-500 dark:text-gray-400">Global cover art for all Bible chapters</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="premium-btn-icon text-gray-900 dark:text-gray-200 dark:border-gray-700"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            <strong>Note:</strong> This changes chapter art for all users globally.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={viewMode === 'recent' ? 'default' : 'outline'}
            onClick={() => setViewMode('recent')}
            className={viewMode === 'recent' ? 'bg-orange-600 hover:bg-orange-700' : 'dark:border-gray-700'}
          >
            <Clock className="w-4 h-4 mr-2" />
            Recent Art
          </Button>
          <Button
            variant={viewMode === 'browse' ? 'default' : 'outline'}
            onClick={() => setViewMode('browse')}
            className={viewMode === 'browse' ? 'bg-orange-600 hover:bg-orange-700' : 'dark:border-gray-700'}
          >
            <List className="w-4 h-4 mr-2" />
            Browse by Book
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {viewMode === 'browse' && (
            <div className="flex-1">
              <Select value={selectedBook} onValueChange={setSelectedBook}>
                <SelectTrigger className="dark:bg-gray-900 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64 dark:bg-gray-900 dark:border-gray-800">
                  <div className="px-2 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30">
                    Old Testament
                  </div>
                  {OLD_TESTAMENT.map((book) => (
                    <SelectItem key={book} value={book} className="dark:text-gray-200">
                      {book}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 mt-2">
                    New Testament
                  </div>
                  {NEW_TESTAMENT.map((book) => (
                    <SelectItem key={book} value={book} className="dark:text-gray-200">
                      {book}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <Input
              placeholder={viewMode === 'recent' ? 'Search: "39", "Jeremiah 39", "gen 1"...' : 'Search: "39", "Jeremiah 39", "gen 1"...'}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="premium-search-input pl-10 pr-9 dark:bg-gray-900 dark:border-gray-700"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {viewMode === 'browse' && (
            <>
              <Button
                onClick={handleBulkApply}
                className="premium-btn-primary bg-gradient-to-r from-orange-600 to-amber-600 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Apply to All
              </Button>

              <Button
                onClick={handleBulkRemove}
                variant="outline"
                className="premium-btn-secondary text-red-600 dark:text-red-400 dark:border-gray-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove All
              </Button>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden" ref={tableRef}>
          <Table>
            <TableHeader>
              <TableRow className="dark:border-gray-800">
                <TableHead className="dark:text-gray-400 w-[180px]">Chapter</TableHead>
                <TableHead className="dark:text-gray-400 w-[100px]">Preview</TableHead>
                <TableHead className="dark:text-gray-400 w-[200px]">Name</TableHead>
                <TableHead className="dark:text-gray-400 w-[100px]">Status</TableHead>
                {viewMode === 'recent' && <TableHead className="dark:text-gray-400 w-[140px]">Updated</TableHead>}
                <TableHead className="dark:text-gray-400 w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.map((chapter) => {
                const identifier = `${chapter.book}-${chapter.chapter_number}`;
                return (
                  <TableRow 
                    key={identifier}
                    data-chapter-id={identifier}
                    className={`premium-table-row dark:border-gray-800 transition-all ${
                      dragOver === identifier ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, identifier)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, chapter.book, chapter.chapter_number)}
                  >
                    <TableCell className="font-semibold dark:text-gray-300 w-[180px]">
                      {chapter.book} {chapter.chapter_number}
                    </TableCell>
                    <TableCell className="w-[100px]">
                      {chapter.has_art ? (
                        <img
                          src={chapter.cover_art_url}
                          alt="Cover art"
                          className="w-16 h-16 object-cover rounded border border-gray-200 dark:border-gray-700"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="w-[200px]">
                      {chapter.has_art && editingName === identifier ? (
                        <div className="flex gap-1">
                          <Input
                            value={nameInputValue}
                            onChange={(e) => setNameInputValue(e.target.value)}
                            placeholder="Art name..."
                            className="h-8 text-sm dark:bg-gray-800 dark:border-gray-700"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveName(chapter.book, chapter.chapter_number);
                              } else if (e.key === 'Escape') {
                                setEditingName(null);
                                setNameInputValue('');
                              }
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => handleSaveName(chapter.book, chapter.chapter_number)}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                          onClick={() => {
                            if (chapter.has_art) {
                              setEditingName(identifier);
                              setNameInputValue(chapter.cover_art_name || '');
                            }
                          }}
                        >
                          {chapter.cover_art_name || (chapter.has_art ? '(click to add name)' : '-')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="w-[100px]">
                      {chapter.has_art ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          Set
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="dark:border-gray-700 dark:text-gray-400">
                          Not set
                        </Badge>
                      )}
                    </TableCell>
                    {viewMode === 'recent' && (
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400 w-[140px]">
                        {chapter.updated_date ? format(new Date(chapter.updated_date), 'MMM d, yyyy') : '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-right w-[200px]">
                      <div className="flex justify-end gap-1">
                        {chapter.has_art && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="premium-btn-icon h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => handleOpenEditor(chapter)}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="premium-btn-icon h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          disabled={uploading === identifier}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => handleUploadArt(chapter.book, chapter.chapter_number, e.target.files[0]);
                            input.click();
                          }}
                        >
                          {uploading === identifier ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                        </Button>
                        {chapter.has_art && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="premium-btn-icon h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleRemoveArt(chapter.book, chapter.chapter_number)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {displayData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={viewMode === 'recent' ? 6 : 5} className="text-center py-12 text-gray-500">
                    {viewMode === 'recent' 
                      ? 'No chapters with cover art yet. Upload some art to get started!'
                      : 'No chapters match your search'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ArtEditorPanel
        chapter={editingChapter}
        settings={editorSettings}
        onChange={handleEditorChange}
        onSave={handleSaveEditor}
        onCancel={handleCancelEditor}
        onReset={handleResetEditor}
        saving={saving}
      />

      <Toaster />

      <style>{`
        .premium-page {
          position: relative;
        }

        .premium-page::before {
          content: '';
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.15) 100%);
          pointer-events: none;
          z-index: 0;
        }

        .premium-page > * {
          position: relative;
          z-index: 1;
        }

        .premium-btn-primary,
        .premium-btn-secondary,
        .premium-btn-icon {
          position: relative;
          overflow: hidden;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-btn-primary:hover,
        .premium-btn-secondary:hover,
        .premium-btn-icon:hover {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .premium-btn-primary:active,
        .premium-btn-secondary:active,
        .premium-btn-icon:active {
          transform: translateY(0px) scale(0.99);
          transition: all 0.12s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-search-input {
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-search-input:focus {
          border-color: rgba(251, 191, 36, 0.6);
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
        }

        .premium-table-row {
          position: relative;
          transition: background-color 0.18s ease;
        }

        .premium-table-row::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, rgba(251, 191, 36, 0.8), rgba(245, 158, 11, 0.6));
          opacity: 0;
          transition: opacity 0.18s ease;
        }

        .premium-table-row:hover {
          background-color: rgba(251, 191, 36, 0.03);
        }

        .dark .premium-table-row:hover {
          background-color: rgba(251, 191, 36, 0.05);
        }

        .premium-table-row:hover::before {
          opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .premium-btn-primary,
          .premium-btn-secondary,
          .premium-btn-icon,
          .premium-table-row {
            transition: background-color 0.2s;
          }

          .premium-btn-primary:hover,
          .premium-btn-secondary:hover,
          .premium-btn-icon:hover {
            transform: none;
          }

          .premium-btn-primary:active,
          .premium-btn-secondary:active,
          .premium-btn-icon:active {
            transform: none;
            filter: brightness(0.95);
          }
        }
      `}</style>
    </div>
  );
}