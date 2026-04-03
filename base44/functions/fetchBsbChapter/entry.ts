import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BSB_FILE_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/e4e6f94ab_bsb.txt';

let cachedText = null;

async function getBsbText() {
  if (cachedText) return cachedText;
  const response = await fetch(BSB_FILE_URL);
  if (!response.ok) throw new Error('Failed to fetch BSB file');
  cachedText = await response.text();
  return cachedText;
}

function extractChapter(text, bookName, chapterNum) {
  const output = [];
  const prefix = `\n${bookName} ${chapterNum}:`;
  const altPrefix = bookName === 'Psalms' ? `\nPsalm ${chapterNum}:` : null;
  
  let searchPrefix = text.includes(prefix) ? prefix : (altPrefix && text.includes(altPrefix) ? altPrefix : null);
  
  if (!searchPrefix) {
    // Try without \n just in case it's the very first line (unlikely for verses)
    const exactPrefix = `${bookName} ${chapterNum}:`;
    const exactAlt = bookName === 'Psalms' ? `Psalm ${chapterNum}:` : null;
    if (text.startsWith(exactPrefix)) searchPrefix = exactPrefix;
    else if (exactAlt && text.startsWith(exactAlt)) searchPrefix = exactAlt;
    else return "";
  }

  let currentIndex = text.indexOf(searchPrefix);
  
  while (currentIndex !== -1) {
    const endOfLine = text.indexOf('\n', currentIndex + 1);
    const line = endOfLine === -1 
      ? text.substring(currentIndex + (searchPrefix.startsWith('\n') ? 1 : 0)) 
      : text.substring(currentIndex + (searchPrefix.startsWith('\n') ? 1 : 0), endOfLine);
    
    const colonIndex = line.indexOf(':');
    const tabIndex = line.indexOf('\t', colonIndex);
    
    if (colonIndex !== -1 && tabIndex !== -1) {
      const verseStr = line.substring(colonIndex + 1, tabIndex);
      const verseNum = parseInt(verseStr);
      const verseText = line.substring(tabIndex + 1).trim();
      
      if (!isNaN(verseNum)) {
        output.push(`~${verseNum} ${verseText}`);
      }
    }
    
    currentIndex = text.indexOf(searchPrefix, currentIndex + 1);
  }
  
  return output.join('\n');
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
      return Response.json(diagnostics, { status: 401 });
    }

    stage = 'input';
    diagnostics.stage = stage;
    
    const { book, chapter } = await req.json();
    if (!book || chapter === undefined) {
      diagnostics.error = 'Missing book or chapter';
      return Response.json(diagnostics, { status: 400 });
    }

    stage = 'fetch_file';
    diagnostics.stage = stage;
    
    const text = await getBsbText();

    stage = 'parse';
    diagnostics.stage = stage;
    
    const chapterText = extractChapter(text, book, parseInt(chapter));

    if (!chapterText) {
      diagnostics.error = `No content found for ${book} ${chapter}`;
      return Response.json(diagnostics, { status: 404 });
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
    return Response.json(diagnostics, { status: 500 });
  }
});