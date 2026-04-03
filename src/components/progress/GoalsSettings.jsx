import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Target, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function GoalsSettings({ user, onSave }) {
  const [verseGoal, setVerseGoal] = useState(user?.daily_verse_goal || '');
  const [annotationGoal, setAnnotationGoal] = useState(user?.daily_annotation_goal || '');
  const [paceDays, setPaceDays] = useState(user?.chapter_pace_days || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        daily_verse_goal: verseGoal ? parseInt(verseGoal) : null,
        daily_annotation_goal: annotationGoal ? parseInt(annotationGoal) : null,
        chapter_pace_days: paceDays ? parseInt(paceDays) : null
      });
      toast.success('Goals updated successfully!');
    } catch (error) {
      toast.error('Failed to update goals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Study Goals
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label className="text-gray-700 dark:text-gray-300">
            Daily Verses Goal
          </Label>
          <Input
            type="number"
            placeholder="e.g. 50"
            value={verseGoal}
            onChange={(e) => setVerseGoal(e.target.value)}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Number of verses to study per day
          </p>
        </div>

        <div>
          <Label className="text-gray-700 dark:text-gray-300">
            Daily Annotations Goal
          </Label>
          <Input
            type="number"
            placeholder="e.g. 5"
            value={annotationGoal}
            onChange={(e) => setAnnotationGoal(e.target.value)}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Annotations to create per day
          </p>
        </div>

        <div>
          <Label className="text-gray-700 dark:text-gray-300">
            Chapter Pace (days)
          </Label>
          <Input
            type="number"
            placeholder="e.g. 3"
            value={paceDays}
            onChange={(e) => setPaceDays(e.target.value)}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Complete 1 chapter every X days
          </p>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 bg-purple-600 hover:bg-purple-700"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Goals'}
      </Button>
    </Card>
  );
}