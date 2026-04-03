import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { files } = await req.json();
        
        const zip = new JSZip();
        for (const file of files) {
            zip.file(file.name, file.content);
        }
        
        const zipBase64 = await zip.generateAsync({ type: "base64" });
        return Response.json({ zipBase64 });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
});