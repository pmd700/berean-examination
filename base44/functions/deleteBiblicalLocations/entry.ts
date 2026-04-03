import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function deleteWithRetry(base44, id, maxAttempts = 2) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await base44.asServiceRole.entities.BiblicalLocation.delete(id);
      return { status: 'deleted', id };
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('not found')) {
        return { status: 'not_found', id };
      }
      if (message.toLowerCase().includes('rate limit') && attempt < maxAttempts) {
        continue;
      }
      return { status: 'failed', id, reason: message || 'Unknown delete error' };
    }
  }
  return { status: 'failed', id, reason: 'Unknown delete error' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.is_admin && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'No IDs provided' }, { status: 400 });
    }

    const deletedIds = [];
    const notFoundIds = [];
    const failedIds = [];

    for (const batch of chunkArray(ids, 100)) {
      const results = await Promise.all(batch.map((id) => deleteWithRetry(base44, id)));

      for (const result of results) {
        if (result.status === 'deleted') deletedIds.push(result.id);
        else if (result.status === 'not_found') notFoundIds.push(result.id);
        else failedIds.push({ id: result.id, reason: result.reason });
      }
    }

    return Response.json({
      success: failedIds.length === 0,
      deletedIds,
      notFoundIds,
      failedIds,
      deletedCount: deletedIds.length,
      notFoundCount: notFoundIds.length,
      failedCount: failedIds.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});