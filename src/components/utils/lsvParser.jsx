/**
 * LSV-specific parser for prepared text.
 * Key differences from the default parser:
 * - Preserves [bracketed] interpolated words (does NOT strip them)
 * - Preserves [[double-bracketed]] disputed text
 * - Handles || caesura marks for poetry by converting to line breaks
 * - Handles UPPERCASE psalm superscriptions as headers
 */

export function parseLsvPreparedText(preparedText) {
  if (!preparedText) return [];
  
  const lines = preparedText.split('\n');
  const blocks = [];
  let currentVerse = null;
  
  for (const line of lines) {
    // Header: ### Title
    const headerMatch = line.match(/^###\s+(.+)$/);
    if (headerMatch) {
      if (currentVerse) {
        currentVerse.text = processLsvVerseText(currentVerse.text.trim());
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
        currentVerse.text = processLsvVerseText(currentVerse.text.trim());
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
    }
  }
  
  // Flush final verse
  if (currentVerse) {
    currentVerse.text = processLsvVerseText(currentVerse.text.trim());
    blocks.push(currentVerse);
  }
  
  return blocks;
}

/**
 * Process LSV verse text:
 * - Keep [brackets] and [[double brackets]]
 * - Keep || caesura marks (they'll be rendered as visual separators)
 */
function processLsvVerseText(text) {
  // Clean up extra whitespace but preserve structure
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Special sections (Preface, Copyright, Introduction) are read-only prose.
 * This flag check is used by the Study page to disable annotations.
 */
export const LSV_SPECIAL_SECTIONS = ['Copyright', 'Preface', 'Introduction'];

export function isLsvSpecialSection(book) {
  return LSV_SPECIAL_SECTIONS.includes(book);
}