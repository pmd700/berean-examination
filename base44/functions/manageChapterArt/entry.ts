import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, book, chapter_number, image_url, settings, chapter_count, name } = body;

    if (action === 'load_book') {
      // Load all chapters for a book (existing ones)
      const existingChapters = await base44.asServiceRole.entities.StudyChapter.filter({ book });
      return Response.json({ chapters: existingChapters });
    }

    if (action === 'load_recent') {
      const { limit = 50 } = body;
      
      // Query all chapters with cover art, sorted by updated_date descending
      const allChapters = await base44.asServiceRole.entities.StudyChapter.list('-updated_date', limit * 2);
      
      // Filter only those with cover_art_url
      const withArt = allChapters.filter(ch => ch.cover_art_url);
      
      // Take first `limit` items
      const recent = withArt.slice(0, limit);
      
      return Response.json({ chapters: recent });
    }

    if (action === 'set_art') {
      // Find or create chapter record with cover art
      const existing = await base44.asServiceRole.entities.StudyChapter.filter({
        book,
        chapter_number
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.StudyChapter.update(existing[0].id, {
          cover_art_url: image_url
        });
      } else {
        await base44.asServiceRole.entities.StudyChapter.create({
          book,
          chapter_number,
          raw_text: '',
          cover_art_url: image_url
        });
      }

      return Response.json({ success: true });
    }

    if (action === 'remove_art') {
      const existing = await base44.asServiceRole.entities.StudyChapter.filter({
        book,
        chapter_number
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.StudyChapter.update(existing[0].id, {
          cover_art_url: null
        });
      }

      return Response.json({ success: true });
    }

    if (action === 'bulk_apply') {
      for (let i = 1; i <= chapter_count; i++) {
        const existing = await base44.asServiceRole.entities.StudyChapter.filter({
          book,
          chapter_number: i
        });

        if (existing.length > 0) {
          await base44.asServiceRole.entities.StudyChapter.update(existing[0].id, {
            cover_art_url: image_url
          });
        } else {
          await base44.asServiceRole.entities.StudyChapter.create({
            book,
            chapter_number: i,
            raw_text: '',
            cover_art_url: image_url
          });
        }
      }

      return Response.json({ success: true });
    }

    if (action === 'bulk_remove') {
      const existing = await base44.asServiceRole.entities.StudyChapter.filter({ book });
      
      for (const chapter of existing) {
        if (chapter.cover_art_url) {
          await base44.asServiceRole.entities.StudyChapter.update(chapter.id, {
            cover_art_url: null
          });
        }
      }

      return Response.json({ success: true });
    }

    if (action === 'update_settings') {
      const existing = await base44.asServiceRole.entities.StudyChapter.filter({
        book,
        chapter_number
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.StudyChapter.update(existing[0].id, {
          cover_art_opacity: settings.cover_art_opacity,
          cover_art_x: settings.cover_art_x,
          cover_art_y: settings.cover_art_y,
          cover_art_scale: settings.cover_art_scale
        });
      }

      return Response.json({ success: true });
    }

    if (action === 'update_name') {
      const existing = await base44.asServiceRole.entities.StudyChapter.filter({
        book,
        chapter_number
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.StudyChapter.update(existing[0].id, {
          cover_art_name: name
        });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});