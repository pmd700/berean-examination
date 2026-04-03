import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import JSZip from 'npm:jszip@3.10.1';
import { XMLParser } from 'npm:fast-xml-parser@4.5.0';

const SOURCE_CATEGORIES = ['approved_locations_txt', 'openbible_ancient', 'openbible_modern', 'openbible_geometry', 'openbible_geojson', 'openbible_kml', 'other_reference'];
const FILE_TYPE_MAP = { txt: 'txt', text: 'txt', jsonl: 'jsonl', geojson: 'geojson', json: 'geojson', kml: 'kml', kmz: 'kmz', zip: 'zip' };

const BOOK_CHAPTERS = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34, Joshua: 24, Judges: 21, Ruth: 4,
  '1 Samuel': 31, '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150, Proverbs: 31, Ecclesiastes: 12, 'Song of Solomon': 8,
  Isaiah: 66, Jeremiah: 52, Lamentations: 5, Ezekiel: 48, Daniel: 12, Hosea: 14, Joel: 4, Amos: 9, Obadiah: 1,
  Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3, Zephaniah: 3, Haggai: 2, Zechariah: 14, Malachi: 4,
  Matthew: 28, Mark: 16, Luke: 24, John: 21, Acts: 28, Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13,
  Galatians: 6, Ephesians: 6, Philippians: 4, Colossians: 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, Titus: 3, Philemon: 1, Hebrews: 13, James: 5, '1 Peter': 5, '2 Peter': 3,
  '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1, Revelation: 22
};

const ABBREV_TO_BOOK = {
  Gen: 'Genesis', Exod: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deut: 'Deuteronomy', Josh: 'Joshua', Judg: 'Judges', Ruth: 'Ruth',
  '1Sam': '1 Samuel', '2Sam': '2 Samuel', '1Kgs': '1 Kings', '2Kgs': '2 Kings', '1Chr': '1 Chronicles', '2Chr': '2 Chronicles',
  Ezra: 'Ezra', Neh: 'Nehemiah', Esth: 'Esther', Job: 'Job', Ps: 'Psalms', Prov: 'Proverbs', Eccl: 'Ecclesiastes', Song: 'Song of Solomon',
  Isa: 'Isaiah', Jer: 'Jeremiah', Lam: 'Lamentations', Ezek: 'Ezekiel', Dan: 'Daniel', Hos: 'Hosea', Joel: 'Joel', Amos: 'Amos', Obad: 'Obadiah',
  Jonah: 'Jonah', Mic: 'Micah', Nah: 'Nahum', Hab: 'Habakkuk', Zeph: 'Zephaniah', Hag: 'Haggai', Zech: 'Zechariah', Mal: 'Malachi',
  Matt: 'Matthew', Mark: 'Mark', Luke: 'Luke', John: 'John', Acts: 'Acts', Rom: 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians',
  Gal: 'Galatians', Eph: 'Ephesians', Phil: 'Philippians', Col: 'Colossians', '1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians',
  '1Tim': '1 Timothy', '2Tim': '2 Timothy', Titus: 'Titus', Phlm: 'Philemon', Heb: 'Hebrews', Jas: 'James', '1Pet': '1 Peter', '2Pet': '2 Peter',
  '1John': '1 John', '2John': '2 John', '3John': '3 John', Jude: 'Jude', Rev: 'Revelation'
};

function detectFileType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  return FILE_TYPE_MAP[ext] || 'unknown';
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function similarityScore(a, b) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.88;
  const aTokens = new Set(left.split(' '));
  const bTokens = new Set(right.split(' '));
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union ? intersection / union : 0;
}

function normalizeAbbrev(raw) {
  return raw.replace(/\s+/g, '');
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
      if (!book) { errors.push(`Unknown book abbreviation: ${abbrev}`); continue; }
      const chapter = parseInt(fullMatch[2], 10);
      const verse = parseInt(fullMatch[3], 10);
      if (chapter < 1 || chapter > (BOOK_CHAPTERS[book] || 0)) { errors.push(`Invalid chapter for ${abbrev}: ${chapter}`); continue; }
      currentBook = book; currentAbbrev = abbrev; refs.push({ book, abbrev, chapter, verse });
      continue;
    }

    if (continuationMatch) {
      if (!currentBook || !currentAbbrev) { errors.push(`Missing book abbreviation before reference: ${part}`); continue; }
      const chapter = parseInt(continuationMatch[1], 10);
      const verse = parseInt(continuationMatch[2], 10);
      if (chapter < 1 || chapter > (BOOK_CHAPTERS[currentBook] || 0)) { errors.push(`Invalid chapter for ${currentAbbrev}: ${chapter}`); continue; }
      refs.push({ book: currentBook, abbrev: currentAbbrev, chapter, verse });
      continue;
    }

    if (singleChapterFullMatch) {
      const abbrev = normalizeAbbrev(singleChapterFullMatch[1]);
      const book = ABBREV_TO_BOOK[abbrev];
      if (!book) { errors.push(`Unknown book abbreviation: ${abbrev}`); continue; }
      if ((BOOK_CHAPTERS[book] || 0) !== 1) { errors.push(`Invalid reference format: ${part}`); continue; }
      const verse = parseInt(singleChapterFullMatch[2], 10);
      currentBook = book; currentAbbrev = abbrev; refs.push({ book, abbrev, chapter: 1, verse });
      continue;
    }

    if (singleChapterContinuationMatch) {
      if (!currentBook || !currentAbbrev || (BOOK_CHAPTERS[currentBook] || 0) !== 1) { errors.push(`Invalid reference format: ${part}`); continue; }
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
    if (prev && prev.book === ref.book) return `${ref.chapter}:${ref.verse}`;
    return `${ref.abbrev} ${ref.chapter}:${ref.verse}`;
  }).join(', ');
}

function parseApprovedLocationsText(text) {
  return text.replace(/\r\n/g, '\n').split(/\n\s*\n+/).map((block) => block.trim()).filter(Boolean).map((block, index) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    return { source_row_number: index + 1, location_name: lines[0] || '', verse_string: lines.slice(1).join(' ').trim() };
  });
}

function parseJsonl(text) {
  return text.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => ({ source_row_number: index + 1, data: JSON.parse(line) }));
}

function parseGeojson(text) {
  const json = JSON.parse(text);
  const features = json.type === 'FeatureCollection' ? json.features || [] : [json];
  return features.map((feature, index) => ({ source_row_number: index + 1, data: feature }));
}

function extractKmlCoordinates(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  return text.split(/\s+/).map((chunk) => {
    const [lng, lat] = chunk.split(',').map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null;
  }).filter(Boolean);
}

function parseKml(text) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const parsed = parser.parse(text);
  const placemarks = [];

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.Placemark) {
      const list = Array.isArray(node.Placemark) ? node.Placemark : [node.Placemark];
      placemarks.push(...list);
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') walk(value);
    }
  }

  walk(parsed);

  return placemarks.map((placemark, index) => ({ source_row_number: index + 1, data: placemark }));
}

async function hashBytes(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getFileContent(fileUrl, detectedFileType, rawFileText) {
  if (rawFileText) {
    const encoder = new TextEncoder();
    return { text: rawFileText, bytes: encoder.encode(rawFileText) };
  }

  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`Failed to fetch uploaded file: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (detectedFileType === 'kmz') {
    const zip = await JSZip.loadAsync(bytes);
    const firstKml = Object.keys(zip.files).find((name) => name.toLowerCase().endsWith('.kml'));
    if (!firstKml) throw new Error('KMZ file does not contain a KML document');
    const text = await zip.files[firstKml].async('text');
    return { text, bytes };
  }

  return { text: new TextDecoder().decode(bytes), bytes };
}

function extractMetadata(text, detectedFileType) {
  if (detectedFileType === 'txt') {
    const firstLines = text.split('\n').slice(0, 4).map((line) => line.trim()).filter(Boolean);
    return firstLines.join(' | ');
  }
  return '';
}

async function createRun(base44, sourceFileId, runType) {
  return await base44.asServiceRole.entities.GeographyImportRun.create({
    source_file_id: sourceFileId,
    run_type: runType,
    status: 'running'
  });
}

async function finalizeRun(base44, run, data) {
  await base44.asServiceRole.entities.GeographyImportRun.update(run.id, data);
}

async function parseSourceFile(base44, payload) {
  const originalFilename = String(payload.originalFilename || 'uploaded-source');
  const sourceCategory = String(payload.sourceCategory || 'other_reference');
  if (!SOURCE_CATEGORIES.includes(sourceCategory)) throw new Error('Unsupported source category');

  const detectedFileType = detectFileType(originalFilename);
  const { text, bytes } = await getFileContent(payload.fileUrl, detectedFileType, payload.rawFileText);
  const checksum = await hashBytes(bytes);
  const sourceMetadata = extractMetadata(text, detectedFileType);

  const sourceFile = await base44.asServiceRole.entities.GeographySourceFile.create({
    original_filename: originalFilename,
    detected_file_type: detectedFileType,
    source_category: sourceCategory,
    upload_timestamp: new Date().toISOString(),
    processing_status: 'processing',
    checksum,
    storage_path: payload.fileUrl || originalFilename,
    source_metadata: sourceMetadata
  });

  const run = await createRun(base44, sourceFile.id, 'parse');

  try {
    let parsedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    if (detectedFileType === 'txt') {
      const rows = parseApprovedLocationsText(text);
      const staged = [];
      for (const row of rows) {
        if (!row.location_name || !row.verse_string) {
          skippedCount += 1;
          staged.push({ ...row, source_file_id: sourceFile.id, validation_status: 'invalid', validation_errors: 'Missing location name or verse line' });
          continue;
        }
        const { refs, errors } = parseReferenceString(row.verse_string);
        if (errors.length > 0) {
          failedCount += 1;
          staged.push({ ...row, source_file_id: sourceFile.id, validation_status: 'invalid', validation_errors: errors.join('; ') });
        } else {
          parsedCount += 1;
          staged.push({ ...row, source_file_id: sourceFile.id, normalized_verse_string: normalizeReferenceString(refs), validation_status: 'valid' });
        }
      }
      for (const batch of chunkArray(staged, 100)) {
        await base44.asServiceRole.entities.StagingApprovedPlace.bulkCreate(batch);
      }
    } else if (detectedFileType === 'jsonl') {
      const rows = parseJsonl(text);
      const targetEntity = sourceCategory === 'openbible_modern' ? 'StagingOpenBibleModern' : sourceCategory === 'openbible_geometry' ? 'StagingOpenBibleGeometry' : 'StagingOpenBibleAncient';
      const staged = rows.map(({ source_row_number, data }) => ({
        source_file_id: sourceFile.id,
        source_row_number,
        external_id: String(data.id || data.place_id || data.osm_id || `${source_row_number}`),
        primary_name: String(data.name || data.title || data.label || data.place || data.site || 'Unnamed'),
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : Array.isArray(data.names) ? data.names.map(String) : [],
        latitude: Number(data.latitude ?? data.lat ?? data.geometry?.coordinates?.[1] ?? 0) || null,
        longitude: Number(data.longitude ?? data.lng ?? data.lon ?? data.geometry?.coordinates?.[0] ?? 0) || null,
        raw_geometry: data.geometry ? JSON.stringify(data.geometry) : '',
        source_payload: JSON.stringify(data)
      }));
      parsedCount = staged.length;
      for (const batch of chunkArray(staged, 100)) {
        await base44.asServiceRole.entities[targetEntity].bulkCreate(batch);
      }
    } else if (detectedFileType === 'geojson') {
      const rows = parseGeojson(text);
      const staged = rows.map(({ source_row_number, data }) => ({
        source_file_id: sourceFile.id,
        source_row_number,
        external_id: String(data.id || data.properties?.id || `${source_row_number}`),
        feature_name: String(data.properties?.name || data.properties?.title || data.properties?.label || 'Unnamed Feature'),
        geometry_type: String(data.geometry?.type || 'Unknown'),
        geometry_json: JSON.stringify(data.geometry || {}),
        source_payload: JSON.stringify(data)
      }));
      parsedCount = staged.length;
      for (const batch of chunkArray(staged, 100)) {
        await base44.asServiceRole.entities.StagingGeojsonFeature.bulkCreate(batch);
      }
    } else if (detectedFileType === 'kml' || detectedFileType === 'kmz') {
      const rows = parseKml(text);
      const staged = rows.map(({ source_row_number, data }) => {
        let geometryType = 'Unknown';
        let geometry = {};
        if (data.Point?.coordinates) {
          geometryType = 'Point';
          geometry = { type: 'Point', coordinates: extractKmlCoordinates(data.Point.coordinates)[0] || [] };
        } else if (data.LineString?.coordinates) {
          geometryType = 'LineString';
          geometry = { type: 'LineString', coordinates: extractKmlCoordinates(data.LineString.coordinates) };
        } else if (data.Polygon?.outerBoundaryIs?.LinearRing?.coordinates) {
          geometryType = 'Polygon';
          geometry = { type: 'Polygon', coordinates: [extractKmlCoordinates(data.Polygon.outerBoundaryIs.LinearRing.coordinates)] };
        }
        return {
          source_file_id: sourceFile.id,
          source_row_number,
          external_id: String(data.id || source_row_number),
          feature_name: String(data.name || 'Unnamed Placemark'),
          geometry_type: geometryType,
          geometry_json: JSON.stringify(geometry),
          source_payload: JSON.stringify(data)
        };
      });
      parsedCount = staged.length;
      for (const batch of chunkArray(staged, 100)) {
        await base44.asServiceRole.entities.StagingKmlFeature.bulkCreate(batch);
      }
    } else {
      throw new Error(`Unsupported file type: ${detectedFileType}`);
    }

    await base44.asServiceRole.entities.GeographySourceFile.update(sourceFile.id, {
      processing_status: 'parsed',
      parsed_count: parsedCount,
      skipped_count: skippedCount,
      failed_count: failedCount
    });

    await finalizeRun(base44, run, {
      status: 'success',
      parsed_count: parsedCount,
      skipped_count: skippedCount,
      failed_count: failedCount,
      log_summary: 'Source file parsed successfully'
    });

    return { sourceFileId: sourceFile.id, parsedCount, skippedCount, failedCount };
  } catch (error) {
    await base44.asServiceRole.entities.GeographySourceFile.update(sourceFile.id, {
      processing_status: 'failed',
      error_message: error.message
    });
    await finalizeRun(base44, run, {
      status: 'failed',
      error_message: error.message
    });
    throw error;
  }
}

async function runMatching(base44, payload) {
  const sourceFileId = payload.sourceFileId;
  const sourceFileRows = await base44.asServiceRole.entities.GeographySourceFile.filter({ id: sourceFileId });
  const sourceFile = sourceFileRows[0];
  if (!sourceFile) throw new Error('Source file not found');
  const run = await createRun(base44, sourceFileId, 'match');

  try {
    const approvedLocations = await base44.asServiceRole.entities.BiblicalLocation.list('-created_date', 5000);
    let candidates = [];

    if (sourceFile.source_category === 'approved_locations_txt') {
      const staged = await base44.asServiceRole.entities.StagingApprovedPlace.filter({ source_file_id: sourceFileId, validation_status: 'valid' });
      candidates = staged.map((row) => ({ sourceId: row.id, name: row.location_name, aliases: [], sourceType: 'approved_places' }));
    } else if (sourceFile.source_category === 'openbible_ancient') {
      const staged = await base44.asServiceRole.entities.StagingOpenBibleAncient.filter({ source_file_id: sourceFileId });
      candidates = staged.map((row) => ({ sourceId: row.id, name: row.primary_name, aliases: row.aliases || [], sourceType: 'openbible_ancient' }));
    } else if (sourceFile.source_category === 'openbible_modern') {
      const staged = await base44.asServiceRole.entities.StagingOpenBibleModern.filter({ source_file_id: sourceFileId });
      candidates = staged.map((row) => ({ sourceId: row.id, name: row.primary_name, aliases: row.aliases || [], sourceType: 'openbible_modern' }));
    } else {
      const geojson = await base44.asServiceRole.entities.StagingGeojsonFeature.filter({ source_file_id: sourceFileId });
      const kml = await base44.asServiceRole.entities.StagingKmlFeature.filter({ source_file_id: sourceFileId });
      const geom = await base44.asServiceRole.entities.StagingOpenBibleGeometry.filter({ source_file_id: sourceFileId });
      candidates = [
        ...geojson.map((row) => ({ sourceId: row.id, name: row.feature_name, aliases: [], sourceType: 'geojson' })),
        ...kml.map((row) => ({ sourceId: row.id, name: row.feature_name, aliases: [], sourceType: 'kml' })),
        ...geom.map((row) => ({ sourceId: row.id, name: row.feature_name, aliases: [], sourceType: 'openbible_geometry' }))
      ];
    }

    let matchedCount = 0;
    let unresolvedCount = 0;

    for (const approved of approvedLocations) {
      const potential = [];
      for (const candidate of candidates) {
        const exact = approved.biblical_location_name === candidate.name;
        const alias = candidate.aliases.some((item) => normalizeName(item) === normalizeName(approved.biblical_location_name));
        const normalized = normalizeName(approved.biblical_location_name) === normalizeName(candidate.name);
        const fuzzy = similarityScore(approved.biblical_location_name, candidate.name);

        if (exact || alias || normalized || fuzzy >= 0.72) {
          potential.push({
            candidate,
            matchType: exact ? 'exact_name' : alias ? 'alias_match' : normalized ? 'normalized_name' : 'fuzzy_suggestion',
            confidence: exact ? 1 : alias ? 0.95 : normalized ? 0.9 : fuzzy
          });
        }
      }

      if (potential.length === 0) {
        unresolvedCount += 1;
        await base44.asServiceRole.entities.BiblicalLocationReviewQueue.create({
          source_file_id: sourceFileId,
          approved_location_id: approved.id,
          approved_location_name: approved.biblical_location_name,
          issue_type: 'unresolved',
          details: 'No candidate geography record found',
          status: 'pending'
        });
        continue;
      }

      for (const match of potential.slice(0, 5)) {
        matchedCount += 1;
        await base44.asServiceRole.entities.BiblicalLocationImportMatch.create({
          source_file_id: sourceFileId,
          approved_location_id: approved.id,
          approved_location_name: approved.biblical_location_name,
          candidate_source_id: String(match.candidate.sourceId),
          candidate_name: match.candidate.name,
          candidate_source_type: match.candidate.sourceType,
          match_type: match.matchType,
          match_confidence: match.confidence,
          review_status: 'pending',
          is_final: false
        });
      }

      if (potential.length > 1) {
        await base44.asServiceRole.entities.BiblicalLocationReviewQueue.create({
          source_file_id: sourceFileId,
          approved_location_id: approved.id,
          approved_location_name: approved.biblical_location_name,
          issue_type: 'multiple_candidates',
          details: `Found ${potential.length} possible candidates`,
          status: 'pending'
        });
      }
    }

    const newStatus = unresolvedCount > 0 ? 'review_required' : 'matched';
    await base44.asServiceRole.entities.GeographySourceFile.update(sourceFileId, {
      processing_status: newStatus,
      matched_count: matchedCount
    });

    await finalizeRun(base44, run, {
      status: 'success',
      matched_count: matchedCount,
      failed_count: unresolvedCount,
      log_summary: 'Matching completed'
    });

    return { matchedCount, unresolvedCount };
  } catch (error) {
    await base44.asServiceRole.entities.GeographySourceFile.update(sourceFileId, {
      processing_status: 'failed',
      error_message: error.message
    });
    await finalizeRun(base44, run, { status: 'failed', error_message: error.message });
    throw error;
  }
}

async function publishApproved(base44, payload) {
  const sourceFileId = payload.sourceFileId;
  const run = await createRun(base44, sourceFileId, 'publish');

  try {
    let publishedCount = 0;
    const sourceFileRows = await base44.asServiceRole.entities.GeographySourceFile.filter({ id: sourceFileId });
    const sourceFile = sourceFileRows[0];
    if (!sourceFile) throw new Error('Source file not found');

    if (sourceFile.source_category === 'approved_locations_txt') {
      const staged = await base44.asServiceRole.entities.StagingApprovedPlace.filter({ source_file_id: sourceFileId, validation_status: 'valid' });
      for (const row of staged) {
        const existing = await base44.asServiceRole.entities.BiblicalLocation.filter({ biblical_location_name: row.location_name });
        const location = existing[0] || await base44.asServiceRole.entities.BiblicalLocation.create({
          biblical_location_name: row.location_name,
          bible_verses: row.normalized_verse_string || row.verse_string
        });
        const { refs } = parseReferenceString(row.normalized_verse_string || row.verse_string);
        const verseRows = refs.map((ref) => ({
          biblical_location_id: location.id,
          book: ref.book,
          chapter: ref.chapter,
          verse: ref.verse,
          verse_ref: `${ref.book} ${ref.chapter}:${ref.verse}`
        }));
        for (const batch of chunkArray(verseRows, 100)) {
          await base44.asServiceRole.entities.BiblicalLocationVerse.bulkCreate(batch);
        }
        publishedCount += 1;
      }
    }

    const approvedMatches = await base44.asServiceRole.entities.BiblicalLocationImportMatch.filter({ source_file_id: sourceFileId, review_status: 'approved' });
    for (const match of approvedMatches) {
      await base44.asServiceRole.entities.BiblicalLocationAlias.create({
        biblical_location_id: match.approved_location_id,
        alias: match.candidate_name,
        source_file_id: sourceFileId,
        source_type: match.candidate_source_type,
        is_primary: false
      });

      if (match.candidate_source_type === 'openbible_ancient' || match.candidate_source_type === 'openbible_modern') {
        const entityName = match.candidate_source_type === 'openbible_ancient' ? 'StagingOpenBibleAncient' : 'StagingOpenBibleModern';
        const stagedRows = await base44.asServiceRole.entities[entityName].filter({ id: match.candidate_source_id });
        const staged = stagedRows[0];
        if (staged?.latitude && staged?.longitude) {
          await base44.asServiceRole.entities.BiblicalLocationPoint.create({
            biblical_location_id: match.approved_location_id,
            latitude: staged.latitude,
            longitude: staged.longitude,
            source_file_id: sourceFileId,
            source_type: match.candidate_source_type,
            confidence: match.match_confidence
          });
        }
      } else {
        const entityName = match.candidate_source_type === 'geojson' ? 'StagingGeojsonFeature' : match.candidate_source_type === 'kml' ? 'StagingKmlFeature' : 'StagingOpenBibleGeometry';
        const stagedRows = await base44.asServiceRole.entities[entityName].filter({ id: match.candidate_source_id });
        const staged = stagedRows[0];
        if (staged?.geometry_json) {
          await base44.asServiceRole.entities.BiblicalLocationGeometry.create({
            biblical_location_id: match.approved_location_id,
            geometry_type: staged.geometry_type,
            geometry_json: staged.geometry_json,
            source_file_id: sourceFileId,
            source_type: match.candidate_source_type
          });
        }
      }

      await base44.asServiceRole.entities.BiblicalLocationImportMatch.update(match.id, { is_final: true });
      publishedCount += 1;
    }

    await base44.asServiceRole.entities.GeographySourceFile.update(sourceFileId, {
      processing_status: 'published',
      published_count: publishedCount
    });
    await finalizeRun(base44, run, { status: 'success', published_count: publishedCount, log_summary: 'Publishing completed' });
    return { publishedCount };
  } catch (error) {
    await finalizeRun(base44, run, { status: 'failed', error_message: error.message });
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.is_admin && user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const payload = await req.json();
    const action = payload.action;

    if (action === 'parse_source') {
      return Response.json(await parseSourceFile(base44, payload));
    }
    if (action === 'run_matching') {
      return Response.json(await runMatching(base44, payload));
    }
    if (action === 'publish_approved') {
      return Response.json(await publishApproved(base44, payload));
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});