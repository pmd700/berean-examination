import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const TIER_REQUIREMENTS = [
  { tier: 7, days: 700, chapters: 350 },
  { tier: 6, days: 400, chapters: 210 },
  { tier: 5, days: 144, chapters: 70 },
  { tier: 4, days: 70, chapters: 35 },
  { tier: 3, days: 49, chapters: 21 },
  { tier: 2, days: 12, chapters: 6 },
  { tier: 1, days: 7, chapters: 3 },
  { tier: 0, days: 0, chapters: 0 }
];

const TIER_ROMAN = {
  0: '—',
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII'
};

export function useTierRank() {
  const [tierData, setTierData] = useState({
    tier: 0,
    roman: '—',
    loginDays: 0,
    chaptersWithCommentary: 0,
    loading: true
  });

  useEffect(() => {
    loadTierData();
  }, []);

  const loadTierData = async () => {
    try {
      // Get unique login days
      const dailyActivities = await base44.entities.DailyActivity.list('date');
      const uniqueDays = new Set(dailyActivities.map(d => d.date)).size;

      // Get unique chapters with commentary (annotations)
      const annotations = await base44.entities.Annotation.list();
      const chapterIds = new Set();
      
      for (const ann of annotations) {
        if (ann.study_chapter_id) {
          chapterIds.add(ann.study_chapter_id);
        }
      }

      // Get chapters with context or application
      const chapters = await base44.entities.StudyChapter.list();
      const chaptersWithContent = chapters.filter(ch => 
        ch.context?.trim() || ch.application?.trim() || chapterIds.has(ch.id)
      );

      // Count unique book+chapter combinations
      const uniqueChapters = new Set(
        chaptersWithContent.map(ch => `${ch.book}-${ch.chapter_number}`)
      ).size;

      // Calculate tier (both conditions must be met)
      let currentTier = 0;
      for (const req of TIER_REQUIREMENTS) {
        if (uniqueDays >= req.days && uniqueChapters >= req.chapters) {
          currentTier = req.tier;
          break;
        }
      }

      setTierData({
        tier: currentTier,
        roman: TIER_ROMAN[currentTier],
        loginDays: uniqueDays,
        chaptersWithCommentary: uniqueChapters,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load tier data:', error);
      setTierData(prev => ({ ...prev, loading: false }));
    }
  };

  const trackLoginDay = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if today is already recorded
      const existing = await base44.entities.DailyActivity.filter({ date: today });
      
      if (existing.length === 0) {
        await base44.entities.DailyActivity.create({
          date: today,
          verses_studied: 0,
          annotations_created: 0,
          chapters_completed: 0
        });
        // Reload tier data after tracking new day
        await loadTierData();
      }
    } catch (error) {
      console.error('Failed to track login day:', error);
    }
  };

  return {
    ...tierData,
    trackLoginDay,
    refresh: loadTierData
  };
}