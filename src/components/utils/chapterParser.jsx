/**
 * Robust Bible chapter text parser
 * Handles messy input from Bible websites with headers, verse numbers, footnotes, and poetry
 */

const VERSE_START_PATTERN = /^(\d{1,3})([.:)]?)\s+/;
const BRACKET_FOOTNOTE_PATTERN = /\[[^\]]{1,4}\]/g;

export function parseChapterText(rawText, selectedChapterNumber) {
  // PHASE A: Normalize
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.split('\n').map(line => line.trimEnd()).join('\n');
  
  // PHASE B: Remove bracket footnotes/markers (NOT for LSV which uses brackets intentionally)
  text = text.replace(BRACKET_FOOTNOTE_PATTERN, '');
  text = text.replace(/  +/g, ' ');
  
  // PHASE C: Tokenize into logical lines
  const lines = text.split('\n');
  
  // PHASE D-G: Parse lines into blocks
  const blocks = [];
  let currentVerse = null;
  let verseEmitted = false;
  let lineBuffer = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const prevLine = i > 0 ? lines[i - 1].trim() : '';
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
    
    // Skip empty lines between blocks
    if (!line) {
      if (currentVerse && lineBuffer.length > 0) {
        currentVerse.text = processLineBuffer(lineBuffer);
        blocks.push(currentVerse);
        currentVerse = null;
        lineBuffer = [];
      }
      continue;
    }
    
    // PHASE D: Detect section headers
    if (isHeader(line, prevLine, nextLine)) {
      if (currentVerse && lineBuffer.length > 0) {
        currentVerse.text = processLineBuffer(lineBuffer);
        blocks.push(currentVerse);
        currentVerse = null;
        lineBuffer = [];
      }
      blocks.push({ type: 'header', text: line });
      continue;
    }
    
    // PHASE E: Detect verse starts
    const verseMatch = line.match(VERSE_START_PATTERN);
    
    if (verseMatch) {
      // Save previous verse if exists
      if (currentVerse && lineBuffer.length > 0) {
        currentVerse.text = processLineBuffer(lineBuffer);
        blocks.push(currentVerse);
        lineBuffer = [];
      }
      
      let verseNumber = parseInt(verseMatch[1], 10);
      let verseText = line.substring(verseMatch[0].length).trim();
      
      // Handle special case: chapter number + verse 1 on first line
      if (!verseEmitted && verseNumber === selectedChapterNumber) {
        verseNumber = 1;
      }
      
      currentVerse = { type: 'verse', verseNumber, text: '' };
      lineBuffer = [verseText];
      verseEmitted = true;
      continue;
    }
    
    // PHASE F: Continuation lines
    if (currentVerse) {
      lineBuffer.push(line);
    } else {
      // Orphaned text before any verse - treat as continuation of header or ignore
      if (blocks.length > 0 && blocks[blocks.length - 1].type === 'header') {
        blocks[blocks.length - 1].text += ' ' + line;
      }
    }
  }
  
  // Flush final verse
  if (currentVerse && lineBuffer.length > 0) {
    currentVerse.text = processLineBuffer(lineBuffer);
    blocks.push(currentVerse);
  }
  
  return blocks;
}

function isHeader(line, prevLine, nextLine) {
  // Must have at least 3 letters
  if (line.length < 3) return false;
  
  // Must not start with verse number pattern
  if (VERSE_START_PATTERN.test(line)) return false;
  
  // Must contain NO digits at all
  if (/\d/.test(line)) return false;
  
  // Must be reasonably short
  if (line.length > 80) return false;
  
  // Must be surrounded by whitespace in a header-like way
  const prevBlank = !prevLine || prevLine === '';
  const nextStartsVerse = nextLine && VERSE_START_PATTERN.test(nextLine);
  
  return prevBlank || nextStartsVerse;
}

function processLineBuffer(lines) {
  if (lines.length === 0) return '';
  if (lines.length === 1) return lines[0];
  
  // PHASE G: Poetry/quotation formatting
  const isPoeticBlock = detectPoetry(lines);
  
  if (isPoeticBlock) {
    // Preserve line breaks for poetry
    return lines.join('\n');
  } else {
    // Regular verse - join with spaces
    return lines.join(' ');
  }
}

function detectPoetry(lines) {
  if (lines.length < 2) return false;
  
  // Count lines that look poetic:
  // - Short-ish (<= 60 chars)
  // - End with punctuation like ; or ,
  let poeticLines = 0;
  
  for (const line of lines) {
    if (line.length <= 60 && /[;,]$/.test(line)) {
      poeticLines++;
    }
  }
  
  // If at least 2 lines look poetic, treat the whole buffer as poetry
  return poeticLines >= 2;
}

/**
 * Prepare raw pasted Bible text into standardized format
 * Headers: ### Title
 * Verses: ~N verse text...
 */
export function preparePastedBibleText(rawText, selectedChapterNumber) {
  // Step 1: Clean up footnotes and normalize
  let text = rawText
    .replace(/\[\[[^\]]+\]\([^)]+\)\]/g, '')  // [[a](url)] footnotes
    .replace(/\[[^\]]{1,6}\]/g, '')            // [a], [12] markers
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Step 2: Flatten EVERYTHING into one single string with spaces.
  // Line breaks do NOT matter for verse detection. Only numbers matter.
  let flat = text.split('\n').map(l => l.trim()).filter(Boolean).join(' ');
  flat = flat.replace(/  +/g, ' ').trim();

  // Step 3: Split into words (tokens). We'll walk through word by word.
  const words = flat.split(' ');

  // Step 4: Find all candidate verse numbers.
  // A verse number is a word that contains a 1-3 digit number, possibly with
  // leading punctuation like quotes ("3, \u201C5) or trailing punctuation (2:, 3.)
  // Strip all non-digit chars and check if what remains is a 1-3 digit number.
  const candidates = [];
  for (let i = 0; i < words.length; i++) {
    const digitsOnly = words[i].replace(/\D/g, '');
    if (digitsOnly.length >= 1 && digitsOnly.length <= 3 && /\d/.test(words[i])) {
      const num = parseInt(digitsOnly, 10);
      if (num >= 1 && num <= 176) {
        candidates.push({ wordIndex: i, num });
      }
    }
  }

  // Step 5: Filter to a coherent sequential run (1, 2, 3, 4...).
  // The first number might be the chapter number (e.g. "47") which maps to verse 1.
  let expectedNext = 1;
  const verseMarkers = []; // {wordIndex, num (remapped)}

  for (const c of candidates) {
    let vNum = c.num;
    if (verseMarkers.length === 0 && vNum === selectedChapterNumber && vNum !== 1) {
      vNum = 1;
    }
    if (vNum === expectedNext) {
      verseMarkers.push({ wordIndex: c.wordIndex, num: vNum });
      expectedNext = vNum + 1;
    }
  }

  if (verseMarkers.length === 0) {
    return flat;
  }

  // Step 6: Build output.
  const output = [];

  // Text before first verse = potential header
  const preWords = words.slice(0, verseMarkers[0].wordIndex);
  if (preWords.length > 0) {
    const preText = preWords.join(' ').trim();
    if (preText && !/\d/.test(preText) && preText.length <= 120) {
      output.push(`### ${preText}`);
      output.push('');
    }
  }

  for (let vi = 0; vi < verseMarkers.length; vi++) {
    const marker = verseMarkers[vi];
    const nextMarker = verseMarkers[vi + 1];
    const textStartIdx = marker.wordIndex + 1;
    const textEndIdx = nextMarker ? nextMarker.wordIndex : words.length;
    const verseText = words.slice(textStartIdx, textEndIdx).join(' ').trim();
    output.push(`~${marker.num} ${verseText}`);
  }

  return output.join('\n').trim();
}

function isHeaderLine(line, nextLine) {
  // Header if: no digits, not empty, <= 90 chars, looks like a title
  if (line.length === 0 || line.length > 90) return false;
  if (/\d/.test(line)) return false;
  
  // Check if title case-ish or at least 2 words
  const words = line.split(/\s+/);
  if (words.length < 2) return false;
  
  // Check if next line starts with verse number
  const nextHasVerse = nextLine && /^\d{1,3}\s/.test(nextLine);
  
  return nextHasVerse || words.length >= 2;
}

function processVerseContent(line, selectedChapterNumber, firstVerseFound) {
  const result = { lines: [], hasVerse: false };
  
  // Find all verse number markers (standalone numbers)
  // Pattern: number at start or after space/punctuation, followed by space/punctuation
  const versePattern = /(?:^|\s)(\d{1,3})(?=\s|[.,;:!?]|\s*$)/g;
  const matches = [];
  let match;
  
  while ((match = versePattern.exec(line)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 176) {
      matches.push({ index: match.index, number: num, matchLength: match[0].length });
    }
  }
  
  if (matches.length === 0) {
    // No verse markers - might be continuation
    return result;
  }
  
  // Special case: first verse might be chapter number
  if (!firstVerseFound && matches[0].number === selectedChapterNumber) {
    // Replace chapter number with verse 1
    const textAfterChapter = line.substring(matches[0].index + matches[0].matchLength).trim();
    result.lines.push(`~1 ${textAfterChapter}`);
    result.hasVerse = true;
    
    // Process remaining verses if any
    for (let i = 1; i < matches.length; i++) {
      const verseNum = matches[i].number;
      const startIdx = matches[i].index + matches[i].matchLength;
      const endIdx = i < matches.length - 1 ? matches[i + 1].index : line.length;
      const verseText = line.substring(startIdx, endIdx).trim();
      result.lines.push(`~${verseNum} ${verseText}`);
    }
  } else {
    // Regular verse processing
    for (let i = 0; i < matches.length; i++) {
      const verseNum = matches[i].number;
      const startIdx = matches[i].index + matches[i].matchLength;
      const endIdx = i < matches.length - 1 ? matches[i + 1].index : line.length;
      const verseText = line.substring(startIdx, endIdx).trim();
      
      if (verseText) {
        result.lines.push(`~${verseNum} ${verseText}`);
        result.hasVerse = true;
      }
    }
  }
  
  return result;
}

/**
 * Parse prepared text format into structured blocks
 * Expects format: ### Header and ~N verse text
 */
export function parsePreparedText(preparedText) {
  const lines = preparedText.split('\n');
  const blocks = [];
  let currentVerse = null;
  
  for (const line of lines) {
    // Header: ### Title
    const headerMatch = line.match(/^###\s+(.+)$/);
    if (headerMatch) {
      if (currentVerse) {
        currentVerse.text = currentVerse.text.trim();
        blocks.push(currentVerse);
        currentVerse = null;
      }
      blocks.push({ type: 'header', text: headerMatch[1].trim() });
      continue;
    }
    
    // Verse start: ~N text
    const verseMatch = line.match(/^~(\d{1,3})\s+(.*)$/);
    if (verseMatch) {
      if (currentVerse) {
        currentVerse.text = currentVerse.text.trim();
        blocks.push(currentVerse);
      }
      currentVerse = {
        type: 'verse',
        verseNumber: parseInt(verseMatch[1], 10),
        text: verseMatch[2]
      };
      continue;
    }
    
    // Continuation line
    if (currentVerse && line.trim()) {
      currentVerse.text += (currentVerse.text ? ' ' : '') + line.trim();
    } else if (currentVerse && !line.trim()) {
      // Preserve blank lines for poetry
      currentVerse.text += '\n\n';
    }
  }
  
  // Flush final verse
  if (currentVerse) {
    currentVerse.text = currentVerse.text.trim();
    blocks.push(currentVerse);
  }
  
  return blocks;
}

/**
 * Tokenize verse text into words for annotation
 */
export function tokenizeVerseText(text) {
  // Split by whitespace but preserve newlines as special tokens
  const parts = text.split(/(\s+)/);
  const tokens = [];
  
  for (const part of parts) {
    if (part && part !== ' ' && part !== '\n') {
      tokens.push(part);
    }
  }
  
  return tokens;
}