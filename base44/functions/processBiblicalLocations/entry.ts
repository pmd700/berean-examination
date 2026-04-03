import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOOK_CHAPTERS = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
  Joshua: 24, Judges: 21, Ruth: 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150,
  Proverbs: 31, Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66,
  Jeremiah: 52, Lamentations: 5, Ezekiel: 48, Daniel: 12, Hosea: 14,
  Joel: 4, Amos: 9, Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3,
  Habakkuk: 3, Zephaniah: 3, Haggai: 2, Zechariah: 14, Malachi: 4,
  Matthew: 28, Mark: 16, Luke: 24, John: 21, Acts: 28, Romans: 16,
  '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6, Ephesians: 6,
  Philippians: 4, Colossians: 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, Titus: 3, Philemon: 1, Hebrews: 13,
  James: 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1,
  '3 John': 1, Jude: 1, Revelation: 22
};

const ABBREV_TO_BOOK = {
  Gen: 'Genesis', Exod: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deut: 'Deuteronomy',
  Josh: 'Joshua', Judg: 'Judges', Ruth: 'Ruth', '1Sam': '1 Samuel', '2Sam': '2 Samuel',
  '1Kgs': '1 Kings', '2Kgs': '2 Kings', '1Chr': '1 Chronicles', '2Chr': '2 Chronicles',
  Ezra: 'Ezra', Neh: 'Nehemiah', Esth: 'Esther', Job: 'Job', Ps: 'Psalms',
  Prov: 'Proverbs', Eccl: 'Ecclesiastes', Song: 'Song of Solomon', Isa: 'Isaiah',
  Jer: 'Jeremiah', Lam: 'Lamentations', Ezek: 'Ezekiel', Dan: 'Daniel', Hos: 'Hosea',
  Joel: 'Joel', Amos: 'Amos', Obad: 'Obadiah', Jonah: 'Jonah', Mic: 'Micah',
  Nah: 'Nahum', Hab: 'Habakkuk', Zeph: 'Zephaniah', Hag: 'Haggai', Zech: 'Zechariah',
  Mal: 'Malachi', Matt: 'Matthew', Mark: 'Mark', Luke: 'Luke', John: 'John',
  Acts: 'Acts', Rom: 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians',
  Gal: 'Galatians', Eph: 'Ephesians', Phil: 'Philippians', Col: 'Colossians',
  '1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians', '1Tim': '1 Timothy',
  '2Tim': '2 Timothy', Titus: 'Titus', Phlm: 'Philemon', Heb: 'Hebrews',
  Jas: 'James', '1Pet': '1 Peter', '2Pet': '2 Peter', '1John': '1 John',
  '2John': '2 John', '3John': '3 John', Jude: 'Jude', Rev: 'Revelation'
};

const NEW_TESTAMENT_BOOKS = new Set([
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation'
]);

function normalizeAbbrev(raw) {
  return raw.replace(/\s+/g, '');
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function validateReferenceExistence(_base44, refs, _chapterCache = new Map()) {
  const errors = [];

  for (const ref of refs) {
    if (ref.verse < 1 || ref.verse > 176) {
      errors.push(`Invalid verse reference: ${ref.abbrev} ${ref.chapter}:${ref.verse}`);
    }
  }

  return errors;
}

function parseReferenceString(verseString) {
  const parts = verseString.split(',').map((part) => part.trim()).filter(Boolean);
  const refs = [];
  const errors = [];
  let currentBook = null;
  let currentAbbrev = null;

  for (const part of parts) {
    const fullMatch = part.match(/^([1-3]?[A-Za-z]+)\s+(\d{1,3}):(\d{1,3})$/);
    const continuationMatch = part.match(/^(\d{1,3}):(\d{1,3})$/);
    const singleChapterFullMatch = part.match(/^([1-3]?[A-Za-z]+)\s+(\d{1,3})$/);
    const singleChapterContinuationMatch = part.match(/^(\d{1,3})$/);

    if (fullMatch) {
      const abbrev = normalizeAbbrev(fullMatch[1]);
      const book = ABBREV_TO_BOOK[abbrev];
      if (!book) {
        errors.push(`Unknown book abbreviation: ${abbrev}`);
        continue;
      }

      const chapter = parseInt(fullMatch[2], 10);
      const verse = parseInt(fullMatch[3], 10);
      if (chapter < 1 || chapter > (BOOK_CHAPTERS[book] || 0)) {
        errors.push(`Invalid chapter for ${abbrev}: ${chapter}`);
        continue;
      }

      currentBook = book;
      currentAbbrev = abbrev;
      refs.push({ book, abbrev, chapter, verse });
      continue;
    }

    if (continuationMatch) {
      if (!currentBook || !currentAbbrev) {
        errors.push(`Missing book abbreviation before reference: ${part}`);
        continue;
      }

      const chapter = parseInt(continuationMatch[1], 10);
      const verse = parseInt(continuationMatch[2], 10);
      if (chapter < 1 || chapter > (BOOK_CHAPTERS[currentBook] || 0)) {
        errors.push(`Invalid chapter for ${currentAbbrev}: ${chapter}`);
        continue;
      }

      refs.push({ book: currentBook, abbrev: currentAbbrev, chapter, verse });
      continue;
    }

    if (singleChapterFullMatch) {
      const abbrev = normalizeAbbrev(singleChapterFullMatch[1]);
      const book = ABBREV_TO_BOOK[abbrev];
      if (!book) {
        errors.push(`Unknown book abbreviation: ${abbrev}`);
        continue;
      }
      if ((BOOK_CHAPTERS[book] || 0) !== 1) {
        errors.push(`Invalid reference format: ${part}`);
        continue;
      }

      const verse = parseInt(singleChapterFullMatch[2], 10);
      currentBook = book;
      currentAbbrev = abbrev;
      refs.push({ book, abbrev, chapter: 1, verse });
      continue;
    }

    if (singleChapterContinuationMatch) {
      if (!currentBook || !currentAbbrev || (BOOK_CHAPTERS[currentBook] || 0) !== 1) {
        errors.push(`Invalid reference format: ${part}`);
        continue;
      }

      const verse = parseInt(singleChapterContinuationMatch[1], 10);
      refs.push({ book: currentBook, abbrev: currentAbbrev, chapter: 1, verse });
      continue;
    }

    errors.push(`Invalid reference format: ${part}`);
  }

  return { refs, errors };
}


function normalizeReferenceString(refs) {
  return refs.map((ref, index) => {
    const prev = refs[index - 1];
    if (prev && prev.book === ref.book) {
      return `${ref.chapter}:${ref.verse}`;
    }
    return `${ref.abbrev} ${ref.chapter}:${ref.verse}`;
  }).join(', ');
}

function parseImportBlocks(fileText) {
  const blocks = fileText
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const name = lines[0] || '';
    const verseLine = lines.slice(1).join(' ').trim();
    return { index: index + 1, name, verseLine };
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.is_admin && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const mode = payload.mode || 'validate';

    if (mode === 'validate') {
      const verseString = String(payload.verseString || '').trim();
      if (!verseString) {
        return Response.json({ valid: false, errors: ['Bible Verses is required'] });
      }

      const { refs, errors: parseErrors } = parseReferenceString(verseString);
      const existenceErrors = parseErrors.length ? [] : await validateReferenceExistence(base44, refs);
      const errors = [...parseErrors, ...existenceErrors];

      return Response.json({
        valid: errors.length === 0,
        errors,
        normalized: errors.length === 0 ? normalizeReferenceString(refs) : null,
        totalReferences: refs.length,
      });
    }

    if (mode === 'import') {
      const fileText = String(payload.fileText || '');
      const blocks = parseImportBlocks(fileText);
      const results = [];
      const validRows = [];
      const chapterCache = new Map();
      let skipped = 0;

      for (const block of blocks) {
        if (!block.name && !block.verseLine) continue;

        if (!block.name || !block.verseLine) {
          skipped += 1;
          results.push({ row: block.index, location: block.name || '(missing name)', reason: 'Missing location name or verse line' });
          continue;
        }

        const { refs, errors: parseErrors } = parseReferenceString(block.verseLine);
        const existenceErrors = parseErrors.length ? [] : await validateReferenceExistence(base44, refs, chapterCache);
        const errors = [...parseErrors, ...existenceErrors];

        if (errors.length > 0) {
          skipped += 1;
          results.push({ row: block.index, location: block.name, reason: errors.join('; ') });
          continue;
        }

        validRows.push({
          biblical_location_name: block.name.trim(),
          bible_verses: normalizeReferenceString(refs)
        });
      }

      for (const batch of chunkArray(validRows, 100)) {
        await base44.asServiceRole.entities.BiblicalLocation.bulkCreate(batch);
      }

      return Response.json({
        totalParsed: blocks.length,
        totalImported: validRows.length,
        totalSkipped: skipped,
        errors: results,
      });
    }

    return Response.json({ error: 'Unsupported mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});