import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query } = await req.json();
        if (!query || query.length < 2) return Response.json({ results: [] });

        const q = query.toLowerCase();

        // Fetch user data
        const [chapters, annotations, keywords, cards] = await Promise.all([
            base44.entities.StudyChapter.list(),
            base44.entities.Annotation.list(),
            base44.entities.Keyword.list(),
            base44.entities.WebCard.list()
        ]);

        const results = [];

        // Filter chapters
        chapters.forEach(c => {
            if (c.book.toLowerCase().includes(q) || c.notes?.toLowerCase().includes(q)) {
                results.push({ type: 'Chapter', title: `${c.book} ${c.chapter_number}`, id: c.id, url: `Study?chapter_id=${c.id}` });
            }
        });

        // Filter annotations
        annotations.forEach(a => {
            if (a.content?.toLowerCase().includes(q) || a.selected_text?.toLowerCase().includes(q)) {
                results.push({ type: 'Annotation', title: `Annotation on ${a.selected_text?.substring(0, 20)}...`, description: a.content?.substring(0, 50), id: a.id, url: `Study?chapter_id=${a.study_chapter_id}` });
            }
        });

        // Filter keywords
        keywords.forEach(k => {
            if (k.title.toLowerCase().includes(q) || k.explanation?.toLowerCase().includes(q)) {
                results.push({ type: 'Keyword', title: k.title, id: k.id, url: `Keywords` });
            }
        });

        // Filter cards
        cards.forEach(c => {
            if (c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)) {
                results.push({ type: 'Web Card', title: c.title, id: c.id, url: `KnowledgeWeb` }); 
            }
        });

        return Response.json({ results: results.slice(0, 20) });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});