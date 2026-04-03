import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const NASB_FILE_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/c64b156e1_NASB1995.txt';

const BOOK_NAMES = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah',
  'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum',
  'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

let cachedLines = null;

async function getNasbLines() {
  if (cachedLines) return cachedLines;
  const response = await fetch(NASB_FILE_URL);
  if (!response.ok) throw new Error('Failed to fetch NASB 1995 file');
  const text = await response.text();
  cachedLines = text.split('\n').map((line) => line.replace(/\r$/, ''));
  return cachedLines;
}

function isHeadingLine(line) {
  const trimmed = line.trim();
  const match = trimmed.match(/^(.+?)\s+(\d+)\s+New American Standard Bible$/);
  if (!match) return null;
  const book = match[1].replace(/\s+/g, ' ').trim();
  const chapter = parseInt(match[2], 10);
  if (!BOOK_NAMES.includes(book)) return null;
  return { book, chapter };
}

function extractChapter(lines, targetBook, targetChapter) {
  const output = [];
  let capturing = false;
  let currentVerse = null;
  let currentText = [];

  const flushVerse = () => {
    if (currentVerse !== null && currentText.length > 0) {
      output.push(`~${currentVerse} ${currentText.join(' ').replace(/\s+/g, ' ').trim()}`);
    }
    currentVerse = null;
    currentText = [];
  };

  for (const rawLine of lines) {
    const heading = isHeadingLine(rawLine);
    if (heading) {
      if (heading.book === targetBook && heading.chapter === targetChapter) {
        capturing = true;
        continue;
      }
      if (capturing) {
        flushVerse();
        break;
      }
      continue;
    }

    if (!capturing) continue;

    const line = rawLine.trim();
    if (!line || line === 'New American Standard Bible') continue;

    const verseMatch = line.match(/^(\d{1,3})\s+(.*)$/);
    if (verseMatch) {
      const verseNumber = parseInt(verseMatch[1], 10);
      if (verseNumber !== currentVerse) {
        flushVerse();
        currentVerse = verseNumber;
      }
      if (verseMatch[2]) currentText.push(verseMatch[2].trim());
      continue;
    }

    if (currentVerse !== null) {
      currentText.push(line);
    }
  }

  flushVerse();
  return output.join('\n').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 200 });
    }

    if (!user.is_admin && user.role !== 'admin') {
      return Response.json({ ok: false, error: 'Forbidden: Admin access required' }, { status: 200 });
    }

    const { book, chapter } = await req.json();
    if (!book || chapter === undefined) {
      return Response.json({ ok: false, error: 'Missing book or chapter' }, { status: 200 });
    }

    const lines = await getNasbLines();
    const chapterText = extractChapter(lines, String(book), parseInt(chapter, 10));

    if (!chapterText) {
      return Response.json({ ok: false, error: `No content found for ${book} ${chapter}` }, { status: 200 });
    }

    return Response.json({ ok: true, text: chapterText }, { status: 200 });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 200 });
  }
});