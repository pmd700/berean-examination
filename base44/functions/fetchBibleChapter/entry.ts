import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Convert raw Bible text (with [1], [2] verse markers) to prepared format
 * Output: ### Headers and ~N verse text
 */
function convertToPreparedFormat(rawText) {
  if (!rawText) return '';
  
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
  const output = [];
  let currentVerseNum = null;
  let currentVerseText = [];
  
  const saveCurrentVerse = () => {
    if (currentVerseNum !== null && currentVerseText.length > 0) {
      output.push(`~${currentVerseNum} ${currentVerseText.join(' ')}`);
      currentVerseNum = null;
      currentVerseText = [];
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    
    // Check if this line contains verse markers [1], [2], etc.
    const versePattern = /\[(\d+)\]/g;
    let match;
    const verses = [];
    
    while ((match = versePattern.exec(line)) !== null) {
      verses.push({
        index: match.index,
        number: parseInt(match[1], 10),
        length: match[0].length
      });
    }
    
    if (verses.length > 0) {
      // Line has verse markers
      for (let j = 0; j < verses.length; j++) {
        // Save previous verse
        saveCurrentVerse();
        
        // Start new verse
        currentVerseNum = verses[j].number;
        const startIdx = verses[j].index + verses[j].length;
        const endIdx = j < verses.length - 1 ? verses[j + 1].index : line.length;
        const verseText = line.substring(startIdx, endIdx).trim();
        
        currentVerseText = verseText ? [verseText] : [];
      }
    } else {
      // No verse markers - check if header or continuation
      const nextHasVerse = /\[\d+\]/.test(nextLine);
      const isShort = line.length <= 80;
      const startsWithCapital = /^[A-Z]/.test(line);
      const hasQuotes = /["'""''"]/.test(line);
      
      // Treat as header if:
      // 1. First line before any verses (chapter opening header), OR
      // 2. Standalone line between verses (no quotes, reasonable length, starts with capital)
      const isHeader = (i === 0 && currentVerseNum === null) || 
                       (currentVerseNum !== null && nextHasVerse && !hasQuotes && isShort && startsWithCapital);
      
      if (isHeader) {
        // Save any previous verse
        saveCurrentVerse();
        output.push(`### ${line}`);
      } else if (currentVerseNum !== null) {
        // Continuation of current verse
        currentVerseText.push(line);
      }
    }
  }
  
  // Save final verse
  saveCurrentVerse();
  
  return output.join('\n').trim();
}

/**
 * Convert NLT API HTML response to prepared format (### headers, ~N verses)
 * NLT HTML uses <span class="verse-num"> for verse numbers and <h3> for section headers
 */
function convertNltHtmlToPrepared(html) {
  const output = [];
  
  // Remove everything outside the bibletext div if present
  let cleaned = html;
  const bibletextMatch = html.match(/<div[^>]*id="bibletext"[^>]*>([\s\S]*)<\/div>\s*<\/body>/i);
  if (bibletextMatch) {
    cleaned = bibletextMatch[1];
  }
  
  // Remove style/script tags and their content
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Extract section headers: <h3>, <h4>, or class="heading" elements
  // Replace them with a marker we can find later
  let markerIdx = 0;
  const headerMap = {};
  
  // Remove chapter number headers (e.g. "John 3") and reference headers (e.g. "John 3:1-36, NLT")
  cleaned = cleaned.replace(/<h2[^>]*class="[^"]*(?:chapter-number|bk_ch_vs_header)[^"]*"[^>]*>[\s\S]*?<\/h2>/gi, '');
  // Also remove <h3> psalm headers like "Psalm 23" (class="psalm-title" or similar)
  cleaned = cleaned.replace(/<h3[^>]*class="[^"]*psalm[^"]*"[^>]*>[\s\S]*?<\/h3>/gi, '');
  
  // Extract section headers: <h3>, <h4> elements
  cleaned = cleaned.replace(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi, (match, content) => {
    const headerText = content.replace(/<[^>]+>/g, '').trim();
    if (headerText) {
      const marker = `%%%HEADER_${markerIdx}%%%`;
      headerMap[marker] = headerText;
      markerIdx++;
      return marker;
    }
    return '';
  });
  
  // Remove verse_export tags (NLT-specific wrapper elements)
  cleaned = cleaned.replace(/<\/?verse_export[^>]*>/gi, '');
  
  // Extract verse numbers: <span class="vn"> or <span class="verse-num"> patterns
  // Replace with %%%VERSE_N%%% markers
  cleaned = cleaned.replace(/<span[^>]*class="[^"]*(?:vn|verse-num)[^"]*"[^>]*>\s*(\d+)\s*<\/span>/gi, (match, num) => {
    return `%%%VERSE_${num}%%%`;
  });
  // Also handle <sup> verse numbers
  cleaned = cleaned.replace(/<sup[^>]*class="[^"]*(?:vn|verse-num)[^"]*"[^>]*>\s*(\d+)\s*<\/sup>/gi, (match, num) => {
    return `%%%VERSE_${num}%%%`;
  });
  
  // Remove NLT footnotes completely using a custom approach:
  // The structure is: <a class="a-tn">*</a><span class="tn">...footnote text with inner tags...</span>
  // We need to handle nested tags inside the tn span, so use a manual parser
  function removeNltFootnotes(html) {
    // Remove <a class="a-tn">...</a> markers
    let result = html.replace(/<a[^>]*class="[^"]*a-tn[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
    
    // Remove <span class="tn">...</span> including nested tags
    // Find each <span class="tn"> and track nesting depth to find its matching </span>
    let output = '';
    let i = 0;
    while (i < result.length) {
      const tnMatch = result.substring(i).match(/^<span[^>]*class="[^"]*\btn\b[^"]*"[^>]*>/i);
      if (tnMatch) {
        // Found a tn span - skip everything until we find its matching </span>
        let depth = 1;
        let j = i + tnMatch[0].length;
        while (j < result.length && depth > 0) {
          if (result.substring(j).match(/^<span[\s>]/i)) {
            depth++;
            const closeTag = result.indexOf('>', j);
            j = closeTag >= 0 ? closeTag + 1 : j + 1;
          } else if (result.substring(j, j + 7).toLowerCase() === '</span>') {
            depth--;
            if (depth === 0) {
              j += 7; // skip past </span>
              break;
            }
            j += 7;
          } else {
            j++;
          }
        }
        i = j;
      } else {
        output += result[i];
        i++;
      }
    }
    return output;
  }
  cleaned = removeNltFootnotes(cleaned);
  
  // Also remove generic note classes
  cleaned = cleaned.replace(/<a[^>]*class="[^"]*note[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
  cleaned = cleaned.replace(/<span[^>]*class="[^"]*note[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '');
  
  // Remove all remaining HTML tags
  cleaned = cleaned.replace(/<br\s*\/?>/gi, ' ');
  cleaned = cleaned.replace(/<\/p>/gi, '\n');
  cleaned = cleaned.replace(/<\/div>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&rsquo;/g, '\u2019');
  cleaned = cleaned.replace(/&lsquo;/g, '\u2018');
  cleaned = cleaned.replace(/&rdquo;/g, '\u201D');
  cleaned = cleaned.replace(/&ldquo;/g, '\u201C');
  cleaned = cleaned.replace(/&mdash;/g, '\u2014');
  cleaned = cleaned.replace(/&ndash;/g, '\u2013');
  cleaned = cleaned.replace(/&#\d+;/g, (match) => {
    const code = parseInt(match.replace(/&#|;/g, ''));
    return String.fromCharCode(code);
  });
  
  // Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  // Now process line by line, looking for markers
  const lines = cleaned.split('\n');
  let currentVerseNum = null;
  let currentVerseText = [];
  
  const saveVerse = () => {
    if (currentVerseNum !== null && currentVerseText.length > 0) {
      const text = currentVerseText.join(' ').replace(/\s+/g, ' ').trim();
      if (text) {
        output.push(`~${currentVerseNum} ${text}`);
      }
      currentVerseText = [];
    }
  };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Split line into segments by markers
    const segments = trimmed.split(/(%%%(?:HEADER|VERSE)_\d+%%%)/);
    
    for (const seg of segments) {
      const headerMatch = seg.match(/^%%%HEADER_(\d+)%%%$/);
      const verseMatch = seg.match(/^%%%VERSE_(\d+)%%%$/);
      
      if (headerMatch) {
        saveVerse();
        currentVerseNum = null;
        const headerText = headerMap[seg];
        if (headerText) {
          output.push(`### ${headerText}`);
        }
      } else if (verseMatch) {
        saveVerse();
        currentVerseNum = parseInt(verseMatch[1], 10);
        currentVerseText = [];
      } else {
        const text = seg.trim();
        if (text && currentVerseNum !== null) {
          currentVerseText.push(text);
        } else if (text && currentVerseNum === null && output.length === 0) {
          // Text before any verse - could be chapter header
          if (text.length <= 120 && !/\d/.test(text)) {
            output.push(`### ${text}`);
          }
        }
      }
    }
  }
  
  saveVerse();
  
  return output.join('\n').trim();
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout after 9 seconds');
    }
    throw error;
  }
}

Deno.serve(async (req) => {
  // ALWAYS return HTTP 200 with structured JSON - never crash
  let stage = 'input';
  const diagnostics = {
    ok: false,
    stage: 'input',
    version: null,
    book: null,
    chapter: null,
    envHasEsvKey: !!Deno.env.get('ESV_API_KEY'),
    envHasNltKey: !!Deno.env.get('NLT_API_KEY'),
    error: null,
    upstreamStatus: null,
    upstreamErrorMessage: null,
    upstreamBody: null
  };

  try {
    // Stage: Auth
    stage = 'auth';
    diagnostics.stage = stage;
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      diagnostics.error = 'Unauthorized - no user session';
      return Response.json(diagnostics, { status: 200 });
    }

    // Stage: Input validation
    stage = 'input';
    diagnostics.stage = stage;
    
    const { version, book, chapter } = await req.json();
    diagnostics.version = version;
    diagnostics.book = book;
    diagnostics.chapter = chapter;

    if (!version || !book || !chapter) {
      diagnostics.error = 'Missing required parameters: version, book, or chapter';
      return Response.json(diagnostics, { status: 200 });
    }

    // Stage: Upstream fetch
    stage = 'upstream_fetch';
    diagnostics.stage = stage;
    
    let chapterText = '';

    if (version === 'ESV') {
      const esvApiKey = Deno.env.get('ESV_API_KEY');
      if (!esvApiKey) {
        diagnostics.error = 'ESV_API_KEY environment variable not set';
        return Response.json(diagnostics, { status: 200 });
      }

      let response;
      try {
        response = await fetchWithTimeout(
          `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(book)}+${chapter}&include-headings=true&include-verse-numbers=true&include-footnotes=false&include-short-copyright=false`,
          {
            headers: {
              'Authorization': `Token ${esvApiKey}`
            }
          }
        );
      } catch (fetchError) {
        diagnostics.upstreamErrorMessage = fetchError.message;
        diagnostics.error = `Failed to reach ESV API: ${fetchError.message}`;
        return Response.json(diagnostics, { status: 200 });
      }

      diagnostics.upstreamStatus = response.status;

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
          diagnostics.upstreamBody = errorBody.substring(0, 300);
        } catch {}
        diagnostics.upstreamErrorMessage = `ESV API returned ${response.status}`;
        diagnostics.error = `Failed to fetch ESV text (HTTP ${response.status})`;
        return Response.json(diagnostics, { status: 200 });
      }

      const data = await response.json();
      const rawText = data.passages?.[0] || '';
      
      if (!rawText || rawText.length === 0) {
        diagnostics.error = 'ESV API returned empty text (check book/chapter validity)';
        return Response.json(diagnostics, { status: 200 });
      }
      
      // Stage: Transform
      stage = 'transform';
      diagnostics.stage = stage;
      chapterText = convertToPreparedFormat(rawText);

    } else if (version === 'KJV') {
      let response;
      try {
        response = await fetchWithTimeout(
          `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=kjv`
        );
      } catch (fetchError) {
        diagnostics.upstreamErrorMessage = fetchError.message;
        diagnostics.error = `Failed to reach Bible API: ${fetchError.message}`;
        return Response.json(diagnostics, { status: 200 });
      }

      diagnostics.upstreamStatus = response.status;

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
          diagnostics.upstreamBody = errorBody.substring(0, 300);
        } catch {}
        diagnostics.upstreamErrorMessage = `Bible API returned ${response.status}`;
        diagnostics.error = `Failed to fetch KJV text (HTTP ${response.status})`;
        return Response.json(diagnostics, { status: 200 });
      }

      const data = await response.json();
      
      // Format KJV response to match our expected format
      let rawText = '';
      if (data.verses && data.verses.length > 0) {
        rawText = data.verses.map(v => `[${v.verse}] ${v.text}`).join('\n\n');
      }
      
      if (!rawText || rawText.length === 0) {
        diagnostics.error = 'Bible API returned empty verses (check book/chapter validity)';
        return Response.json(diagnostics, { status: 200 });
      }
      
      // Stage: Transform
      stage = 'transform';
      diagnostics.stage = stage;
      chapterText = convertToPreparedFormat(rawText);
      
    } else if (version === 'NLT') {
      const nltApiKey = Deno.env.get('NLT_API_KEY');
      if (!nltApiKey) {
        diagnostics.error = 'NLT_API_KEY environment variable not set';
        return Response.json(diagnostics, { status: 200 });
      }

      // NLT API uses Book.Chapter format (e.g. "John.3", "1Corinthians.13")
      // Convert book name to NLT ref format: remove spaces for numbered books
      const nltBook = book.replace(/\s+/g, '');
      const nltRef = `${nltBook}.${chapter}`;

      let response;
      try {
        response = await fetchWithTimeout(
          `https://api.nlt.to/api/passages?ref=${encodeURIComponent(nltRef)}&version=NLT&key=${encodeURIComponent(nltApiKey)}`
        );
      } catch (fetchError) {
        diagnostics.upstreamErrorMessage = fetchError.message;
        diagnostics.error = `Failed to reach NLT API: ${fetchError.message}`;
        return Response.json(diagnostics, { status: 200 });
      }

      diagnostics.upstreamStatus = response.status;

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
          diagnostics.upstreamBody = errorBody.substring(0, 300);
        } catch {}
        diagnostics.upstreamErrorMessage = `NLT API returned ${response.status}`;
        diagnostics.error = `Failed to fetch NLT text (HTTP ${response.status})`;
        return Response.json(diagnostics, { status: 200 });
      }

      const html = await response.text();

      if (!html || html.length === 0 || html.includes('No passages found')) {
        diagnostics.error = 'NLT API returned empty or not found (check book/chapter validity)';
        return Response.json(diagnostics, { status: 200 });
      }

      // Stage: Transform NLT HTML to prepared format
      stage = 'transform';
      diagnostics.stage = stage;
      chapterText = convertNltHtmlToPrepared(html);

    } else {
      diagnostics.error = `Unsupported version: ${version} (only ESV, KJV, and NLT supported)`;
      return Response.json(diagnostics, { status: 200 });
    }

    if (!chapterText || chapterText.length === 0) {
      diagnostics.error = 'Text conversion produced empty result';
      return Response.json(diagnostics, { status: 200 });
    }

    // Stage: Done
    stage = 'done';
    diagnostics.stage = stage;
    diagnostics.ok = true;
    diagnostics.error = null;

    return Response.json({ 
      ok: true,
      text: chapterText,
      diagnostics
    }, { status: 200 });

  } catch (error) {
    // Top-level catch: always return JSON, never crash
    diagnostics.error = `Unexpected error at stage ${stage}: ${error.message}`;
    diagnostics.stage = stage;
    return Response.json(diagnostics, { status: 200 });
  }
});