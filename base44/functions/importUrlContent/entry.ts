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

    // Use InvokeLLM with web context to extract and format content
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract the main content from this URL: ${url}

Please extract:
1. The title
2. The main body content in a clean, readable format
3. Remove navigation, ads, footers, and other non-content elements
4. Format as markdown for easy reading

Return the content ready to be pasted into a study environment.`,
      add_context_from_internet: true
    });

    return Response.json({
      url,
      content: result,
      imported_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error importing URL content:', error);
    return Response.json({ 
      error: error.message || 'Failed to import URL content' 
    }, { status: 500 });
  }
});