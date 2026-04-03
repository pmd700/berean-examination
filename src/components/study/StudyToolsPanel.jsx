import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Edit2, MessageSquare } from 'lucide-react';
import AIInsightsButton from './AIInsightsButton';
import ChapterTransfer from './ChapterTransfer';
import { useI18n } from '../utils/I18nContext';

export default function StudyToolsPanel({
  currentChapter,
  annotations,
  hasContext,
  hasNotes,
  hasApplication,
  onOpenContextModal,
  onOpenNotesPanel,
  onOpenApplicationModal,
  onEditChapterText,
  onImportComplete,
}) {
  const { tr } = useI18n();

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/30 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
        {tr('Study Tools')}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onOpenContextModal} className="dark:border-gray-700">
          <BookOpen className="w-4 h-4 mr-2" />
          {hasContext ? tr('See Context') : tr('Add Context')}
        </Button>
        <Button variant="outline" onClick={onOpenNotesPanel} className="dark:border-gray-700">
          <FileText className="w-4 h-4 mr-2" />
          {hasNotes ? tr('Chapter Notes') : tr('Add Notes')}
        </Button>
        <Button variant="outline" onClick={onOpenApplicationModal} className="dark:border-gray-700">
          <MessageSquare className="w-4 h-4 mr-2" />
          {hasApplication ? tr('See Application') : tr('Add Application')}
        </Button>
        <Button variant="outline" onClick={onEditChapterText} className="dark:border-gray-700">
          <Edit2 className="w-4 h-4 mr-2" />
          {tr('Edit Chapter Text')}
        </Button>
        <ChapterTransfer
          currentChapter={currentChapter}
          annotations={annotations}
          onImportComplete={onImportComplete}
        />
        <AIInsightsButton currentChapter={currentChapter} />
      </div>
    </div>
  );
}