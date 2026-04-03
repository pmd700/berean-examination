import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '../utils/I18nContext';

export default function InterlinearSettings({
  enabled,
  onToggle,
  onSourceChange,
  isAvailable,
  isLoading,
}) {
  const { tr } = useI18n();
  const isNewTestament = !!isAvailable;
  const effectiveSource = isNewTestament ? 'SBLGNT' : 'UXLC';
  const sourceOption = isNewTestament ? 'SBLGNT' : 'UXLC / Leningrad Codex';
  const sourceLabel = isNewTestament ? 'Interlinear Source: SBLGNT' : 'Interlinear Source: UXLC';

  return (
    <div className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50 px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              {tr('Reading Controls')}
            </p>
            <Button
              type="button"
              variant={enabled ? 'default' : 'outline'}
              onClick={onToggle}
              className={enabled ? 'bg-orange-600 hover:bg-orange-700' : 'dark:border-gray-700'}
            >
              {enabled ? tr('Interlinear On') : tr('Interlinear Off')}
            </Button>
          </div>

          <div className="w-full sm:w-[240px]">
            <Label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{tr('Source Text')}</Label>
            <Select value={effectiveSource} onValueChange={onSourceChange} disabled={!enabled}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={effectiveSource}>{tr(sourceOption)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400 xl:text-right">
          {isLoading ? tr('Loading source text…') : tr(sourceLabel)}
        </div>
      </div>
    </div>
  );
}