import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const FILE_URLS = [
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/016540a93_Matt.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/2afedf230_Mark.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/48bbe6144_Luke.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/48da3a007_John.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/c34495dcc_Acts.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/07688b947_Rom.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/d868a6ebd_1Cor.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/3c4067059_2Cor.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/0734eef82_Gal.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/425cae6df_Eph.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/7b4593a64_Phil.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/1eaeb62c3_Col.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/2d16c67db_1Thess.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/e6b93b07c_2Thess.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/c8809acda_1Tim.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/9decde94d_2Tim.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/2dbe5b32d_Titus.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/32eb97893_Phlm.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/388079a7c_Heb.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/a57c9af55_Jas.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/c9669fc7c_1Pet.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/1e5ccced1_2Pet.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/e4985fd4f_1John.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/5b1f7ffb1_2John.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/0c27fd94a_3John.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/7964c4f4e_Jude.txt',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/dcf8c9f34_Rev.txt'
];

const BOOK_CODE_TO_NAME = {
  Matt: 'Matthew',
  Mark: 'Mark',
  Luke: 'Luke',
  John: 'John',
  Acts: 'Acts',
  Rom: 'Romans',
  '1Cor': '1 Corinthians',
  '2Cor': '2 Corinthians',
  Gal: 'Galatians',
  Eph: 'Ephesians',
  Phil: 'Philippians',
  Col: 'Colossians',
  '1Thess': '1 Thessalonians',
  '2Thess': '2 Thessalonians',
  '1Tim': '1 Timothy',
  '2Tim': '2 Timothy',
  Titus: 'Titus',
  Phlm: 'Philemon',
  Heb: 'Hebrews',
  Jas: 'James',
  '1Pet': '1 Peter',
  '2Pet': '2 Peter',
  '1John': '1 John',
  '2John': '2 John',
  '3John': '3 John',
  Jude: 'Jude',
  Rev: 'Revelation'
};

const VERSE_REGEX = /^([1-3]?[A-Za-z]+)\s+(\d+):(\d+)\s*(.*)$/;

function parseBookFile(text) {
  const records = [];
  const lines = text.replace(/^\uFEFF/, '').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '').trimEnd();
    const match = line.match(VERSE_REGEX);
    if (!match) continue;

    const [, code, chapterStr, verseStr, greekTextRaw] = match;
    const book = BOOK_CODE_TO_NAME[code];
    if (!book) continue;

    const chapter = parseInt(chapterStr, 10);
    const verse = parseInt(verseStr, 10);
    const greekText = greekTextRaw.trim();
    const refKey = `SBLGNT:${book}:${chapter}:${verse}`;

    records.push({
      source_text: 'SBLGNT',
      book,
      chapter,
      verse,
      greek_text: greekText,
      ref_key: refKey,
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

    const existing = await base44.asServiceRole.entities.GreekSourceVerse.list('-created_date', 10000);
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
      const records = parseBookFile(text);
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

    for (const batch of chunkArray(toCreate, 200)) {
      await base44.asServiceRole.entities.GreekSourceVerse.bulkCreate(batch);
    }

    return Response.json({
      ok: true,
      source_text: 'SBLGNT',
      parsed_count: parsedCount,
      inserted_count: toCreate.length,
      skipped_count: skippedCount,
      total_records: existingKeys.size,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});