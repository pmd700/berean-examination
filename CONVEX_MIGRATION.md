# Convex migration plan

This repository was exported from Base44 and still depends on Base44 in several places.

## Current Base44 coupling

- `src/api/base44Client.js`
- `src/lib/app-params.js`
- `src/lib/AuthContext.jsx`
- `vite.config.js`
- `package.json`
- `base44/functions/*`

## Phase 1 completed in ChatGPT

This document was added as the starting point for the Convex migration.

## Next steps

1. Add Convex to `package.json`.
2. Add a Convex client and root provider.
3. Decide auth strategy:
   - Convex Auth
   - Clerk/Auth0 with Convex
4. Replace Base44 auth calls in `src/lib/AuthContext.jsx`.
5. Replace data access layer.
6. Remove Base44 packages and Vite plugin.
7. Remove `base44/functions` once replacements exist.
