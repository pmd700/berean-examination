import React, { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

/**
 * Calculates how many consecutive days (ending today) the user has activity.
 * Activity = any chapter, annotation, or keyword created on that day.
 */
function calculateStreak(chapters, annotations, keywords, tz) {
  // Collect all activity dates into a Set of local date strings
  const activeDays = new Set();
  
  const toLocal = (utcStr) => {
    const d = parseISO(utcStr);
    return d.toLocaleDateString('en-CA', { timeZone: tz });
  };

  chapters?.forEach(ch => { if (ch.created_date) activeDays.add(toLocal(ch.created_date)); });
  annotations?.forEach(a => { if (a.created_date) activeDays.add(toLocal(a.created_date)); });
  (keywords || []).forEach(k => { if (k.created_date) activeDays.add(toLocal(k.created_date)); });

  // Count consecutive days backwards from today
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 3650; i++) { // max ~10 years
    const ds = format(subDays(today, i), 'yyyy-MM-dd');
    if (activeDays.has(ds)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export default function StreakBadge({ chapters, annotations, keywords, user }) {
  const tz = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  
  const streak = useMemo(
    () => calculateStreak(chapters, annotations, keywords, tz),
    [chapters, annotations, keywords, tz]
  );

  if (streak === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 select-none" title={`${streak} day streak`}>
      <Flame className="w-3.5 h-3.5 text-orange-500" />
      <span className="text-xs font-bold text-orange-600 dark:text-orange-400 tabular-nums">{streak}</span>
    </div>
  );
}