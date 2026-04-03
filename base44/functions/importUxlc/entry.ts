import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const FILE_URLS = [
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/9999ea7af_Gen.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/cafc6922b_Ex.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/d1ced9e6c_Lev.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/693422d0b_Num.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/9860377de_Deut.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/05579aae3_Josh.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/90a038901_Judg.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/ac39ba3db_Ruth.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/a10d08780_1Sam.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/c3182eb3f_2Sam.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/94c7ee92b_1Kings.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/df6e2ee03_2Kings.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/2d07fca8c_1Chr.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/75e27f2b0_2Chr.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/5b83d70ca_Ezra.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/13dd77373_Neh.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/f60cb869c_Esth.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/a18a50414_Job.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/50eb35824_Ps.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/3807b0812_Prov.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/5ce9a46c5_Eccl.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/5e3c6d15b_Song.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/d481875bc_Isa.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/87b05c1fc_Jer.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/567a896fe_Lam.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/f8c6c034e_Ezek.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/2dc7046b9_Dan.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/1cfcdcaa2_Hos.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/de8ddfef3_Joel.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/398687a7a_Am.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/96cffddc0_Ob.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/5309d9523_Jon.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/a43639a18_Mic.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/071749e79_Nah.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/d2794ed17_Hab.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/aa0705369_Zeph.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/9cab8ec08_Hag.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/e94876c1c_Zech.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/48436bc7f_Mal.txt'
];

const BOOK_CODE_TO_NAME = {
  Gen: 'Genesis',
  Ex: 'Exodus',
  Lev: 'Leviticus',
  Num: 'Numbers',
  Deut: 'Deuteronomy',
  Josh: 'Joshua',
  Judg: 'Judges',
  Ruth: 'Ruth',
  '1Sam': '1 Samuel',
  '2Sam': '2 Samuel',
  '1Kings': '1 Kings',
  '2Kings': '2 Kings',
  '1Chr': '1 Chronicles',
  '2Chr': '2 Chronicles',
  Ezra: 'Ezra',
  Neh: 'Nehemiah',
  Esth: 'Esther',
  Job: 'Job',
  Ps: 'Psalms',
  Prov: 'Proverbs',
  Eccl: 'Ecclesiastes',
  Song: 'Song of Solomon',
  Isa: 'Isaiah',
  Jer: 'Jeremiah',
  Lam: 'Lamentations',
  Ezek: 'Ezekiel',
  Dan: 'Daniel',
  Hos: 'Hosea',
  Joel: 'Joel',
  Am: 'Amos',
  Ob: 'Obadiah',
  Jon: 'Jonah',
  Mic: 'Micah',
  Nah: 'Nahum',
  Hab: 'Habakkuk',
  Zeph: 'Zephaniah',
  Hag: 'Haggai',
  Zech: 'Zechariah',
  Mal: 'Malachi'
};

const CHAPTER_REGEX = /^xxxx\s+Chapter\s+(\d+)/i;
const CONTROL_REGEX = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const VERSE_REGEX = /^(\d+)\s*׃\s*(\d+)\s+(.*)$/;

function cleanLine(line) {
  return line
    .replace(CONTROL_REGEX, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHebrewText(text) {
  return text
    .replace(CONTROL_REGEX, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\*[^*\s]+\s+\*\*([^\s]+)/g, '$1')
    .replace(/\s+[ספ]$/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBookFile(text, canonicalBook) {
  const records = [];
  const lines = text.replace(/^\uFEFF/, '').split('\n');
  let currentChapter = null;

  for (const rawLine of lines) {
    const line = cleanLine(rawLine.replace(/\r$/, ''));
    if (!line) continue;

    const chapterMatch = line.match(CHAPTER_REGEX);
    if (chapterMatch) {
      currentChapter = parseInt(chapterMatch[1], 10);
      continue;
    }

    const verseMatch = line.match(VERSE_REGEX);
    if (!verseMatch) continue;

    const [, verseStr, chapterStr, rawText] = verseMatch;
    const verse = parseInt(verseStr, 10);
    const chapter = currentChapter || parseInt(chapterStr, 10);
    const hebrewText = normalizeHebrewText(rawText);

    if (!hebrewText) continue;

    records.push({
      source_text: 'UXLC',
      book: canonicalBook,
      chapter,
      verse,
      hebrew_text: hebrewText,
      ref_key: `UXLC:${canonicalBook}:${chapter}:${verse}`
    });
  }

  return records;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.is_admin !== true) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const existing = await base44.asServiceRole.entities.HebrewSourceVerse.list('-created_date', 30000);
    const existingKeys = new Set(existing.map((item) => item.ref_key));

    const toCreate = [];
    let parsedCount = 0;
    let skippedCount = 0;

    for (const url of FILE_URLS) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch source file: ${url}`);
      }

      const text = await response.text();
      const fileName = url.split('/').pop() || '';
      const codeMatch = fileName.match(/_([A-Za-z0-9]+)\.txt$/);
      const code = codeMatch?.[1];
      const canonicalBook = BOOK_CODE_TO_NAME[code];

      if (!canonicalBook) {
        throw new Error(`Unknown book code: ${code || fileName}`);
      }

      const records = parseBookFile(text, canonicalBook);
      parsedCount += records.length;
      for (const record of records) {
        if (existingKeys.has(record.ref_key)) {
          skippedCount += 1;
          continue;
        }
        existingKeys.add(record.ref_key);
        toCreate.push(record);
      }
    }

    for (const batch of chunkArray(toCreate, 1000)) {
      await base44.asServiceRole.entities.HebrewSourceVerse.bulkCreate(batch);
    }

    return Response.json({
      ok: true,
      source_text: 'UXLC',
      parsed_count: parsedCount,
      inserted_count: toCreate.length,
      skipped_count: skippedCount,
      total_records: existingKeys.size
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});