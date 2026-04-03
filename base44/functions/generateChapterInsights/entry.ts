import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { chapterText, book, chapterNum } = await req.json();

        const prompt = `
        You are an expert Bible scholar. Analyze the following chapter (${book} ${chapterNum}):
        ${chapterText}
        
        Please provide:
        1. A brief summary (2-3 sentences)
        2. Historical/Cultural context
        3. 3 thought-provoking study questions
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    summary: { type: "string", description: "A brief 2-3 sentence summary of the chapter" },
                    context: { type: "string", description: "Historical and cultural context of the chapter" },
                    questions: { type: "array", items: { type: "string" }, description: "3 thought-provoking study questions" }
                },
                required: ["summary", "context", "questions"]
            }
        });

        return Response.json(response);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});