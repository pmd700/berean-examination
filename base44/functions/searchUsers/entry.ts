import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return Response.json({ users: [] });
    }

    const lowerQ = query.trim().toLowerCase();

    // Use service role to list users (regular users can't list all users)
    const allUsers = await base44.asServiceRole.entities.User.list();

    const matches = allUsers
      .filter(u => {
        if (u.email === user.email) return false;
        const username = (u.username || u.full_name || '').toLowerCase();
        return username.includes(lowerQ);
      })
      .sort((a, b) => {
        const aName = (a.username || a.full_name || '').toLowerCase();
        const bName = (b.username || b.full_name || '').toLowerCase();
        if (aName === lowerQ) return -1;
        if (bName === lowerQ) return 1;
        if (aName.startsWith(lowerQ) && !bName.startsWith(lowerQ)) return -1;
        if (bName.startsWith(lowerQ) && !aName.startsWith(lowerQ)) return 1;
        return aName.localeCompare(bName);
      })
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        bio: u.bio,
      }));

    return Response.json({ users: matches });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});