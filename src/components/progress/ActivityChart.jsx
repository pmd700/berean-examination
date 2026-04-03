import React, { useMemo, useRef, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, LineChart as LineChartIcon, Calendar, BookOpen, MessageSquare, Lightbulb } from 'lucide-react';
import { format, subDays, parseISO, differenceInDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth, addDays } from 'date-fns';

const TIMEFRAMES = [
  { key: '7d', label: '7d', days: 7 },
  { key: '14d', label: '14d', days: 14 },
  { key: '30d', label: '30d', days: 30 },
  { key: '6m', label: '6m', days: 183 },
  { key: '1y', label: '1y', days: 365 },
  { key: 'all', label: 'All' },
];

function toLocalDateStr(utcDateStr, tz) {
  const d = parseISO(utcDateStr);
  return d.toLocaleDateString('en-CA', { timeZone: tz });
}

function getEarliestDate(chapters, annotations, keywords) {
  let earliest = null;
  const allDates = [
    ...chapters.map(c => c.created_date),
    ...annotations.map(a => a.created_date),
    ...(keywords || []).map(k => k.created_date),
  ];
  for (const d of allDates) {
    if (!d) continue;
    const parsed = parseISO(d);
    if (!earliest || parsed < earliest) earliest = parsed;
  }
  return earliest;
}

function buildDailyMaps(chapters, annotations, keywords, tz) {
  const maps = { chapters: {}, annotations: {}, keywords: {} };
  chapters.forEach(ch => {
    const ld = toLocalDateStr(ch.created_date, tz);
    maps.chapters[ld] = (maps.chapters[ld] || 0) + 1;
  });
  annotations.forEach(ann => {
    const ld = toLocalDateStr(ann.created_date, tz);
    maps.annotations[ld] = (maps.annotations[ld] || 0) + 1;
  });
  (keywords || []).forEach(kw => {
    const ld = toLocalDateStr(kw.created_date, tz);
    maps.keywords[ld] = (maps.keywords[ld] || 0) + 1;
  });
  return maps;
}

// Smart label formatting based on timeframe and total span
function formatTickLabel(fullDate, timeframe, totalBuckets, totalDaysInRange) {
  if (!fullDate) return '';
  const d = parseISO(fullDate);
  
  if (timeframe === '7d' || timeframe === '14d') {
    return format(d, 'MMM d');
  }
  if (timeframe === '30d') {
    return format(d, 'MMM d');
  }
  if (timeframe === '6m') {
    return format(d, 'MMM d');
  }
  if (timeframe === '1y') {
    return format(d, "MMM ''yy");
  }
  // All time — pick format based on actual date span
  if (totalDaysInRange <= 60) return format(d, 'MMM d');
  if (totalDaysInRange <= 365) return format(d, "MMM d ''yy");
  return format(d, "MMM ''yy");
}

// Format tooltip date range
function formatTooltipDate(fullDate, rangeLabel, timeframe) {
  if (!fullDate) return rangeLabel || '';
  const d = parseISO(fullDate);
  if (timeframe === '7d' || timeframe === '14d' || timeframe === '30d') {
    return format(d, 'EEEE, MMM d, yyyy');
  }
  // For weekly/monthly buckets, use the range label
  return rangeLabel || format(d, 'MMM d, yyyy');
}

function generateDailyData(startDate, endDate, dailyMaps) {
  const data = [];
  let current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const ds = format(current, 'yyyy-MM-dd');
    data.push({
      label: format(current, 'MMM d'),
      fullDate: ds,
      chapters: dailyMaps.chapters[ds] || 0,
      annotations: dailyMaps.annotations[ds] || 0,
      keywords: dailyMaps.keywords[ds] || 0,
    });
    current = addDays(current, 1);
  }
  return data;
}

function generateWeeklyData(startDate, endDate, dailyMaps) {
  const data = [];
  let weekStart = startOfWeek(new Date(startDate), { weekStartsOn: 1 });
  const end = new Date(endDate);
  while (weekStart <= end) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const actualEnd = weekEnd > end ? end : weekEnd;
    let ch = 0, ann = 0, kw = 0;
    let d = new Date(weekStart);
    while (d <= actualEnd) {
      const ds = format(d, 'yyyy-MM-dd');
      ch += dailyMaps.chapters[ds] || 0;
      ann += dailyMaps.annotations[ds] || 0;
      kw += dailyMaps.keywords[ds] || 0;
      d = addDays(d, 1);
    }
    const rangeLabel = `${format(weekStart, 'MMM d')} – ${format(actualEnd, 'MMM d')}`;
    const dateKey = format(weekStart, 'yyyy-MM-dd');
    data.push({
      dateKey,
      label: rangeLabel,
      fullDate: dateKey,
      chapters: ch,
      annotations: ann,
      keywords: kw,
    });
    weekStart = addDays(weekEnd, 1);
  }
  return data;
}

function generateMonthlyData(startDate, endDate, dailyMaps) {
  const data = [];
  let monthStart = startOfMonth(new Date(startDate));
  const end = new Date(endDate);
  while (monthStart <= end) {
    const monthEnd = endOfMonth(monthStart);
    const actualEnd = monthEnd > end ? end : monthEnd;
    let ch = 0, ann = 0, kw = 0;
    let d = new Date(monthStart);
    while (d <= actualEnd) {
      const ds = format(d, 'yyyy-MM-dd');
      ch += dailyMaps.chapters[ds] || 0;
      ann += dailyMaps.annotations[ds] || 0;
      kw += dailyMaps.keywords[ds] || 0;
      d = addDays(d, 1);
    }
    data.push({
      label: format(monthStart, 'MMM yyyy'),
      fullDate: format(monthStart, 'yyyy-MM-dd'),
      chapters: ch,
      annotations: ann,
      keywords: kw,
    });
    monthStart = addDays(monthEnd, 1);
  }
  return data;
}

function generateCumulativeData(startDate, endDate, chapters, annotations, keywords) {
  // Pre-sort dates for efficient cumulative counting
  const chDates = chapters.map(ch => format(parseISO(ch.created_date), 'yyyy-MM-dd')).sort();
  const annDates = annotations.map(a => format(parseISO(a.created_date), 'yyyy-MM-dd')).sort();
  const kwDates = (keywords || []).map(k => format(parseISO(k.created_date), 'yyyy-MM-dd')).sort();
  
  const countUpTo = (sortedDates, ds) => {
    let count = 0;
    for (const d of sortedDates) {
      if (d <= ds) count++;
      else break;
    }
    return count;
  };

  const data = [];
  let current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const ds = format(current, 'yyyy-MM-dd');
    data.push({
      label: format(current, 'MMM d'),
      fullDate: ds,
      chapters: countUpTo(chDates, ds),
      annotations: countUpTo(annDates, ds),
      keywords: countUpTo(kwDates, ds),
    });
    current = addDays(current, 1);
  }
  return data;
}

function sampleLineData(data, maxPoints) {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }
  if (sampled[sampled.length - 1] !== data[data.length - 1]) {
    sampled.push(data[data.length - 1]);
  }
  return sampled;
}

function computeBarSize(bucketCount) {
  if (bucketCount <= 7) return 18;
  if (bucketCount <= 14) return 12;
  if (bucketCount <= 30) return 8;
  if (bucketCount <= 60) return 5;
  return 3;
}

// Custom tooltip
function ChartTooltip({ active, payload, label, timeframe }) {
  if (!active || !payload?.length) return null;
  
  const entry = payload[0]?.payload;
  const dateLabel = formatTooltipDate(entry?.fullDate, entry?.label, timeframe);
  const total = (entry?.chapters || 0) + (entry?.annotations || 0) + (entry?.keywords || 0);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3.5 py-2.5 shadow-xl text-sm">
      <p className="text-gray-300 text-xs mb-1.5 font-medium">{dateLabel}</p>
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-gray-400 text-xs">{p.name}</span>
            </div>
            <span className="text-white text-xs font-semibold tabular-nums">{p.value}</span>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="border-t border-gray-700 mt-1.5 pt-1.5 flex justify-between">
          <span className="text-gray-500 text-xs">Total</span>
          <span className="text-white text-xs font-bold tabular-nums">{total}</span>
        </div>
      )}
    </div>
  );
}

export default function ActivityChart({ chapters, annotations, keywords, user, chartMode, timeframe, onChartModeChange, onTimeframeChange }) {
  const userTz = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  const cacheRef = useRef({});

  const earliestDate = useMemo(() => getEarliestDate(chapters, annotations, keywords), [chapters, annotations, keywords]);

  const allTimeDays = useMemo(() => {
    if (!earliestDate) return 0;
    return differenceInDays(new Date(), earliestDate) + 1;
  }, [earliestDate]);

  const dailyMaps = useMemo(() => buildDailyMaps(chapters, annotations, keywords, userTz), [chapters, annotations, keywords, userTz]);

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    if (timeframe === 'all') {
      if (!earliestDate) return { startDate: todayStr, endDate: todayStr };
      return { startDate: format(earliestDate, 'yyyy-MM-dd'), endDate: todayStr };
    }
    const tf = TIMEFRAMES.find(t => t.key === timeframe);
    const daysBack = tf?.days || 30;
    return { startDate: format(subDays(today, daysBack - 1), 'yyyy-MM-dd'), endDate: todayStr };
  }, [timeframe, earliestDate]);

  const totalDaysInRange = useMemo(() => differenceInDays(parseISO(endDate), parseISO(startDate)) + 1, [startDate, endDate]);

  // Cached bar data
  const barData = useMemo(() => {
    const cacheKey = `bar-${startDate}-${endDate}`;
    if (cacheRef.current[cacheKey]) return cacheRef.current[cacheKey];
    let result;
    if (totalDaysInRange <= 45) {
      result = generateDailyData(startDate, endDate, dailyMaps);
    } else if (totalDaysInRange <= 200) {
      result = generateWeeklyData(startDate, endDate, dailyMaps);
    } else {
      result = generateMonthlyData(startDate, endDate, dailyMaps);
    }
    cacheRef.current[cacheKey] = result;
    return result;
  }, [startDate, endDate, dailyMaps, totalDaysInRange]);

  // Cached line data
  const lineData = useMemo(() => {
    const cacheKey = `line-${startDate}-${endDate}`;
    if (cacheRef.current[cacheKey]) return cacheRef.current[cacheKey];
    const raw = generateCumulativeData(startDate, endDate, chapters, annotations, keywords);
    const result = sampleLineData(raw, 60);
    cacheRef.current[cacheKey] = result;
    return result;
  }, [startDate, endDate, chapters, annotations, keywords]);

  const chartData = chartMode === 'bar' ? barData : lineData;
  const barSize = computeBarSize(barData.length);

  // Summary stats for the current timeframe
  const summary = useMemo(() => {
    const source = barData; // always use bar data (non-cumulative) for summary
    let ch = 0, ann = 0, kw = 0;
    source.forEach(d => {
      ch += d.chapters;
      ann += d.annotations;
      kw += d.keywords;
    });
    return { chapters: ch, annotations: ann, keywords: kw };
  }, [barData]);

  const hasAnyData = summary.chapters + summary.annotations + summary.keywords > 0;

  // Smart tick count: target ~6-8 visible ticks
  const xTickInterval = useMemo(() => {
    const len = chartData.length;
    if (len <= 8) return 0;
    if (len <= 16) return 1;
    // Target ~7 ticks
    return Math.max(1, Math.floor(len / 7) - 1);
  }, [chartData.length]);

  // Custom tick formatter - receives fullDate as the dataKey value
  const formatXTick = useCallback((value) => {
    if (!value) return '';
    return formatTickLabel(value, timeframe, chartData.length, totalDaysInRange);
  }, [timeframe, chartData.length, totalDaysInRange]);

  const timeframeLabel = TIMEFRAMES.find(t => t.key === timeframe)?.label || timeframe;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activity
          </h3>
          {timeframe === 'all' && allTimeDays > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              <Calendar className="w-3 h-3" />
              {allTimeDays} day{allTimeDays !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe pills */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.key}
                onClick={() => onTimeframeChange(tf.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  timeframe === tf.key
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Mode toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => onChartModeChange('line')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                chartMode === 'line'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              Line
            </button>
            <button
              onClick={() => onChartModeChange('bar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                chartMode === 'bar'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Bars
            </button>
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
          {summary.chapters} ch
        </span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" />
          {summary.annotations} ann
        </span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          {summary.keywords} kw
        </span>
        <span className="text-gray-300 dark:text-gray-600 ml-1">
          in {timeframe === 'all' ? 'all time' : `last ${timeframeLabel}`}
        </span>
      </div>

      {/* Chart area */}
      <div className="min-h-[300px]">
        {!hasAnyData ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 dark:text-gray-500">
            <BookOpen className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No activity in this timeframe</p>
            <p className="text-xs mt-1 opacity-70">Start studying to see your progress here</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {chartMode === 'line' ? (
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="lineGradCh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                <XAxis
                  dataKey="fullDate"
                  stroke="#6b7280"
                  style={{ fontSize: '10px' }}
                  interval={xTickInterval}
                  tickFormatter={formatXTick}
                  tickLine={false}
                  axisLine={{ stroke: '#4b5563' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip timeframe={timeframe} />} cursor={{ stroke: '#6b7280', strokeDasharray: '3 3' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="chapters" stroke="#8b5cf6" strokeWidth={2} name="Chapters" dot={chartData.length <= 30 ? { fill: '#8b5cf6', r: 2.5, strokeWidth: 0 } : false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={400} />
                <Line type="monotone" dataKey="annotations" stroke="#06b6d4" strokeWidth={2} name="Annotations" dot={chartData.length <= 30 ? { fill: '#06b6d4', r: 2.5, strokeWidth: 0 } : false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={400} />
                <Line type="monotone" dataKey="keywords" stroke="#f59e0b" strokeWidth={2} name="Keywords" dot={chartData.length <= 30 ? { fill: '#f59e0b', r: 2.5, strokeWidth: 0 } : false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={400} />
              </LineChart>
            ) : (
              <BarChart data={chartData} barSize={barSize}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                <XAxis
                  dataKey="fullDate"
                  stroke="#6b7280"
                  style={{ fontSize: '10px' }}
                  interval={xTickInterval}
                  tickFormatter={formatXTick}
                  tickLine={false}
                  axisLine={{ stroke: '#4b5563' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip timeframe={timeframe} />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="chapters" fill="#8b5cf6" name="Chapters" radius={[3, 3, 0, 0]} animationDuration={400} />
                <Bar dataKey="annotations" fill="#06b6d4" name="Annotations" radius={[3, 3, 0, 0]} animationDuration={400} />
                <Bar dataKey="keywords" fill="#f59e0b" name="Keywords" radius={[3, 3, 0, 0]} animationDuration={400} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}