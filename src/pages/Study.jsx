import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { getUserTimezone, formatShortDate } from '../components/utils/timezoneUtils';

import RichTextEditor from '../components/editor/RichTextEditor';
import SaveStatusIndicator from '../components/editor/SaveStatusIndicator';
import { useAutoSave } from '../components/editor/useAutoSave';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  BookOpen, LogOut, Moon, Sun, ArrowLeft, ArrowRight,
  Edit2, Trash2, MessageSquare, Pencil, FileText, Copy, PenLine, Send, Star } from
'lucide-react';
import { LoadingScreen, LoadingSpinner } from '../components/ui/loading-screen';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { BIBLE_BOOKS, OLD_TESTAMENT, NEW_TESTAMENT, isValidChapter } from '../components/utils/bibleData';
import { parsePreparedText } from '../components/utils/chapterParser';
import { parseLsvPreparedText, isLsvSpecialSection, LSV_SPECIAL_SECTIONS } from '../components/utils/lsvParser';
import ProgressTracker from '../components/progress/ProgressTracker';
import ProgressDashboard from '../components/progress/ProgressDashboard';
import { Toaster } from '@/components/ui/sonner';
import ThinkingOverlay from '@/components/ui/ThinkingOverlay';
import SelectionPopover from '../components/scripture/SelectionPopover';
import KeywordPreview from '../components/editor/KeywordPreview';
import UnsavedChangesDialog from '../components/editor/UnsavedChangesDialog';
import DrawingEditor from '../components/drawing/DrawingEditor';
import ChapterNotesPanel from '../components/notes/ChapterNotesPanel';
import Breadcrumbs from '../components/navigation/Breadcrumbs';
import StreakBadge from '../components/progress/StreakBadge';
import { trackActivity } from '../components/utils/activityTracker';
import TextSizeControl, { getScriptureTextClass, getVerseNumberClass, getHeaderClass } from '../components/scripture/TextSizeControl';
import AnnotationsListModal from '../components/study/AnnotationsListModal';
import ChapterTransfer from '../components/study/ChapterTransfer';
import ContextApplicationModals from '../components/study/ContextApplicationModals';
import InterlinearSettings from '../components/interlinear/InterlinearSettings';
import InterlinearVerse from '../components/interlinear/InterlinearVerse';
import useInterlinearChapter from '../components/interlinear/useInterlinearChapter';
import StudyToolsPanel from '../components/study/StudyToolsPanel';
import VerseBibleHubButton from '../components/study/VerseBibleHubButton';
import { getBibleHubVerseUrl } from '../components/utils/bibleHub';
import { useI18n } from '../components/utils/I18nContext';

export default function Study() {
  const { tr } = useI18n();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdminUser = !!(user?.is_admin || user?.role === 'admin');
  const [theme, setTheme] = useState('light');

  const [stage, setStage] = useState('progress');
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('ESV');
  const [favoriteVersion, setFavoriteVersion] = useState('');
  const [interlinearEnabled, setInterlinearEnabled] = useState(false);
  const [interlinearSource, setInterlinearSource] = useState('SBLGNT');
  const [isFetchingChapter, setIsFetchingChapter] = useState(false);
  const [pastedText, setPastedText] = useState('');

  const [currentChapter, setCurrentChapter] = useState(null);
  const [annotations, setAnnotations] = useState([]);

  const [userChapters, setUserChapters] = useState([]);
  const [dailyActivities, setDailyActivities] = useState([]);
  const [allAnnotations, setAllAnnotations] = useState([]);
  const [keywords, setKeywords] = useState([]);

  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const [showAnnotationPopup, setShowAnnotationPopup] = useState(false);
  const [annotationContent, setAnnotationContent] = useState('');
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [capturedSelectedText, setCapturedSelectedText] = useState('');

  const [showContextModal, setShowContextModal] = useState(false);
  const [contextContent, setContextContent] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationContent, setApplicationContent] = useState('');

  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [notesContent, setNotesContent] = useState('');

  const [showAnnotationsModal, setShowAnnotationsModal] = useState(false);
  const [showStudyTools, setShowStudyTools] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [activeVerseId, setActiveVerseId] = useState(null);

  const [showSelectionPopover, setShowSelectionPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [popoverCopied, setPopoverCopied] = useState(false);
  const [storedSelectionText, setStoredSelectionText] = useState('');
  const [storedSelectionData, setStoredSelectionData] = useState(null);

  const [keywordPreview, setKeywordPreview] = useState(null);

  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingSaveFunction, setPendingSaveFunction] = useState(null);

  const [highlights, setHighlights] = useState([]);

  const [showDrawingEditor, setShowDrawingEditor] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState(null);
  const [annotationDrawings, setAnnotationDrawings] = useState({});

  const [textSize, setTextSize] = useState(3);

  const { interlinearVerses, isLoadingInterlinear } = useInterlinearChapter(currentChapter, interlinearEnabled, interlinearSource);

  const { saveStatus: annotationSaveStatus, hasUnsavedChanges: hasUnsavedAnnotation, resetSaveState: resetAnnotationSave } = useAutoSave({
    content: annotationContent,
    initialContent: editingAnnotation?.content || '',
    onSave: async (content) => {
      if (editingAnnotation && selectionStart) {
        await base44.entities.Annotation.update(editingAnnotation.id, {
          content: content.trim()
        });
      }
    },
    delay: 5000,
    enabled: showAnnotationPopup
  });

  const { saveStatus: contextSaveStatus, hasUnsavedChanges: hasUnsavedContext, resetSaveState: resetContextSave } = useAutoSave({
    content: contextContent,
    initialContent: currentChapter?.context || '',
    onSave: async (content) => {
      if (currentChapter) {
        await base44.entities.StudyChapter.update(currentChapter.id, {
          context: content.trim()
        });
      }
    },
    delay: 5000,
    enabled: showContextModal
  });

  const { saveStatus: applicationSaveStatus, hasUnsavedChanges: hasUnsavedApplication, resetSaveState: resetApplicationSave } = useAutoSave({
    content: applicationContent,
    initialContent: currentChapter?.application || '',
    onSave: async (content) => {
      if (currentChapter) {
        await base44.entities.StudyChapter.update(currentChapter.id, {
          application: content.trim()
        });
      }
    },
    delay: 5000,
    enabled: showApplicationModal
  });

  const { saveStatus: notesSaveStatus, hasUnsavedChanges: hasUnsavedNotes, resetSaveState: resetNotesSave } = useAutoSave({
    content: notesContent,
    initialContent: currentChapter?.notes || '',
    onSave: async (content) => {
      if (currentChapter) {
        await base44.entities.StudyChapter.update(currentChapter.id, {
          notes: content.trim(),
          notes_updated_date: new Date().toISOString()
        });
        const updated = await base44.entities.StudyChapter.filter({ id: currentChapter.id });
        setCurrentChapter(updated[0]);
      }
    },
    delay: 800,
    enabled: showNotesPanel
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const handleKeywordClick = (e) => {
      const keywordLink = e.target.closest('[data-keyword-id]');
      if (keywordLink) {
        e.preventDefault();
        const keywordId = keywordLink.getAttribute('data-keyword-id');
        if (keywordId) {
          window.location.href = createPageUrl('Keywords');
        }
      }
    };

    const handleKeywordHover = (e) => {
      const keywordLink = e.target.closest('[data-keyword-id]');
      if (keywordLink) {
        const keywordId = keywordLink.getAttribute('data-keyword-id');
        const rect = keywordLink.getBoundingClientRect();
        setKeywordPreview({
          keywordId,
          position: {
            x: rect.left + rect.width / 2 - 150,
            y: rect.bottom + 10
          }
        });
      } else if (!e.target.closest('[data-keyword-preview]')) {
        setKeywordPreview(null);
      }
    };

    const handleOpenDrawing = async (e) => {
      const drawingId = e.detail?.drawingId;
      if (drawingId) {
        const drawings = await base44.entities.Drawing.filter({ id: drawingId });
        if (drawings.length > 0) {
          setCurrentDrawing(drawings[0]);
          setShowDrawingEditor(true);
        }
      }
    };

    document.addEventListener('click', handleKeywordClick);
    document.addEventListener('mouseover', handleKeywordHover);
    window.addEventListener('openDrawingEditor', handleOpenDrawing);

    return () => {
      document.removeEventListener('click', handleKeywordClick);
      document.removeEventListener('mouseover', handleKeywordHover);
      window.removeEventListener('openDrawingEditor', handleOpenDrawing);
    };
  }, []);

  useEffect(() => {
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setTimeout(() => {
        const browserSelection = window.getSelection();
        const selectionText = browserSelection?.toString().trim() || '';

        if (!selectionText || browserSelection.rangeCount === 0) {
          setShowSelectionPopover(false);
          setStoredSelectionText('');
          setStoredSelectionData(null);
          return;
        }

        const scriptureWrapper = document.querySelector('[data-scripture-root="true"]');
        if (!scriptureWrapper) {
          setShowSelectionPopover(false);
          return;
        }

        const anchorNode = browserSelection.anchorNode;
        const focusNode = browserSelection.focusNode;

        let anchorParent = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
        let focusParent = focusNode?.nodeType === Node.TEXT_NODE ? focusNode.parentElement : focusNode;

        while (anchorParent && !anchorParent.hasAttribute('data-scripture-root')) {
          if (anchorParent.classList?.contains('verse-number-badge')) {
            setShowSelectionPopover(false);
            return;
          }
          anchorParent = anchorParent.parentElement;
        }

        while (focusParent && !focusParent.hasAttribute('data-scripture-root')) {
          if (focusParent.classList?.contains('verse-number-badge')) {
            setShowSelectionPopover(false);
            return;
          }
          focusParent = focusParent.parentElement;
        }

        const isInsideScripture = scriptureWrapper.contains(anchorNode) && scriptureWrapper.contains(focusNode);
        if (!isInsideScripture) {
          setShowSelectionPopover(false);
          return;
        }

        if (showAnnotationPopup || showDrawingEditor || showAnnotationsModal || showNotesPanel) {
          setShowSelectionPopover(false);
          return;
        }

        const range = browserSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          const rects = range.getClientRects();
          if (!rects.length) {
            setShowSelectionPopover(false);
            return;
          }
        }

        const startContainer = range.startContainer;
        const endContainer = range.endContainer;

        let startSpan = startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentElement : startContainer;
        let endSpan = endContainer.nodeType === Node.TEXT_NODE ? endContainer.parentElement : endContainer;

        while (startSpan && !startSpan.hasAttribute('data-token-key')) startSpan = startSpan.parentElement;
        while (endSpan && !endSpan.hasAttribute('data-token-key')) endSpan = endSpan.parentElement;

        let selectionData = null;
        if (startSpan && endSpan) {
          const startKey = startSpan.getAttribute('data-token-key');
          const endKey = endSpan.getAttribute('data-token-key');
          const startMatch = startKey?.match(/token-(\d+)-(\d+)/);
          const endMatch = endKey?.match(/token-(\d+)-(\d+)/);

          if (startMatch && endMatch) {
            selectionData = {
              startVerse: parseInt(startMatch[1]),
              startToken: parseInt(startMatch[2]),
              endVerse: parseInt(endMatch[1]),
              endToken: parseInt(endMatch[2])
            };
          }
        }

        setStoredSelectionText(selectionText);
        setStoredSelectionData(selectionData);

        const targetRect = rect.width > 0 ? rect : range.getClientRects()[0];
        let x = targetRect.left + targetRect.width / 2 - 60;
        let y = targetRect.top - 60;

        const padding = 10;
        x = Math.max(padding, Math.min(x, window.innerWidth - 120 - padding));
        y = Math.max(padding, y);
        if (y < 70) y = targetRect.bottom + 10;

        setPopoverPosition({ x, y });
        setShowSelectionPopover(true);
        setPopoverCopied(false);
      }, 50);
    };

    const handleScroll = () => {
      setShowSelectionPopover(false);
      setStoredSelectionText('');
      setStoredSelectionData(null);
    };

    const handleClickOutside = (e) => {
      if (e.target.closest('[data-selection-popover]')) return;
      setShowSelectionPopover(false);
      setStoredSelectionText('');
      setStoredSelectionData(null);
    };

    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAnnotationPopup, showDrawingEditor, showAnnotationsModal, showNotesPanel]);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        window.location.href = createPageUrl('KeyEntry');
        return;
      }

      const currentUser = await base44.auth.me();
      if (!currentUser?.access_key) {
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }

      const keys = await base44.entities.AccessKey.filter({ key: currentUser.access_key });
      if (keys.length === 0) {
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }

      const userKey = keys[0];
      if (userKey.status === 'paused' || userKey.status === 'revoked' || userKey.status === 'deleted') {
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }

      const canUsePrivateVersions = !!(currentUser?.is_admin || currentUser?.role === 'admin');
      const allowedVersions = ['ESV', 'KJV', 'NLT', 'LSV', 'BSB', 'Paste Your Own', ...(canUsePrivateVersions ? ['NASB1995'] : [])];
      const savedFavoriteVersion = currentUser.favorite_bible_version || '';
      const nextFavoriteVersion = allowedVersions.includes(savedFavoriteVersion) ? savedFavoriteVersion : '';

      setUser(currentUser);
      setTheme(currentUser.theme || 'light');
      setTextSize(currentUser.text_size || 3);
      setFavoriteVersion(nextFavoriteVersion);
      setSelectedVersion(nextFavoriteVersion || 'ESV');
      setInterlinearEnabled(!!currentUser.interlinear_mode);
      setInterlinearSource(currentUser.interlinear_source || 'SBLGNT');
      await loadUserChapters();

      const urlParams = new URLSearchParams(window.location.search);
      const chapterId = urlParams.get('chapter_id');
      if (chapterId) {
        await loadChapterById(chapterId);
      }
    } catch (e) {
      window.location.href = createPageUrl('KeyEntry');
    }
    setLoading(false);
  };

  const loadUserChapters = async () => {
    const chapters = await base44.entities.StudyChapter.list('-updated_date');
    setUserChapters(chapters);
    const allAnns = await base44.entities.Annotation.list('-created_date');
    setAllAnnotations(allAnns);
    const activities = await base44.entities.DailyActivity.list('-date');
    setDailyActivities(activities);
    const kws = await base44.entities.Keyword.list('-created_date');
    setKeywords(kws);
  };

  const loadChapterById = async (chapterId) => {
    try {
      const chapters = await base44.entities.StudyChapter.filter({ id: chapterId });
      if (chapters && chapters.length > 0) {
        setCurrentChapter(chapters[0]);
        await loadAnnotations(chapters[0].id);
        setStage('view');
      }
    } catch (error) {
      console.error('Failed to load chapter by ID:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await base44.auth.updateMe({ theme: newTheme });
  };

  const prepareChapterText = (rawText, chapterNum) => {
    let text = rawText.replace(/\[([a-z]|[ab][a-z])\]/gi, '');
    const words = text.split(/\s+/).filter(Boolean);
    const candidates = [];
    for (let i = 0; i < words.length; i++) {
      if (/^\d{1,3}$/.test(words[i])) {
        candidates.push({ wordIndex: i, num: parseInt(words[i], 10) });
      }
    }

    let expectedNext = 1;
    const verseMarkers = [];
    for (const c of candidates) {
      let vNum = c.num;
      if (verseMarkers.length === 0 && vNum === chapterNum && vNum !== 1) vNum = 1;
      if (vNum === expectedNext) {
        verseMarkers.push({ wordIndex: c.wordIndex, num: vNum });
        expectedNext = vNum + 1;
      }
    }

    if (verseMarkers.length === 0) return rawText;

    const output = [];
    const preWords = words.slice(0, verseMarkers[0].wordIndex);
    if (preWords.length > 0) {
      const preText = preWords.join(' ').trim();
      if (preText && !/\d/.test(preText) && preText.length <= 120) output.push(`### ${preText}`);
    }

    const PUNCT_ENDS = /[<>?":}{|+_)(*&^%$#@!,.\/';\\[\]=\-\u201C\u201D\u2018\u2019\u2014\u2013]$/;

    for (let vi = 0; vi < verseMarkers.length; vi++) {
      const marker = verseMarkers[vi];
      const nextMarker = verseMarkers[vi + 1];
      const textWords = words.slice(marker.wordIndex + 1, nextMarker ? nextMarker.wordIndex : words.length);
      let verseText = textWords.join(' ').trim();

      if (verseText.length > 0 && nextMarker) {
        let lastPunctIdx = -1;
        for (let ci = verseText.length - 1; ci >= 0; ci--) {
          if (PUNCT_ENDS.test(verseText[ci])) {
            lastPunctIdx = ci;
            break;
          }
        }
        if (lastPunctIdx >= 0 && lastPunctIdx < verseText.length - 1) {
          const trailing = verseText.substring(lastPunctIdx + 1).trim();
          if (trailing.length >= 2 && /^[A-Z]/.test(trailing) && !PUNCT_ENDS.test(trailing) && /[a-zA-Z]/.test(trailing)) {
            verseText = verseText.substring(0, lastPunctIdx + 1).trim();
            output.push(`~${marker.num} ${verseText}`);
            output.push(`### ${trailing}`);
            continue;
          }
        }
      }
      output.push(`~${marker.num} ${verseText}`);
    }

    return output.join('\n').trim();
  };

  const handleContinueToFetch = async () => {
    if (!selectedBook || !selectedChapter) return;
    const chapterNum = parseInt(selectedChapter);
    if (selectedVersion !== 'Paste Your Own' && !LSV_SPECIAL_SECTIONS.includes(selectedBook) && !isValidChapter(selectedBook, chapterNum)) return;

    setIsFetchingChapter(true);
    try {
      const versionToStore = selectedVersion;
      const existingChapters = await base44.entities.StudyChapter.filter({
        book: selectedBook,
        chapter_number: chapterNum,
        version: versionToStore
      });

      let chapter;
      if (existingChapters && existingChapters.length > 0) {
        chapter = existingChapters[0];
      } else if (selectedVersion === 'LSV') {
        const response = await base44.functions.invoke('fetchLsvChapter', { book: selectedBook, chapter: chapterNum });
        if (!response.data.ok) throw new Error(`Failed to load LSV chapter: ${response.data.error}`);
        chapter = await base44.entities.StudyChapter.create({
          book: selectedBook,
          chapter_number: chapterNum,
          version: 'LSV',
          raw_text: response.data.text
        });
      } else if (selectedVersion === 'BSB') {
        const response = await base44.functions.invoke('fetchBsbChapter', { book: selectedBook, chapter: chapterNum });
        if (!response.data.ok) throw new Error(`Failed to load BSB chapter: ${response.data.error}`);
        chapter = await base44.entities.StudyChapter.create({
          book: selectedBook,
          chapter_number: chapterNum,
          version: 'BSB',
          raw_text: response.data.text
        });
      } else if (selectedVersion === 'NASB1995') {
        if (!isAdminUser) {
          throw new Error('This translation is private and admin-only');
        }
        const response = await base44.functions.invoke('fetchNasb1995Chapter', {
          book: selectedBook,
          chapter: chapterNum
        });
        if (!response.data.ok) throw new Error(`Failed to load NASB 1995 chapter: ${response.data.error}`);
        chapter = await base44.entities.StudyChapter.create({
          book: selectedBook,
          chapter_number: chapterNum,
          version: 'NASB1995',
          raw_text: response.data.text
        });
      } else if (selectedVersion === 'Paste Your Own') {
        if (!pastedText.trim()) {
          toast.error('Please paste chapter text');
          setIsFetchingChapter(false);
          return;
        }
        chapter = await base44.entities.StudyChapter.create({
          book: selectedBook,
          chapter_number: chapterNum,
          version: 'Paste Your Own',
          raw_text: pastedText.trim()
        });
      } else {
        const response = await base44.functions.invoke('fetchBibleChapter', {
          version: selectedVersion,
          book: selectedBook,
          chapter: chapterNum
        });

        if (!response.data.ok) {
          const diag = response.data;
          throw new Error(
            `Failed to load chapter (stage: ${diag.stage}): ${diag.error}\n` +
            `ESV Key Available: ${diag.envHasEsvKey}\n` + (
            diag.upstreamStatus ? `Upstream Status: ${diag.upstreamStatus}\n` : '') + (
            diag.upstreamErrorMessage ? `Upstream Error: ${diag.upstreamErrorMessage}` : '')
          );
        }

        const chapterText = response.data.text;
        if (!chapterText) throw new Error('No chapter text returned from API');

        chapter = await base44.entities.StudyChapter.create({
          book: selectedBook,
          chapter_number: chapterNum,
          version: selectedVersion,
          raw_text: chapterText
        });
      }

      setCurrentChapter(chapter);
      await loadAnnotations(chapter.id);
      await loadUserChapters();
      setStage('view');
      setPastedText('');
      trackActivity({
        type: 'study_chapter',
        page: 'Study',
        title: 'Continue studying?',
        subtitle: `${chapter.book} ${chapter.chapter_number}`,
        icon: 'study',
        url_params: `chapter_id=${chapter.id}`
      });
    } catch (error) {
      toast.error(`Failed to load chapter: ${error.message}`);
    } finally {
      setIsFetchingChapter(false);
    }
  };

  const loadAnnotations = async (chapterId) => {
    const anns = await base44.entities.Annotation.filter({ study_chapter_id: chapterId });
    setAnnotations(anns);

    const [drawingResults, hls] = await Promise.all([
      Promise.all(anns.map((ann) => base44.entities.Drawing.filter({ annotation_id: ann.id, is_deleted: false }))),
      base44.entities.TextHighlight.filter({ study_chapter_id: chapterId })
    ]);

    const drawingsMap = {};
    drawingResults.forEach((drawings, index) => {
      if (drawings.length > 0) {
        drawingsMap[anns[index].id] = drawings[0];
      }
    });

    setAnnotationDrawings(drawingsMap);
    setHighlights(hls);
  };

  const handleOpenContextModal = () => {
    setContextContent(currentChapter?.context || '');
    resetContextSave(currentChapter?.context || '');
    setShowContextModal(true);
  };

  const handleCloseContextModal = () => {
    if (hasUnsavedContext || contextSaveStatus === 'saving') {
      setPendingAction(() => () => {
        setShowContextModal(false);
        resetContextSave();
      });
      setPendingSaveFunction(() => handleSaveContext);
      setShowUnsavedWarning(true);
      return;
    }
    setShowContextModal(false);
    resetContextSave();
  };

  const handleSaveContext = async () => {
    if (currentChapter) {
      await base44.entities.StudyChapter.update(currentChapter.id, { context: contextContent.trim() });
      const updated = await base44.entities.StudyChapter.filter({ id: currentChapter.id });
      setCurrentChapter(updated[0]);
      resetContextSave(contextContent.trim());
      setShowContextModal(false);
    }
  };

  const handleOpenApplicationModal = () => {
    setApplicationContent(currentChapter?.application || '');
    resetApplicationSave(currentChapter?.application || '');
    setShowApplicationModal(true);
  };

  const handleCloseApplicationModal = () => {
    if (hasUnsavedApplication || applicationSaveStatus === 'saving') {
      setPendingAction(() => () => {
        setShowApplicationModal(false);
        resetApplicationSave();
      });
      setPendingSaveFunction(() => handleSaveApplication);
      setShowUnsavedWarning(true);
      return;
    }
    setShowApplicationModal(false);
    resetApplicationSave();
  };

  const handleSaveApplication = async () => {
    if (currentChapter) {
      await base44.entities.StudyChapter.update(currentChapter.id, { application: applicationContent.trim() });
      const updated = await base44.entities.StudyChapter.filter({ id: currentChapter.id });
      setCurrentChapter(updated[0]);
      resetApplicationSave(applicationContent.trim());
      setShowApplicationModal(false);
    }
  };

  const handleOpenNotesPanel = () => {
    setNotesContent(currentChapter?.notes || '');
    resetNotesSave(currentChapter?.notes || '');
    setShowNotesPanel(true);
  };

  const handleCloseNotesPanel = () => {
    setShowNotesPanel(false);
    resetNotesSave();
  };

  const parseChapter = (rawText, version) => {
    if (version === 'LSV') return parseLsvPreparedText(rawText);
    return parsePreparedText(rawText);
  };

  const tokenizeText = (text) => text.split(/(\s+)/);

  const handleOpenAnnotationPopup = () => {
    if (!selectionStart) return;
    const endPoint = selectionEnd || selectionStart;
    const blocks = parseChapter(currentChapter.raw_text);

    let selectedText = '';
    let capturing = false;
    for (let block of blocks) {
      if (block.type !== 'verse') continue;
      const tokens = tokenizeText(block.text);
      for (let i = 0; i < tokens.length; i++) {
        const isStart = block.verseNumber === selectionStart.verse && i === selectionStart.tokenIndex;
        const isEnd = block.verseNumber === endPoint.verse && i === endPoint.tokenIndex;
        if (isStart) capturing = true;
        if (capturing) selectedText += tokens[i];
        if (isEnd) break;
      }
      if (capturing && block.verseNumber === endPoint.verse) break;
    }

    const trimmedText = selectedText.trim();
    setCapturedSelectedText(trimmedText);
    const initialContent = editingAnnotation ? editingAnnotation.content : '';
    setAnnotationContent(initialContent);
    resetAnnotationSave(initialContent);
    setShowAnnotationPopup(true);
    setShowSelectionPopover(false);
  };

  const handlePopoverAddAnnotation = () => {
    if (!storedSelectionText || !storedSelectionData) return;
    setShowSelectionPopover(false);
    setStoredSelectionText('');
    setStoredSelectionData(null);

    setSelectionStart({ verse: storedSelectionData.startVerse, tokenIndex: storedSelectionData.startToken });
    setSelectionEnd({ verse: storedSelectionData.endVerse, tokenIndex: storedSelectionData.endToken });
    setCapturedSelectedText(storedSelectionText);
    setAnnotationContent('');
    setEditingAnnotation(null);
    resetAnnotationSave('');
    setShowAnnotationPopup(true);
  };

  const handlePopoverCopy = async () => {
    if (!storedSelectionText) return;
    try {
      await navigator.clipboard.writeText(storedSelectionText);
      setPopoverCopied(true);
      setTimeout(() => {
        setShowSelectionPopover(false);
        setPopoverCopied(false);
        setStoredSelectionText('');
        setStoredSelectionData(null);
      }, 800);
    } catch (err) {
      console.error('Failed to copy:', err);
      setShowSelectionPopover(false);
      setStoredSelectionText('');
      setStoredSelectionData(null);
    }
  };

  const handleCloseAnnotationPopup = () => {
    if (hasUnsavedAnnotation || annotationSaveStatus === 'saving') {
      setPendingAction(() => () => {
        setShowAnnotationPopup(false);
        setAnnotationContent('');
        setEditingAnnotation(null);
        setCapturedSelectedText('');
        resetAnnotationSave();
      });
      setPendingSaveFunction(() => handleSaveAnnotation);
      setShowUnsavedWarning(true);
      return;
    }
    setShowAnnotationPopup(false);
    setAnnotationContent('');
    setEditingAnnotation(null);
    setCapturedSelectedText('');
    resetAnnotationSave();
  };

  const handleSaveAnnotation = async () => {
    if (!editingAnnotation && !annotationContent.trim()) {
      toast.error('Must type at least 1 character');
      return;
    }
    if (!annotationContent.trim() && !editingAnnotation) return;

    const endPoint = selectionEnd || selectionStart;
    const payload = {
      study_chapter_id: currentChapter.id,
      start_verse: selectionStart.verse,
      start_token_index: selectionStart.tokenIndex,
      end_verse: endPoint.verse,
      end_token_index: endPoint.tokenIndex,
      selected_text: capturedSelectedText,
      content: annotationContent.trim()
    };

    if (editingAnnotation) {
      try {
        await base44.entities.Annotation.update(editingAnnotation.id, { content: annotationContent.trim() });
      } catch (error) {
        if (error.message?.includes('not found')) {
          await base44.entities.Annotation.create(payload);
        } else {
          throw error;
        }
      }
    } else {
      await base44.entities.Annotation.create(payload);
    }

    await loadAnnotations(currentChapter.id);
    const annotationCount = await base44.entities.Annotation.filter({ study_chapter_id: currentChapter.id });
    await base44.entities.StudyChapter.update(currentChapter.id, { annotation_count: annotationCount.length });
    await loadUserChapters();
    resetAnnotationSave();
    setShowAnnotationPopup(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setEditingAnnotation(null);
    setCapturedSelectedText('');
    setAnnotationContent('');
  };

  const getHighlightForToken = (verse, tokenIndex) => {
    for (const hl of highlights) {
      const afterStart = verse > hl.start_verse || verse === hl.start_verse && tokenIndex >= hl.start_token_index;
      const beforeEnd = verse < hl.end_verse || verse === hl.end_verse && tokenIndex <= hl.end_token_index;
      if (afterStart && beforeEnd) return hl;
    }
    return null;
  };

  const handleHighlightText = async (color) => {
    if (!storedSelectionData || !currentChapter) return;
    const { startVerse, startToken, endVerse, endToken } = storedSelectionData;
    const overlapping = highlights.filter((hl) => {
      const hlStart = hl.start_verse * 100000 + hl.start_token_index;
      const hlEnd = hl.end_verse * 100000 + hl.end_token_index;
      const selStart = startVerse * 100000 + startToken;
      const selEnd = endVerse * 100000 + endToken;
      return hlStart <= selEnd && hlEnd >= selStart;
    });

    for (const hl of overlapping) await base44.entities.TextHighlight.delete(hl.id);

    await base44.entities.TextHighlight.create({
      study_chapter_id: currentChapter.id,
      start_verse: startVerse,
      start_token_index: startToken,
      end_verse: endVerse,
      end_token_index: endToken,
      color: color
    });

    const hls = await base44.entities.TextHighlight.filter({ study_chapter_id: currentChapter.id });
    setHighlights(hls);
    setShowSelectionPopover(false);
    setStoredSelectionText('');
    setStoredSelectionData(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleRemoveHighlight = async () => {
    if (!storedSelectionData || !currentChapter) return;
    const { startVerse, startToken, endVerse, endToken } = storedSelectionData;
    const overlapping = highlights.filter((hl) => {
      const hlStart = hl.start_verse * 100000 + hl.start_token_index;
      const hlEnd = hl.end_verse * 100000 + hl.end_token_index;
      const selStart = startVerse * 100000 + startToken;
      const selEnd = endVerse * 100000 + endToken;
      return hlStart <= selEnd && hlEnd >= selStart;
    });

    for (const hl of overlapping) await base44.entities.TextHighlight.delete(hl.id);
    const hls = await base44.entities.TextHighlight.filter({ study_chapter_id: currentChapter.id });
    setHighlights(hls);
    setShowSelectionPopover(false);
    setStoredSelectionText('');
    setStoredSelectionData(null);
    window.getSelection()?.removeAllRanges();
  };

  const selectionHasHighlight = () => {
    if (!storedSelectionData) return false;
    const { startVerse, startToken, endVerse, endToken } = storedSelectionData;
    return highlights.some((hl) => {
      const hlStart = hl.start_verse * 100000 + hl.start_token_index;
      const hlEnd = hl.end_verse * 100000 + hl.end_token_index;
      const selStart = startVerse * 100000 + startToken;
      const selEnd = endVerse * 100000 + endToken;
      return hlStart <= selEnd && hlEnd >= selStart;
    });
  };

  const isTokenAnnotated = (verse, tokenIndex) => {
    return annotations.some((ann) => {
      const startMatch = ann.start_verse === verse && ann.start_token_index <= tokenIndex;
      const endMatch = ann.end_verse === verse && ann.end_token_index >= tokenIndex;
      const inRange = ann.start_verse < verse && verse < ann.end_verse;
      return startMatch && endMatch || inRange;
    });
  };

  const getAnnotationForToken = (verse, tokenIndex) => {
    return annotations.find((ann) => ann.start_verse === verse && ann.start_token_index === tokenIndex);
  };

  const handleDeleteAnnotation = async (ann) => {
    if (annotationDrawings[ann.id]) {
      await base44.entities.Drawing.update(annotationDrawings[ann.id].id, { is_deleted: true });
    }
    await base44.entities.Annotation.delete(ann.id);
    await loadAnnotations(currentChapter.id);
    const annotationCount = await base44.entities.Annotation.filter({ study_chapter_id: currentChapter.id });
    await base44.entities.StudyChapter.update(currentChapter.id, { annotation_count: annotationCount.length });
    await loadUserChapters();
    const verseText = ann.selected_text || '(no text)';
    const truncatedText = verseText.length > 50 ? verseText.substring(0, 47) + '...' : verseText;
    toast.success(`Annotation on v${ann.start_verse} deleted`, { description: `"${truncatedText}"` });
  };

  const handleSelectChapter = async (chapter) => {
    setCurrentChapter(chapter);
    await loadAnnotations(chapter.id);
    setStage('view');
    trackActivity({
      type: 'study_chapter',
      page: 'Study',
      title: 'Continue studying?',
      subtitle: `${chapter.book} ${chapter.chapter_number}`,
      icon: 'study',
      url_params: `chapter_id=${chapter.id}`
    });
  };

  const handleDeleteChapter = async (chapter) => {
    const chapterAnnotations = await base44.entities.Annotation.filter({ study_chapter_id: chapter.id });
    for (const ann of chapterAnnotations) await base44.entities.Annotation.delete(ann.id);
    await base44.entities.StudyChapter.delete(chapter.id);
    await loadUserChapters();
    if (currentChapter?.id === chapter.id) {
      setCurrentChapter(null);
      setStage('progress');
    }
  };

  const handleTextSizeChange = async (size) => {
    setTextSize(size);
    await base44.auth.updateMe({ text_size: size });
  };

  const handleToggleInterlinear = async () => {
    const nextValue = !interlinearEnabled;
    setInterlinearEnabled(nextValue);
    await base44.auth.updateMe({ interlinear_mode: nextValue });
  };

  const handleInterlinearSourceChange = async (value) => {
    setInterlinearSource(value);
    await base44.auth.updateMe({ interlinear_source: value });
  };

  const handleNewChapter = () => {
    setCurrentChapter(null);
    setSelectedBook('');
    setSelectedChapter('');
    setSelectedVersion(favoriteVersion || 'ESV');
    setStage('select');
    trackActivity({
      type: 'study_dashboard',
      page: 'Study',
      title: 'Continue studying?',
      icon: 'study'
    });
  };

  const versionOptions = [
  { value: 'ESV', label: 'ESV - English Standard Version' },
  { value: 'KJV', label: 'KJV - King James Version' },
  { value: 'NLT', label: 'NLT - New Living Translation' },
  { value: 'LSV', label: 'LSV - Literal Standard Version' },
  { value: 'BSB', label: 'BSB - Berean Standard Bible' },
  ...(isAdminUser ? [{ value: 'NASB1995', label: '🔒 NASB 1995 — Private' }] : []),
  { value: 'Paste Your Own', label: 'Paste Your Own' }];


  const orderedVersionOptions = favoriteVersion ?
  [
  ...versionOptions.filter((option) => option.value === favoriteVersion),
  ...versionOptions.filter((option) => option.value !== favoriteVersion)] :

  versionOptions;

  const toggleFavoriteVersion = async () => {
    const nextFavorite = favoriteVersion === selectedVersion ? '' : selectedVersion;
    setFavoriteVersion(nextFavorite);
    await base44.auth.updateMe({ favorite_bible_version: nextFavorite || null });
    toast.success(nextFavorite ? `${selectedVersion} ${tr('saved as favorite')}` : tr('Favorite Bible version cleared'));
  };

  const handleEditChapterText = () => {
    setSelectedBook(currentChapter.book);
    setSelectedChapter(String(currentChapter.chapter_number));
    setSelectedVersion('Paste Your Own');
    setPastedText(currentChapter.raw_text || '');
    setStage('select');
  };

  if (loading) {
    return <LoadingScreen message="Loading your study..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
              <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-gray-900 text-lg font-bold opacity-100 dark:text-white">Berean Examination</h1>
          </div>

          <div className="flex items-center gap-2">
            <StreakBadge chapters={userChapters} annotations={allAnnotations} keywords={keywords} user={user} />
            <button
              onClick={() => window.location.href = createPageUrl('AccountCenter')}
              className="w-9 h-9 rounded-full hover:ring-2 hover:ring-amber-500 transition-all overflow-hidden">
              
              {user?.avatar_url ?
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> :

              <div className="w-full h-full bg-gradient-to-br from-amber-700 to-orange-700 flex items-center justify-center text-amber-50 text-sm font-bold">
                  {(user?.full_name || user?.username || user?.email || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              }
            </button>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => base44.auth.logout(createPageUrl('KeyEntry'))} className="text-gray-500">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {stage === 'progress' &&
        <>
            <Breadcrumbs items={[{ label: 'Study', href: createPageUrl('Study') }]} />
          </>
        }

        {stage === 'progress' &&
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-900 text-2xl font-bold capitalize opacity-100 dark:text-white">{tr('My Study Dashboard')}</h2>
            </div>

            <ProgressDashboard
            chapters={userChapters}
            annotations={allAnnotations}
            dailyActivities={dailyActivities}
            user={user}
            onNewChapter={handleNewChapter}
            keywords={keywords} />
          

            <div className="mt-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{tr('Chapter History')}</h3>
              <ProgressTracker
              chapters={userChapters}
              onSelectChapter={handleSelectChapter}
              onDeleteChapter={handleDeleteChapter}
              user={user} />
            
            </div>
          </div>
        }

        {stage === 'select' &&
        <>
            <Breadcrumbs items={[
          { label: 'Study', href: createPageUrl('Study') },
          { label: 'Select Chapter' }]
          } />
          </>
        }

        {stage === 'select' &&
        <div className="max-w-xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" onClick={() => setStage('progress')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            <h2 className="text-gray-900 mb-6 text-2xl font-bold dark:text-white">{tr('Select Chapter')}</h2>

            <div className="space-y-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div>
                <div className="flex items-center justify-between mb-2 gap-3">
                  <Label className="text-gray-700 dark:text-gray-300">{tr('Bible Version')}</Label>
                  <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleFavoriteVersion}
                  className="h-8 px-2 text-xs text-gray-500 dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-400">
                  
                    <Star className={`w-4 h-4 mr-1 ${favoriteVersion === selectedVersion ? 'fill-amber-400 text-amber-400' : ''}`} />
                    {favoriteVersion === selectedVersion ? tr('Favorited') : tr('Favorite')}
                  </Button>
                </div>
                <Select value={selectedVersion} onValueChange={(val) => {
                setSelectedVersion(val);
                setPastedText('');
              }}>
                  <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectValue placeholder="Select version..." />
                  </SelectTrigger>
                  <SelectContent>
                    {orderedVersionOptions.map((option) =>
                  <SelectItem key={option.value} value={option.value}>
                        {option.value === favoriteVersion ? `★ ${option.label}` : option.label}
                      </SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300 mb-2">{tr('Book')}</Label>
                <Select value={selectedBook} onValueChange={(val) => {
                setSelectedBook(val);
                if (LSV_SPECIAL_SECTIONS.includes(val)) setSelectedChapter('0');else
                setSelectedChapter('');
              }}>
                  <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectValue placeholder="Select book..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {selectedVersion === 'LSV' &&
                  <>
                        <div className="px-2 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30">LSV Special Sections</div>
                        {LSV_SPECIAL_SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </>
                  }
                    <div className="px-2 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30">Old Testament</div>
                    {OLD_TESTAMENT.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    <div className="px-2 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 mt-2">New Testament</div>
                    {NEW_TESTAMENT.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {!LSV_SPECIAL_SECTIONS.includes(selectedBook) &&
            <div>
                  <Label className="text-gray-700 dark:text-gray-300 mb-2">
                    {tr('Chapter')} {selectedBook && selectedVersion !== 'Paste Your Own' && <span className="text-gray-400">(1-{BIBLE_BOOKS[selectedBook]})</span>}
                  </Label>
                  {selectedVersion === 'Paste Your Own' ?
              <Input
                type="number"
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                placeholder="Enter chapter number..."
                disabled={!selectedBook}
                className="dark:bg-gray-800 dark:border-gray-700" /> :


              <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedBook}>
                      <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                        <SelectValue placeholder="Select chapter..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {Array.from({ length: BIBLE_BOOKS[selectedBook] || 0 }, (_, i) => i + 1).map((num) => <SelectItem key={num} value={String(num)}>{num}</SelectItem>)}
                      </SelectContent>
                    </Select>
              }
                </div>
            }

              {selectedVersion === 'Paste Your Own' &&
            <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-gray-700 dark:text-gray-300">
                      Paste Chapter Text
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Use ### for headers, ~1 for verse 1, etc.)</span>
                    </Label>
                    <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!pastedText.trim()) {
                      toast.error('Paste some text first');
                      return;
                    }
                    const chapterNum = parseInt(selectedChapter);
                    const prepared = prepareChapterText(pastedText, chapterNum);
                    setPastedText(prepared);
                    toast.success('Text prepared with verse markers');
                  }}
                  className="text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                  
                      Prepare Text
                    </Button>
                    <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!pastedText.trim()) {
                      toast.error('Nothing to copy');
                      return;
                    }
                    navigator.clipboard.writeText(pastedText);
                    toast.success('Copied to clipboard');
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="### Header&#10;~1 In the beginning...&#10;~2 And the earth..."
                className="w-full h-40 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm" />
              
                </div>
            }

              <Button
              onClick={handleContinueToFetch}
              disabled={
              !selectedBook ||
              !selectedChapter && !LSV_SPECIAL_SECTIONS.includes(selectedBook) ||
              selectedVersion === 'Paste Your Own' && !pastedText.trim() ||
              isFetchingChapter
              }
              className="w-full bg-orange-600 hover:bg-orange-700">
              
                {isFetchingChapter ?
              <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Loading Chapter...
                  </> :

              <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
              }
              </Button>
            </div>
          </div>
        }

        {stage === 'view' && currentChapter &&
        <>
            <Breadcrumbs items={[
          { label: 'Study', href: createPageUrl('Study') },
          { label: `${currentChapter.book} ${currentChapter.chapter_number}` }]
          } />
          </>
        }

        {stage === 'view' && currentChapter &&
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-1">
                <Button variant="ghost" onClick={() => setStage('progress')} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Progress
                </Button>
                <Button variant="ghost" onClick={handleNewChapter} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Study Another Chapter
                </Button>
              </div>
              <Button variant="outline" onClick={() => setShowAnnotationsModal(true)} className="dark:border-gray-700">
                <MessageSquare className="w-4 h-4 mr-2" />
                Annotations ({annotations.length})
              </Button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
              <div className="mb-5">
                <h2 className="text-gray-900 text-3xl font-bold dark:text-white">
                  {currentChapter.book} {!isLsvSpecialSection(currentChapter.book) && currentChapter.chapter_number}
                  {currentChapter.version &&
                <span className="ml-3 text-base font-medium text-gray-400 dark:text-gray-500">
                      {currentChapter.version}
                    </span>
                }
                </h2>
              </div>

              {(!currentChapter.raw_text || currentChapter.raw_text.length === 0) &&
            <div className="mb-6 p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Pencil className="w-6 h-6 text-amber-700 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-amber-900 dark:text-amber-200 font-semibold mb-1">No chapter text found</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">This chapter was created but has no text. Add the chapter text to begin studying.</p>
                      <Button onClick={() => {
                    setSelectedBook(currentChapter.book);
                    setSelectedChapter(String(currentChapter.chapter_number));
                    setSelectedVersion('Paste Your Own');
                    setStage('select');
                  }} className="bg-amber-600 hover:bg-amber-700">
                        <Pencil className="w-4 h-4 mr-2" />
                        Add Chapter Text
                      </Button>
                    </div>
                  </div>
                </div>
            }

              {currentChapter.version === 'LSV' && isLsvSpecialSection(currentChapter.book) &&
            <div className="mb-4 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300 italic">
                  This is a read-only section from the Literal Standard Version.
                </div>
            }

              <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <InterlinearSettings
                enabled={interlinearEnabled}
                sourceText={interlinearSource}
                onToggle={handleToggleInterlinear}
                onSourceChange={handleInterlinearSourceChange}
                isAvailable={NEW_TESTAMENT.includes(currentChapter.book)}
                isLoading={isLoadingInterlinear} />
              
                <div className="shrink-0 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Display</p>
                  <TextSizeControl value={textSize} onChange={handleTextSizeChange} />
                </div>
              </div>

              {!(currentChapter.version === 'LSV' && isLsvSpecialSection(currentChapter.book)) &&
            <div className="mb-6 space-y-3">
                  <Button variant="outline" onClick={() => setShowStudyTools(!showStudyTools)} className="dark:border-gray-700">
                    <FileText className="w-4 h-4 mr-2" />
                    {showStudyTools ? 'Hide Study Tools' : 'Study Tools'}
                  </Button>
                  {showStudyTools &&
              <StudyToolsPanel
                currentChapter={currentChapter}
                annotations={annotations}
                hasContext={!!currentChapter.context}
                hasNotes={!!currentChapter.notes}
                hasApplication={!!currentChapter.application}
                onOpenContextModal={handleOpenContextModal}
                onOpenNotesPanel={handleOpenNotesPanel}
                onOpenApplicationModal={handleOpenApplicationModal}
                onEditChapterText={handleEditChapterText}
                onImportComplete={() => {
                  loadAnnotations(currentChapter.id);
                  base44.entities.StudyChapter.filter({ id: currentChapter.id }).then((c) => c.length && setCurrentChapter(c[0]));
                }} />

              }
                </div>
            }

              <div data-scripture-root="true" className="opacity-100">
                {parseChapter(currentChapter.raw_text, currentChapter.version).map((block, blockIdx) =>
              <div key={blockIdx} className="mb-6">
                    {block.type === 'header' ?
                <h3 className={`${getHeaderClass(textSize)} font-semibold text-gray-700 dark:text-gray-300 mb-4`}>
                        {block.text}
                      </h3> :

                <>
                        <div className="group flex gap-3">
                          <div className="pt-0.5">
                            <VerseBibleHubButton
                              verseNumber={block.verseNumber}
                              href={getBibleHubVerseUrl(currentChapter.book, currentChapter.chapter_number, block.verseNumber)}
                              className={`verse-number-badge min-w-[2.5rem] h-7 px-2 rounded-md bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 ${getVerseNumberClass(textSize)} font-bold`}
                            />
                          </div>
                          <div className={`flex-1 font-serif text-gray-800 dark:text-gray-200 ${getScriptureTextClass(textSize)} relative verse-content-container`} data-verse-id={block.verseNumber}>
                            {(() => {
                        const tokens = tokenizeText(block.text);
                        return tokens.map((token, tokenIdx) => {
                          const isAnnotated = isTokenAnnotated(block.verseNumber, tokenIdx);
                          const annotation = getAnnotationForToken(block.verseNumber, tokenIdx);

                          if (/^\s+$/.test(token)) {
                            const wsHighlight = getHighlightForToken(block.verseNumber, tokenIdx);
                            const wsAnnotated = isTokenAnnotated(block.verseNumber, tokenIdx);
                            return (
                              <span
                                key={tokenIdx}
                                className={wsAnnotated ? 'border-b-2 border-orange-400 dark:border-orange-600' : ''}
                                style={wsHighlight ? {
                                  backgroundColor: wsHighlight.color + '50',
                                  boxDecorationBreak: 'clone'
                                } : undefined}>
                                {token}</span>);

                          }

                          if (!token) return null;
                          const hasDrawing = annotation && annotationDrawings[annotation.id];
                          const highlight = getHighlightForToken(block.verseNumber, tokenIdx);

                          return (
                            <span key={tokenIdx} className="relative inline">
                                    {annotation &&
                              <span
                                className="absolute -left-2 top-0.5 cursor-pointer text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 z-10"
                                onClick={() => {
                                  if (hasDrawing) {
                                    setEditingAnnotation(annotation);
                                    setCurrentDrawing(annotationDrawings[annotation.id]);
                                    setShowDrawingEditor(true);
                                  } else {
                                    setEditingAnnotation(annotation);
                                    setAnnotationContent(annotation.content);
                                    setSelectionStart({ verse: annotation.start_verse, tokenIndex: annotation.start_token_index });
                                    setSelectionEnd({ verse: annotation.end_verse, tokenIndex: annotation.end_token_index });
                                    setCapturedSelectedText(annotation.selected_text);
                                    resetAnnotationSave(annotation.content);
                                    setShowAnnotationPopup(true);
                                  }
                                }}>
                                
                                        {hasDrawing ? <PenLine className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                                      </span>
                              }
                                    <span
                                data-token-key={`token-${block.verseNumber}-${tokenIdx}`}
                                className={isAnnotated ? 'border-b-2 border-orange-400 dark:border-orange-600' : ''}
                                style={highlight ? {
                                  backgroundColor: highlight.color + '50',
                                  boxDecorationBreak: 'clone',
                                  WebkitBoxDecorationBreak: 'clone'
                                } : undefined}>
                                
                                      {token}
                                    </span>
                                  </span>);

                        });
                      })()}
                          </div>
                        </div>
                        {interlinearEnabled &&
                  <InterlinearVerse greekText={interlinearVerses[block.verseNumber]} />
                  }
                      </>
                }
                  </div>
              )}
              </div>
            </div>
          </div>
        }
      </main>

      <Dialog open={showAnnotationPopup} onOpenChange={(open) => {
        if (!open) handleCloseAnnotationPopup();else
        setShowAnnotationPopup(true);
      }}>
        <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="dark:text-white">{editingAnnotation ? 'Edit Annotation' : 'Add Annotation'}</DialogTitle>
              <SaveStatusIndicator status={annotationSaveStatus} />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 py-4">
            <RichTextEditor
              key={editingAnnotation?.id || 'new'}
              content={annotationContent}
              onChange={setAnnotationContent}
              placeholder="Write your commentary..." />
            
          </div>

          <DialogFooter className="flex-shrink-0">
            {editingAnnotation &&
            <Button
              variant="outline"
              onClick={async () => {
                await handleDeleteAnnotation(editingAnnotation);
                handleCloseAnnotationPopup();
              }}
              className="mr-auto border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
              
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            }
            <Button onClick={handleSaveAnnotation} className="bg-orange-600 hover:bg-orange-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnnotationsListModal
        open={showAnnotationsModal}
        onOpenChange={setShowAnnotationsModal}
        annotations={annotations}
        annotationDrawings={annotationDrawings}
        onEditDrawing={(ann) => {
          setEditingAnnotation(ann);
          setCurrentDrawing(annotationDrawings[ann.id]);
          setShowAnnotationsModal(false);
          setShowDrawingEditor(true);
        }}
        onEditAnnotation={(ann) => {
          setEditingAnnotation(ann);
          setAnnotationContent(ann.content);
          setSelectionStart({ verse: ann.start_verse, tokenIndex: ann.start_token_index });
          setSelectionEnd({ verse: ann.end_verse, tokenIndex: ann.end_token_index });
          setCapturedSelectedText(ann.selected_text);
          resetAnnotationSave(ann.content);
          setShowAnnotationsModal(false);
          setShowAnnotationPopup(true);
        }}
        onDeleteAnnotation={handleDeleteAnnotation} />
      

      <SelectionPopover
        visible={showSelectionPopover && stage === 'view'}
        position={popoverPosition}
        onAddAnnotation={handlePopoverAddAnnotation}
        onCopy={handlePopoverCopy}
        onHighlight={handleHighlightText}
        onRemoveHighlight={handleRemoveHighlight}
        hasExistingHighlight={selectionHasHighlight()}
        onCreateDrawing={async () => {
          if (!storedSelectionText || !storedSelectionData) return;
          const selectionText = storedSelectionText;
          const selectionData = storedSelectionData;
          setShowSelectionPopover(false);
          setStoredSelectionText('');
          setStoredSelectionData(null);

          setSelectionStart({ verse: selectionData.startVerse, tokenIndex: selectionData.startToken });
          setSelectionEnd({ verse: selectionData.endVerse, tokenIndex: selectionData.endToken });
          setCapturedSelectedText(selectionText);

          const existingAnnotation = annotations.find((ann) =>
          ann.start_verse === selectionData.startVerse &&
          ann.start_token_index === selectionData.startToken &&
          ann.end_verse === selectionData.endVerse &&
          ann.end_token_index === selectionData.endToken
          );

          if (existingAnnotation) {
            const drawing = annotationDrawings[existingAnnotation.id] || null;
            setEditingAnnotation(existingAnnotation);
            setCurrentDrawing(drawing);
            setShowDrawingEditor(true);
          } else {
            const payload = {
              study_chapter_id: currentChapter.id,
              start_verse: selectionData.startVerse,
              start_token_index: selectionData.startToken,
              end_verse: selectionData.endVerse,
              end_token_index: selectionData.endToken,
              selected_text: selectionText,
              content: ''
            };
            const created = await base44.entities.Annotation.create(payload);
            setEditingAnnotation(created);
            await loadAnnotations(currentChapter.id);
            setShowDrawingEditor(true);
          }
        }}
        copied={popoverCopied} />
      

      {keywordPreview &&
      <KeywordPreview
        keywordId={keywordPreview.keywordId}
        position={keywordPreview.position}
        onClose={() => setKeywordPreview(null)} />

      }

      <ContextApplicationModals
        showContextModal={showContextModal}
        handleCloseContextModal={handleCloseContextModal}
        contextSaveStatus={contextSaveStatus}
        contextContent={contextContent}
        setContextContent={setContextContent}
        handleSaveContext={handleSaveContext}
        showApplicationModal={showApplicationModal}
        handleCloseApplicationModal={handleCloseApplicationModal}
        applicationSaveStatus={applicationSaveStatus}
        applicationContent={applicationContent}
        setApplicationContent={setApplicationContent}
        handleSaveApplication={handleSaveApplication} />
      

      <ChapterNotesPanel
        isOpen={showNotesPanel}
        onClose={handleCloseNotesPanel}
        content={notesContent}
        onChange={setNotesContent}
        saveStatus={notesSaveStatus}
        lastEditedDate={currentChapter?.notes_updated_date}
        user={user} />
      

      <UnsavedChangesDialog
        open={showUnsavedWarning}
        onStay={() => {
          setShowUnsavedWarning(false);
          setPendingAction(null);
          setPendingSaveFunction(null);
        }}
        onSaveAndLeave={async () => {
          if (pendingSaveFunction) await pendingSaveFunction();
          setShowUnsavedWarning(false);
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
            setPendingSaveFunction(null);
          }
        }}
        onLeave={() => {
          setShowUnsavedWarning(false);
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
            setPendingSaveFunction(null);
          }
        }}
        isSaving={annotationSaveStatus === 'saving' || contextSaveStatus === 'saving' || applicationSaveStatus === 'saving'} />
      

      <div className="max-w-7xl mx-auto px-4 pb-24 pt-8 flex items-center justify-center gap-6">
        <a href={createPageUrl('ContactFeedback')} className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-600 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
          <Send className="w-3 h-3" />
          Feedback & Contact
        </a>
        <a href={createPageUrl('SourcesLicenses')} className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-600 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
          <FileText className="w-3 h-3" />
          Sources & Licenses
        </a>
      </div>

      <DrawingEditor
        open={showDrawingEditor}
        onClose={() => {
          setShowDrawingEditor(false);
          setCurrentDrawing(null);
        }}
        drawingId={currentDrawing?.id}
        annotationId={editingAnnotation?.id}
        onSave={async (savedDrawing) => {
          setAnnotationDrawings((prev) => ({
            ...prev,
            [savedDrawing.annotation_id]: savedDrawing
          }));
          await loadAnnotations(currentChapter.id);
          setShowDrawingEditor(false);
          setCurrentDrawing(null);
          toast.success('Drawing saved');
        }} />
      

      <ThinkingOverlay
        visible={isFetchingChapter}
        title="Preparing chapter…"
        subtitle="Fetching and organizing the chapter text for reading and study." />
      
      <Toaster />
    </div>);

}