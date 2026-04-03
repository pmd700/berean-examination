// Bible book aliases and smart search parsing

export const BIBLE_BOOK_ALIASES = {
  // Genesis - Deuteronomy
  'gen': 'Genesis',
  'genesis': 'Genesis',
  'ex': 'Exodus',
  'exo': 'Exodus',
  'exodus': 'Exodus',
  'lev': 'Leviticus',
  'leviticus': 'Leviticus',
  'num': 'Numbers',
  'numbers': 'Numbers',
  'deut': 'Deuteronomy',
  'deuteronomy': 'Deuteronomy',
  
  // Historical books
  'josh': 'Joshua',
  'joshua': 'Joshua',
  'judg': 'Judges',
  'judges': 'Judges',
  'ruth': 'Ruth',
  '1sam': '1 Samuel',
  '1 sam': '1 Samuel',
  '1samuel': '1 Samuel',
  '1 samuel': '1 Samuel',
  '2sam': '2 Samuel',
  '2 sam': '2 Samuel',
  '2samuel': '2 Samuel',
  '2 samuel': '2 Samuel',
  '1kings': '1 Kings',
  '1 kings': '1 Kings',
  '1k': '1 Kings',
  '2kings': '2 Kings',
  '2 kings': '2 Kings',
  '2k': '2 Kings',
  '1chron': '1 Chronicles',
  '1 chron': '1 Chronicles',
  '1chronicles': '1 Chronicles',
  '1 chronicles': '1 Chronicles',
  '2chron': '2 Chronicles',
  '2 chron': '2 Chronicles',
  '2chronicles': '2 Chronicles',
  '2 chronicles': '2 Chronicles',
  'ezra': 'Ezra',
  'neh': 'Nehemiah',
  'nehemiah': 'Nehemiah',
  'esth': 'Esther',
  'esther': 'Esther',
  
  // Wisdom books
  'job': 'Job',
  'ps': 'Psalms',
  'psalm': 'Psalms',
  'psalms': 'Psalms',
  'prov': 'Proverbs',
  'proverbs': 'Proverbs',
  'eccl': 'Ecclesiastes',
  'ecclesiastes': 'Ecclesiastes',
  'song': 'Song of Solomon',
  'song of solomon': 'Song of Solomon',
  'songofsolomon': 'Song of Solomon',
  'sos': 'Song of Solomon',
  
  // Major prophets
  'isa': 'Isaiah',
  'isaiah': 'Isaiah',
  'jer': 'Jeremiah',
  'jeremiah': 'Jeremiah',
  'lam': 'Lamentations',
  'lamentations': 'Lamentations',
  'ezek': 'Ezekiel',
  'ezekiel': 'Ezekiel',
  'dan': 'Daniel',
  'daniel': 'Daniel',
  
  // Minor prophets
  'hos': 'Hosea',
  'hosea': 'Hosea',
  'joel': 'Joel',
  'amos': 'Amos',
  'obad': 'Obadiah',
  'obadiah': 'Obadiah',
  'jonah': 'Jonah',
  'mic': 'Micah',
  'micah': 'Micah',
  'nah': 'Nahum',
  'nahum': 'Nahum',
  'hab': 'Habakkuk',
  'habakkuk': 'Habakkuk',
  'zeph': 'Zephaniah',
  'zephaniah': 'Zephaniah',
  'hag': 'Haggai',
  'haggai': 'Haggai',
  'zech': 'Zechariah',
  'zechariah': 'Zechariah',
  'mal': 'Malachi',
  'malachi': 'Malachi',
  
  // New Testament - Gospels
  'matt': 'Matthew',
  'matthew': 'Matthew',
  'mt': 'Matthew',
  'mark': 'Mark',
  'mk': 'Mark',
  'luke': 'Luke',
  'lk': 'Luke',
  'john': 'John',
  'jn': 'John',
  
  // Acts and Epistles
  'acts': 'Acts',
  'rom': 'Romans',
  'romans': 'Romans',
  '1cor': '1 Corinthians',
  '1 cor': '1 Corinthians',
  '1corinthians': '1 Corinthians',
  '1 corinthians': '1 Corinthians',
  '2cor': '2 Corinthians',
  '2 cor': '2 Corinthians',
  '2corinthians': '2 Corinthians',
  '2 corinthians': '2 Corinthians',
  'gal': 'Galatians',
  'galatians': 'Galatians',
  'eph': 'Ephesians',
  'ephesians': 'Ephesians',
  'phil': 'Philippians',
  'philippians': 'Philippians',
  'col': 'Colossians',
  'colossians': 'Colossians',
  '1thess': '1 Thessalonians',
  '1 thess': '1 Thessalonians',
  '1thessalonians': '1 Thessalonians',
  '1 thessalonians': '1 Thessalonians',
  '2thess': '2 Thessalonians',
  '2 thess': '2 Thessalonians',
  '2thessalonians': '2 Thessalonians',
  '2 thessalonians': '2 Thessalonians',
  '1tim': '1 Timothy',
  '1 tim': '1 Timothy',
  '1timothy': '1 Timothy',
  '1 timothy': '1 Timothy',
  '2tim': '2 Timothy',
  '2 tim': '2 Timothy',
  '2timothy': '2 Timothy',
  '2 timothy': '2 Timothy',
  'titus': 'Titus',
  'philem': 'Philemon',
  'philemon': 'Philemon',
  'heb': 'Hebrews',
  'hebrews': 'Hebrews',
  'james': 'James',
  'jas': 'James',
  '1pet': '1 Peter',
  '1 pet': '1 Peter',
  '1peter': '1 Peter',
  '1 peter': '1 Peter',
  '2pet': '2 Peter',
  '2 pet': '2 Peter',
  '2peter': '2 Peter',
  '2 peter': '2 Peter',
  '1john': '1 John',
  '1 john': '1 John',
  '1jn': '1 John',
  '2john': '2 John',
  '2 john': '2 John',
  '2jn': '2 John',
  '3john': '3 John',
  '3 john': '3 John',
  '3jn': '3 John',
  'jude': 'Jude',
  'rev': 'Revelation',
  'revelation': 'Revelation'
};

/**
 * Parse smart search input like "Jeremiah 39", "gen 1", "39"
 * @param {string} input - User search input
 * @returns {Object} - { book: string|null, chapter: number|null }
 */
export function parseSmartSearch(input) {
  if (!input) return { book: null, chapter: null };
  
  // Normalize: trim, lowercase, collapse spaces, replace dashes/underscores with spaces
  let normalized = input
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
  
  // Try to extract trailing chapter number
  const match = normalized.match(/(.*?)(\d+)\s*$/);
  
  if (!match) {
    // No number found, might be just a book name
    const bookName = BIBLE_BOOK_ALIASES[normalized];
    return { book: bookName || null, chapter: null };
  }
  
  const bookText = match[1].trim();
  const chapterNumber = parseInt(match[2]);
  
  // If no book text, it's just a chapter number
  if (!bookText) {
    return { book: null, chapter: chapterNumber };
  }
  
  // Try to resolve book name
  const bookName = BIBLE_BOOK_ALIASES[bookText];
  
  return {
    book: bookName || null,
    chapter: chapterNumber
  };
}