import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LSV_FILE_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/e9304a11f_TheHolyBibleLSV.txt';

// LSV abbreviation → standard book name mapping
const ABBREV_MAP = {
  'Gen': 'Genesis', 'Exo': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers',
  'Deu': 'Deuteronomy', 'Jos': 'Joshua', 'Jdg': 'Judges', 'Rth': 'Ruth',
  '1Sa': '1 Samuel', '2Sa': '2 Samuel', '1Ki': '1 Kings', '2Ki': '2 Kings',
  '1Ch': '1 Chronicles', '2Ch': '2 Chronicles', 'Ezr': 'Ezra', 'Neh': 'Nehemiah',
  'Est': 'Esther', 'Job': 'Job', 'Psa': 'Psalms', 'Pro': 'Proverbs',
  'Ecc': 'Ecclesiastes', 'Sol': 'Song of Solomon', 'Isa': 'Isaiah', 'Jer': 'Jeremiah',
  'Lam': 'Lamentations', 'Eze': 'Ezekiel', 'Dan': 'Daniel', 'Hos': 'Hosea',
  'Joe': 'Joel', 'Amo': 'Amos', 'Oba': 'Obadiah', 'Jon': 'Jonah',
  'Mic': 'Micah', 'Nah': 'Nahum', 'Hab': 'Habakkuk', 'Zep': 'Zephaniah',
  'Hag': 'Haggai', 'Zec': 'Zechariah', 'Mal': 'Malachi',
  'Mat': 'Matthew', 'Mar': 'Mark', 'Luk': 'Luke', 'Joh': 'John',
  'Act': 'Acts', 'Rom': 'Romans', '1Co': '1 Corinthians', '2Co': '2 Corinthians',
  'Gal': 'Galatians', 'Eph': 'Ephesians', 'Phi': 'Philippians', 'Col': 'Colossians',
  '1Th': '1 Thessalonians', '2Th': '2 Thessalonians', '1Ti': '1 Timothy', '2Ti': '2 Timothy',
  'Tit': 'Titus', 'Phm': 'Philemon', 'Heb': 'Hebrews', 'Jam': 'James',
  '1Pe': '1 Peter', '2Pe': '2 Peter', '1Jo': '1 John', '2Jo': '2 John',
  '3Jo': '3 John', 'Jud': 'Jude', 'Rev': 'Revelation'
};

// Reverse map: book name → abbreviation
const NAME_TO_ABBREV = {};
for (const [abbr, name] of Object.entries(ABBREV_MAP)) {
  NAME_TO_ABBREV[name] = abbr;
}

// Verse line regex: "Abbr Chapter:Verse Text..."
// The file may have trailing \r or spaces, so we trim each line before matching
const VERSE_LINE_REGEX = /^([A-Za-z0-9]+)\s+(\d+):(\d+)\s+(.+)$/;

// Cache the parsed file in memory (lives as long as the function instance)
let cachedLines = null;

async function getLsvLines() {
  if (cachedLines) return cachedLines;
  const response = await fetch(LSV_FILE_URL);
  if (!response.ok) throw new Error('Failed to fetch LSV file');
  const text = await response.text();
  cachedLines = text.split('\n').map(l => l.replace(/\r$/, ''));
  return cachedLines;
}

/**
 * Extract a specific chapter from the LSV file.
 * Returns prepared format: ### Header + ~N verse text
 */
function extractChapter(lines, bookAbbrev, chapterNum) {
  const output = [];
  let prevPsalmTitle = null;
  
  for (const line of lines) {
    const match = line.match(VERSE_LINE_REGEX);
    if (!match) continue;
    
    const [, abbr, ch, vs, text] = match;
    if (abbr !== bookAbbrev || parseInt(ch) !== chapterNum) continue;
    
    const verseNum = parseInt(vs);
    let verseText = text.trim();
    
    // For Psalms, extract psalm superscription headers (e.g., "TO THE OVERSEER. A PSALM OF DAVID.")
    // These appear as ALL CAPS text at the start of verse 1
    if (verseNum === 1 && bookAbbrev === 'Psa') {
      // Check for ALL-CAPS header at the beginning (psalm titles)
      const headerMatch = verseText.match(/^([A-Z\s.,;:'"!?\-—–]+?(?:PSALM|SONG|PRAYER|MASKIL|MIKTAM|SHIGGAION)[A-Z\s.,;:'"!?\-—–]*?)\s+(?=[A-Z][a-z])/);
      if (headerMatch) {
        const headerText = headerMatch[1].trim().replace(/\.$/, '');
        output.push(`### ${headerText}`);
        verseText = verseText.substring(headerMatch[0].length - 1).trim();
      } else {
        // Try simpler pattern: starts with caps section before lowercase
        const simpleHeader = verseText.match(/^((?:[A-Z][A-Z\s.,;:'"!?\-—–]+?)\.\s*)/);
        if (simpleHeader && simpleHeader[1].length > 10) {
          const headerText = simpleHeader[1].trim().replace(/\.\s*$/, '');
          output.push(`### ${headerText}`);
          verseText = verseText.substring(simpleHeader[0].length).trim();
        }
      }
    }
    
    output.push(`~${verseNum} ${verseText}`);
  }
  
  return output.join('\n');
}

/**
 * Extract preface/copyright text sections.
 */
function extractSpecialSection(lines, sectionName) {
  const output = [];
  let capturing = false;
  let searchText;
  
  if (sectionName === 'Copyright') {
    searchText = 'COPYRIGHT INFORMATION';
  } else if (sectionName === 'Preface') {
    searchText = 'PREFACE TO THE LSV';
  } else if (sectionName === 'Introduction') {
    searchText = 'INTRODUCTION TO THE LSV';
  } else {
    return '';
  }
  
  // End markers
  const endRegex = /^-{5,}/;
  
  let foundTitle = false;
  let skippedPostDivider = false;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // Look for the section title
    if (!capturing && !foundTitle && trimmed.includes(searchText)) {
      foundTitle = true;
      continue;
    }
    
    // After finding title, skip the closing divider line
    if (foundTitle && !capturing) {
      if (endRegex.test(trimmed) || trimmed === '') {
        // skip dividers and blank lines right after title
        if (endRegex.test(trimmed)) {
          capturing = true; // start capturing after the closing divider
        }
        continue;
      }
      // If no divider found, start capturing anyway
      capturing = true;
    }
    
    if (capturing) {
      // Check if we hit the next section divider (end of this section)
      if (endRegex.test(trimmed)) {
        break;
      }
      
      // Also stop if we hit the first verse line (e.g., "Gen 1:1 ...")
      if (VERSE_LINE_REGEX.test(trimmed)) {
        break;
      }
      
      output.push(lines[i]);
    }
  }
  
  // Convert to a simple prose block (no verse markers)
  // Use ~0 to signal it's a prose block
  const text = output.join('\n').trim();
  if (!text) return '';
  
  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/);
  const prepared = [];
  
  paragraphs.forEach((para, idx) => {
    const cleaned = para.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned) {
      // Check if it's a subheading (starts with ---)
      if (cleaned.startsWith('---') && cleaned.endsWith('---')) {
        const heading = cleaned.replace(/^-+\s*/, '').replace(/\s*-+$/, '');
        prepared.push(`### ${heading}`);
      } else if (cleaned.startsWith('*')) {
        // Bullet points
        prepared.push(`~${idx + 1} ${cleaned}`);
      } else {
        prepared.push(`~${idx + 1} ${cleaned}`);
      }
    }
  });
  
  return prepared.join('\n');
}

Deno.serve(async (req) => {
  let stage = 'input';
  const diagnostics = {
    ok: false,
    stage: 'input',
    error: null,
  };

  try {
    stage = 'auth';
    diagnostics.stage = stage;
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      diagnostics.error = 'Unauthorized';
      return Response.json(diagnostics, { status: 200 });
    }

    stage = 'input';
    diagnostics.stage = stage;
    
    const { book, chapter } = await req.json();
    if (!book || chapter === undefined) {
      diagnostics.error = 'Missing book or chapter';
      return Response.json(diagnostics, { status: 200 });
    }

    stage = 'fetch_file';
    diagnostics.stage = stage;
    
    const lines = await getLsvLines();

    stage = 'parse';
    diagnostics.stage = stage;
    
    let chapterText = '';
    
    // Handle special sections
    const specialSections = ['Copyright', 'Preface', 'Introduction'];
    if (specialSections.includes(book)) {
      chapterText = extractSpecialSection(lines, book);
    } else {
      // Regular Bible chapter
      const abbrev = NAME_TO_ABBREV[book];
      if (!abbrev) {
        diagnostics.error = `Unknown book: ${book}`;
        return Response.json(diagnostics, { status: 200 });
      }
      
      chapterText = extractChapter(lines, abbrev, parseInt(chapter));
    }

    if (!chapterText) {
      diagnostics.error = `No content found for ${book} ${chapter}`;
      return Response.json(diagnostics, { status: 200 });
    }

    diagnostics.ok = true;
    diagnostics.stage = 'done';
    
    return Response.json({
      ok: true,
      text: chapterText,
      diagnostics
    }, { status: 200 });

  } catch (error) {
    diagnostics.error = `Error at ${stage}: ${error.message}`;
    return Response.json(diagnostics, { status: 200 });
  }
});