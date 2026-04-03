import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    // Use InvokeLLM with web context to extract metadata
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract metadata from this URL: ${url}
      
Return the following information:
- title: The page title
- description: A brief description or summary (max 200 characters)
- favicon: The favicon URL if available
- image: The main image or thumbnail URL if available

Be concise and accurate.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          favicon: { type: "string" },
          image: { type: "string" }
        },
        required: ["title"]
      }
    });

    return Response.json({
      url,
      ...result,
      fetched_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    return Response.json({ 
      error: error.message || 'Failed to fetch URL metadata' 
    }, { status: 500 });
  }
});