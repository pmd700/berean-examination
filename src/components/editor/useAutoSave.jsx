import { useState, useEffect, useRef } from 'react';

export function useAutoSave({
  content,
  onSave,
  delay = 5000,
  enabled = true,
  initialContent = ''
}) {
  const [saveStatus, setSaveStatus] = useState(null); // null (neutral), 'saving', 'saved', 'unsaved'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const timeoutRef = useRef(null);
  const initialContentRef = useRef(initialContent);
  const lastSavedContentRef = useRef(initialContent);
  const isSavingRef = useRef(false);
  const isInitializedRef = useRef(false);

  // Initialize with the initial content on first render
  useEffect(() => {
    if (!isInitializedRef.current) {
      initialContentRef.current = initialContent;
      lastSavedContentRef.current = initialContent;
      isInitializedRef.current = true;
    }
  }, [initialContent]);

  useEffect(() => {
    if (!enabled || !isInitializedRef.current) return;

    // Single source of truth: compare current content to last saved content
    const hasChanges = content !== lastSavedContentRef.current;
    setHasUnsavedChanges(hasChanges);
    
    // If content matches last saved, show neutral or saved
    if (!hasChanges) {
      // Only show "saved" if we were dirty before
      setSaveStatus(isDirty ? 'saved' : null);
      return;
    }

    // Content differs from last saved - mark as dirty and show unsaved
    if (!isDirty) {
      setIsDirty(true);
    }
    
    // Only show unsaved if not currently saving
    if (!isSavingRef.current) {
      setSaveStatus('unsaved');
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      if (content === lastSavedContentRef.current) return;

      try {
        setSaveStatus('saving');
        isSavingRef.current = true;
        await onSave(content);
        lastSavedContentRef.current = content;
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('unsaved');
        setHasUnsavedChanges(true);
      } finally {
        isSavingRef.current = false;
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, onSave, delay, enabled, isDirty]);

  const resetSaveState = (newContent = content) => {
    initialContentRef.current = newContent;
    lastSavedContentRef.current = newContent;
    setHasUnsavedChanges(false);
    setSaveStatus(null);
    setIsDirty(false);
    isInitializedRef.current = true;
  };

  return { saveStatus, hasUnsavedChanges, isDirty, resetSaveState };
}